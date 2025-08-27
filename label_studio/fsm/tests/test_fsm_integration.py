"""
Integration tests for the FSM system.

Tests the complete FSM functionality including models, state management,
and API endpoints.
"""

from datetime import datetime, timezone

from django.contrib.auth import get_user_model
from django.test import TestCase
from fsm.models import AnnotationState, ProjectState, TaskState
from fsm.state_manager import get_state_manager
from projects.models import Project
from rest_framework.test import APITestCase
from tasks.models import Annotation, Task

User = get_user_model()


class TestFSMModels(TestCase):
    """Test FSM model functionality"""

    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com', password='test123')
        self.project = Project.objects.create(title='Test Project', created_by=self.user)
        self.task = Task.objects.create(project=self.project, data={'text': 'test'})

    def test_task_state_creation(self):
        """Test TaskState creation and basic functionality"""
        task_state = TaskState.objects.create(
            task=self.task,
            project_id=self.task.project_id,  # Denormalized from task.project_id
            state='CREATED',
            triggered_by=self.user,
            reason='Task created for testing',
        )

        # Check basic fields
        self.assertEqual(task_state.state, 'CREATED')
        self.assertEqual(task_state.task, self.task)
        self.assertEqual(task_state.triggered_by, self.user)

        # Check UUID7 functionality
        self.assertEqual(task_state.id.version, 7)
        self.assertIsInstance(task_state.timestamp_from_uuid, datetime)

        # Check string representation
        str_repr = str(task_state)
        self.assertIn('Task', str_repr)
        self.assertIn('CREATED', str_repr)

    def test_annotation_state_creation(self):
        """Test AnnotationState creation and basic functionality"""
        annotation = Annotation.objects.create(task=self.task, completed_by=self.user, result=[])

        annotation_state = AnnotationState.objects.create(
            annotation=annotation,
            task_id=annotation.task.id,  # Denormalized from annotation.task_id
            project_id=annotation.task.project_id,  # Denormalized from annotation.task.project_id
            completed_by_id=annotation.completed_by.id if annotation.completed_by else None,  # Denormalized
            state='DRAFT',
            triggered_by=self.user,
            reason='Annotation draft created',
        )

        # Check basic fields
        self.assertEqual(annotation_state.state, 'DRAFT')
        self.assertEqual(annotation_state.annotation, annotation)

        # Check terminal state property
        self.assertFalse(annotation_state.is_terminal_state)

        # Test completed state
        completed_state = AnnotationState.objects.create(
            annotation=annotation,
            task_id=annotation.task.id,
            project_id=annotation.task.project_id,
            completed_by_id=annotation.completed_by.id if annotation.completed_by else None,
            state='COMPLETED',
            triggered_by=self.user,
        )
        self.assertTrue(completed_state.is_terminal_state)

    def test_project_state_creation(self):
        """Test ProjectState creation and basic functionality"""
        project_state = ProjectState.objects.create(
            project=self.project, state='CREATED', triggered_by=self.user, reason='Project created for testing'
        )

        # Check basic fields
        self.assertEqual(project_state.state, 'CREATED')
        self.assertEqual(project_state.project, self.project)

        # Test terminal state
        self.assertFalse(project_state.is_terminal_state)

        completed_state = ProjectState.objects.create(project=self.project, state='COMPLETED', triggered_by=self.user)
        self.assertTrue(completed_state.is_terminal_state)


