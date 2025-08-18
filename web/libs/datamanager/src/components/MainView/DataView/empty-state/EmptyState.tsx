import type { FC } from "react";
import {
  IconUpload,
  IconLsLabeling,
  IconCheck,
  IconSearch,
  IconInbox,
  IconCloudProviderS3,
  IconCloudProviderGCS,
  IconCloudProviderAzure,
  IconCloudProviderRedis,
} from "@humansignal/icons";
import { Button, IconExternal, Typography, Tooltip } from "@humansignal/ui";
import { getDocsUrl } from "../../../../../../editor/src/utils/docs";

declare global {
  interface Window {
    APP_SETTINGS?: {
      whitelabel_is_active?: boolean;
    };
  }
}

// TypeScript interfaces for props
interface EmptyStateProps {
  canImport: boolean;
  onOpenSourceStorageModal?: () => void;
  onOpenImportModal?: () => void;
  // Role-based props (optional)
  userRole?: string;
  project?: {
    assignment_settings?: {
      label_stream_task_distribution?: "auto_distribution" | "assigned_only" | string;
    };
  };
  hasData?: boolean;
  hasFilters?: boolean;
  canLabel?: boolean;
  onLabelAllTasks?: () => void;
  onClearFilters?: () => void;
}

/**
 * Unified empty state for Data Manager
 * Handles different empty states based on user role and context
 *
 * Props:
 * - canImport: boolean — whether import is enabled in interfaces
 * - onOpenSourceStorageModal: () => void — opens Connect Source Storage modal
 * - onOpenImportModal: () => void — opens Import modal
 * - userRole: string — User role (REVIEWER, ANNOTATOR, etc.) - optional
 * - project: object — Project object with assignment settings - optional
 * - hasData: boolean — Whether the project has any tasks - optional
 * - hasFilters: boolean — Whether filters are currently applied - optional
 * - canLabel: boolean — Whether the Label All Tasks button would be enabled - optional
 * - onLabelAllTasks: function — Callback for Label All Tasks action - optional
 * - onClearFilters: function — Callback to clear all applied filters - optional
 */

