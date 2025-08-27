"""
Core framework tests for the declarative Pydantic-based transition system.

This test suite covers the core transition framework functionality without
product-specific implementations. It tests the abstract base classes,
registration system, validation, and core utilities.
"""

from datetime import datetime
from typing import Any, Dict
from unittest.mock import Mock

from django.contrib.auth import get_user_model
from django.db import models
from django.test import TestCase
from django.utils.translation import gettext_lazy as _
from fsm.registry import register_transition, transition_registry
from fsm.transition_utils import (
    TransitionBuilder,
    get_available_transitions,
)
from fsm.transitions import (
    BaseTransition,
    TransitionContext,
    TransitionValidationError,
)
from pydantic import Field, ValidationError

User = get_user_model()


class TestStateChoices(models.TextChoices):
    """Test state choices for mock entity"""

    CREATED = 'CREATED', _('Created')
    IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
    COMPLETED = 'COMPLETED', _('Completed')


class MockEntity:
    """Mock entity model for testing"""

    def __init__(self, pk=1):
        self.pk = pk
        self.id = pk
        self.organization_id = 1
        self._meta = Mock()
        self._meta.model_name = 'test_entity'
        self._meta.label_lower = 'test.testentity'


class CoreFrameworkTests(TestCase):
    """Test core framework functionality"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(email='test@example.com', password='test123')
        self.mock_entity = MockEntity()

        # Clear registry to avoid test pollution
        transition_registry.clear()

    def tearDown(self):
        """Clean up after tests"""
        transition_registry.clear()

    def test_base_transition_class(self):
        """Test BaseTransition abstract functionality"""

        @register_transition('test_entity', 'test_transition')
        class TestTransition(BaseTransition):
            test_field: str = Field('default', description='Test field')

            @property
            def target_state(self) -> str:
                return TestStateChoices.IN_PROGRESS

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'test_field': self.test_field}

        # Test instantiation
        transition = TestTransition(test_field='test_value')
        self.assertEqual(transition.test_field, 'test_value')
        self.assertEqual(transition.target_state, TestStateChoices.IN_PROGRESS)
        self.assertEqual(transition.transition_name, 'test_transition')

    def test_transition_context(self):
        """Test TransitionContext functionality"""
        context = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.CREATED,
            target_state=TestStateChoices.IN_PROGRESS,
            timestamp=datetime.now(),
            current_user=self.user,
        )

        self.assertEqual(context.entity, self.mock_entity)
        self.assertEqual(context.current_state, TestStateChoices.CREATED)
        self.assertEqual(context.target_state, TestStateChoices.IN_PROGRESS)
        self.assertEqual(context.current_user, self.user)
        self.assertTrue(context.has_current_state)
        self.assertFalse(context.is_initial_transition)

    def test_transition_context_properties(self):
        """Test TransitionContext computed properties"""
        # Test initial transition
        context = TransitionContext(entity=self.mock_entity, current_state=None, target_state=TestStateChoices.CREATED)
        self.assertTrue(context.is_initial_transition)
        self.assertFalse(context.has_current_state)

        # Test with current state
        context_with_state = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.CREATED,
            target_state=TestStateChoices.IN_PROGRESS,
        )
        self.assertFalse(context_with_state.is_initial_transition)
        self.assertTrue(context_with_state.has_current_state)

    def test_transition_registry(self):
        """Test transition registration and retrieval"""

        @register_transition('test_entity', 'test_transition')
        class TestTransition(BaseTransition):
            @property
            def target_state(self) -> str:
                return TestStateChoices.COMPLETED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        # Test registration
        retrieved = transition_registry.get_transition('test_entity', 'test_transition')
        self.assertEqual(retrieved, TestTransition)

        # Test entity transitions
        entity_transitions = transition_registry.get_transitions_for_entity('test_entity')
        self.assertIn('test_transition', entity_transitions)
        self.assertEqual(entity_transitions['test_transition'], TestTransition)

    def test_pydantic_validation(self):
        """Test Pydantic validation in transitions"""

        @register_transition('test_entity', 'validated_transition')
        class ValidatedTransition(BaseTransition):
            required_field: str = Field(..., description='Required field')
            optional_field: int = Field(42, description='Optional field')

            @property
            def target_state(self) -> str:
                return TestStateChoices.COMPLETED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'required_field': self.required_field, 'optional_field': self.optional_field}

        # Test valid instantiation
        transition = ValidatedTransition(required_field='test')
        self.assertEqual(transition.required_field, 'test')
        self.assertEqual(transition.optional_field, 42)

        # Test validation error
        with self.assertRaises(ValidationError):
            ValidatedTransition()  # Missing required field

    def test_transition_execution(self):
        """Test transition execution logic"""

        @register_transition('test_entity', 'execution_test')
        class ExecutionTestTransition(BaseTransition):
            value: str = Field('test', description='Test value')

            @property
            def target_state(self) -> str:
                return TestStateChoices.COMPLETED

            def validate_transition(self, context: TransitionContext) -> bool:
                return context.current_state == TestStateChoices.IN_PROGRESS

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'value': self.value,
                    'entity_id': context.entity.pk,
                    'timestamp': context.timestamp.isoformat(),
                }

        transition = ExecutionTestTransition(value='execution_test')
        context = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.IN_PROGRESS,
            target_state=transition.target_state,
            timestamp=datetime.now(),
        )

        # Test validation
        self.assertTrue(transition.validate_transition(context))

        # Test execution
        result = transition.transition(context)
        self.assertEqual(result['value'], 'execution_test')
        self.assertEqual(result['entity_id'], self.mock_entity.pk)
        self.assertIn('timestamp', result)

    def test_validation_error_handling(self):
        """Test transition validation error handling"""

        @register_transition('test_entity', 'validation_test')
        class ValidationTestTransition(BaseTransition):
            @property
            def target_state(self) -> str:
                return TestStateChoices.COMPLETED

            def validate_transition(self, context: TransitionContext) -> bool:
                if context.current_state != TestStateChoices.IN_PROGRESS:
                    raise TransitionValidationError(
                        'Can only complete from IN_PROGRESS state', {'current_state': context.current_state}
                    )
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        transition = ValidationTestTransition()
        invalid_context = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.CREATED,
            target_state=transition.target_state,
        )

        # Test validation error
        with self.assertRaises(TransitionValidationError) as cm:
            transition.validate_transition(invalid_context)

        error = cm.exception
        self.assertIn('Can only complete from IN_PROGRESS state', str(error))
        self.assertIn('current_state', error.context)

    def test_transition_builder_basic(self):
        """Test TransitionBuilder basic functionality"""

        @register_transition('test_entity', 'builder_test')
        class BuilderTestTransition(BaseTransition):
            value: str = Field('default', description='Test value')

            @property
            def target_state(self) -> str:
                return TestStateChoices.COMPLETED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'value': self.value}

        # Test builder creation
        builder = TransitionBuilder(self.mock_entity)
        self.assertEqual(builder.entity, self.mock_entity)

        # Test method chaining
        builder = builder.transition('builder_test').with_data(value='builder_test_value').by_user(self.user)

        # Validate the builder state
        validation_errors = builder.validate()
        self.assertEqual(len(validation_errors), 0)

    def test_get_available_transitions(self):
        """Test get_available_transitions utility"""

        @register_transition('test_entity', 'available_test')
        class AvailableTestTransition(BaseTransition):
            @property
            def target_state(self) -> str:
                return TestStateChoices.COMPLETED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        available = get_available_transitions(self.mock_entity)
        self.assertIn('available_test', available)
        self.assertEqual(available['available_test'], AvailableTestTransition)

    def test_transition_hooks(self):
        """Test pre and post transition hooks"""

        hook_calls = []

        @register_transition('test_entity', 'hook_test')
        class HookTestTransition(BaseTransition):
            @property
            def target_state(self) -> str:
                return TestStateChoices.COMPLETED

            def pre_transition_hook(self, context: TransitionContext) -> None:
                hook_calls.append('pre')

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                hook_calls.append('transition')
                return {}

            def post_transition_hook(self, context: TransitionContext, state_record) -> None:
                hook_calls.append('post')

        transition = HookTestTransition()
        context = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.IN_PROGRESS,
            target_state=transition.target_state,
        )

        # Test hook execution order
        transition.pre_transition_hook(context)
        transition.transition(context)
        transition.post_transition_hook(context, Mock())

        self.assertEqual(hook_calls, ['pre', 'transition', 'post'])


class TransitionUtilsTests(TestCase):
    """Test transition utility functions"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(email='test@example.com', password='test123')
        self.mock_entity = MockEntity()
        transition_registry.clear()

    def tearDown(self):
        """Clean up after tests"""
        transition_registry.clear()

    def test_get_available_transitions(self):
        """Test getting available transitions for an entity"""

        @register_transition('test_entity', 'util_test_1')
        class UtilTestTransition1(BaseTransition):
            @property
            def target_state(self) -> str:
                return TestStateChoices.IN_PROGRESS

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        @register_transition('test_entity', 'util_test_2')
        class UtilTestTransition2(BaseTransition):
            @property
            def target_state(self) -> str:
                return TestStateChoices.COMPLETED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        available = get_available_transitions(self.mock_entity)
        self.assertEqual(len(available), 2)
        self.assertIn('util_test_1', available)
        self.assertIn('util_test_2', available)

        # Test with non-existent entity
        mock_other = MockEntity()
        mock_other._meta.model_name = 'other_entity'
        other_available = get_available_transitions(mock_other)
        self.assertEqual(len(other_available), 0)
