"""
Comprehensive tests for the declarative Pydantic-based transition system.

This test suite provides extensive coverage of the new transition system,
including usage examples, edge cases, validation scenarios, and integration
patterns to serve as both tests and documentation.
"""

from datetime import datetime, timedelta
from typing import Any, Dict
from unittest.mock import Mock, patch

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase
from fsm.registry import register_transition, transition_registry
from fsm.state_choices import AnnotationStateChoices, TaskStateChoices
from fsm.transition_utils import (
    TransitionBuilder,
    get_available_transitions,
    get_valid_transitions,
)
from fsm.transitions import (
    BaseTransition,
    TransitionContext,
    TransitionValidationError,
)
from pydantic import Field, ValidationError

User = get_user_model()


class MockTask:
    """Mock task model for testing"""

    def __init__(self, pk=1):
        self.pk = pk
        self.id = pk
        self.organization_id = 1
        self._meta = Mock()
        self._meta.model_name = 'task'
        self._meta.label_lower = 'tasks.task'


class MockAnnotation:
    """Mock annotation model for testing"""

    def __init__(self, pk=1):
        self.pk = pk
        self.id = pk
        self.result = {'test': 'data'}  # Mock annotation data
        self.organization_id = 1
        self._meta = Mock()
        self._meta.model_name = 'annotation'
        self._meta.label_lower = 'tasks.annotation'


class TestTransition(BaseTransition):
    """Test transition class"""

    test_field: str
    optional_field: int = 42

    @property
    def target_state(self) -> str:
        return 'TEST_STATE'

    @classmethod
    def get_target_state(cls) -> str:
        """Return the target state at class level"""
        return 'TEST_STATE'

    @classmethod
    def can_transition_from_state(cls, context: TransitionContext) -> bool:
        """Allow transition from any state for testing"""
        return True

    def validate_transition(self, context: TransitionContext) -> bool:
        if self.test_field == 'invalid':
            raise TransitionValidationError('Test validation error')
        return super().validate_transition(context)

    def transition(self, context: TransitionContext) -> dict:
        return {
            'test_field': self.test_field,
            'optional_field': self.optional_field,
            'context_entity_id': context.entity.pk,
        }


class DeclarativeTransitionTests(TestCase):
    """Test cases for the declarative transition system"""

    def setUp(self):
        self.task = MockTask()
        self.annotation = MockAnnotation()
        self.user = Mock()
        self.user.id = 1
        self.user.username = 'testuser'

        # Register test transition
        transition_registry.register('task', 'test_transition', TestTransition)

    def test_transition_context_creation(self):
        """Test creation of transition context"""
        context = TransitionContext(
            entity=self.task,
            current_user=self.user,
            current_state='CREATED',
            target_state='IN_PROGRESS',
            organization_id=1,
        )

        self.assertEqual(context.entity, self.task)
        self.assertEqual(context.current_user, self.user)
        self.assertEqual(context.current_state, 'CREATED')
        self.assertEqual(context.target_state, 'IN_PROGRESS')
        self.assertEqual(context.organization_id, 1)
        self.assertFalse(context.is_initial_transition)
        self.assertTrue(context.has_current_state)

    def test_transition_context_initial_state(self):
        """Test context for initial state transition"""
        context = TransitionContext(entity=self.task, current_state=None, target_state='CREATED')

        self.assertTrue(context.is_initial_transition)
        self.assertFalse(context.has_current_state)

    def test_transition_validation_success(self):
        """Test successful transition validation"""
        transition = TestTransition(test_field='valid')
        context = TransitionContext(entity=self.task, current_state='CREATED', target_state=transition.target_state)

        self.assertTrue(transition.validate_transition(context))

    def test_transition_validation_failure(self):
        """Test transition validation failure"""
        transition = TestTransition(test_field='invalid')
        context = TransitionContext(entity=self.task, current_state='CREATED', target_state=transition.target_state)

        with self.assertRaises(TransitionValidationError):
            transition.validate_transition(context)

    def test_transition_execution(self):
        """Test transition data generation"""
        transition = TestTransition(test_field='test_value', optional_field=100)
        context = TransitionContext(entity=self.task, current_state='CREATED', target_state=transition.target_state)

        result = transition.transition(context)

        self.assertEqual(result['test_field'], 'test_value')
        self.assertEqual(result['optional_field'], 100)
        self.assertEqual(result['context_entity_id'], self.task.pk)

    def test_transition_name_generation(self):
        """Test automatic transition name generation"""
        transition = TestTransition(test_field='test')
        self.assertEqual(transition.transition_name, 'test_transition')

    @patch('fsm.state_manager.StateManager.transition_state')
    @patch('fsm.state_manager.StateManager.get_current_state_object')
    def test_transition_execute_full_workflow(self, mock_get_state, mock_transition):
        """Test full transition execution workflow"""
        # Setup mocks
        mock_get_state.return_value = None  # No current state
        mock_transition.return_value = True

        mock_state_record = Mock()
        mock_state_record.id = 'test-uuid'

        with patch('fsm.state_manager.StateManager.get_current_state_object', return_value=mock_state_record):
            transition = TestTransition(test_field='test_value')
            context = TransitionContext(
                entity=self.task, current_user=self.user, current_state=None, target_state=transition.target_state
            )

            # Execute transition
            transition.execute(context)

            # Verify StateManager was called correctly
            mock_transition.assert_called_once()
            call_args = mock_transition.call_args

            self.assertEqual(call_args[1]['entity'], self.task)
            self.assertEqual(call_args[1]['new_state'], 'TEST_STATE')
            self.assertEqual(call_args[1]['transition_name'], 'test_transition')
            self.assertEqual(call_args[1]['user'], self.user)

            # Check context data
            context_data = call_args[1]['context']
            self.assertEqual(context_data['test_field'], 'test_value')
            self.assertEqual(context_data['optional_field'], 42)


