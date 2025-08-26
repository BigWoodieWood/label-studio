"""
Core FSM URL patterns for Label Studio.

Provides basic URL routing for state management API
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api import FSMViewSet

# Create router for FSM API endpoints
router = DefaultRouter()
router.register(r'fsm', FSMViewSet, basename='fsm')

# Core FSM URL patterns
urlpatterns = [
    path('api/', include(router.urls)),
]
