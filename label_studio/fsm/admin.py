"""
Core FSM admin interface for Label Studio.

Provides basic admin interface for state management that can be extended
by Label Studio Enterprise with additional functionality.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import AnnotationState, ProjectState, TaskState


class BaseStateAdmin(admin.ModelAdmin):
    """
    Base admin for state models.

    Provides common admin interface functionality for all state models.
    Enterprise can extend this with additional features.
    """

    list_display = [
        'entity_display',
        'state',
        'previous_state',
        'transition_name',
        'triggered_by',
        'created_at',
    ]
    list_filter = [
        'state',
        'created_at',
        'transition_name',
    ]
    search_fields = [
        'state',
        'previous_state',
        'transition_name',
        'reason',
    ]
    readonly_fields = [
        'id',
        'created_at',
        'timestamp_from_uuid',
        'entity_display',
    ]
    ordering = ['-created_at']

    # Limit displayed records for performance
    list_per_page = 50
    list_max_show_all = 200

    def entity_display(self, obj):
        """Display the related entity information"""
        try:
            entity = obj.entity
            return format_html(
                '<a href="{}">{} #{}</a>',
                f'/admin/{entity._meta.app_label}/{entity._meta.model_name}/{entity.pk}/change/',
                entity._meta.verbose_name.title(),
                entity.pk,
            )
        except Exception:
            return f'{obj._get_entity_name().title()} #{getattr(obj, f"{obj._get_entity_name()}_id", "?")}'

    entity_display.short_description = 'Entity'
    # Note: admin_order_field is set dynamically in subclasses since model is not available here

    def timestamp_from_uuid(self, obj):
        """Display timestamp extracted from UUID7"""
        return obj.timestamp_from_uuid

    timestamp_from_uuid.short_description = 'UUID7 Timestamp'

    def has_add_permission(self, request):
        """Disable manual creation of state records"""
        return False

    def has_change_permission(self, request, obj=None):
        """State records should be read-only"""
        return False

    def has_delete_permission(self, request, obj=None):
        """State records should not be deleted"""
        return False


@admin.register(TaskState)
class TaskStateAdmin(BaseStateAdmin):
    """Admin interface for Task state records"""

    list_display = BaseStateAdmin.list_display + ['task_id']
    list_filter = BaseStateAdmin.list_filter + ['state']
    search_fields = BaseStateAdmin.search_fields + ['task__id']

    def task_id(self, obj):
        """Display task ID with link"""
        return format_html('<a href="/admin/tasks/task/{}/change/">Task #{}</a>', obj.task.pk, obj.task.pk)

    task_id.short_description = 'Task'
    task_id.admin_order_field = 'task__id'


@admin.register(AnnotationState)
class AnnotationStateAdmin(BaseStateAdmin):
    """Admin interface for Annotation state records"""

    list_display = BaseStateAdmin.list_display + ['annotation_id', 'task_link']
    list_filter = BaseStateAdmin.list_filter + ['state']
    search_fields = BaseStateAdmin.search_fields + ['annotation__id']

    def annotation_id(self, obj):
        """Display annotation ID with link"""
        return format_html(
            '<a href="/admin/tasks/annotation/{}/change/">Annotation #{}</a>', obj.annotation.pk, obj.annotation.pk
        )

    annotation_id.short_description = 'Annotation'
    annotation_id.admin_order_field = 'annotation__id'

    def task_link(self, obj):
        """Display related task link"""
        task = obj.annotation.task
        return format_html('<a href="/admin/tasks/task/{}/change/">Task #{}</a>', task.pk, task.pk)

    task_link.short_description = 'Task'
    task_link.admin_order_field = 'annotation__task__id'


@admin.register(ProjectState)
class ProjectStateAdmin(BaseStateAdmin):
    """Admin interface for Project state records"""

    list_display = BaseStateAdmin.list_display + ['project_id', 'project_title']
    list_filter = BaseStateAdmin.list_filter + ['state']
    search_fields = BaseStateAdmin.search_fields + ['project__id', 'project__title']

    def project_id(self, obj):
        """Display project ID with link"""
        return format_html(
            '<a href="/admin/projects/project/{}/change/">Project #{}</a>', obj.project.pk, obj.project.pk
        )

    project_id.short_description = 'Project'
    project_id.admin_order_field = 'project__id'

    def project_title(self, obj):
        """Display project title"""
        return obj.project.title[:50] + ('...' if len(obj.project.title) > 50 else '')

    project_title.short_description = 'Title'
    project_title.admin_order_field = 'project__title'


# Admin actions for bulk operations (Enterprise can extend these)


def mark_states_as_reviewed(modeladmin, request, queryset):
    """
    Admin action to mark state records as reviewed.

    This is a placeholder that Enterprise can extend with actual functionality.
    """
    count = queryset.count()
    modeladmin.message_user(request, f'{count} state records marked as reviewed.')


mark_states_as_reviewed.short_description = 'Mark selected states as reviewed'


def export_state_history(modeladmin, request, queryset):
    """
    Admin action to export state history.

    This is a placeholder that Enterprise can extend with actual export functionality.
    """
    count = queryset.count()
    modeladmin.message_user(request, f'Export initiated for {count} state records.')


export_state_history.short_description = 'Export state history'


# Add actions to base admin (Enterprise can override)
BaseStateAdmin.actions = [mark_states_as_reviewed, export_state_history]
