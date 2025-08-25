# Label Studio FSM (Finite State Machine)

Core finite state machine functionality for Label Studio that provides the foundation for state tracking across entities like Tasks, Annotations, and Projects.

## Overview

The Label Studio FSM system provides:

- **Core Infrastructure**: Base state tracking models and managers
- **UUID7 Optimization**: Time-series optimized state records using UUID7
- **Extension Mechanism**: Allows Label Studio Enterprise to extend functionality
- **Basic API**: REST endpoints for state management
- **Admin Interface**: Django admin integration for state inspection

## Architecture

### Core Components

1. **BaseState**: Abstract model providing common state tracking functionality
2. **StateManager**: High-performance state management with caching
3. **Core State Models**: Task, Annotation, and Project state tracking
4. **Extension Registry**: Allows enterprise extensions to register additional functionality

### Extension System

The FSM system is designed to be extended by Label Studio Enterprise:

```python
# Core provides foundation
from label_studio.fsm.models import BaseState
from label_studio.fsm.state_manager import StateManager

# Enterprise extends with advanced features  
class EnterpriseTaskState(BaseState):
    # Additional enterprise-specific fields
    organization_id = models.PositiveIntegerField(db_index=True)
    # Advanced indexes and denormalization

class EnterpriseStateManager(StateManager):
    # Bulk operations, advanced caching, etc.
    @classmethod
    def bulk_get_states(cls, entities):
        # Enterprise-specific bulk optimization
        pass
```

## Usage

### Basic State Management

```python
from label_studio.fsm.state_manager import get_state_manager
from label_studio.tasks.models import Task

# Get current state
StateManager = get_state_manager()
task = Task.objects.get(id=123)
current_state = StateManager.get_current_state(task)

# Transition state
success = StateManager.transition_state(
    entity=task,
    new_state='IN_PROGRESS',
    user=request.user,
    reason='User started annotation work'
)

# Get state history
history = StateManager.get_state_history(task, limit=10)
```

### Integration with Existing Models

```python
# Add FSM functionality to existing models
from label_studio.fsm.integration import FSMIntegrationMixin

class Task(FSMIntegrationMixin, BaseTask):
    class Meta:
        proxy = True

# Now you can use FSM methods directly
task = Task.objects.get(id=123)
current_state = task.current_fsm_state
task.transition_fsm_state('COMPLETED', user=user)
```

### API Usage

```bash
# Get current state
GET /api/fsm/task/123/current/

# Get state history
GET /api/fsm/task/123/history/?limit=10

# Transition state
POST /api/fsm/task/123/transition/
{
    "new_state": "COMPLETED",
    "reason": "Task completed by user"
}
```

## Dependencies

The FSM system requires the `uuid-utils` library for UUID7 support:

```bash
pip install uuid-utils>=0.11.0
```

This dependency is automatically included in Label Studio's requirements.

### Why UUID7?

UUID7 provides significant performance benefits for time-series data like state transitions:

- **Natural Time Ordering**: Records are naturally ordered by creation time without requiring additional indexes
- **Global Uniqueness**: Works across distributed systems and database shards
- **INSERT-only Architecture**: No UPDATE operations needed, maximizing concurrency
- **Time-based Partitioning**: Enables horizontal scaling to billions of records

## Configuration

### Django Settings

Add the FSM app to your `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ... other apps
    'label_studio.fsm',
    # ... other apps
]
```

### Optional Settings

```python
# FSM Configuration
FSM_CACHE_TTL = 300  # Cache timeout in seconds (default: 300)
FSM_AUTO_CREATE_STATES = False  # Auto-create states on entity creation (default: False)
FSM_STATE_MANAGER_CLASS = None  # Custom state manager class (default: None)

# Enterprise Settings (when using Label Studio Enterprise)
FSM_ENABLE_BULK_OPERATIONS = True  # Enable bulk operations (default: False)
FSM_CACHE_STATS_ENABLED = True  # Enable cache statistics (default: False)
```

## Database Migrations

Run migrations to create the FSM tables:

```bash
python manage.py migrate fsm
```

This will create:
- `fsm_task_states`: Task state tracking
- `fsm_annotation_states`: Annotation state tracking  
- `fsm_project_states`: Project state tracking

## Performance Considerations

### UUID7 Benefits

The FSM system uses UUID7 for optimal time-series performance:

- **Natural Time Ordering**: No need for `created_at` indexes
- **INSERT-only Architecture**: Maximum concurrency, no row locks
- **Global Uniqueness**: Supports distributed systems
- **Time-based Partitioning**: Scales to billions of records

### Caching Strategy

- **Write-through Caching**: Immediate consistency after state transitions
- **Configurable TTL**: Balance between performance and freshness
- **Cache Key Strategy**: Optimized for entity-based lookups

### Indexes

Critical indexes for performance:
- `(entity_id, id DESC)`: Current state lookup using UUID7 ordering
- `(entity_id, id)`: State history queries

## Extension by Label Studio Enterprise

Label Studio Enterprise extends this system with:

1. **Advanced State Models**: Additional entities (Reviews, Assignments, etc.)
2. **Complex Workflows**: Review, arbitration, and approval flows
3. **Bulk Operations**: High-performance batch state transitions
4. **Enhanced Caching**: Multi-level caching with cache warming
5. **Analytics**: State-based reporting and metrics
6. **Denormalization**: Performance optimization with redundant fields

### Enterprise Extension Example

```python
# In Label Studio Enterprise
from label_studio.fsm.extension import BaseFSMExtension
from label_studio.fsm.models import register_state_model

class EnterpriseExtension(BaseFSMExtension):
    @classmethod
    def initialize(cls):
        # Register enterprise models
        register_state_model('review', AnnotationReviewState)
        register_state_model('assignment', TaskAssignmentState)
        
    @classmethod
    def get_state_manager(cls):
        return EnterpriseStateManager
```

## Monitoring and Debugging

### Admin Interface

Access state records via Django admin:
- `/admin/fsm/taskstate/`
- `/admin/fsm/annotationstate/`
- `/admin/fsm/projectstate/`

### Logging

FSM operations are logged at appropriate levels:
- `INFO`: Successful state transitions
- `ERROR`: Failed transitions and system errors
- `DEBUG`: Cache hits/misses and detailed operation info

### Cache Statistics

When `FSM_CACHE_STATS_ENABLED=True`, cache performance metrics are available for monitoring.

## Migration from Existing Systems

The FSM system can run alongside existing state management:

1. **Parallel Operation**: FSM tracks states without affecting existing logic
2. **Gradual Migration**: Replace existing state checks with FSM calls over time
3. **Backfill Support**: Historical states can be backfilled from existing data

## Testing

Test the FSM system:

```python
from label_studio.fsm.state_manager import StateManager
from label_studio.tasks.models import Task

def test_task_state_transition():
    task = Task.objects.create(...)
    
    # Test initial state
    assert StateManager.get_current_state(task) is None
    
    # Test transition
    success = StateManager.transition_state(task, 'CREATED')
    assert success
    assert StateManager.get_current_state(task) == 'CREATED'
    
    # Test history
    history = StateManager.get_state_history(task)
    assert len(history) == 1
    assert history[0].state == 'CREATED'
```