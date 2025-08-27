"""
Core FSM API endpoints.

Provides generic API endpoints for state management that can be extended
for any application using the FSM framework.
"""

import logging

from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import get_state_model_for_entity
from .serializers import StateHistorySerializer, StateTransitionSerializer
from .state_manager import get_state_manager

logger = logging.getLogger(__name__)


class FSMViewSet(viewsets.ViewSet):
    """
    Core FSM API endpoints.

    Provides basic state management operations:
    - Get current state
    - Get state history
    - Trigger state transitions
    """

    permission_classes = [IsAuthenticated]

    def _get_entity_and_state_model(self, entity_type: str, entity_id: int):
        """Helper to get entity instance and its state model"""
        # Get the Django model class for the entity type
        entity_model = self._get_entity_model(entity_type)
        if not entity_model:
            raise Http404(f'Unknown entity type: {entity_type}')

        # Get the entity instance
        entity = get_object_or_404(entity_model, pk=entity_id)

        # Get the state model for this entity
        state_model = get_state_model_for_entity(entity)
        if not state_model:
            raise Http404(f'No state model found for entity type: {entity_type}')

        return entity, state_model

    def _get_entity_model(self, entity_type: str):
        """
        Get Django model class for entity type.

        This method should be overridden by subclasses to provide
        application-specific entity type mappings.

        Example:
            entity_mapping = {
                'order': 'shop.Order',
                'ticket': 'support.Ticket',
            }
        """
        from django.apps import apps

        # Default empty mapping - override in subclasses
        entity_mapping = {}

        model_path = entity_mapping.get(entity_type.lower())
        if not model_path:
            return None

        app_label, model_name = model_path.split('.')
        return apps.get_model(app_label, model_name)

    @action(detail=False, methods=['get'], url_path=r'(?P<entity_type>\w+)/(?P<entity_id>\d+)/current')
    def current_state(self, request, entity_type=None, entity_id=None):
        """
        Get current state for an entity.

        GET /api/fsm/{entity_type}/{entity_id}/current/

        Returns:
            {
                "current_state": "IN_PROGRESS",
                "entity_type": "task",
                "entity_id": 123
            }
        """
        # Let Http404 from _get_entity_and_state_model pass through
        entity, state_model = self._get_entity_and_state_model(entity_type, int(entity_id))

        try:
            # Get current state using the configured state manager
            StateManager = get_state_manager()
            current_state = StateManager.get_current_state(entity)

            return Response(
                {
                    'current_state': current_state,
                    'entity_type': entity_type,
                    'entity_id': int(entity_id),
                }
            )

        except Exception as e:
            logger.error(f'Error getting current state for {entity_type} {entity_id}: {e}')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path=r'(?P<entity_type>\w+)/(?P<entity_id>\d+)/history')
    def state_history(self, request, entity_type=None, entity_id=None):
        """
        Get state history for an entity.

        GET /api/fsm/{entity_type}/{entity_id}/history/

        Query parameters:
        - limit: Maximum number of history records (default: 100)
        - include_context: Include context_data in response (default: false)

        Returns:
            {
                "count": 5,
                "results": [
                    {
                        "id": "uuid7-id",
                        "state": "COMPLETED",
                        "previous_state": "IN_PROGRESS",
                        "transition_name": "complete_task",
                        "triggered_by": "user@example.com",
                        "created_at": "2024-01-15T10:30:00Z",
                        "reason": "Task completed by user",
                        "context_data": {...}  // if include_context=true
                    },
                    ...
                ]
            }
        """
        # Let Http404 from _get_entity_and_state_model pass through
        entity, state_model = self._get_entity_and_state_model(entity_type, int(entity_id))

        try:
            # Get query parameters
            limit = min(int(request.query_params.get('limit', 100)), 1000)  # Max 1000
            include_context = request.query_params.get('include_context', 'false').lower() == 'true'

            # Get state history using the configured state manager
            StateManager = get_state_manager()
            history = StateManager.get_state_history(entity, limit)

            # Serialize the results
            serializer = StateHistorySerializer(history, many=True, context={'include_context': include_context})

            return Response(
                {
                    'count': len(history),
                    'results': serializer.data,
                }
            )

        except Exception as e:
            logger.error(f'Error getting state history for {entity_type} {entity_id}: {e}')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path=r'(?P<entity_type>\w+)/(?P<entity_id>\d+)/transition')
    def transition_state(self, request, entity_type=None, entity_id=None):
        """
        Trigger a state transition for an entity.

        POST /api/fsm/{entity_type}/{entity_id}/transition/

        Request body:
            {
                "new_state": "COMPLETED",
                "transition_name": "complete_task",  // optional
                "reason": "Task completed by user",   // optional
                "context": {                         // optional
                    "assignment_id": 456
                }
            }

        Returns:
            {
                "success": true,
                "previous_state": "IN_PROGRESS",
                "new_state": "COMPLETED",
                "entity_type": "task",
                "entity_id": 123
            }
        """
        # Let Http404 from _get_entity_and_state_model pass through
        entity, state_model = self._get_entity_and_state_model(entity_type, int(entity_id))

        try:
            # Validate request data
            serializer = StateTransitionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            data = serializer.validated_data
            new_state = data['new_state']
            transition_name = data.get('transition_name')
            reason = data.get('reason', '')
            context = data.get('context', {})

            # Get current state for response
            StateManager = get_state_manager()
            previous_state = StateManager.get_current_state(entity)

            # Perform state transition
            success = StateManager.transition_state(
                entity=entity,
                new_state=new_state,
                transition_name=transition_name,
                user=request.user,
                context=context,
                reason=reason,
            )

            if success:
                return Response(
                    {
                        'success': True,
                        'previous_state': previous_state,
                        'new_state': new_state,
                        'entity_type': entity_type,
                        'entity_id': int(entity_id),
                    }
                )
            else:
                return Response({'error': 'State transition failed'}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f'Error transitioning state for {entity_type} {entity_id}: {e}')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
