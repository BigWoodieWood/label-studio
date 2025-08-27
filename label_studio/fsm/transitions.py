"""
Declarative Pydantic-based transition system for FSM engine.

This module provides a framework for defining state transitions as first-class
Pydantic models with built-in validation, context passing, and middleware-like
functionality for enhanced declarative state management.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, Generic, Optional, Type, TypeVar

from django.contrib.auth import get_user_model
from django.db.models import Model
from pydantic import BaseModel, ConfigDict, Field

from .models import BaseState

User = get_user_model()

# Type variables for generic transition context
EntityType = TypeVar('EntityType', bound=Model)
StateModelType = TypeVar('StateModelType', bound=BaseState)


class TransitionContext(BaseModel, Generic[EntityType, StateModelType]):
    """
    Context object passed to all transitions containing middleware-like information.

    This provides access to current state, entity, user, and other contextual
    information needed for transition validation and execution.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    # Core context information
    entity: Any = Field(..., description='The entity being transitioned')
    current_user: Optional[Any] = Field(None, description='User triggering the transition')
    current_state_object: Optional[Any] = Field(None, description='Full current state object')
    current_state: Optional[str] = Field(None, description='Current state as string')
    target_state: str = Field(..., description='Target state for this transition')

    # Timing and metadata
    timestamp: datetime = Field(default_factory=datetime.now, description='When transition was initiated')
    transition_name: Optional[str] = Field(None, description='Name of the transition method')

    # Additional context data
    request_data: Dict[str, Any] = Field(default_factory=dict, description='Additional request/context data')
    metadata: Dict[str, Any] = Field(default_factory=dict, description='Transition-specific metadata')

    # Organizational context
    organization_id: Optional[int] = Field(None, description='Organization context for the transition')

    @property
    def has_current_state(self) -> bool:
        """Check if entity has a current state"""
        return self.current_state is not None

    @property
    def is_initial_transition(self) -> bool:
        """Check if this is the first state transition for the entity"""
        return not self.has_current_state


class TransitionValidationError(Exception):
    """Exception raised when transition validation fails"""

    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.context = context or {}


