from django.urls import path

from .api import ScatterTasksAPI

app_name = 'scatter'

urlpatterns = [
    path('api/scatter/tasks', ScatterTasksAPI.as_view(), name='scatter-tasks'),
]