export const EmptyState: FC<EmptyStateProps> = ({
  canImport,
  onOpenSourceStorageModal,
  onOpenImportModal,
  // Role-based props (optional)
  userRole,
  project,
  hasData: _hasData,
  hasFilters,
  canLabel: _canLabel,
  onLabelAllTasks,
  onClearFilters,
}) => {
  const isImportEnabled = Boolean(canImport);

  // If filters are applied, show the filter-specific empty state (regardless of user role)
  if (hasFilters) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-wide">
        <div className="flex items-center justify-center bg-warning-background text-warning-icon rounded-full p-tight mb-4">
          <IconSearch width={40} height={40} />
        </div>

        <Typography variant="headline" size="medium" className="mb-tight">
          No tasks found
        </Typography>

        <Typography size="medium" className="text-neutral-content-subtler mb-8 max-w-xl">
          Try adjusting or clearing the filters to see more results
        </Typography>

        <Button variant="primary" look="outlined" onClick={onClearFilters} data-testid="dm-clear-filters-button">
          Clear Filters
        </Button>
      </div>
    );
  }

  // Role-based empty state logic (from RoleBasedEmptyState)
  // For service roles (reviewers/annotators), show role-specific empty states when they have no visible tasks
  // This applies whether the project has tasks or not - what matters is what's visible to this user
  if (userRole === "REVIEWER" || userRole === "ANNOTATOR") {
    // Reviewer empty state
    if (userRole === "REVIEWER") {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-wide">
          <div className="flex items-center justify-center bg-primary-emphasis text-primary-icon rounded-full p-tight mb-4">
            <IconCheck width={40} height={40} />
          </div>

          <Typography variant="headline" size="medium" className="mb-tight">
            No tasks available for review or labeling
          </Typography>

          <Typography size="medium" className="text-neutral-content-subtler max-w-xl">
            Tasks imported to this project will appear here
          </Typography>
        </div>
      );
    }

    // Annotator empty state
    if (userRole === "ANNOTATOR") {
      const isAutoDistribution = project?.assignment_settings?.label_stream_task_distribution === "auto_distribution";
      const isManualDistribution = project?.assignment_settings?.label_stream_task_distribution === "assigned_only";

      if (isAutoDistribution) {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-wide">
            <div className="flex items-center justify-center bg-primary-emphasis text-primary-icon rounded-full p-tight mb-4">
              <IconLsLabeling width={40} height={40} />
            </div>

            <Typography variant="headline" size="medium" className="mb-tight">
              Start labeling tasks
            </Typography>

            <Typography size="medium" className="text-neutral-content-subtler mb-8 max-w-xl">
              Tasks you've labeled will appear here
            </Typography>

            <Button
              variant="primary"
              look="filled"
              disabled={false}
              onClick={onLabelAllTasks}
              data-testid="dm-label-all-tasks-button"
            >
              Label All Tasks
            </Button>
          </div>
        );
      }

      if (isManualDistribution) {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-wide">
            <div className="flex items-center justify-center bg-primary-emphasis text-primary-icon rounded-full p-tight mb-4">
              <IconInbox width={40} height={40} />
            </div>

            <Typography variant="headline" size="medium" className="mb-tight">
              No tasks available
            </Typography>

            <Typography size="medium" className="text-neutral-content-subtler max-w-xl">
              Tasks assigned to you will appear here
            </Typography>
          </div>
        );
      }

      // Fallback for annotators with unknown distribution setting
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-wide">
          <div className="flex items-center justify-center bg-primary-emphasis text-primary-icon rounded-full p-tight mb-4">
            <IconInbox width={40} height={40} />
          </div>

          <Typography variant="headline" size="medium" className="mb-tight">
            No tasks available
          </Typography>

          <Typography size="medium" className="text-neutral-content-subtler max-w-xl">
            Tasks will appear here when they become available
          </Typography>
        </div>
      );
    }
  }

  // Default case: show import functionality (existing behavior for Owners/Admins/Managers)
  return (
    <div
      data-testid="empty-state-label"
      aria-labelledby="dm-empty-title"
      aria-describedby="dm-empty-desc"
      className="w-full flex items-center justify-center m-0"
    >
      <div className="w-full h-full">
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-wide">
          <div className="flex items-center justify-center bg-primary-emphasis text-primary-icon rounded-full p-tight mb-4">
            <IconUpload width={40} height={40} />
          </div>

          <Typography id="dm-empty-title" variant="headline" size="medium" className="mb-tight">
            Import data to get your project started
          </Typography>

          <Typography id="dm-empty-desc" size="medium" className="text-neutral-content-subtler mb-tighter max-w-xl">
            Start by connecting your cloud storage or uploading files from your computer
          </Typography>

          <div className="flex items-center justify-center gap-base mb-wide" data-testid="dm-storage-provider-icons">
            <Tooltip title="Amazon S3">
              <div className="flex items-center justify-center p-2" aria-label="Amazon S3">
                <IconCloudProviderS3 width={32} height={32} className="text-neutral-content-subtler" />
              </div>
            </Tooltip>
            <Tooltip title="Google Cloud Storage">
              <div className="flex items-center justify-center p-2" aria-label="Google Cloud Storage">
                <IconCloudProviderGCS width={32} height={32} className="text-neutral-content-subtler" />
              </div>
            </Tooltip>
            <Tooltip title="Azure Blob Storage">
              <div className="flex items-center justify-center p-2" aria-label="Azure Blob Storage">
                <IconCloudProviderAzure width={32} height={32} className="text-neutral-content-subtler" />
              </div>
            </Tooltip>
            <Tooltip title="Redis Storage">
              <div className="flex items-center justify-center p-2" aria-label="Redis Storage">
                <IconCloudProviderRedis width={32} height={32} className="text-neutral-content-subtler" />
              </div>
            </Tooltip>
          </div>

          <div className="flex gap-4 w-full max-w-md">
            <Button
              variant="primary"
              look="filled"
              className="flex-1"
              onClick={onOpenSourceStorageModal}
              data-testid="dm-connect-source-storage-button"
            >
              Connect Cloud Storage
            </Button>

            {isImportEnabled && (
              <Button
                variant="primary"
                look="outlined"
                className="flex-1"
                onClick={onOpenImportModal}
                data-testid="dm-import-button"
              >
                Import
              </Button>
            )}
          </div>

          {!window.APP_SETTINGS?.whitelabel_is_active && (
            <a
              href={getDocsUrl("guide/tasks")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-body-small text-primary-link hover:underline mt-6"
              data-testid="dm-docs-data-import-link"
            >
              See docs on importing data
              <span className="sr-only"> (opens in a new tab)</span>
              <IconExternal width={20} height={20} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