class BaseTransition(BaseModel, ABC, Generic[EntityType, StateModelType]):
    """
    Abstract base class for all declarative state transitions.

    This provides the framework for implementing transitions as first-class Pydantic
    models with built-in validation, context handling, and execution logic.

    Example usage:
        class StartTaskTransition(BaseTransition[Task, TaskState]):
            assigned_user_id: int = Field(..., description="User assigned to start the task")
            estimated_duration: Optional[int] = Field(None, description="Estimated completion time in hours")

            @property
            def target_state(self) -> str:
                return TaskStateChoices.IN_PROGRESS

            def validate_transition(self, context: TransitionContext[Task, TaskState]) -> bool:
                if context.current_state == TaskStateChoices.COMPLETED:
                    raise TransitionValidationError("Cannot start an already completed task")
                return True

            def transition(self, context: TransitionContext[Task, TaskState]) -> Dict[str, Any]:
                return {
                    "assigned_user_id": self.assigned_user_id,
                    "estimated_duration": self.estimated_duration,
                    "started_at": context.timestamp.isoformat()
                }
    """

    model_config = ConfigDict(arbitrary_types_allowed=True, validate_assignment=True, use_enum_values=True)

    def __init__(self, **data):
        super().__init__(**data)
        self.__context: Optional[TransitionContext[EntityType, StateModelType]] = None

    @property
    def context(self) -> Optional[TransitionContext[EntityType, StateModelType]]:
        """Access the current transition context"""
        return getattr(self, '_BaseTransition__context', None)

    @context.setter
    def context(self, value: TransitionContext[EntityType, StateModelType]):
        """Set the transition context"""
        self.__context = value

    @property
    @abstractmethod
    def target_state(self) -> str:
        """
        The target state this transition leads to.

        Returns:
            String representation of the target state
        """
        pass

    @property
    def transition_name(self) -> str:
        """
        Name of this transition for audit purposes.

        Defaults to the class name in snake_case.
        """
        class_name = self.__class__.__name__
        # Convert CamelCase to snake_case
        result = ''
        for i, char in enumerate(class_name):
            if char.isupper() and i > 0:
                result += '_'
            result += char.lower()
        return result

    @classmethod
    def get_target_state(cls) -> Optional[str]:
        """
        Get the target state for this transition class without creating an instance.

        Override this in subclasses where the target state is known at the class level.

        Returns:
            The target state name, or None if it depends on instance data
        """
        return None

    @classmethod
    def can_transition_from_state(cls, context: TransitionContext[EntityType, StateModelType]) -> bool:
        """
        Class-level validation for whether this transition type is allowed from the current state.

        This method checks if the transition is structurally valid (e.g., allowed state transitions)
        without needing the actual transition data. Override this to implement state-based rules.

        Args:
            context: The transition context containing entity, user, and state information

        Returns:
            True if transition type is allowed from current state, False otherwise
        """
        return True

    def validate_transition(self, context: TransitionContext[EntityType, StateModelType]) -> bool:
        """
        Validate whether this specific transition instance can be performed.

        This method validates both the transition type (via can_transition_from_state)
        and the specific transition data. Override to add data-specific validation.

        Args:
            context: The transition context containing entity, user, and state information

        Returns:
            True if transition is valid, False otherwise

        Raises:
            TransitionValidationError: If transition validation fails with specific reason
        """
        # First check if this transition type is allowed
        if not self.can_transition_from_state(context):
            return False

        # Then perform instance-specific validation
        return True

    def pre_transition_hook(self, context: TransitionContext[EntityType, StateModelType]) -> None:
        """
        Hook called before the transition is executed.

        Use this for any setup or preparation needed before state change.
        Override in subclasses as needed.

        Args:
            context: The transition context
        """
        pass

    @abstractmethod
    def transition(self, context: TransitionContext[EntityType, StateModelType]) -> Dict[str, Any]:
        """
        Execute the transition and return context data for the state record.

        This is the core method that implements the transition logic.
        Must be implemented by all concrete transition classes.

        Args:
            context: The transition context containing all necessary information

        Returns:
            Dictionary of context data to be stored with the state record

        Raises:
            TransitionValidationError: If transition cannot be completed
        """
        pass

    def post_transition_hook(
        self, context: TransitionContext[EntityType, StateModelType], state_record: StateModelType
    ) -> None:
        """
        Hook called after the transition has been successfully executed.

        Use this for any cleanup, notifications, or side effects after state change.
        Override in subclasses as needed.

        Args:
            context: The transition context
            state_record: The newly created state record
        """
        pass

    def get_reason(self, context: TransitionContext[EntityType, StateModelType]) -> str:
        """
        Get a human-readable reason for this transition.

        Override in subclasses to provide more specific reasons.

        Args:
            context: The transition context

        Returns:
            Human-readable reason string
        """
        user_info = f'by {context.current_user}' if context.current_user else 'automatically'
        return f'{self.__class__.__name__} executed {user_info}'

    def execute(self, context: TransitionContext[EntityType, StateModelType]) -> StateModelType:
        """
        Execute the complete transition workflow.

        This orchestrates the entire transition process:
        1. Set context on the transition instance
        2. Validate the transition
        3. Execute pre-transition hooks
        4. Perform the actual transition
        5. Create the state record
        6. Execute post-transition hooks

        Args:
            context: The transition context

        Returns:
            The newly created state record

        Raises:
            TransitionValidationError: If validation fails
            Exception: If transition execution fails
        """
        # Set context for access during transition
        self.context = context

        # Update context with transition name
        context.transition_name = self.transition_name

        try:
            # Validate transition
            if not self.validate_transition(context):
                raise TransitionValidationError(
                    f'Transition validation failed for {self.transition_name}',
                    {'current_state': context.current_state, 'target_state': self.target_state},
                )

            # Pre-transition hook
            self.pre_transition_hook(context)

            # Execute the transition logic
            transition_data = self.transition(context)

            # Create the state record through StateManager
            from .state_manager import StateManager

            success = StateManager.transition_state(
                entity=context.entity,
                new_state=self.target_state,
                transition_name=self.transition_name,
                user=context.current_user,
                context=transition_data,
                reason=self.get_reason(context),
            )

            if not success:
                raise TransitionValidationError(f'Failed to create state record for {self.transition_name}')

            # Get the newly created state record
            state_record = StateManager.get_current_state_object(context.entity)

            # Post-transition hook
            self.post_transition_hook(context, state_record)

            return state_record

        except Exception:
            # Clear context on error
            self.context = None
            raise


