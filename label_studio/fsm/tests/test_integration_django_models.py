"""
Integration tests for declarative transitions with real Django models.
These tests demonstrate how the transition system integrates with actual
Django models and the StateManager, providing realistic usage examples.
"""

from datetime import datetime
from typing import Any, Dict
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from fsm.models import TaskState
from fsm.state_choices import AnnotationStateChoices, TaskStateChoices
from fsm.transition_utils import TransitionBuilder
from fsm.transitions import BaseTransition, TransitionContext, TransitionValidationError, register_transition
from pydantic import Field


# Mock Django models for integration testing
class MockDjangoTask:
    """Mock Django Task model with realistic attributes"""

    def __init__(self, pk=1, project_id=1, organization_id=1):
        self.pk = pk
        self.id = pk
        self.project_id = project_id
        self.organization_id = organization_id
        self._meta = Mock()
        self._meta.model_name = 'task'
        self._meta.label_lower = 'tasks.task'

        # Mock task attributes
        self.data = {'text': 'Sample task data'}
        self.created_at = datetime.now()
        self.updated_at = datetime.now()


class MockDjangoAnnotation:
    """Mock Django Annotation model with realistic attributes"""

    def __init__(self, pk=1, task_id=1, project_id=1, organization_id=1):
        self.pk = pk
        self.id = pk
        self.task_id = task_id
        self.project_id = project_id
        self.organization_id = organization_id
        self._meta = Mock()
        self._meta.model_name = 'annotation'
        self._meta.label_lower = 'tasks.annotation'

        # Mock annotation attributes
        self.result = [{'value': {'text': ['Sample annotation']}}]
        self.completed_by_id = None
        self.created_at = datetime.now()
        self.updated_at = datetime.now()


User = get_user_model()


