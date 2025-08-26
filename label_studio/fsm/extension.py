"""
Minimal extension hooks for Label Studio FSM.
"""

import logging

logger = logging.getLogger(__name__)


class BaseFSMExtension:
    """
    Minimal base class for FSM extensions.

    This provides the interface that extensions should implement.
    """

    @classmethod
    def initialize(cls):
        """Initialize the extension."""
        pass

    @classmethod
    def register_models(cls):
        """Register state models with the core FSM system."""
        pass

    @classmethod
    def register_choices(cls):
        """Register state choices with the core FSM system."""
        pass

    @classmethod
    def get_state_manager(cls):
        """Get the state manager class for this extension."""
        from .state_manager import StateManager

        return StateManager


#  Extension registry for compatibility
class ExtensionRegistry:
    """
    Extension registry for core Label Studio.
    """

    def __init__(self):
        self._extensions = {}

    def register_extension(self, name: str, extension_class):
        """Register an extension."""
        self._extensions[name] = extension_class
        logger.debug(f'Registered FSM extension: {name}')

    def get_extension(self, name: str):
        """Get a registered extension by name."""
        return self._extensions.get(name)


# Global minimal registry
extension_registry = ExtensionRegistry()