class TransitionRegistryTests(TestCase):
    """Test cases for the transition registry"""

    def setUp(self):
        self.registry = transition_registry

    def test_transition_registration(self):
        """Test registering transitions"""
        self.registry.register('test_entity', 'test_transition', TestTransition)

        retrieved = self.registry.get_transition('test_entity', 'test_transition')
        self.assertEqual(retrieved, TestTransition)

    def test_get_transitions_for_entity(self):
        """Test getting all transitions for an entity"""
        self.registry.register('test_entity', 'transition1', TestTransition)
        self.registry.register('test_entity', 'transition2', TestTransition)

        transitions = self.registry.get_transitions_for_entity('test_entity')

        self.assertIn('transition1', transitions)
        self.assertIn('transition2', transitions)
        self.assertEqual(len(transitions), 2)

    def test_list_entities(self):
        """Test listing registered entities"""
        self.registry.register('entity1', 'transition1', TestTransition)
        self.registry.register('entity2', 'transition2', TestTransition)

        entities = self.registry.list_entities()

        self.assertIn('entity1', entities)
        self.assertIn('entity2', entities)


class TransitionUtilsTests(TestCase):
    """Test cases for transition utility functions"""

    def setUp(self):
        self.task = MockTask()
        transition_registry.register('task', 'test_transition', TestTransition)

    def test_get_available_transitions(self):
        """Test getting available transitions for entity"""
        transitions = get_available_transitions(self.task)
        self.assertIn('test_transition', transitions)

    @patch('fsm.state_manager.StateManager.get_current_state_object')
    def test_get_valid_transitions(self, mock_get_state):
        """Test filtering valid transitions"""
        mock_get_state.return_value = None

        valid_transitions = get_valid_transitions(self.task, validate=True)
        self.assertIn('test_transition', valid_transitions)

    @patch('fsm.state_manager.StateManager.get_current_state_object')
    def test_get_valid_transitions_with_invalid(self, mock_get_state):
        """Test filtering out invalid transitions"""
        mock_get_state.return_value = None

        # Register an invalid transition
        class InvalidTransition(TestTransition):
            @classmethod
            def can_transition_from_state(cls, context):
                # This transition is never valid at the class level
                return False

            def validate_transition(self, context):
                raise TransitionValidationError('Always invalid')

        transition_registry.register('task', 'invalid_transition', InvalidTransition)

        valid_transitions = get_valid_transitions(self.task, validate=True)
        self.assertIn('test_transition', valid_transitions)
        self.assertNotIn('invalid_transition', valid_transitions)

    @patch('fsm.transition_utils.execute_transition')
    def test_transition_builder(self, mock_execute):
        """Test fluent transition builder interface"""
        mock_execute.return_value = Mock()

        (
            TransitionBuilder(self.task)
            .transition('test_transition')
            .with_data(test_field='builder_test')
            .by_user(Mock())
            .with_context(extra='context')
            .execute()
        )

        mock_execute.assert_called_once()
        call_args = mock_execute.call_args

        self.assertEqual(call_args[1]['transition_name'], 'test_transition')
        self.assertEqual(call_args[1]['transition_data']['test_field'], 'builder_test')