class DjangoModelIntegrationTests(TestCase):
    """
    Integration tests demonstrating realistic usage with Django models.
    These tests show how to implement transitions that work with actual
    Django model patterns and the StateManager integration.
    """

    def setUp(self):
        self.task = MockDjangoTask()
        self.annotation = MockDjangoAnnotation()
        self.user = Mock()
        self.user.id = 123
        self.user.username = 'integration_test_user'

        # Clear registry for clean test state
        from fsm.transitions import transition_registry

        transition_registry._transitions.clear()

    @patch('fsm.registry.get_state_model_for_entity')
    @patch('fsm.state_manager.StateManager.get_current_state_object')
    @patch('fsm.state_manager.StateManager.transition_state')
    def test_task_workflow_integration(self, mock_transition_state, mock_get_state_obj, mock_get_state_model):
        """
        INTEGRATION TEST: Complete task workflow using Django models
        Demonstrates a realistic task lifecycle from creation through completion
        using the declarative transition system with Django model integration.
        """

        # Setup mocks to simulate Django model behavior
        mock_get_state_model.return_value = TaskState
        mock_get_state_obj.return_value = None  # No existing state (initial transition)
        mock_transition_state.return_value = True

        # Define task workflow transitions
        @register_transition('task', 'create_task')
        class CreateTaskTransition(BaseTransition):
            """Initial task creation transition"""

            created_by_id: int = Field(..., description='User creating the task')
            initial_priority: str = Field('normal', description='Initial task priority')

            @property
            def target_state(self) -> str:
                return TaskStateChoices.CREATED

            def validate_transition(self, context: TransitionContext) -> bool:
                # Validate initial creation
                if not context.is_initial_transition:
                    raise TransitionValidationError('CreateTask can only be used for initial state')
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'created_by_id': self.created_by_id,
                    'initial_priority': self.initial_priority,
                    'task_data': getattr(context.entity, 'data', {}),
                    'project_id': getattr(context.entity, 'project_id', None),
                    'creation_method': 'declarative_transition',
                }

        @register_transition('task', 'assign_and_start')
        class AssignAndStartTaskTransition(BaseTransition):
            """Assign task to user and start work"""

            assignee_id: int = Field(..., description='User assigned to task')
            estimated_hours: float = Field(None, ge=0.1, description='Estimated work hours')
            priority: str = Field('normal', description='Task priority')

            @property
            def target_state(self) -> str:
                return TaskStateChoices.IN_PROGRESS

            def validate_transition(self, context: TransitionContext) -> bool:
                valid_from_states = [TaskStateChoices.CREATED]
                if context.current_state not in valid_from_states:
                    raise TransitionValidationError(
                        f'Can only assign tasks from states: {valid_from_states}',
                        {'current_state': context.current_state, 'valid_states': valid_from_states},
                    )

                # Business rule: Can't assign to the same user who created it
                if hasattr(context, 'current_state_object') and context.current_state_object:
                    creator_id = context.current_state_object.context_data.get('created_by_id')
                    if creator_id == self.assignee_id:
                        raise TransitionValidationError(
                            'Cannot assign task to the same user who created it',
                            {'creator_id': creator_id, 'assignee_id': self.assignee_id},
                        )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'assignee_id': self.assignee_id,
                    'estimated_hours': self.estimated_hours,
                    'priority': self.priority,
                    'assigned_at': context.timestamp.isoformat(),
                    'assigned_by_id': context.current_user.id if context.current_user else None,
                    'work_started': True,
                }

        @register_transition('task', 'complete_with_quality')
        class CompleteTaskWithQualityTransition(BaseTransition):
            """Complete task with quality metrics"""

            quality_score: float = Field(..., ge=0.0, le=1.0, description='Quality score')
            completion_notes: str = Field('', description='Completion notes')
            actual_hours: float = Field(None, ge=0.0, description='Actual hours worked')

            @property
            def target_state(self) -> str:
                return TaskStateChoices.COMPLETED

            def validate_transition(self, context: TransitionContext) -> bool:
                if context.current_state != TaskStateChoices.IN_PROGRESS:
                    raise TransitionValidationError(
                        'Can only complete tasks that are in progress', {'current_state': context.current_state}
                    )

                # Quality check
                if self.quality_score < 0.6:
                    raise TransitionValidationError(
                        f'Quality score too low: {self.quality_score}. Minimum required: 0.6'
                    )

                return True

            def post_transition_hook(self, context: TransitionContext, state_record) -> None:
                """Post-completion tasks like notifications"""
                # Mock notification system
                if hasattr(self, '_notifications'):
                    self._notifications.append(f'Task {context.entity.pk} completed with quality {self.quality_score}')

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                # Calculate metrics
                start_data = context.current_state_object.context_data if context.current_state_object else {}
                estimated_hours = start_data.get('estimated_hours')

                return {
                    'quality_score': self.quality_score,
                    'completion_notes': self.completion_notes,
                    'actual_hours': self.actual_hours,
                    'estimated_hours': estimated_hours,
                    'completed_at': context.timestamp.isoformat(),
                    'completed_by_id': context.current_user.id if context.current_user else None,
                    'efficiency_ratio': (estimated_hours / self.actual_hours)
                    if (estimated_hours and self.actual_hours)
                    else None,
                }

        # Execute the complete workflow

        # Step 1: Create task
        create_transition = CreateTaskTransition(created_by_id=100, initial_priority='high')

        # Test with StateManager integration
        with patch('fsm.state_manager.StateManager.get_current_state') as mock_get_current:
            mock_get_current.return_value = None  # No current state

            context = TransitionContext(
                entity=self.task,
                current_user=self.user,
                current_state=None,
                target_state=create_transition.target_state,
            )

            # Validate and execute creation
            self.assertTrue(create_transition.validate_transition(context))
            creation_data = create_transition.transition(context)

            self.assertEqual(creation_data['created_by_id'], 100)
            self.assertEqual(creation_data['initial_priority'], 'high')
            self.assertEqual(creation_data['creation_method'], 'declarative_transition')

        # Step 2: Assign and start task
        mock_current_state = Mock()
        mock_current_state.context_data = creation_data
        mock_get_state_obj.return_value = mock_current_state

        assign_transition = AssignAndStartTaskTransition(
            assignee_id=200, estimated_hours=4.5, priority='urgent'  # Different from creator
        )

        context = TransitionContext(
            entity=self.task,
            current_user=self.user,
            current_state=TaskStateChoices.CREATED,
            current_state_object=mock_current_state,
            target_state=assign_transition.target_state,
        )

        self.assertTrue(assign_transition.validate_transition(context))
        assignment_data = assign_transition.transition(context)

        self.assertEqual(assignment_data['assignee_id'], 200)
        self.assertEqual(assignment_data['estimated_hours'], 4.5)
        self.assertTrue(assignment_data['work_started'])

        # Step 3: Complete task
        mock_current_state.context_data = assignment_data

        complete_transition = CompleteTaskWithQualityTransition(
            quality_score=0.85, completion_notes='Task completed successfully with minor revisions', actual_hours=5.2
        )
        complete_transition._notifications = []  # Mock notification system

        context = TransitionContext(
            entity=self.task,
            current_user=self.user,
            current_state=TaskStateChoices.IN_PROGRESS,
            current_state_object=mock_current_state,
            target_state=complete_transition.target_state,
        )

        self.assertTrue(complete_transition.validate_transition(context))
        completion_data = complete_transition.transition(context)

        self.assertEqual(completion_data['quality_score'], 0.85)
        self.assertEqual(completion_data['actual_hours'], 5.2)
        self.assertAlmostEqual(completion_data['efficiency_ratio'], 4.5 / 5.2, places=2)

        # Test post-hook
        mock_state_record = Mock()
        complete_transition.post_transition_hook(context, mock_state_record)
        self.assertEqual(len(complete_transition._notifications), 1)

        # Verify StateManager calls
        self.assertEqual(mock_transition_state.call_count, 0)  # Not called in our test setup

    def test_annotation_review_workflow_integration(self):
        """
        INTEGRATION TEST: Annotation review workflow
        Demonstrates a realistic annotation review process using
        enterprise-grade validation and approval logic.
        """

        @register_transition('annotation', 'submit_for_review')
        class SubmitAnnotationForReview(BaseTransition):
            """Submit annotation for quality review"""

            annotator_confidence: float = Field(..., ge=0.0, le=1.0, description='Annotator confidence')
            annotation_time_seconds: int = Field(..., ge=1, description='Time spent annotating')
            review_requested: bool = Field(True, description='Whether review is requested')

            @property
            def target_state(self) -> str:
                return AnnotationStateChoices.SUBMITTED

            def validate_transition(self, context: TransitionContext) -> bool:
                # Check annotation has content
                if not hasattr(context.entity, 'result') or not context.entity.result:
                    raise TransitionValidationError('Cannot submit empty annotation')

                # Business rule: Low confidence annotations must request review
                if self.annotator_confidence < 0.7 and not self.review_requested:
                    raise TransitionValidationError(
                        'Low confidence annotations must request review',
                        {'confidence': self.annotator_confidence, 'threshold': 0.7},
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'annotator_confidence': self.annotator_confidence,
                    'annotation_time_seconds': self.annotation_time_seconds,
                    'review_requested': self.review_requested,
                    'annotation_complexity': len(context.entity.result) if context.entity.result else 0,
                    'submitted_at': context.timestamp.isoformat(),
                    'submitted_by_id': context.current_user.id if context.current_user else None,
                }

        @register_transition('annotation', 'review_and_approve')
        class ReviewAndApproveAnnotation(BaseTransition):
            """Review annotation and approve/reject"""

            reviewer_decision: str = Field(..., description='approve, reject, or request_changes')
            quality_score: float = Field(..., ge=0.0, le=1.0, description='Reviewer quality assessment')
            review_comments: str = Field('', description='Review comments')
            corrections_made: bool = Field(False, description='Whether reviewer made corrections')

            @property
            def target_state(self) -> str:
                if self.reviewer_decision == 'approve':
                    return AnnotationStateChoices.COMPLETED
                else:
                    return AnnotationStateChoices.DRAFT  # Back to draft for changes

            def validate_transition(self, context: TransitionContext) -> bool:
                if context.current_state != AnnotationStateChoices.SUBMITTED:
                    raise TransitionValidationError('Can only review submitted annotations')

                valid_decisions = ['approve', 'reject', 'request_changes']
                if self.reviewer_decision not in valid_decisions:
                    raise TransitionValidationError(
                        f'Invalid decision: {self.reviewer_decision}', {'valid_decisions': valid_decisions}
                    )

                # Quality score validation based on decision
                if self.reviewer_decision == 'approve' and self.quality_score < 0.6:
                    raise TransitionValidationError(
                        'Cannot approve annotation with low quality score',
                        {'quality_score': self.quality_score, 'decision': self.reviewer_decision},
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                # Get submission data for metrics
                submission_data = context.current_state_object.context_data if context.current_state_object else {}

                return {
                    'reviewer_decision': self.reviewer_decision,
                    'quality_score': self.quality_score,
                    'review_comments': self.review_comments,
                    'corrections_made': self.corrections_made,
                    'reviewed_at': context.timestamp.isoformat(),
                    'reviewed_by_id': context.current_user.id if context.current_user else None,
                    'original_confidence': submission_data.get('annotator_confidence'),
                    'confidence_vs_quality_diff': abs(
                        submission_data.get('annotator_confidence', 0) - self.quality_score
                    ),
                }

        # Execute annotation workflow

        # Step 1: Submit annotation
        submit_transition = SubmitAnnotationForReview(
            annotator_confidence=0.9, annotation_time_seconds=300, review_requested=True  # 5 minutes
        )

        context = TransitionContext(
            entity=self.annotation,
            current_user=self.user,
            current_state=AnnotationStateChoices.DRAFT,
            target_state=submit_transition.target_state,
        )

        self.assertTrue(submit_transition.validate_transition(context))
        submit_data = submit_transition.transition(context)

        self.assertEqual(submit_data['annotator_confidence'], 0.9)
        self.assertEqual(submit_data['annotation_time_seconds'], 300)
        self.assertTrue(submit_data['review_requested'])
        self.assertEqual(submit_data['annotation_complexity'], 1)  # Based on mock result

        # Step 2: Review and approve
        mock_submission_state = Mock()
        mock_submission_state.context_data = submit_data

        review_transition = ReviewAndApproveAnnotation(
            reviewer_decision='approve',
            quality_score=0.85,
            review_comments='High quality annotation with good coverage',
            corrections_made=False,
        )

        context = TransitionContext(
            entity=self.annotation,
            current_user=self.user,
            current_state=AnnotationStateChoices.SUBMITTED,
            current_state_object=mock_submission_state,
            target_state=review_transition.target_state,
        )

        self.assertTrue(review_transition.validate_transition(context))
        self.assertEqual(review_transition.target_state, AnnotationStateChoices.COMPLETED)

        review_data = review_transition.transition(context)

        self.assertEqual(review_data['reviewer_decision'], 'approve')
        self.assertEqual(review_data['quality_score'], 0.85)
        self.assertEqual(review_data['original_confidence'], 0.9)
        self.assertAlmostEqual(review_data['confidence_vs_quality_diff'], 0.05, places=2)

        # Test rejection scenario
        reject_transition = ReviewAndApproveAnnotation(
            reviewer_decision='reject',
            quality_score=0.3,
            review_comments='Insufficient annotation quality',
            corrections_made=False,
        )

        self.assertEqual(reject_transition.target_state, AnnotationStateChoices.DRAFT)

        # Test validation failure
        invalid_review = ReviewAndApproveAnnotation(
            reviewer_decision='approve',  # Trying to approve
            quality_score=0.5,  # But quality too low
            review_comments='Test',
        )

        with self.assertRaises(TransitionValidationError) as cm:
            invalid_review.validate_transition(context)

        self.assertIn('Cannot approve annotation with low quality score', str(cm.exception))

    @patch('fsm.transition_utils.execute_transition')
    def test_transition_builder_with_django_models(self, mock_execute):
        """
        INTEGRATION TEST: TransitionBuilder with Django model integration
        Shows how to use the fluent TransitionBuilder interface with
        real Django models and complex business logic.
        """

        @register_transition('task', 'bulk_update_status')
        class BulkUpdateTaskStatusTransition(BaseTransition):
            """Bulk update task status with metadata"""

            new_status: str = Field(..., description='New status for tasks')
            update_reason: str = Field(..., description='Reason for bulk update')
            updated_by_system: bool = Field(False, description='Whether updated by automated system')
            batch_id: str = Field(None, description='Batch operation ID')

            @property
            def target_state(self) -> str:
                return self.new_status

            def validate_transition(self, context: TransitionContext) -> bool:
                valid_statuses = [TaskStateChoices.CREATED, TaskStateChoices.IN_PROGRESS, TaskStateChoices.COMPLETED]
                if self.new_status not in valid_statuses:
                    raise TransitionValidationError(f'Invalid status: {self.new_status}')

                # Can't bulk update to the same status
                if context.current_state == self.new_status:
                    raise TransitionValidationError('Cannot update to the same status')

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'new_status': self.new_status,
                    'update_reason': self.update_reason,
                    'updated_by_system': self.updated_by_system,
                    'batch_id': self.batch_id,
                    'bulk_update_timestamp': context.timestamp.isoformat(),
                    'previous_status': context.current_state,
                }

        # Mock successful execution
        mock_state_record = Mock()
        mock_state_record.id = 'mock-uuid'
        mock_execute.return_value = mock_state_record

        # Test fluent interface
        result = (
            TransitionBuilder(self.task)
            .transition('bulk_update_status')
            .with_data(
                new_status=TaskStateChoices.IN_PROGRESS,
                update_reason='Project priority change',
                updated_by_system=True,
                batch_id='batch_2024_001',
            )
            .by_user(self.user)
            .with_context(project_update=True, notification_level='high')
            .execute()
        )

        # Verify the call
        mock_execute.assert_called_once()
        call_args, call_kwargs = mock_execute.call_args

        # Check call parameters
        self.assertEqual(call_kwargs['entity'], self.task)
        self.assertEqual(call_kwargs['transition_name'], 'bulk_update_status')
        self.assertEqual(call_kwargs['user'], self.user)

        # Check transition data
        transition_data = call_kwargs['transition_data']
        self.assertEqual(transition_data['new_status'], TaskStateChoices.IN_PROGRESS)
        self.assertEqual(transition_data['update_reason'], 'Project priority change')
        self.assertTrue(transition_data['updated_by_system'])
        self.assertEqual(transition_data['batch_id'], 'batch_2024_001')

        # Check context
        self.assertTrue(call_kwargs['project_update'])
        self.assertEqual(call_kwargs['notification_level'], 'high')

        # Check return value
        self.assertEqual(result, mock_state_record)

    def test_error_handling_with_django_models(self):
        """
        INTEGRATION TEST: Error handling with Django model validation
        Tests comprehensive error handling scenarios that might occur
        in real Django model integration.
        """

        @register_transition('task', 'assign_with_constraints')
        class AssignTaskWithConstraints(BaseTransition):
            """Task assignment with business constraints"""

            assignee_id: int = Field(..., description='User to assign to')
            max_concurrent_tasks: int = Field(5, description='Max concurrent tasks per user')
            skill_requirements: list = Field(default_factory=list, description='Required skills')

            @property
            def target_state(self) -> str:
                return TaskStateChoices.IN_PROGRESS

            def validate_transition(self, context: TransitionContext) -> bool:
                errors = []

                # Mock database checks (in real scenario, these would be actual queries)

                # 1. Check user exists and is active
                if self.assignee_id <= 0:
                    errors.append('Invalid user ID')

                # 2. Check user's current task load
                if self.max_concurrent_tasks < 1:
                    errors.append('Max concurrent tasks must be at least 1')

                # 3. Check skill requirements
                if self.skill_requirements:
                    # Mock skill validation
                    available_skills = ['python', 'labeling', 'review']
                    missing_skills = [skill for skill in self.skill_requirements if skill not in available_skills]
                    if missing_skills:
                        errors.append(f'Missing required skills: {missing_skills}')

                # 4. Check project-level constraints
                if hasattr(context.entity, 'project_id'):
                    # Mock project validation
                    if context.entity.project_id <= 0:
                        errors.append('Invalid project configuration')

                # 5. Check organization permissions
                if hasattr(context.entity, 'organization_id'):
                    if not context.current_user:
                        errors.append('User authentication required for assignment')

                if errors:
                    raise TransitionValidationError(
                        f"Assignment validation failed: {'; '.join(errors)}",
                        {
                            'validation_errors': errors,
                            'assignee_id': self.assignee_id,
                            'task_id': context.entity.pk,
                            'skill_requirements': self.skill_requirements,
                        },
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'assignee_id': self.assignee_id,
                    'max_concurrent_tasks': self.max_concurrent_tasks,
                    'skill_requirements': self.skill_requirements,
                    'assignment_validated': True,
                }

        # Test successful validation
        valid_transition = AssignTaskWithConstraints(
            assignee_id=123, max_concurrent_tasks=3, skill_requirements=['python', 'labeling']
        )

        context = TransitionContext(
            entity=self.task,
            current_user=self.user,
            current_state=TaskStateChoices.CREATED,
            target_state=valid_transition.target_state,
        )

        self.assertTrue(valid_transition.validate_transition(context))

        # Test multiple validation errors
        invalid_transition = AssignTaskWithConstraints(
            assignee_id=-1,  # Invalid user ID
            max_concurrent_tasks=0,  # Invalid max tasks
            skill_requirements=['nonexistent_skill'],  # Missing skill
        )

        with self.assertRaises(TransitionValidationError) as cm:
            invalid_transition.validate_transition(context)

        error = cm.exception
        error_msg = str(error)

        # Check all validation errors are included
        self.assertIn('Invalid user ID', error_msg)
        self.assertIn('Max concurrent tasks must be at least 1', error_msg)
        self.assertIn('Missing required skills', error_msg)

        # Check error context
        self.assertIn('validation_errors', error.context)
        self.assertEqual(len(error.context['validation_errors']), 3)
        self.assertEqual(error.context['assignee_id'], -1)

        # Test authentication requirement
        context_no_user = TransitionContext(
            entity=self.task,
            current_user=None,  # No user
            current_state=TaskStateChoices.CREATED,
            target_state=valid_transition.target_state,
        )

        with self.assertRaises(TransitionValidationError) as cm:
            valid_transition.validate_transition(context_no_user)

        self.assertIn('User authentication required', str(cm.exception))
