"""
Core FSM URL patterns for Label Studio.

Provides basic URL routing for state management API that can be extended
by Label Studio Enterprise with additional endpoints.
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

# Extension point for Label Studio Enterprise
# Enterprise can add additional URL patterns here
enterprise_urlpatterns = []

# Function to register additional URL patterns from Enterprise
def register_enterprise_urls(patterns):
    """
    Register additional URL patterns from Label Studio Enterprise.

    Args:
        patterns: List of URL patterns to register

    Example:
        # In LSE code:
        from label_studio.fsm.urls import register_enterprise_urls

        enterprise_patterns = [
            path('api/fsm/bulk/', BulkFSMViewSet.as_view(), name='fsm-bulk'),
            path('api/fsm/analytics/', AnalyticsFSMViewSet.as_view(), name='fsm-analytics'),
        ]
        register_enterprise_urls(enterprise_patterns)
    """
    global enterprise_urlpatterns
    enterprise_urlpatterns.extend(patterns)


# Include enterprise URL patterns if any are registered
if enterprise_urlpatterns:
    urlpatterns.extend(enterprise_urlpatterns)