class ExampleTransitionIntegrationTests(TestCase):
    """Integration tests using the example transitions"""

    def setUp(self):
        # Import example transitions to register them

        self.task = MockTask()
        self.annotation = MockAnnotation()
        self.user = Mock()
        self.user.id = 1
        self.user.username = 'testuser'

    def test_start_task_transition_validation(self):
        """Test StartTaskTransition validation"""
        from fsm.example_transitions import StartTaskTransition

        transition = StartTaskTransition(assigned_user_id=123)

        # Test valid transition from CREATED
        context = TransitionContext(
            entity=self.task, current_state=TaskStateChoices.CREATED, target_state=transition.target_state
        )

        self.assertTrue(transition.validate_transition(context))

        # Test invalid transition from COMPLETED
        context.current_state = TaskStateChoices.COMPLETED

        with self.assertRaises(TransitionValidationError):
            transition.validate_transition(context)

    def test_submit_annotation_validation(self):
        """Test SubmitAnnotationTransition validation"""
        from fsm.example_transitions import SubmitAnnotationTransition

        transition = SubmitAnnotationTransition()

        # Test valid transition
        context = TransitionContext(
            entity=self.annotation, current_state=AnnotationStateChoices.DRAFT, target_state=transition.target_state
        )

        self.assertTrue(transition.validate_transition(context))

    def test_transition_data_generation(self):
        """Test that transitions generate appropriate context data"""
        from fsm.example_transitions import StartTaskTransition

        transition = StartTaskTransition(assigned_user_id=123, estimated_duration=5, priority='high')

        context = TransitionContext(
            entity=self.task, current_user=self.user, target_state=transition.target_state, timestamp=datetime.now()
        )

        result = transition.transition(context)

        self.assertEqual(result['assigned_user_id'], 123)
        self.assertEqual(result['estimated_duration'], 5)
        self.assertEqual(result['priority'], 'high')
        self.assertIn('started_at', result)
        self.assertEqual(result['assignment_type'], 'manual')


