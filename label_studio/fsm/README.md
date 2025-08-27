# FSM (Finite State Machine) Framework

A high-performance Django-based finite state machine framework with UUID7 optimization, declarative transitions, and comprehensive state management capabilities.

## Overview

The FSM framework provides:

- **Core Infrastructure**: Abstract base state models and managers
- **UUID7 Optimization**: Time-series optimized state records with natural ordering
- **Declarative Transitions**: Pydantic-based transition system with validation
- **REST API**: Generic endpoints for state management
- **High Performance**: Optimized for high-volume state changes with caching
- **Extensible**: Plugin-based architecture for custom implementations

## Architecture

### Core Components

1. **BaseState**: Abstract model providing UUID7-optimized state tracking
2. **StateManager**: High-performance state management with intelligent caching
3. **Transition System**: Declarative, Pydantic-based transitions with validation
4. **State Registry**: Dynamic registration system for entities and transitions
5. **API Layer**: Generic REST endpoints for state operations

## Quick Start

### 1. Define State Choices

```python
from django.db import models
from django.utils.translation import gettext_lazy as _
from fsm.registry import register_state_choices

@register_state_choices('order')
class OrderStateChoices(models.TextChoices):
    CREATED = 'CREATED', _('Created')
    PROCESSING = 'PROCESSING', _('Processing')
    SHIPPED = 'SHIPPED', _('Shipped')
    DELIVERED = 'DELIVERED', _('Delivered')
    CANCELLED = 'CANCELLED', _('Cancelled')
```

### 2. Create State Model

```python
from fsm.models import BaseState
from fsm.registry import register_state_model

@register_state_model('order')
class OrderState(BaseState):
    # Entity relationship
    order = models.ForeignKey('shop.Order', related_name='fsm_states', on_delete=models.CASCADE)
    
    # Override state field with choices
    state = models.CharField(max_length=50, choices=OrderStateChoices.choices, db_index=True)
    
    # Denormalized fields for performance
    customer_id = models.PositiveIntegerField(db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['order_id', '-id'], name='order_current_state_idx'),
        ]
```

### 3. Define Transitions

```python
from fsm.transitions import BaseTransition
from fsm.registry import register_transition
from pydantic import Field

@register_transition('order', 'process_order')
class ProcessOrderTransition(BaseTransition):
    processor_id: int = Field(..., description="ID of user processing the order")
    priority: str = Field('normal', description="Processing priority")
    
    @property
    def target_state(self) -> str:
        return OrderStateChoices.PROCESSING
    
    def validate_transition(self, context) -> bool:
        return context.current_state == OrderStateChoices.CREATED
        
    def transition(self, context) -> dict:
        return {
            "processor_id": self.processor_id,
            "priority": self.priority,
            "processed_at": context.timestamp.isoformat()
        }
```

### 4. Execute Transitions

```python
from fsm.transition_utils import execute_transition

# Execute transition
result = execute_transition(
    entity=order,
    transition_name='process_order',
    transition_data={'processor_id': 123, 'priority': 'high'},
    user=request.user
)
```

### 5. Query States

```python
from fsm.state_manager import get_state_manager

StateManager = get_state_manager()

# Get current state
current_state = StateManager.get_current_state(order)

# Get state history
history = StateManager.get_state_history(order, limit=10)

# Bulk operations for performance
orders = Order.objects.all()[:1000]
states = StateManager.bulk_get_current_states(orders)
```

## Key Features

### UUID7 Performance Optimization

- **Natural Time Ordering**: UUID7 provides chronological ordering without separate timestamp indexes
- **High Concurrency**: INSERT-only approach eliminates locking contention
- **Scalability**: Supports large amounts of state records with consistent performance

### Declarative Transitions

- **Pydantic Validation**: Strong typing and automatic validation
- **Composable Logic**: Reusable transition classes with inheritance
- **Hooks System**: Pre/post transition hooks for custom logic

### Advanced Querying

```python
# Time-range queries using UUID7
from datetime import datetime, timedelta
recent_states = StateManager.get_states_since(
    entity=order, 
    since=datetime.now() - timedelta(hours=24)
)

# Bulk operations
orders = Order.objects.filter(status='active')
current_states = StateManager.bulk_get_current_states(orders)
```

### API Integration

The framework provides generic REST endpoints:

```
GET /api/fsm/{entity_type}/{entity_id}/current/     # Current state
GET /api/fsm/{entity_type}/{entity_id}/history/     # State history  
POST /api/fsm/{entity_type}/{entity_id}/transition/ # Execute transition
```

Extend the base viewset

```python
from fsm.api import FSMViewSet

class MyFSMViewSet(FSMViewSet):
    def _get_entity_model(self, entity_type: str):
        entity_mapping = {
            'order': 'shop.Order',
            'ticket': 'support.Ticket',
        }
        # ... implementation
```

## Performance Characteristics

- **State Queries**: O(1) current state lookup via UUID7 ordering
- **History Queries**: Optimal for time-series access patterns
- **Bulk Operations**: Efficient batch processing for thousands of entities
- **Cache Integration**: Intelligent caching with automatic invalidation
- **Memory Efficiency**: Minimal memory footprint for state objects

## Extension Points

### Custom State Manager

```python
from fsm.state_manager import BaseStateManager

class CustomStateManager(BaseStateManager):
    def get_current_state(self, entity):
        # Custom logic
        return super().get_current_state(entity)
```

### Custom Validation

```python
@register_transition('order', 'validate_payment')  
class PaymentValidationTransition(BaseTransition):
    def validate_transition(self, context) -> bool:
        # Custom business logic
        return self.check_payment_method(context.entity)
```

## Framework vs Implementation

This is the **core framework** - a clean, generic FSM system. Product-specific implementations (state definitions, concrete models, business logic) should be in separate branches/modules for:

- **Clean Architecture**: Framework logic separated from business logic
- **Reusability**: Framework can be used across different projects
- **Maintainability**: Changes to business logic don't affect framework
- **Review Process**: Framework and implementation can be reviewed independently

## Migration from Other FSM Libraries

The framework provides migration utilities and is designed to be compatible with existing Django FSM patterns while offering significant performance improvements through UUID7 optimization.

## Contributing

When contributing:
- Keep framework code generic and reusable
- Add product-specific code to appropriate implementation branches
- Include performance tests for UUID7 optimizations
- Document extension points and customization options
