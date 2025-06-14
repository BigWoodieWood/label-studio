"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from core.utils.common import load_func
from core.utils.db import fast_first
from django.conf import settings
from organizations.models import OrganizationMember
from rest_flex_fields import FlexFieldsModelSerializer
from rest_framework import serializers

from .models import User


class BaseUserSerializer(FlexFieldsModelSerializer):
    # short form for user presentation
    initials = serializers.SerializerMethodField(default='?', read_only=True)
    avatar = serializers.SerializerMethodField(read_only=True)
    active_organization_meta = serializers.SerializerMethodField(read_only=True)

    def get_avatar(self, instance):
        return instance.avatar_url

    def get_initials(self, instance):
        return instance.get_initials(self._is_deleted(instance))

    def get_active_organization_meta(self, instance):
        organization = instance.active_organization
        if organization is None:
            return {'title': '', 'email': ''}

        title = organization.title
        email = ''

        if organization.created_by is not None and organization.created_by.email is not None:
            email = organization.created_by.email

        return {'title': title, 'email': email}

    def _is_deleted(self, instance):
        if 'deleted_organization_members' in self.context:
            organization_members = self.context.get('deleted_organization_members', None)
            return instance.id in organization_members

        if organization_members := self.context.get('organization_members', None):
            # Finds the first organization_member matching the instance's id. If not found, set to None.
            organization_member_for_user = next(
                (
                    organization_member
                    for organization_member in organization_members
                    if organization_member.user_id == instance.id
                ),
                None,
            )
        else:
            if 'user' in self.context:
                org_id = self.context['user'].active_organization_id
            elif 'request' in self.context:
                org_id = self.context['request'].user.active_organization_id
            else:
                org_id = None

            if not org_id:
                return False

            organization_member_for_user = fast_first(
                OrganizationMember.objects.filter(user_id=instance.id, organization_id=org_id)
            )
            if not organization_member_for_user:
                return True
        return bool(organization_member_for_user.deleted_at)

    def to_representation(self, instance):
        """Returns user with cache, this helps to avoid multiple s3/gcs links resolving for avatars"""

        uid = instance.id
        key = 'user_cache'

        if key not in self.context:
            self.context[key] = {}
        if uid not in self.context[key]:
            self.context[key][uid] = super().to_representation(instance)

        if self._is_deleted(instance):
            for field in ['username', 'first_name', 'last_name', 'email']:
                self.context[key][uid][field] = 'User' if field == 'last_name' else 'Deleted'

        return self.context[key][uid]

    class Meta:
        model = User
        fields = (
            'id',
            'first_name',
            'last_name',
            'username',
            'email',
            'last_activity',
            'custom_hotkeys',
            'avatar',
            'initials',
            'phone',
            'active_organization',
            'active_organization_meta',
            'allow_newsletters',
            'date_joined',
        )

        
class BaseUserSerializerUpdate(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        read_only_fields = ('email',)


class UserSimpleSerializer(BaseUserSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email', 'avatar')


class HotkeysSerializer(serializers.Serializer):
    custom_hotkeys = serializers.DictField(required=True)

    def validate_custom_hotkeys(self, custom_hotkeys):
        """
        Validates the hotkey format.
        Expected format: {"section:action": {"key": "key_combination", "active": boolean}}
        The "active" field is optional and defaults to true.
        """
        if not isinstance(custom_hotkeys, dict):
            raise serializers.ValidationError("custom_hotkeys must be a dictionary")
    
        section_hotkeys = {}  # Keep track of hotkeys by section
    
        for action_key, hotkey_data in custom_hotkeys.items():
            # Validate action key format (section:action)
            if not isinstance(action_key, str) or not action_key:
                raise serializers.ValidationError(f"Action key '{action_key}' must be a non-empty string")
        
            # Check if the action key follows the section:action format
            if ':' not in action_key:
                raise serializers.ValidationError(f"Action key '{action_key}' must be in 'section:action' format")
        
            section, action = action_key.split(':', 1)
        
            # Validate hotkey data format
            if not isinstance(hotkey_data, dict):
                raise serializers.ValidationError(f"Hotkey data for '{action_key}' must be a dictionary")
        
            # Check for key in hotkey data
            if 'key' not in hotkey_data:
                raise serializers.ValidationError(f"Missing 'key' in hotkey data for '{action_key}'")
            
            key_combo = hotkey_data['key']
        
            # Get active status, default to True if not specified
            active = hotkey_data.get('active', True)
        
            # Validate key combination
            if not isinstance(key_combo, str) or not key_combo:
                raise serializers.ValidationError(f"Key combination for '{action_key}' must be a non-empty string")
        
            # Validate active flag if provided
            if 'active' in hotkey_data and not isinstance(active, bool):
                raise serializers.ValidationError(f"Active flag for '{action_key}' must be a boolean")
        
            # Check for duplicate hotkeys within the same section
            if section not in section_hotkeys:
                section_hotkeys[section] = []
            
            # Only check for duplicates if the hotkey is active
            if active:
                if key_combo in section_hotkeys[section]:
                    raise serializers.ValidationError(
                        f"Duplicate hotkey '{key_combo}' in section '{section}'. "
                        f"Each section must have unique hotkeys."
                    )
                
                section_hotkeys[section].append(key_combo)
            
        return custom_hotkeys

        
UserSerializer = load_func(settings.USER_SERIALIZER)
UserSerializerUpdate = load_func(settings.USER_SERIALIZER_UPDATE)
