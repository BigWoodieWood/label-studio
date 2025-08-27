"""
Integration helpers for connecting FSM with existing Label Studio models.

This module provides helper methods and mixins that can be added to existing
Label Studio models to integrate them with the FSM system.
"""

import logging
from typing import Optional

from django.db import models

from .state_manager import get_state_manager

logger = logging.getLogger(__name__)


class FSMIntegrationMixin:
    """
    Mixin to add FSM functionality to existing Label Studio models.

    This mixin can be added to Task, Annotation, and Project models to provide
    convenient methods for state management without modifying the core models.
    """

    @property
    def current_fsm_state(self) -> Optional[str]:
        """Get current FSM state for this entity"""
        StateManager = get_state_manager()
        return StateManager.get_current_state(self)

    def transition_fsm_state(
        self, new_state: str, user=None, transition_name: str = None, reason: str = '', context: dict = None
    ) -> bool:
        """
        Transition this entity to a new FSM state.

        Args:
            new_state: Target state
            user: User triggering the transition
            transition_name: Name of transition method
            reason: Human-readable reason
            context: Additional context data

        Returns:
            True if transition succeeded
        """
        StateManager = get_state_manager()
        return StateManager.transition_state(
            entity=self,
            new_state=new_state,
            user=user,
            transition_name=transition_name,
            reason=reason,
            context=context or {},
        )

    def get_fsm_state_history(self, limit: int = 100):
        """Get FSM state history for this entity"""
        StateManager = get_state_manager()
        return StateManager.get_state_history(self, limit)

    def is_in_fsm_state(self, state: str) -> bool:
        """Check if entity is currently in the specified state"""
        return self.current_fsm_state == state

    def has_fsm_state_history(self) -> bool:
        """Check if entity has any FSM state records"""
        return self.current_fsm_state is not None


def add_fsm_to_model(model_class):
    """
    Class decorator to add FSM functionality to existing models.

    This provides an alternative to inheritance for adding FSM capabilities.

    Example:
        from fsm.integration import add_fsm_to_model
        from tasks.models import Task

        @add_fsm_to_model
        class Task(Task):
            class Meta:
                proxy = True
    """

    def current_fsm_state_property(self):
        """Get current FSM state for this entity"""
        StateManager = get_state_manager()
        return StateManager.get_current_state(self)

    def transition_fsm_state_method(
        self, new_state: str, user=None, transition_name: str = None, reason: str = '', context: dict = None
    ):
        """Transition this entity to a new FSM state"""
        StateManager = get_state_manager()
        return StateManager.transition_state(
            entity=self,
            new_state=new_state,
            user=user,
            transition_name=transition_name,
            reason=reason,
            context=context or {},
        )

    def get_fsm_state_history_method(self, limit: int = 100):
        """Get FSM state history for this entity"""
        StateManager = get_state_manager()
        return StateManager.get_state_history(self, limit)

    # Add methods as properties/methods to the class
    model_class.current_fsm_state = property(current_fsm_state_property)
    model_class.transition_fsm_state = transition_fsm_state_method
    model_class.get_fsm_state_history = get_fsm_state_history_method

    return model_class


# Utility functions for model extensions


def get_entities_by_state(model_class, state: str, limit: int = 100):
    """
    Get entities that are currently in a specific state.

    Args:
        model_class: Django model class (e.g., Task, Annotation, Project)
        state: State to filter by
        limit: Maximum number of entities to return

    Returns:
        QuerySet of entities in the specified state

    Example:
        from tasks.models import Task
        from fsm.integration import get_entities_by_state

        completed_tasks = get_entities_by_state(Task, 'COMPLETED', limit=50)
    """
    from .models import get_state_model_for_entity

    # Create a dummy instance to get the state model
    dummy_instance = model_class()
    state_model = get_state_model_for_entity(dummy_instance)

    if not state_model:
        return model_class.objects.none()

    # Get entity IDs that have the specified current state
    f'{model_class._meta.model_name.lower()}_id'

    current_state_subquery = (
        state_model.objects.filter(**{f'{model_class._meta.model_name.lower()}__pk': models.OuterRef('pk')})
        .order_by('-id')
        .values('state')[:1]
    )

    return model_class.objects.annotate(current_state=models.Subquery(current_state_subquery)).filter(
        current_state=state
    )[:limit]


def bulk_transition_entities(entities, new_state: str, user=None, **kwargs):
    """
    Bulk transition multiple entities to the same state.

    Args:
        entities: List of entity instances
        new_state: Target state for all entities
        user: User triggering the transitions
        **kwargs: Additional arguments for transition_state

    Returns:
        List of (entity, success) tuples
    """
    StateManager = get_state_manager()
    results = []

    for entity in entities:
        try:
            success = StateManager.transition_state(entity=entity, new_state=new_state, user=user, **kwargs)
            results.append((entity, success))
        except Exception as e:
            logger.error(f'Failed to transition {entity._meta.model_name} {entity.pk}: {e}')
            results.append((entity, False))

    return results