class ComprehensiveUsageExampleTests(TestCase):
    """
    Comprehensive test cases demonstrating various usage patterns.

    These tests serve as both validation and documentation for how to
    implement and use the declarative transition system.
    """

    def setUp(self):
        self.task = MockTask()
        self.user = Mock()
        self.user.id = 123
        self.user.username = 'testuser'

        # Clear registry to avoid conflicts
        transition_registry._transitions.clear()

    def test_basic_transition_implementation(self):
        """
        USAGE EXAMPLE: Basic transition implementation

        Shows how to implement a simple transition with validation.
        """

        class BasicTransition(BaseTransition):
            """Example: Simple transition with required field"""

            message: str = Field(..., description='Message for the transition')

            @property
            def target_state(self) -> str:
                return 'PROCESSED'

            def validate_transition(self, context: TransitionContext) -> bool:
                # Business logic validation
                if context.current_state == 'COMPLETED':
                    raise TransitionValidationError('Cannot process completed items')
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'message': self.message,
                    'processed_by': context.current_user.username if context.current_user else 'system',
                    'processed_at': context.timestamp.isoformat(),
                }

        # Test the implementation
        transition = BasicTransition(message='Processing task')
        self.assertEqual(transition.message, 'Processing task')
        self.assertEqual(transition.target_state, 'PROCESSED')

        # Test validation
        context = TransitionContext(
            entity=self.task, current_user=self.user, current_state='CREATED', target_state=transition.target_state
        )

        self.assertTrue(transition.validate_transition(context))

        # Test data generation
        data = transition.transition(context)
        self.assertEqual(data['message'], 'Processing task')
        self.assertEqual(data['processed_by'], 'testuser')
        self.assertIn('processed_at', data)

    def test_complex_validation_example(self):
        """
        USAGE EXAMPLE: Complex validation with multiple conditions

        Shows how to implement sophisticated business logic validation.
        """

        class TaskAssignmentTransition(BaseTransition):
            """Example: Complex validation for task assignment"""

            assignee_id: int = Field(..., description='User to assign task to')
            priority: str = Field('normal', description='Task priority')
            deadline: datetime = Field(None, description='Task deadline')

            @property
            def target_state(self) -> str:
                return 'ASSIGNED'

            def validate_transition(self, context: TransitionContext) -> bool:
                # Multiple validation conditions
                if context.current_state not in ['CREATED', 'UNASSIGNED']:
                    raise TransitionValidationError(
                        f'Cannot assign task in state {context.current_state}',
                        {'current_state': context.current_state, 'task_id': context.entity.pk},
                    )

                # Check deadline is in future
                if self.deadline and self.deadline <= datetime.now():
                    raise TransitionValidationError(
                        'Deadline must be in the future', {'deadline': self.deadline.isoformat()}
                    )

                # Check priority is valid
                valid_priorities = ['low', 'normal', 'high', 'urgent']
                if self.priority not in valid_priorities:
                    raise TransitionValidationError(
                        f'Invalid priority: {self.priority}', {'valid_priorities': valid_priorities}
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'assignee_id': self.assignee_id,
                    'priority': self.priority,
                    'deadline': self.deadline.isoformat() if self.deadline else None,
                    'assigned_by': context.current_user.id if context.current_user else None,
                    'assignment_reason': f'Task assigned to user {self.assignee_id}',
                }

        # Test valid assignment
        future_deadline = datetime.now() + timedelta(days=7)
        transition = TaskAssignmentTransition(assignee_id=456, priority='high', deadline=future_deadline)

        context = TransitionContext(
            entity=self.task, current_user=self.user, current_state='CREATED', target_state=transition.target_state
        )

        self.assertTrue(transition.validate_transition(context))

        # Test invalid state
        context.current_state = 'COMPLETED'
        with self.assertRaises(TransitionValidationError) as cm:
            transition.validate_transition(context)

        self.assertIn('Cannot assign task in state', str(cm.exception))
        self.assertIn('COMPLETED', str(cm.exception))

        # Test invalid deadline
        past_deadline = datetime.now() - timedelta(days=1)
        invalid_transition = TaskAssignmentTransition(assignee_id=456, deadline=past_deadline)

        context.current_state = 'CREATED'
        with self.assertRaises(TransitionValidationError) as cm:
            invalid_transition.validate_transition(context)

        self.assertIn('Deadline must be in the future', str(cm.exception))

    def test_hooks_and_lifecycle_example(self):
        """
        USAGE EXAMPLE: Using pre/post hooks for side effects

        Shows how to implement lifecycle hooks for notifications,
        cleanup, or other side effects.
        """

        class NotificationTransition(BaseTransition):
            """Example: Transition with notification hooks"""

            notification_message: str = Field(..., description='Notification message')
            notify_users: list = Field(default_factory=list, description='Users to notify')
            notifications_sent: list = Field(default_factory=list, description='Track sent notifications')
            cleanup_performed: bool = Field(default=False, description='Track cleanup status')

            @property
            def target_state(self) -> str:
                return 'NOTIFIED'

            @classmethod
            def get_target_state(cls) -> str:
                return 'NOTIFIED'

            @classmethod
            def can_transition_from_state(cls, context: TransitionContext) -> bool:
                return True

            def pre_transition_hook(self, context: TransitionContext) -> None:
                """Prepare notifications before state change"""
                # Validate notification recipients
                if not self.notify_users:
                    self.notify_users = [context.current_user.id] if context.current_user else []

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'notification_message': self.notification_message,
                    'notify_users': self.notify_users,
                    'notification_sent_at': context.timestamp.isoformat(),
                }

            def post_transition_hook(self, context: TransitionContext, state_record) -> None:
                """Send notifications after successful state change"""
                # Mock notification sending
                for user_id in self.notify_users:
                    self.notifications_sent.append(
                        {'user_id': user_id, 'message': self.notification_message, 'sent_at': context.timestamp}
                    )

                # Mock cleanup
                self.cleanup_performed = True

        # Test the hooks
        transition = NotificationTransition(notification_message='Task has been updated', notify_users=[123, 456])

        context = TransitionContext(
            entity=self.task, current_user=self.user, current_state='CREATED', target_state=transition.target_state
        )

        # Test pre-hook
        transition.pre_transition_hook(context)
        self.assertEqual(transition.notify_users, [123, 456])

        # Test transition
        data = transition.transition(context)
        self.assertEqual(data['notification_message'], 'Task has been updated')

        # Test post-hook
        mock_state_record = Mock()
        transition.post_transition_hook(context, mock_state_record)

        self.assertEqual(len(transition.notifications_sent), 2)
        self.assertTrue(transition.cleanup_performed)

    def test_conditional_transition_example(self):
        """
        USAGE EXAMPLE: Conditional transitions based on data

        Shows how to implement transitions that behave differently
        based on input data or context.
        """

        class ConditionalApprovalTransition(BaseTransition):
            """Example: Conditional approval based on confidence"""

            confidence_score: float = Field(..., ge=0.0, le=1.0, description='Confidence score')
            auto_approve_threshold: float = Field(0.9, description='Auto-approval threshold')
            reviewer_id: int = Field(None, description='Manual reviewer ID')

            @property
            def target_state(self) -> str:
                # Dynamic target state based on confidence
                if self.confidence_score >= self.auto_approve_threshold:
                    return 'AUTO_APPROVED'
                else:
                    return 'PENDING_REVIEW'

            def validate_transition(self, context: TransitionContext) -> bool:
                # Different validation based on approval type
                if self.confidence_score >= self.auto_approve_threshold:
                    # Auto-approval validation
                    if context.current_state != 'SUBMITTED':
                        raise TransitionValidationError('Can only auto-approve submitted items')
                else:
                    # Manual review validation
                    if not self.reviewer_id:
                        raise TransitionValidationError('Manual review requires reviewer_id')

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                base_data = {
                    'confidence_score': self.confidence_score,
                    'threshold': self.auto_approve_threshold,
                }

                if self.confidence_score >= self.auto_approve_threshold:
                    # Auto-approval data
                    return {
                        **base_data,
                        'approval_type': 'automatic',
                        'approved_at': context.timestamp.isoformat(),
                        'approved_by': 'system',
                    }
                else:
                    # Manual review data
                    return {
                        **base_data,
                        'approval_type': 'manual',
                        'assigned_reviewer': self.reviewer_id,
                        'review_requested_at': context.timestamp.isoformat(),
                    }

        # Test auto-approval path
        high_confidence_transition = ConditionalApprovalTransition(confidence_score=0.95)

        self.assertEqual(high_confidence_transition.target_state, 'AUTO_APPROVED')

        context = TransitionContext(
            entity=self.task, current_state='SUBMITTED', target_state=high_confidence_transition.target_state
        )

        self.assertTrue(high_confidence_transition.validate_transition(context))

        auto_data = high_confidence_transition.transition(context)
        self.assertEqual(auto_data['approval_type'], 'automatic')
        self.assertEqual(auto_data['approved_by'], 'system')

        # Test manual review path
        low_confidence_transition = ConditionalApprovalTransition(confidence_score=0.7, reviewer_id=789)

        self.assertEqual(low_confidence_transition.target_state, 'PENDING_REVIEW')

        context.target_state = low_confidence_transition.target_state
        self.assertTrue(low_confidence_transition.validate_transition(context))

        manual_data = low_confidence_transition.transition(context)
        self.assertEqual(manual_data['approval_type'], 'manual')
        self.assertEqual(manual_data['assigned_reviewer'], 789)

    def test_registry_and_decorator_usage(self):
        """
        USAGE EXAMPLE: Using the registry and decorator system

        Shows how to register transitions and use the decorator syntax.
        """

        @register_transition('document', 'publish')
        class PublishDocumentTransition(BaseTransition):
            """Example: Using the registration decorator"""

            publish_immediately: bool = Field(True, description='Publish immediately')
            scheduled_time: datetime = Field(None, description='Scheduled publish time')

            @property
            def target_state(self) -> str:
                return 'PUBLISHED' if self.publish_immediately else 'SCHEDULED'

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'publish_immediately': self.publish_immediately,
                    'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
                    'published_by': context.current_user.id if context.current_user else None,
                }

        # Test registration worked
        registered_class = transition_registry.get_transition('document', 'publish')
        self.assertEqual(registered_class, PublishDocumentTransition)

        # Test getting transitions for entity
        document_transitions = transition_registry.get_transitions_for_entity('document')
        self.assertIn('publish', document_transitions)

        # Test execution through registry
        mock_document = Mock()
        mock_document.pk = 1
        mock_document._meta.model_name = 'document'

        # This would normally go through the full execution workflow
        transition_data = {'publish_immediately': False, 'scheduled_time': datetime.now() + timedelta(hours=2)}

        # Test transition creation and validation
        transition = PublishDocumentTransition(**transition_data)
        self.assertEqual(transition.target_state, 'SCHEDULED')


