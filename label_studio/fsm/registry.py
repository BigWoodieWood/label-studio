"""
FSM Model Registry for Model State Management.

This module provides a registry system for state models and state choices,
allowing the FSM to be decoupled from concrete implementations.
"""

import logging
import typing
from typing import Any, Callable, Dict, Optional, Type

from django.db.models import Model, TextChoices

if typing.TYPE_CHECKING:
    from fsm.models import BaseState
    from fsm.transitions import BaseTransition, StateModelType, TransitionContext, User
else:
    from fsm.transitions import BaseTransition, TransitionContext, User

    # Import StateModelType at runtime to avoid circular import
    StateModelType = None

logger = logging.getLogger(__name__)


class StateChoicesRegistry:
    """
    Registry for managing state choices for different entity types.

    Provides a centralized way to register, discover, and manage state choices
    for different entity types in the FSM system.
    """

    def __init__(self):
        self._choices: Dict[str, Type[TextChoices]] = {}

    def register(self, entity_name: str, choices_class: Type[TextChoices]):
        """
        Register state choices for an entity type.

        Args:
            entity_name: Name of the entity (e.g., 'task', 'annotation')
            choices_class: Django TextChoices class defining valid states
        """
        self._choices[entity_name.lower()] = choices_class

    def get_choices(self, entity_name: str) -> Optional[Type[TextChoices]]:
        """
        Get state choices for an entity type.

        Args:
            entity_name: Name of the entity

        Returns:
            Django TextChoices class or None if not found
        """
        return self._choices.get(entity_name.lower())

    def list_entities(self) -> list[str]:
        """Get a list of all registered entity types."""
        return list(self._choices.keys())

    def clear(self):
        """
        Clear all registered choices.

        Useful for testing to ensure clean state between tests.
        """
        self._choices.clear()


# Global state choices registry instance
state_choices_registry = StateChoicesRegistry()


def get_state_choices(entity_name: str):
    """
    Get state choices for an entity type.

    Args:
        entity_name: Name of the entity

    Returns:
        Django TextChoices class or None if not found
    """
    return state_choices_registry.get_choices(entity_name)


def register_state_choices(entity_name: str):
    """
    Decorator to register state choices for an entity type.

    Args:
        entity_name: Name of the entity type

    Example:
        @register_state_choices('task')
        class TaskStateChoices(models.TextChoices):
            CREATED = 'CREATED', _('Created')
            IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
            COMPLETED = 'COMPLETED', _('Completed')
    """

    def decorator(choices_class: Type[TextChoices]) -> Type[TextChoices]:
        state_choices_registry.register(entity_name, choices_class)
        return choices_class

    return decorator


class StateModelRegistry:
    """
    Registry for state models and their configurations.

    This allows projects to register their state models dynamically
    without hardcoding them in the FSM framework.
    """

    def __init__(self):
        self._models: Dict[str, Type['BaseState']] = {}
        self._denormalizers: Dict[str, Callable[[Model], Dict[str, Any]]] = {}
        self._initialized = False

    def register_model(
        self,
        entity_name: str,
        state_model: Type['BaseState'],
        denormalizer: Optional[Callable[[Model], Dict[str, Any]]] = None,
    ):
        """
        Register a state model for an entity type.

        Args:
            entity_name: Name of the entity (e.g., 'task', 'annotation')
            state_model: The state model class for this entity
            denormalizer: Optional function to extract denormalized fields
        """
        entity_key = entity_name.lower()

        if entity_key in self._models:
            logger.warning(
                f'Overwriting existing state model for {entity_key}. '
                f'Previous: {self._models[entity_key]}, New: {state_model}'
            )

        self._models[entity_key] = state_model

        if denormalizer:
            self._denormalizers[entity_key] = denormalizer

        logger.debug(f'Registered state model for {entity_key}: {state_model.__name__}')

    def get_model(self, entity_name: str) -> Optional[Type['BaseState']]:
        """
        Get the state model for an entity type.

        Args:
            entity_name: Name of the entity

        Returns:
            State model class or None if not registered
        """
        return self._models.get(entity_name.lower())

    def get_denormalizer(self, entity_name: str) -> Optional[Callable]:
        """
        Get the denormalization function for an entity type.

        Args:
            entity_name: Name of the entity

        Returns:
            Denormalizer function or None if not registered
        """
        return self._denormalizers.get(entity_name.lower())

    def get_denormalized_fields(self, entity: Model) -> Dict[str, Any]:
        """
        Get denormalized fields for an entity.

        Args:
            entity: The entity instance

        Returns:
            Dictionary of denormalized fields
        """
        entity_name = entity._meta.model_name.lower()
        denormalizer = self._denormalizers.get(entity_name)

        if denormalizer:
            try:
                return denormalizer(entity)
            except Exception as e:
                logger.error(f'Error getting denormalized fields for {entity_name}: {e}')

        return {}

    def is_registered(self, entity_name: str) -> bool:
        """Check if a model is registered for an entity type."""
        return entity_name.lower() in self._models

    def clear(self):
        """Clear all registered models (useful for testing)."""
        self._models.clear()
        self._denormalizers.clear()
        self._initialized = False
        logger.debug('Cleared state model registry')

    def get_all_models(self) -> Dict[str, Type['BaseState']]:
        """Get all registered models."""
        return self._models.copy()

    def mark_initialized(self):
        """Mark the registry as initialized."""
        self._initialized = True
        logger.info(f'State model registry initialized with {len(self._models)} models')

    def is_initialized(self) -> bool:
        """Check if the registry has been initialized."""
        return self._initialized


