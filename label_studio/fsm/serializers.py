"""
Core FSM serializers for Label Studio.

Provides basic serializers for state management API
"""

from rest_framework import serializers


class StateHistorySerializer(serializers.Serializer):
    """
    Serializer for state history records.

    Provides basic state history information
    """

    id = serializers.UUIDField(read_only=True)
    state = serializers.CharField(read_only=True)
    previous_state = serializers.CharField(read_only=True, allow_null=True)
    transition_name = serializers.CharField(read_only=True, allow_null=True)
    triggered_by = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    reason = serializers.CharField(read_only=True)
    context_data = serializers.SerializerMethodField()

    def get_triggered_by(self, obj):
        """Get user who triggered the transition"""
        if obj.triggered_by:
            return {
                'id': obj.triggered_by.id,
                'email': obj.triggered_by.email,
                'first_name': getattr(obj.triggered_by, 'first_name', ''),
                'last_name': getattr(obj.triggered_by, 'last_name', ''),
            }
        return None

    def get_context_data(self, obj):
        """Include context data if requested"""
        include_context = self.context.get('include_context', False)
        if include_context:
            return obj.context_data
        return None


class StateTransitionSerializer(serializers.Serializer):
    """
    Serializer for state transition requests.

    Validates state transition request data.
    """

    new_state = serializers.CharField(required=True, help_text='Target state to transition to')
    transition_name = serializers.CharField(
        required=False, allow_blank=True, help_text='Name of the transition method (for audit trail)'
    )
    reason = serializers.CharField(
        required=False, allow_blank=True, help_text='Human-readable reason for the transition'
    )
    context = serializers.JSONField(
        required=False, default=dict, help_text='Additional context data for the transition'
    )

    def validate_new_state(self, value):
        """Validate that new_state is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError('new_state cannot be empty')
        return value.strip().upper()


class StateInfoSerializer(serializers.Serializer):
    """
    Serializer for basic state information.

    Used for current state responses.
    """

    current_state = serializers.CharField(allow_null=True)
    entity_type = serializers.CharField()
    entity_id = serializers.IntegerField()

    available_transitions = serializers.ListField(
        child=serializers.CharField(), required=False, help_text='List of valid transitions from current state'
    )
    state_metadata = serializers.JSONField(required=False, help_text='Additional metadata about the current state')
