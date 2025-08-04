import logging
import time
import traceback
from typing import Callable, Optional

from core.utils.common import load_func
from django.conf import settings
from django.db import transaction
from label_studio_sdk.label_interface import LabelInterface
from projects.models import ProjectImport, ProjectReimport, ProjectSummary
from rest_framework.exceptions import ValidationError
from users.models import User
from webhooks.models import WebhookAction
from webhooks.utils import emit_webhooks_for_instance

from .models import FileUpload
from .serializers import ImportApiSerializer
from .uploader import load_tasks_for_async_import

logger = logging.getLogger(__name__)


def async_import_background(
    import_id, user_id, recalculate_stats_func: Optional[Callable[..., None]] = None, **kwargs
):
    with transaction.atomic():
        try:
            project_import = ProjectImport.objects.get(id=import_id)
        except ProjectImport.DoesNotExist:
            logger.error(f'ProjectImport with id {import_id} not found, import processing failed')
            return
        if project_import.status != ProjectImport.Status.CREATED:
            logger.error(f'Processing import with id {import_id} already started')
            return
        project_import.status = ProjectImport.Status.IN_PROGRESS
        project_import.save(update_fields=['status'])

    user = User.objects.get(id=user_id)

    start = time.time()
    project = project_import.project
    tasks = None
    # upload files from request, and parse all tasks
    # TODO: Stop passing request to load_tasks function, make all validation before
    tasks, file_upload_ids, found_formats, data_columns = load_tasks_for_async_import(project_import, user)

    if project_import.preannotated_from_fields:
        # turn flat task JSONs {"column1": value, "column2": value} into {"data": {"column1"..}, "predictions": [{..."column2"}]
        tasks = reformat_predictions(tasks, project_import.preannotated_from_fields, project)

    # Always validate predictions regardless of commit_to_project setting
    validation_errors = []
    li = LabelInterface(project.label_config)

    for i, task in enumerate(tasks):
        if 'predictions' in task:
            for j, prediction in enumerate(task['predictions']):
                try:
                    validation_errors_list = li.validate_prediction(prediction, return_errors=True)
                    if validation_errors_list:
                        for error in validation_errors_list:
                            validation_errors.append(f'Task {i}, prediction {j}: {error}')
                except Exception as e:
                    error_msg = f'Task {i}, prediction {j}: Error validating prediction - {str(e)}'
                    validation_errors.append(error_msg)
                    logger.error(f'Exception during validation: {error_msg}')

    if validation_errors:
        error_message = f'Prediction validation failed ({len(validation_errors)} errors):\n'
        for error in validation_errors:
            error_message += f'- {error}\n'

        project_import.error = error_message
        project_import.status = ProjectImport.Status.FAILED
        project_import.save()
        return

    if project_import.commit_to_project:
        with transaction.atomic():
            # Lock summary for update to avoid race conditions
            summary = ProjectSummary.objects.select_for_update().get(project=project)

            # Immediately create project tasks and update project states and counters
            serializer = ImportApiSerializer(data=tasks, many=True, context={'project': project})
            serializer.is_valid(raise_exception=True)

            try:
                tasks = serializer.save(project_id=project.id)
                emit_webhooks_for_instance(user.active_organization, project, WebhookAction.TASKS_CREATED, tasks)

                task_count = len(tasks)
                annotation_count = len(serializer.db_annotations)
                prediction_count = len(serializer.db_predictions)
                # Update counters (like total_annotations) for new tasks and after bulk update tasks stats. It should be a
                # single operation as counters affect bulk is_labeled update

                recalculate_stats_counts = {
                    'task_count': task_count,
                    'annotation_count': annotation_count,
                    'prediction_count': prediction_count,
                }

                project.update_tasks_counters_and_task_states(
                    tasks_queryset=tasks,
                    maximum_annotations_changed=False,
                    overlap_cohort_percentage_changed=False,
                    tasks_number_changed=True,
                    recalculate_stats_counts=recalculate_stats_counts,
                )
                logger.info('Tasks bulk_update finished (async import)')

                summary.update_data_columns(tasks)
                # TODO: summary.update_created_annotations_and_labels
            except Exception as e:
                # Handle any other unexpected errors during task creation
                error_message = f'Error creating tasks: {str(e)}'
                project_import.error = error_message
                project_import.status = ProjectImport.Status.FAILED
                project_import.save()
                return
    else:
        # Do nothing - just output file upload ids for further use
        task_count = len(tasks)
        annotation_count = None
        prediction_count = None

    duration = time.time() - start

    project_import.task_count = task_count or 0
    project_import.annotation_count = annotation_count or 0
    project_import.prediction_count = prediction_count or 0
    project_import.duration = duration
    project_import.file_upload_ids = file_upload_ids
    project_import.found_formats = found_formats
    project_import.data_columns = data_columns
    if project_import.return_task_ids:
        project_import.task_ids = [task.id for task in tasks]

    project_import.status = ProjectImport.Status.COMPLETED
    project_import.save()


def set_import_background_failure(job, connection, type, value, _):
    import_id = job.args[0]
    ProjectImport.objects.filter(id=import_id).update(
        status=ProjectImport.Status.FAILED, traceback=traceback.format_exc(), error=str(value)
    )


def set_reimport_background_failure(job, connection, type, value, _):
    reimport_id = job.args[0]
    ProjectReimport.objects.filter(id=reimport_id).update(
        status=ProjectReimport.Status.FAILED,
        traceback=traceback.format_exc(),
        error=str(value),
    )