# Global registry instance
state_model_registry = StateModelRegistry()


def register_state_model(entity_name: str, denormalizer: Optional[Callable[[Model], Dict[str, Any]]] = None):
    """
    Decorator to register a state model.

    Args:
        entity_name: Name of the entity (e.g., 'task', 'annotation')
        denormalizer: Optional function to extract denormalized fields

    Example:
        @register_state_model('task')
        class TaskState(BaseState):
            # ... implementation
    """

    def decorator(state_model: Type['BaseState']) -> Type['BaseState']:
        state_model_registry.register_model(entity_name, state_model, denormalizer)
        return state_model

    return decorator


def register_state_model_class(
    entity_name: str, state_model: Type['BaseState'], denormalizer: Optional[Callable[[Model], Dict[str, Any]]] = None
):
    """
    Convenience function to register a state model programmatically.

    Args:
        entity_name: Name of the entity (e.g., 'task', 'annotation')
        state_model: The state model class for this entity
        denormalizer: Optional function to extract denormalized fields
    """
    state_model_registry.register_model(entity_name, state_model, denormalizer)


def get_state_model(entity_name: str) -> Optional[Type['BaseState']]:
    """
    Convenience function to get a state model.

    Args:
        entity_name: Name of the entity

    Returns:
        State model class or None if not registered
    """
    return state_model_registry.get_model(entity_name)


def get_state_model_for_entity(entity: Model) -> Optional[Type['BaseState']]:
    """Get the state model for an entity."""
    entity_name = entity._meta.model_name.lower()
    return get_state_model(entity_name)


class TransitionRegistry:
    """
    Registry for managing declarative transitions.

    Provides a centralized way to register, discover, and execute transitions
    for different entity types and state models.
    """

    def __init__(self):
        self._transitions: Dict[str, Dict[str, Type['BaseTransition']]] = {}

    def register(self, entity_name: str, transition_name: str, transition_class: Type['BaseTransition']):
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

    def get_transition(self, entity_name: str, transition_name: str) -> Optional[Type['BaseTransition']]:
        """
        Get a registered transition class.

        Args:
            entity_name: Name of the entity type
            transition_name: Name of the transition

        Returns:
            The transition class if found, None otherwise
        """
        return self._transitions.get(entity_name, {}).get(transition_name)

    def get_transitions_for_entity(self, entity_name: str) -> Dict[str, Type['BaseTransition']]:
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
        user: Optional['User'] = None,
        **context_kwargs,
    ) -> 'BaseState':
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
        from fsm.state_manager import StateManager

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


def register_state_transition(entity_name: str, transition_name: str = None):
    """
    Decorator to register a state transition class.

    Args:
        entity_name: Name of the entity type
        transition_name: Name of the transition (defaults to class name in snake_case)

    Example:
        @register_state_transition('task', 'start_task')
        class StartTaskTransition(BaseTransition[Task, TaskState]):
            # ... implementation
    """

    def decorator(transition_class: Type['BaseTransition']) -> Type['BaseTransition']:
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
