"""
Core state choice enums for Label Studio entities.

These enums define the essential states for core Label Studio entities.
Label Studio Enterprise can extend these with additional states or
define entirely new state enums for enterprise-specific entities.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _


class TaskStateChoices(models.TextChoices):
    """
    Core task states for basic Label Studio workflow.

    Simplified states covering the essential task lifecycle:
    - Creation and assignment
    - Annotation work
    - Completion

    Enterprise can extend with review, arbitration, and advanced workflow states.
    """

    # Initial State
    CREATED = 'CREATED', _('Created')

    # Work States
    IN_PROGRESS = 'IN_PROGRESS', _('In Progress')

    # Terminal State
    COMPLETED = 'COMPLETED', _('Completed')


class AnnotationStateChoices(models.TextChoices):
    """
    Core annotation states for basic Label Studio workflow.

    Simplified states covering the essential annotation lifecycle:
    - Draft work
    - Submission
    - Completion

    Enterprise can extend with review, approval, and rejection states.
    """

    # Working States
    DRAFT = 'DRAFT', _('Draft')
    SUBMITTED = 'SUBMITTED', _('Submitted')

    # Terminal State
    COMPLETED = 'COMPLETED', _('Completed')


class ProjectStateChoices(models.TextChoices):
    """
    Core project states for basic Label Studio workflow.

    Simplified states covering the essential project lifecycle:
    - Setup and configuration
    - Active work
    - Completion

    Enterprise can extend with advanced workflow, review, and approval states.
    """

    # Setup States
    CREATED = 'CREATED', _('Created')
    PUBLISHED = 'PUBLISHED', _('Published')

    # Work States
    IN_PROGRESS = 'IN_PROGRESS', _('In Progress')

    # Terminal State
    COMPLETED = 'COMPLETED', _('Completed')


# Registry for dynamic state choices extension
# Enterprise can register additional choices here
STATE_CHOICES_REGISTRY = {
    'task': TaskStateChoices,
    'annotation': AnnotationStateChoices,
    'project': ProjectStateChoices,
}


def register_state_choices(entity_name: str, choices_class):
    """
    Register state choices for an entity type.

    This allows Label Studio Enterprise and other extensions to register
    their own state choices dynamically.

    Args:
        entity_name: Name of the entity (e.g., 'review', 'assignment')
        choices_class: Django TextChoices class defining valid states

    Example:
        # In LSE code:
        register_state_choices('review', ReviewStateChoices)
        register_state_choices('assignment', AssignmentStateChoices)
    """
    STATE_CHOICES_REGISTRY[entity_name.lower()] = choices_class


def get_state_choices(entity_name: str):
    """
    Get state choices for an entity type.

    Args:
        entity_name: Name of the entity

    Returns:
        Django TextChoices class or None if not found
    """
    return STATE_CHOICES_REGISTRY.get(entity_name.lower())


# State complexity metrics for core entities
CORE_STATE_COMPLEXITY_METRICS = {
    'TaskStateChoices': {
        'total_states': len(TaskStateChoices.choices),
        'complexity_score': 1.0,  # Simple linear flow
        'terminal_states': ['COMPLETED'],
        'entry_states': ['CREATED'],
    },
    'AnnotationStateChoices': {
        'total_states': len(AnnotationStateChoices.choices),
        'complexity_score': 1.0,  # Simple linear flow
        'terminal_states': ['COMPLETED'],
        'entry_states': ['DRAFT'],
    },
    'ProjectStateChoices': {
        'total_states': len(ProjectStateChoices.choices),
        'complexity_score': 1.0,  # Simple linear flow
        'terminal_states': ['COMPLETED'],
        'entry_states': ['CREATED'],
    },
}
