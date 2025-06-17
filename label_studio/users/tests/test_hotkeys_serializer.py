
import json
from django.test import TestCase
from users.serializers import HotkeysSerializer  # Import from your actual app

class HotkeysSerializerTestCase(TestCase):
    """Tests for the HotkeysSerializer"""
    
    def setUp(self):
        self.valid_hotkeys = {
            "editor:save": {"key": "ctrl+s", "active": True},
            "editor:open": {"key": "ctrl+o", "active": False},
            "editor:cut": {"key": "ctrl+x"},
            "navigation:home": {"key": "alt+h", "active": True}
        }
        
        self.serializer_data = {
            "custom_hotkeys": self.valid_hotkeys
        }
    
    def test_valid_data(self):
        """Test serializer with valid data"""
        serializer = HotkeysSerializer(data=self.serializer_data)
        self.assertTrue(serializer.is_valid())
    
    def test_invalid_format_not_dict(self):
        """Test serializer rejects non-dictionary custom_hotkeys"""
        data = {"custom_hotkeys": ["not a dictionary"]}
        serializer = HotkeysSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('custom_hotkeys', serializer.errors)
    
    def test_invalid_action_key_format(self):
        """Test serializer rejects action keys without proper format"""
        # Missing colon
        invalid_data = {
            "custom_hotkeys": {
                "editorsave": {"key": "ctrl+s"}
            }
        }
        serializer = HotkeysSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('custom_hotkeys', serializer.errors)
    
    def test_empty_action_key(self):
        """Test serializer rejects empty action keys"""
        invalid_data = {
            "custom_hotkeys": {
                "": {"key": "ctrl+s"}
            }
        }
        serializer = HotkeysSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('custom_hotkeys', serializer.errors)
    
    def test_missing_key_in_hotkey_data(self):
        """Test serializer rejects hotkey data without 'key'"""
        invalid_data = {
            "custom_hotkeys": {
                "editor:save": {"active": True}  # Missing 'key'
            }
        }
        serializer = HotkeysSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('custom_hotkeys', serializer.errors)
    
    def test_invalid_key_value(self):
        """Test serializer rejects invalid key values"""
        invalid_data = {
            "custom_hotkeys": {
                "editor:save": {"key": ""}  # Empty key
            }
        }
        serializer = HotkeysSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('custom_hotkeys', serializer.errors)
    
    def test_invalid_active_flag(self):
        """Test serializer rejects non-boolean active flags"""
        invalid_data = {
            "custom_hotkeys": {
                "editor:save": {"key": "ctrl+s", "active": "yes"}  # Should be boolean
            }
        }
        serializer = HotkeysSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('custom_hotkeys', serializer.errors)
    