class ValidationAndErrorHandlingTests(TestCase):
    """
    Tests focused on validation scenarios and error handling.

    These tests demonstrate proper error handling patterns and
    validation edge cases.
    """

    def setUp(self):
        self.task = MockTask()
        transition_registry._transitions.clear()

    def test_pydantic_validation_errors(self):
        """Test Pydantic field validation errors"""

        class StrictValidationTransition(BaseTransition):
            required_field: str = Field(..., description='Required field')
            email_field: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$', description='Valid email')
            number_field: int = Field(..., ge=1, le=100, description='Number between 1-100')

            @property
            def target_state(self) -> str:
                return 'VALIDATED'

            @classmethod
            def get_target_state(cls) -> str:
                return 'VALIDATED'

            @classmethod
            def can_transition_from_state(cls, context: TransitionContext) -> bool:
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'validated': True}

        # Test missing required field
        with self.assertRaises(ValidationError):
            StrictValidationTransition(email_field='test@example.com', number_field=50)

        # Test invalid email
        with self.assertRaises(ValidationError):
            StrictValidationTransition(required_field='test', email_field='invalid-email', number_field=50)

        # Test number out of range
        with self.assertRaises(ValidationError):
            StrictValidationTransition(required_field='test', email_field='test@example.com', number_field=150)

        # Test valid data
        valid_transition = StrictValidationTransition(
            required_field='test', email_field='user@example.com', number_field=75
        )
        self.assertEqual(valid_transition.required_field, 'test')

    def test_business_logic_validation_errors(self):
        """Test business logic validation with detailed error context"""

        class BusinessRuleTransition(BaseTransition):
            amount: float = Field(..., description='Transaction amount')
            currency: str = Field('USD', description='Currency code')

            @property
            def target_state(self) -> str:
                return 'PROCESSED'

            def validate_transition(self, context: TransitionContext) -> bool:
                # Complex business rule validation
                errors = []

                if self.amount <= 0:
                    errors.append('Amount must be positive')

                if self.amount > 10000 and context.current_user is None:
                    errors.append('Large amounts require authenticated user')

                if self.currency not in ['USD', 'EUR', 'GBP']:
                    errors.append(f'Unsupported currency: {self.currency}')

                if context.current_state == 'CANCELLED':
                    errors.append('Cannot process cancelled transactions')

                if errors:
                    raise TransitionValidationError(
                        f"Validation failed: {'; '.join(errors)}",
                        {
                            'validation_errors': errors,
                            'amount': self.amount,
                            'currency': self.currency,
                            'current_state': context.current_state,
                        },
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'amount': self.amount, 'currency': self.currency}

        context = TransitionContext(entity=self.task, current_state='PENDING', target_state='PROCESSED')

        # Test negative amount
        negative_transition = BusinessRuleTransition(amount=-100)
        with self.assertRaises(TransitionValidationError) as cm:
            negative_transition.validate_transition(context)

        error = cm.exception
        self.assertIn('Amount must be positive', str(error))
        self.assertIn('validation_errors', error.context)

        # Test large amount without user
        large_transition = BusinessRuleTransition(amount=15000)
        with self.assertRaises(TransitionValidationError) as cm:
            large_transition.validate_transition(context)

        self.assertIn('Large amounts require authenticated user', str(cm.exception))

        # Test invalid currency
        invalid_currency_transition = BusinessRuleTransition(amount=100, currency='XYZ')
        with self.assertRaises(TransitionValidationError) as cm:
            invalid_currency_transition.validate_transition(context)

        self.assertIn('Unsupported currency', str(cm.exception))

        # Test multiple errors
        multi_error_transition = BusinessRuleTransition(amount=-50, currency='XYZ')
        with self.assertRaises(TransitionValidationError) as cm:
            multi_error_transition.validate_transition(context)

        error_msg = str(cm.exception)
        self.assertIn('Amount must be positive', error_msg)
        self.assertIn('Unsupported currency', error_msg)

    def test_context_validation_errors(self):
        """Test validation errors related to context state"""

        class ContextAwareTransition(BaseTransition):
            action: str = Field(..., description='Action to perform')

            @property
            def target_state(self) -> str:
                return 'ACTIONED'

            def validate_transition(self, context: TransitionContext) -> bool:
                # State-dependent validation
                if context.is_initial_transition and self.action != 'create':
                    raise TransitionValidationError(
                        "Initial transition must be 'create' action", {'action': self.action, 'is_initial': True}
                    )

                if context.current_state == 'COMPLETED' and self.action in ['modify', 'update']:
                    raise TransitionValidationError(
                        f'Cannot {self.action} completed items',
                        {'action': self.action, 'current_state': context.current_state},
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'action': self.action}

        # Test initial transition validation
        create_transition = ContextAwareTransition(action='create')
        initial_context = TransitionContext(
            entity=self.task, current_state=None, target_state='ACTIONED'  # No current state = initial
        )

        self.assertTrue(create_transition.validate_transition(initial_context))

        # Test invalid initial action
        modify_transition = ContextAwareTransition(action='modify')
        with self.assertRaises(TransitionValidationError) as cm:
            modify_transition.validate_transition(initial_context)

        error = cm.exception
        self.assertIn("Initial transition must be 'create'", str(error))
        self.assertTrue(error.context['is_initial'])

        # Test completed state validation
        completed_context = TransitionContext(entity=self.task, current_state='COMPLETED', target_state='ACTIONED')

        with self.assertRaises(TransitionValidationError) as cm:
            modify_transition.validate_transition(completed_context)

        self.assertIn('Cannot modify completed items', str(cm.exception))


@pytest.fixture
def task():
    """Pytest fixture for mock task"""
    return MockTask()


@pytest.fixture
def user():
    """Pytest fixture for mock user"""
    user = Mock()
    user.id = 1
    user.username = 'testuser'
    return user


def test_transition_context_properties(task, user):
    """Test TransitionContext properties using pytest"""
    context = TransitionContext(entity=task, current_user=user, current_state='CREATED', target_state='IN_PROGRESS')

    assert context.has_current_state
    assert not context.is_initial_transition
    assert context.current_state == 'CREATED'
    assert context.target_state == 'IN_PROGRESS'


def test_pydantic_validation():
    """Test Pydantic validation in transitions"""
    # Valid data
    transition = TestTransition(test_field='valid')
    assert transition.test_field == 'valid'
    assert transition.optional_field == 42

    # Invalid data should raise validation error
    with pytest.raises(Exception):  # Pydantic validation error
        TestTransition()  # Missing required field