def reformat_predictions(tasks, preannotated_from_fields, project=None):
    """
    Transform flat task JSON objects into proper format with separate data and predictions fields.
    Also validates the predictions to ensure they are properly formatted using LabelInterface.

    Args:
        tasks: List of task data
        preannotated_from_fields: List of field names to convert to predictions
        project: Optional project instance to determine correct to_name and type from label config
    """
    new_tasks = []
    validation_errors = []

    # If project is provided, create LabelInterface to determine correct mappings
    li = None
    if project:
        try:
            li = LabelInterface(project.label_config)
        except Exception as e:
            logger.warning(f'Could not create LabelInterface for project {project.id}: {e}')

    for task_index, task in enumerate(tasks):
        if 'data' in task:
            task_data = task['data']
        else:
            task_data = task

        predictions = []
        for field in preannotated_from_fields:
            if field not in task_data:
                validation_errors.append(f"Task {task_index}: Preannotated field '{field}' not found in task data")
                continue

            value = task_data[field]
            if value is not None:
                # Try to determine correct to_name and type from project configuration
                to_name = 'text'  # Default fallback
                prediction_type = 'choices'  # Default fallback

                if li and li._controls:
                    # Find a control tag that matches the field name
                    for control_name, control_tag in li._controls.items():
                        if control_name == field:
                            # Use the control's to_name and determine type
                            if hasattr(control_tag, 'to_name') and control_tag.to_name:
                                to_name = (
                                    control_tag.to_name[0]
                                    if isinstance(control_tag.to_name, list)
                                    else control_tag.to_name
                                )
                                prediction_type = control_tag.tag.lower()
                            break

                # Create prediction from preannotated field
                # Handle different types of values
                if isinstance(value, dict):
                    # For complex structures like bounding boxes, use the value directly
                    prediction_value = value
                else:
                    # For simple values, use the prediction_type as the key
                    # Handle cases where the type doesn't match the expected key
                    value_key = prediction_type
                    if prediction_type == 'textarea':
                        value_key = 'text'

                    # Most types expect lists, but some expect single values
                    if prediction_type in ['rating', 'number', 'datetime']:
                        prediction_value = {value_key: value}
                    else:
                        # Wrap in list for most types
                        prediction_value = {value_key: [value] if not isinstance(value, list) else value}

                prediction = {
                    'result': [
                        {
                            'from_name': field,
                            'to_name': to_name,
                            'type': prediction_type,
                            'value': prediction_value,
                        }
                    ],
                    'score': 1.0,
                    'model_version': 'preannotated',
                }

                print(f'\nprediction: {prediction}\n')

                # Validate the prediction using LabelInterface if project is available
                # Note: We can't validate here since we don't have project context
                # The validation will happen during the actual import process
                predictions.append(prediction)

        # Create new task structure
        new_task = {'data': task_data, 'predictions': predictions}
        new_tasks.append(new_task)

    # If there are validation errors, raise them
    if validation_errors:
        raise ValidationError({'preannotated_fields': validation_errors})

    return new_tasks


post_process_reimport = load_func(settings.POST_PROCESS_REIMPORT)


def async_reimport_background(reimport_id, organization_id, user, **kwargs):

    with transaction.atomic():
        try:
            reimport = ProjectReimport.objects.get(id=reimport_id)
        except ProjectReimport.DoesNotExist:
            logger.error(f'ProjectReimport with id {reimport_id} not found, import processing failed')
            return
        if reimport.status != ProjectReimport.Status.CREATED:
            logger.error(f'Processing reimport with id {reimport_id} already started')
            return
        reimport.status = ProjectReimport.Status.IN_PROGRESS
        reimport.save(update_fields=['status'])

    project = reimport.project

    tasks, found_formats, data_columns = FileUpload.load_tasks_from_uploaded_files(
        reimport.project, reimport.file_upload_ids, files_as_tasks_list=reimport.files_as_tasks_list
    )

    with transaction.atomic():
        # Lock summary for update to avoid race conditions
        summary = ProjectSummary.objects.select_for_update().get(project=project)

        project.remove_tasks_by_file_uploads(reimport.file_upload_ids)
        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': project, 'user': user})
        serializer.is_valid(raise_exception=True)
        tasks = serializer.save(project_id=project.id)
        emit_webhooks_for_instance(organization_id, project, WebhookAction.TASKS_CREATED, tasks)

        task_count = len(tasks)
        annotation_count = len(serializer.db_annotations)
        prediction_count = len(serializer.db_predictions)

        recalculate_stats_counts = {
            'task_count': task_count,
            'annotation_count': annotation_count,
            'prediction_count': prediction_count,
        }

        # Update counters (like total_annotations) for new tasks and after bulk update tasks stats. It should be a
        # single operation as counters affect bulk is_labeled update
        project.update_tasks_counters_and_task_states(
            tasks_queryset=tasks,
            maximum_annotations_changed=False,
            overlap_cohort_percentage_changed=False,
            tasks_number_changed=True,
            recalculate_stats_counts=recalculate_stats_counts,
        )
        logger.info('Tasks bulk_update finished (async reimport)')

        summary.update_data_columns(tasks)
        # TODO: summary.update_created_annotations_and_labels

    reimport.task_count = task_count
    reimport.annotation_count = annotation_count
    reimport.prediction_count = prediction_count
    reimport.found_formats = found_formats
    reimport.data_columns = list(data_columns)
    reimport.status = ProjectReimport.Status.COMPLETED
    reimport.save()

    post_process_reimport(reimport)
