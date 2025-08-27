"""
FSM state choices registry system.

This module provides the infrastructure for registering and managing
state choices for different entity types in the FSM framework.
"""

# Registry for dynamic state choices extension
STATE_CHOICES_REGISTRY = {}


def register_state_choices(entity_name: str, choices_class):
    """
    Register state choices for an entity type.

    Args:
        entity_name: Name of the entity (e.g., 'order', 'ticket')
        choices_class: Django TextChoices class defining valid states
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