class TransitionRegistry:
    """
    Registry for managing declarative transitions.

    Provides a centralized way to register, discover, and execute transitions
    for different entity types and state models.
    """

    def __init__(self):
        self._transitions: Dict[str, Dict[str, Type[BaseTransition]]] = {}

    def register(self, entity_name: str, transition_name: str, transition_class: Type[BaseTransition]):
        """
        Register a transition class for an entity.

        Args:
            entity_name: Name of the entity type (e.g., 'task', 'annotation')
            transition_name: Name of the transition (e.g., 'start_task', 'submit_annotation')
            transition_class: The transition class to register
        """
        if entity_name not in self._transitions:
            self._transitions[entity_name] = {}

        self._transitions[entity_name][transition_name] = transition_class

    def get_transition(self, entity_name: str, transition_name: str) -> Optional[Type[BaseTransition]]:
        """
        Get a registered transition class.

        Args:
            entity_name: Name of the entity type
            transition_name: Name of the transition

        Returns:
            The transition class if found, None otherwise
        """
        return self._transitions.get(entity_name, {}).get(transition_name)

    def get_transitions_for_entity(self, entity_name: str) -> Dict[str, Type[BaseTransition]]:
        """
        Get all registered transitions for an entity type.

        Args:
            entity_name: Name of the entity type

        Returns:
            Dictionary mapping transition names to transition classes
        """
        return self._transitions.get(entity_name, {}).copy()

    def list_entities(self) -> list[str]:
        """Get a list of all registered entity types."""
        return list(self._transitions.keys())

    def clear(self):
        """
        Clear all registered transitions.

        Useful for testing to ensure clean state between tests.
        """
        self._transitions.clear()

    def execute_transition(
        self,
        entity_name: str,
        transition_name: str,
        entity: Model,
        transition_data: Dict[str, Any],
        user: Optional[User] = None,
        **context_kwargs,
    ) -> StateModelType:
        """
        Execute a registered transition.

        Args:
            entity_name: Name of the entity type
            transition_name: Name of the transition
            entity: The entity instance to transition
            transition_data: Data for the transition (will be validated by Pydantic)
            user: User executing the transition
            **context_kwargs: Additional context data

        Returns:
            The newly created state record

        Raises:
            ValueError: If transition is not found
            TransitionValidationError: If transition validation fails
        """
        transition_class = self.get_transition(entity_name, transition_name)
        if not transition_class:
            raise ValueError(f"Transition '{transition_name}' not found for entity '{entity_name}'")

        # Create transition instance with provided data
        transition = transition_class(**transition_data)

        # Get current state information
        from .state_manager import StateManager

        current_state_object = StateManager.get_current_state_object(entity)
        current_state = current_state_object.state if current_state_object else None

        # Build transition context
        context = TransitionContext(
            entity=entity,
            current_user=user,
            current_state_object=current_state_object,
            current_state=current_state,
            target_state=transition.target_state,
            organization_id=getattr(entity, 'organization_id', None),
            **context_kwargs,
        )

        # Execute the transition
        return transition.execute(context)


# Global transition registry instance
transition_registry = TransitionRegistry()


def register_transition(entity_name: str, transition_name: str = None):
    """
    Decorator to register a transition class.

    Args:
        entity_name: Name of the entity type
        transition_name: Name of the transition (defaults to class name in snake_case)

    Example:
        @register_transition('task', 'start_task')
        class StartTaskTransition(BaseTransition[Task, TaskState]):
            # ... implementation
    """

    def decorator(transition_class: Type[BaseTransition]) -> Type[BaseTransition]:
        name = transition_name
        if name is None:
            # Generate name from class name
            class_name = transition_class.__name__
            if class_name.endswith('Transition'):
                class_name = class_name[:-10]  # Remove 'Transition' suffix

            # Convert CamelCase to snake_case
            name = ''
            for i, char in enumerate(class_name):
                if char.isupper() and i > 0:
                    name += '_'
                name += char.lower()

        transition_registry.register(entity_name, name, transition_class)
        return transition_class

    return decorator
