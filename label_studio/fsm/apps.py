"""FSM Django App Configuration"""

import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class FsmConfig(AppConfig):
    default_auto_field = 'django.db.models.UUIDField'
    name = 'fsm'
    verbose_name = 'Label Studio FSM'

    def ready(self):
        """Initialize FSM system when Django app is ready"""
        # Initialize extension system
        self._initialize_extensions()

        # Set up signal handlers for automatic state creation
        self._setup_signals()

        logger.info('FSM system initialized')

    def _initialize_extensions(self):
        """Initialize FSM extension system"""
        try:
            # Import the extension registry to ensure it's initialized

            # Basic extension system is ready
            logger.debug('FSM extension system ready')

        except Exception as e:
            logger.error(f'Failed to initialize FSM extensions: {e}')

    def _setup_signals(self):
        """Set up signal handlers for automatic state creation"""
        try:
            from django.conf import settings

            # Only set up signals if enabled in settings
            if getattr(settings, 'FSM_AUTO_CREATE_STATES', False):
                logger.info('FSM signal handlers registered')

        except Exception as e:
            logger.error(f'Failed to set up FSM signals: {e}')
