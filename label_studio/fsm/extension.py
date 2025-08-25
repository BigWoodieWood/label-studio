"""
Extension mechanism for Label Studio Enterprise FSM.

This module provides the hooks and interfaces that allow Label Studio Enterprise
to extend the core FSM functionality with advanced features.
"""

import logging
from typing import Any, Dict, List, Type

from django.apps import apps
from django.conf import settings

from .models import BaseState, register_state_model
from .state_choices import register_state_choices
from .state_manager import StateManager

logger = logging.getLogger(__name__)


class FSMExtensionRegistry:
    """
    Registry for FSM extensions that allows enterprise features to be
    dynamically loaded and integrated with the core FSM system.
    """

    def __init__(self):
        self._extensions = {}
        self._state_managers = {}
        self._loaded = False

    def register_extension(self, name: str, extension_class):
        """
        Register an FSM extension.

        Args:
            name: Unique name for the extension
            extension_class: Class implementing the extension
        """
        self._extensions[name] = extension_class
        logger.info(f'Registered FSM extension: {name}')

    def get_extension(self, name: str):
        """Get a registered extension by name"""
        return self._extensions.get(name)

    def load_extensions(self):
        """
        Load FSM extensions from settings.

        Called during Django app startup to load enterprise extensions.
        """
        if self._loaded:
            return

        extensions_setting = getattr(settings, 'FSM_EXTENSIONS', [])
        for extension_config in extensions_setting:
            self._load_extension(extension_config)

        self._loaded = True
        logger.info(f'Loaded {len(self._extensions)} FSM extensions')

    def _load_extension(self, config: Dict[str, Any]):
        """Load a single extension from configuration"""
        try:
            name = config['name']
            class_path = config['class']

            # Import the extension class
            module_name, class_name = class_path.rsplit('.', 1)
            module = __import__(module_name, fromlist=[class_name])
            extension_class = getattr(module, class_name)

            # Register the extension
            self.register_extension(name, extension_class)

            # Initialize the extension if it has an init method
            if hasattr(extension_class, 'initialize'):
                extension_class.initialize()

        except Exception as e:
            logger.error(f'Failed to load FSM extension {config}: {e}')


# Global extension registry
extension_registry = FSMExtensionRegistry()


class BaseFSMExtension:
    """
    Base class for FSM extensions.

    Enterprise extensions should inherit from this class to ensure
    compatibility with the core FSM system.
    """

    @classmethod
    def initialize(cls):
        """
        Initialize the extension.

        Called when the extension is loaded. Override to perform
        setup tasks like registering state models and choices.
        """
        pass

    @classmethod
    def register_models(cls):
        """
        Register state models with the core FSM system.

        Override to register enterprise-specific state models.

        Example:
            register_state_model('review', AnnotationReviewState)
            register_state_model('assignment', TaskAssignmentState)
        """
        pass

    @classmethod
    def register_choices(cls):
        """
        Register state choices with the core FSM system.

        Override to register enterprise-specific state choices.

        Example:
            register_state_choices('review', ReviewStateChoices)
            register_state_choices('assignment', AssignmentStateChoices)
        """
        pass

    @classmethod
    def get_state_manager(cls) -> Type[StateManager]:
        """
        Get the state manager class for this extension.

        Override to provide enterprise-specific state manager.

        Returns:
            StateManager class to use
        """
        return StateManager


class EnterpriseExtensionMixin:
    """
    Mixin for enterprise extensions that provides common functionality
    for extending the core FSM system.
    """

    @classmethod
    def extend_state_model(cls, entity_name: str, base_model_class: Type[BaseState]):
        """
        Helper to create extended state models.

        Args:
            entity_name: Name of the entity (e.g., 'task', 'annotation')
            base_model_class: Base state model class to extend

        Returns:
            Extended model class
        """
        # This would be used by enterprise to add denormalized fields,
        # additional indexes, and enterprise-specific functionality
        pass

    @classmethod
    def extend_state_choices(cls, base_choices_class, additional_choices: List[tuple]):
        """
        Helper to extend state choices with additional states.

        Args:
            base_choices_class: Base TextChoices class
            additional_choices: List of (value, label) tuples for new states

        Returns:
            Extended choices class
        """
        # This would be used by enterprise to add additional states
        # to the core state choices
        pass


# Configuration helpers for enterprise setup


