"""
Core FSM models for Label Studio.
"""

from datetime import datetime
from typing import Optional

from django.conf import settings
from django.db import models
from django.db.models import UUIDField

from .state_choices import (
    AnnotationStateChoices,
    ProjectStateChoices,
    TaskStateChoices,
)
from .utils import UUID7Field, generate_uuid7, timestamp_from_uuid7


class BaseState(models.Model):
    """
    Abstract base class for all state models using UUID7 for optimal time-series performance.

    This is the core of the FSM system, providing:
    - UUID7 primary key with natural time ordering
    - Standard state transition metadata
    - Audit trail information
    - Context data storage
    - Performance-optimized helper methods

    Benefits of this architecture:
    - INSERT-only operations for maximum concurrency
    - Natural time ordering eliminates need for created_at indexes
    - Global uniqueness enables distributed system support
    - Time-based partitioning for billion-record scalability
    - Complete audit trail by design
    """

    # UUID7 Primary Key - provides natural time ordering and global uniqueness
    id = UUIDField(
        primary_key=True,
        default=generate_uuid7,
        editable=False,
        help_text='UUID7 provides natural time ordering and global uniqueness',
    )

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        null=True,
        help_text='Organization which owns this state record',
    )

    # Core State Fields
    state = models.CharField(max_length=50, db_index=True, help_text='Current state of the entity')
    previous_state = models.CharField(
        max_length=50, null=True, blank=True, help_text='Previous state before this transition'
    )

    # Transition Metadata
    transition_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Name of the transition method that triggered this state change',
    )
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        help_text='User who triggered this state transition',
    )

    # Context & Audit
    context_data = models.JSONField(
        default=dict, help_text='Additional context data for this transition (e.g., validation results, external IDs)'
    )
    reason = models.TextField(blank=True, help_text='Human-readable reason for this state transition')

    # Timestamp (redundant with UUID7 but useful for human readability)
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=False,  # UUID7 provides natural ordering, no index needed
        help_text='Human-readable timestamp for debugging (UUID7 id contains precise timestamp)',
    )

    class Meta:
        abstract = True
        # UUID7 provides natural ordering, reducing index requirements
        ordering = ['-id']  # Most recent first
        get_latest_by = 'id'

    def __str__(self):
        entity_id = getattr(self, f'{self._get_entity_name()}_id', 'unknown')
        return f'{self._get_entity_name().title()} {entity_id}: {self.previous_state} → {self.state}'

    @property
    def entity(self):
        """Get the related entity object"""
        entity_name = self._get_entity_name()
        return getattr(self, entity_name)

    @property
    def timestamp_from_uuid(self) -> datetime:
        """Extract timestamp from UUID7 ID"""
        return timestamp_from_uuid7(self.id)

    @property
    def is_terminal_state(self) -> bool:
        """
        Check if this is a terminal state (no outgoing transitions).

        Override in subclasses with specific terminal states.
        """
        return False

    def _get_entity_name(self) -> str:
        """Extract entity name from model name (e.g., TaskState → task)"""
        model_name = self.__class__.__name__
        if model_name.endswith('State'):
            return model_name[:-5].lower()
        return 'entity'

    @classmethod
    def get_current_state(cls, entity) -> Optional['BaseState']:
        """
        Get current state using UUID7 natural ordering.

        Uses UUID7's natural time ordering to efficiently find the latest state
        without requiring created_at indexes or complex queries.
        """
        entity_field = f'{cls._get_entity_field_name()}'
        return cls.objects.filter(**{entity_field: entity}).order_by('-id').first()

    @classmethod
    def get_current_state_value(cls, entity) -> Optional[str]:
        """Get current state value as string"""
        current_state = cls.get_current_state(entity)
        return current_state.state if current_state else None

    @classmethod
    def get_state_history(cls, entity, limit: int = 100):
        """Get complete state history for an entity"""
        entity_field = f'{cls._get_entity_field_name()}'
        return cls.objects.filter(**{entity_field: entity}).order_by('-id')[:limit]

    @classmethod
    def get_states_in_range(cls, entity, start_time: datetime, end_time: datetime):
        """
        Efficient time-range queries using UUID7.

        Uses UUID7's embedded timestamp for direct time-based filtering
        without requiring timestamp indexes.
        """
        entity_field = f'{cls._get_entity_field_name()}'
        queryset = cls.objects.filter(**{entity_field: entity})
        return UUID7Field.filter_by_time_range(queryset, start_time, end_time).order_by('id')

    @classmethod
    def get_states_since(cls, entity, since: datetime):
        """Get all states since a specific timestamp"""
        entity_field = f'{cls._get_entity_field_name()}'
        queryset = cls.objects.filter(**{entity_field: entity})
        return UUID7Field.filter_since_time(queryset, since).order_by('id')

    @classmethod
    def _get_entity_field_name(cls) -> str:
        """Get the foreign key field name for the entity"""
        model_name = cls.__name__
        if model_name.endswith('State'):
            return model_name[:-5].lower()
        return 'entity'


# Core state models for basic Label Studio entities