class TestStateManager(TestCase):
    """Test StateManager functionality"""

    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com', password='test123')
        self.project = Project.objects.create(title='Test Project', created_by=self.user)
        self.task = Task.objects.create(project=self.project, data={'text': 'test'})
        self.StateManager = get_state_manager()

    def test_get_current_state_empty(self):
        """Test getting current state when no states exist"""
        current_state = self.StateManager.get_current_state(self.task)
        self.assertIsNone(current_state)

    def test_transition_state(self):
        """Test state transition functionality"""
        # Initial transition
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='CREATED',
            user=self.user,
            transition_name='create_task',
            reason='Initial task creation',
        )

        self.assertTrue(success)

        # Check current state
        current_state = self.StateManager.get_current_state(self.task)
        self.assertEqual(current_state, 'CREATED')

        # Another transition
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='IN_PROGRESS',
            user=self.user,
            transition_name='start_work',
            context={'started_by': 'user'},
        )

        self.assertTrue(success)
        current_state = self.StateManager.get_current_state(self.task)
        self.assertEqual(current_state, 'IN_PROGRESS')

    def test_get_current_state_object(self):
        """Test getting current state object with full details"""
        # Create some state transitions
        self.StateManager.transition_state(entity=self.task, new_state='CREATED', user=self.user)
        self.StateManager.transition_state(
            entity=self.task, new_state='IN_PROGRESS', user=self.user, context={'test': 'data'}
        )

        current_state_obj = self.StateManager.get_current_state_object(self.task)

        self.assertIsNotNone(current_state_obj)
        self.assertEqual(current_state_obj.state, 'IN_PROGRESS')
        self.assertEqual(current_state_obj.previous_state, 'CREATED')
        self.assertEqual(current_state_obj.triggered_by, self.user)
        self.assertEqual(current_state_obj.context_data, {'test': 'data'})

    def test_get_state_history(self):
        """Test state history retrieval"""
        # Create multiple transitions
        transitions = [('CREATED', 'create_task'), ('IN_PROGRESS', 'start_work'), ('COMPLETED', 'finish_work')]

        for state, transition in transitions:
            self.StateManager.transition_state(
                entity=self.task, new_state=state, user=self.user, transition_name=transition
            )

        history = self.StateManager.get_state_history(self.task, limit=10)

        # Should have 3 state records
        self.assertEqual(len(history), 3)

        # Should be ordered by most recent first (UUID7 ordering)
        states = [h.state for h in history]
        self.assertEqual(states, ['COMPLETED', 'IN_PROGRESS', 'CREATED'])

        # Check previous states are set correctly
        self.assertIsNone(history[2].previous_state)  # First state has no previous
        self.assertEqual(history[1].previous_state, 'CREATED')
        self.assertEqual(history[0].previous_state, 'IN_PROGRESS')

    def test_get_states_in_time_range(self):
        """Test time-based state queries using UUID7"""
        # Record time before creating states
        before_time = datetime.now(timezone.utc)

        # Create some states
        self.StateManager.transition_state(entity=self.task, new_state='CREATED', user=self.user)
        self.StateManager.transition_state(entity=self.task, new_state='IN_PROGRESS', user=self.user)

        # Record time after creating states
        after_time = datetime.now(timezone.utc)

        # Query states in time range
        states_in_range = self.StateManager.get_states_in_time_range(self.task, before_time, after_time)

        # Should find both states
        self.assertEqual(len(states_in_range), 2)


class TestFSMAPI(APITestCase):
    """Test FSM API endpoints"""

    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com', password='test123')
        self.project = Project.objects.create(title='Test Project', created_by=self.user)
        self.task = Task.objects.create(project=self.project, data={'text': 'test'})
        self.client.force_authenticate(user=self.user)

        # Create initial state
        StateManager = get_state_manager()
        StateManager.transition_state(entity=self.task, new_state='CREATED', user=self.user)

    def test_get_current_state_api(self):
        """Test GET /api/fsm/{entity_type}/{entity_id}/current/"""
        response = self.client.get(f'/api/fsm/task/{self.task.id}/current/')

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data['current_state'], 'CREATED')
        self.assertEqual(data['entity_type'], 'task')
        self.assertEqual(data['entity_id'], self.task.id)

    def test_get_state_history_api(self):
        """Test GET /api/fsm/{entity_type}/{entity_id}/history/"""
        # Create additional states
        StateManager = get_state_manager()
        StateManager.transition_state(
            entity=self.task, new_state='IN_PROGRESS', user=self.user, transition_name='start_work'
        )

        response = self.client.get(f'/api/fsm/task/{self.task.id}/history/')

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data['count'], 2)
        self.assertEqual(len(data['results']), 2)

        # Check first result (most recent)
        latest_state = data['results'][0]
        self.assertEqual(latest_state['state'], 'IN_PROGRESS')
        self.assertEqual(latest_state['previous_state'], 'CREATED')
        self.assertEqual(latest_state['transition_name'], 'start_work')

    def test_transition_state_api(self):
        """Test POST /api/fsm/{entity_type}/{entity_id}/transition/"""
        transition_data = {
            'new_state': 'IN_PROGRESS',
            'transition_name': 'start_annotation',
            'reason': 'User started working on task',
            'context': {'assignment_id': 123},
        }

        response = self.client.post(f'/api/fsm/task/{self.task.id}/transition/', data=transition_data, format='json')

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertTrue(data['success'])
        self.assertEqual(data['previous_state'], 'CREATED')
        self.assertEqual(data['new_state'], 'IN_PROGRESS')
        self.assertEqual(data['entity_type'], 'task')
        self.assertEqual(data['entity_id'], self.task.id)

        # Verify state was actually changed
        StateManager = get_state_manager()
        current_state = StateManager.get_current_state(self.task)
        self.assertEqual(current_state, 'IN_PROGRESS')

    def test_api_with_invalid_entity(self):
        """Test API with non-existent entity"""
        response = self.client.get('/api/fsm/task/99999/current/')
        self.assertEqual(response.status_code, 404)

    def test_api_with_invalid_entity_type(self):
        """Test API with invalid entity type"""
        response = self.client.get('/api/fsm/invalid/1/current/')
        self.assertEqual(response.status_code, 404)