def configure_fsm_for_enterprise():
    """
    Configure FSM system for Label Studio Enterprise.

    This function should be called by enterprise during app initialization
    to set up the FSM system with enterprise-specific configuration.
    """
    # Load enterprise extensions
    extension_registry.load_extensions()

    # Set enterprise-specific settings
    if not hasattr(settings, 'FSM_CACHE_TTL'):
        settings.FSM_CACHE_TTL = 300  # 5 minutes

    if not hasattr(settings, 'FSM_ENABLE_BULK_OPERATIONS'):
        settings.FSM_ENABLE_BULK_OPERATIONS = True

    logger.info('FSM system configured for Label Studio Enterprise')


def get_enterprise_state_manager():
    """
    Get the enterprise state manager if available.

    Returns the enterprise-specific state manager class if one is registered,
    otherwise returns the core StateManager.
    """
    # Check if enterprise has registered a state manager
    enterprise_ext = extension_registry.get_extension('enterprise')
    if enterprise_ext:
        return enterprise_ext.get_state_manager()

    # Fall back to core state manager
    return StateManager


# Settings for FSM extensions
def get_fsm_settings():
    """Get FSM-related settings with defaults"""
    return {
        'cache_ttl': getattr(settings, 'FSM_CACHE_TTL', 300),
        'enable_bulk_operations': getattr(settings, 'FSM_ENABLE_BULK_OPERATIONS', False),
        'enable_cache_stats': getattr(settings, 'FSM_CACHE_STATS_ENABLED', False),
        'state_manager_class': getattr(settings, 'FSM_STATE_MANAGER_CLASS', None),
        'extensions': getattr(settings, 'FSM_EXTENSIONS', []),
    }


# Integration helpers for model registration


def auto_register_enterprise_models():
    """
    Automatically register enterprise state models.

    Scans for state models in enterprise apps and registers them
    with the core FSM system.
    """
    try:
        # Only attempt if enterprise is available
        if apps.is_installed('label_studio_enterprise.fsm'):
            from label_studio_enterprise.fsm.models import (
                AnnotationDraftState,
                AnnotationReviewState,
                CommentState,
                TaskAssignmentState,
                TaskLockState,
            )
            from label_studio_enterprise.fsm.models import (
                AnnotationState as EnterpriseAnnotationState,
            )
            from label_studio_enterprise.fsm.models import (
                ProjectState as EnterpriseProjectState,
            )
            from label_studio_enterprise.fsm.models import (
                TaskState as EnterpriseTaskState,
            )

            # Register enterprise state models
            register_state_model('task', EnterpriseTaskState)
            register_state_model('annotation', EnterpriseAnnotationState)
            register_state_model('project', EnterpriseProjectState)
            register_state_model('annotationreview', AnnotationReviewState)
            register_state_model('taskassignment', TaskAssignmentState)
            register_state_model('annotationdraft', AnnotationDraftState)
            register_state_model('comment', CommentState)
            register_state_model('tasklock', TaskLockState)

            logger.info('Auto-registered enterprise state models')

    except ImportError:
        # Enterprise not available, use core models
        logger.debug('Enterprise FSM models not available, using core models')


def auto_register_enterprise_choices():
    """
    Automatically register enterprise state choices.

    Scans for state choices in enterprise apps and registers them
    with the core FSM system.
    """
    try:
        # Only attempt if enterprise is available
        if apps.is_installed('label_studio_enterprise.fsm'):
            from label_studio_enterprise.fsm.state_choices import (
                AnnotationDraftStateChoices,
                AssignmentStateChoices,
                CommentStateChoices,
                ReviewStateChoices,
                TaskLockStateChoices,
            )
            from label_studio_enterprise.fsm.state_choices import (
                AnnotationStateChoices as EnterpriseAnnotationStateChoices,
            )
            from label_studio_enterprise.fsm.state_choices import (
                ProjectStateChoices as EnterpriseProjectStateChoices,
            )
            from label_studio_enterprise.fsm.state_choices import (
                TaskStateChoices as EnterpriseTaskStateChoices,
            )

            # Register enterprise state choices
            register_state_choices('task', EnterpriseTaskStateChoices)
            register_state_choices('annotation', EnterpriseAnnotationStateChoices)
            register_state_choices('project', EnterpriseProjectStateChoices)
            register_state_choices('review', ReviewStateChoices)
            register_state_choices('assignment', AssignmentStateChoices)
            register_state_choices('annotationdraft', AnnotationDraftStateChoices)
            register_state_choices('comment', CommentStateChoices)
            register_state_choices('tasklock', TaskLockStateChoices)

            logger.info('Auto-registered enterprise state choices')

    except ImportError:
        # Enterprise not available, use core choices
        logger.debug('Enterprise FSM choices not available, using core choices')
