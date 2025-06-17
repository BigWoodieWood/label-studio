from django.db import migrations, connection
from core.redis import start_job_async_or_sync
from core.models import AsyncMigrationStatus
import logging


logger = logging.getLogger(__name__)

migration_name = "0014_add_filter_parent_idx"


# Actual DDL executed asynchronously
def forward_migration(migration_name):
    migration = AsyncMigrationStatus.objects.create(
        name=migration_name,
        status=AsyncMigrationStatus.STATUS_STARTED,
    )
    logger.debug(f"Start async migration {migration_name}")

    if connection.vendor == "postgresql":
        sql = """
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "filter_parent_idx" 
        ON "data_manager_filter" ("parent_id");
        """
    else:
        # SQLite / others – use regular index (no CONCURRENTLY support)
        sql = """
        CREATE INDEX IF NOT EXISTS "filter_parent_idx" 
        ON "data_manager_filter" ("parent_id");
        """

    with connection.cursor() as cursor:
        cursor.execute(sql)

    migration.status = AsyncMigrationStatus.STATUS_FINISHED
    migration.save()
    logger.debug(f"Async migration {migration_name} complete")


def reverse_migration(migration_name):
    migration = AsyncMigrationStatus.objects.create(
        name=migration_name,
        status=AsyncMigrationStatus.STATUS_STARTED,
    )
    logger.debug(f"Start async migration rollback {migration_name}")

    if connection.vendor == "postgresql":
        sql = "DROP INDEX CONCURRENTLY IF EXISTS \"filter_parent_idx\";"
    else:
        sql = "DROP INDEX IF EXISTS \"filter_parent_idx\";"

    with connection.cursor() as cursor:
        cursor.execute(sql)

    migration.status = AsyncMigrationStatus.STATUS_FINISHED
    migration.save()
    logger.debug(f"Async migration rollback {migration_name} complete")


def forwards(apps, schema_editor):
    start_job_async_or_sync(forward_migration, migration_name=migration_name)


def backwards(apps, schema_editor):
    start_job_async_or_sync(reverse_migration, migration_name=migration_name)


class Migration(migrations.Migration):
    # Must be non-atomic so concurrent index creation isn't wrapped in a transaction
    atomic = False

    dependencies = [
        ("data_manager", "0013_filter_parent_alter_filter_index"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ] 