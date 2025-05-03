from typing import Dict, Any

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from projects.models import Project
from tasks.models import Task
from core.permissions import ViewClassPermission, all_permissions
from core.utils.common import int_from_request

from .serializers import ScatterTaskSerializer
from .constants import DIRECT_DB_FIELDS, ALLOWED_API_PARAMS


class ScatterPagination(PageNumberPagination):
    """Pagination with default page size 1000 (can be overridden via ?page_size)."""

    page_size = 1000
    page_size_query_param = "page_size"
    max_page_size = 5000


class ScatterTasksAPI(generics.ListAPIView):
    """Return all tasks for scatter plot with only requested fields.

    Query parameters:
        project (int, required): project id
        page / page_size: pagination control
        x, y (str, required): keys in task.data or direct columns for coordinates
        class, text, r, image, time (str, optional): additional keys

    Response: paginated list with `tasks` key similar to TaskListAPI.
    """

    serializer_class = ScatterTaskSerializer
    pagination_class = ScatterPagination
    permission_required = ViewClassPermission(GET=all_permissions.tasks_view)

    # ---------------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------------

    def _project_id(self) -> int:
        return int_from_request(self.request.GET, "project", None)

    def _validate_and_build_fields_map(self) -> Dict[str, str]:
        """Validate incoming query params and build mapping api_name -> native_key."""
        params: Dict[str, str] = {}
        for api_name in ALLOWED_API_PARAMS:
            if api_name in self.request.GET:
                native_key = self.request.GET.get(api_name)  # type: ignore[arg-type]
                if native_key:
                    params[api_name] = native_key
        # Ensure mandatory x & y
        if "x" not in params or "y" not in params:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Query parameters 'x' and 'y' are required.")
        return params

    # ------------------------------------------------------------------
    # DRF overrides
    # ------------------------------------------------------------------

    def initial(self, request, *args, **kwargs):
        """Called at the beginning of the view lifecycle; good place to set instance vars."""
        super().initial(request, *args, **kwargs)
        
        # Validate project and build fields map early
        project_id = self._project_id()
        if not project_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Query parameter 'project' is required.")

        self.project = get_object_or_404(Project, pk=project_id)
        self.check_object_permissions(request, self.project)
        
        # Store fields map for both queryset building and serializer context
        self.fields_map = self._validate_and_build_fields_map()

    def get_queryset(self) -> QuerySet[Any]:
        # Get direct columns we need to fetch
        direct_cols = [v for v in self.fields_map.values() if v in DIRECT_DB_FIELDS]

        # Simpler query that just fetches the task and its data field
        qs = (
            Task.objects.for_user(self.request.user)
            .filter(project=self.project)
            .only("id", "data", *direct_cols)
            .order_by("id")  # stable ordering for pagination
        )
        return qs

    def list(self, request, *args, **kwargs):  # type: ignore[override]
        # Requested mapping already available from initial()
        return super().list(request, *args, **kwargs)

    def get_serializer_context(self):  # type: ignore[override]
        ctx = super().get_serializer_context()
        ctx["requested"] = self.fields_map
        return ctx

    def paginate_queryset(self, queryset):  # type: ignore[override]
        """Override to include total like TaskListAPI response format."""
        paginated = super().paginate_queryset(queryset)
        self._total_count = queryset.count()
        return paginated

    def get_paginated_response(self, data):  # type: ignore[override]
        return Response(
            {
                "total": self._total_count,
                "page_size": self.paginator.get_page_size(self.request),
                "page": int(self.request.GET.get("page", 1)),
                "tasks": data,
            }
        )