class TaskState(BaseState):
    """
    Core task state tracking for Label Studio.

    Provides basic task state management with:
    - Simple 3-state workflow (CREATED → IN_PROGRESS → COMPLETED)
    - High-performance queries with UUID7 ordering
    """

    # Entity Relationship
    task = models.ForeignKey('tasks.Task', related_name='fsm_states', on_delete=models.CASCADE, db_index=True)

    # Override state field to add choices constraint
    state = models.CharField(max_length=50, choices=TaskStateChoices.choices, db_index=True)

    project_id = models.PositiveIntegerField(
        db_index=True, help_text='From task.project_id - denormalized for performance'
    )

    class Meta:
        indexes = [
            # Critical: Latest state lookup (current state determined by latest UUID7 id)
            # Index with DESC order explicitly supports ORDER BY id DESC queries
            models.Index(fields=['task_id', '-id'], name='task_current_state_idx'),
            # Reporting and filtering
            models.Index(fields=['project_id', 'state', '-id'], name='task_project_state_idx'),
            models.Index(fields=['organization_id', 'state', '-id'], name='task_org_reporting_idx'),
            # History queries
            models.Index(fields=['task_id', 'id'], name='task_history_idx'),
        ]
        # No constraints needed - INSERT-only approach
        ordering = ['-id']

    @property
    def is_terminal_state(self) -> bool:
        """Check if this is a terminal task state"""
        return self.state == TaskStateChoices.COMPLETED


class AnnotationState(BaseState):
    """
    Core annotation state tracking for Label Studio.

    Provides basic annotation state management with:
    - Simple 3-state workflow (DRAFT → SUBMITTED → COMPLETED)
    """

    # Entity Relationship
    annotation = models.ForeignKey('tasks.Annotation', on_delete=models.CASCADE, related_name='fsm_states')

    # Override state field to add choices constraint
    state = models.CharField(max_length=50, choices=AnnotationStateChoices.choices, db_index=True)

    # Denormalized fields for performance (avoid JOINs in common queries)
    task_id = models.PositiveIntegerField(
        db_index=True, help_text='From annotation.task_id - denormalized for performance'
    )
    project_id = models.PositiveIntegerField(
        db_index=True, help_text='From annotation.task.project_id - denormalized for performance'
    )
    completed_by_id = models.PositiveIntegerField(
        null=True, db_index=True, help_text='From annotation.completed_by_id - denormalized for performance'
    )

    class Meta:
        indexes = [
            # Critical: Latest state lookup
            models.Index(fields=['annotation_id', '-id'], name='anno_current_state_idx'),
            # Filtering and reporting
            models.Index(fields=['task_id', 'state', '-id'], name='anno_task_state_idx'),
            models.Index(fields=['completed_by_id', 'state', '-id'], name='anno_user_report_idx'),
            models.Index(fields=['project_id', 'state', '-id'], name='anno_project_report_idx'),
        ]
        ordering = ['-id']

    @property
    def is_terminal_state(self) -> bool:
        """Check if this is a terminal annotation state"""
        return self.state == AnnotationStateChoices.COMPLETED


class ProjectState(BaseState):
    """
    Core project state tracking for Label Studio.

    Provides basic project state management with:
    - Simple 3-state workflow (CREATED → IN_PROGRESS → COMPLETED)
    - Project lifecycle tracking
    """

    # Entity Relationship
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='states')

    # Override state field to add choices constraint
    state = models.CharField(max_length=50, choices=ProjectStateChoices.choices, db_index=True)

    created_by_id = models.PositiveIntegerField(
        null=True, db_index=True, help_text='From project.created_by_id - denormalized for performance'
    )

    class Meta:
        indexes = [
            # Critical: Latest state lookup
            models.Index(fields=['project_id', '-id'], name='project_current_state_idx'),
            # Filtering and reporting
            models.Index(fields=['organization_id', 'state', '-id'], name='project_org_state_idx'),
            models.Index(fields=['organization_id', '-id'], name='project_org_reporting_idx'),
        ]
        ordering = ['-id']

    @property
    def is_terminal_state(self) -> bool:
        """Check if this is a terminal project state"""
        return self.state == ProjectStateChoices.COMPLETED


# Registry for dynamic state model extension
STATE_MODEL_REGISTRY = {
    'task': TaskState,
    'annotation': AnnotationState,
    'project': ProjectState,
}


def register_state_model(entity_name: str, model_class):
    """
    Register state model for an entity type.

    Args:
        entity_name: Name of the entity (e.g., 'review', 'assignment')
        model_class: Django model class inheriting from BaseState
    """
    STATE_MODEL_REGISTRY[entity_name.lower()] = model_class


def get_state_model(entity_name: str):
    """
    Get state model for an entity type.

    Args:
        entity_name: Name of the entity

    Returns:
        Django model class inheriting from BaseState, or None if not found
    """
    return STATE_MODEL_REGISTRY.get(entity_name.lower())


def get_state_model_for_entity(entity):
    """
    Get state model for a specific entity instance.

    Args:
        entity: Django model instance

    Returns:
        Django model class inheriting from BaseState, or None if not found
    """
    entity_name = entity._meta.model_name.lower()
    return get_state_model(entity_name)
