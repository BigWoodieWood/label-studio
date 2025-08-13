import { IconUpload, IconLsLabeling, IconCheck, IconInbox, IconSearch } from "@humansignal/icons";
import { Button, IconExternal, Typography } from "@humansignal/ui";
import { clsx } from "clsx";
import { useRef, useState } from "react";
import { getDocsUrl } from "../../../../../editor/src/utils/docs";
import { cn } from "../../../utils/bem";

// TypeScript interfaces for props
interface EmptyStateProps {
  canImport: boolean;
  onOpenSourceStorageModal?: () => void;
  onStartImportWithFiles?: (files: File[]) => void;
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
 * - onStartImportWithFiles: (files: File[]) => void — triggers Import modal with files
 * - userRole: string — User role (REVIEWER, ANNOTATOR, etc.) - optional
 * - project: object — Project object with assignment settings - optional
 * - hasData: boolean — Whether the project has any tasks - optional
 * - hasFilters: boolean — Whether filters are currently applied - optional
 * - canLabel: boolean — Whether the Label All Tasks button would be enabled - optional
 * - onLabelAllTasks: function — Callback for Label All Tasks action - optional
 * - onClearFilters: function — Callback to clear all applied filters - optional
 */
const flatten = (nested) => [].concat(...nested);

const traverseFileTree = (item, path) => {
  return new Promise((resolve) => {
    if (!item) return resolve([]);
    if (item.isFile) {
      if (item.name && item.name[0] === ".") return resolve([]);
      return item.file((file) => resolve([file]));
    }
    if (item.isDirectory) {
      const dirReader = item.createReader();
      dirReader.readEntries((entries) => {
        Promise.all(entries.map((entry) => traverseFileTree(entry, `${path ?? ""}${item.name}/`)))
          .then(flatten)
          .then(resolve);
      });
    } else {
      resolve([]);
    }
  });
};

const getDroppedFiles = (dataTransfer) => {
  return new Promise((resolve) => {
    const items = Array.from(dataTransfer?.items ?? []);
    if (!items.length || !items[0].webkitGetAsEntry) {
      return resolve(Array.from(dataTransfer?.files ?? []));
    }
    const entries = items.map((it) => it.webkitGetAsEntry());
    Promise.all(entries.map((entry) => traverseFileTree(entry)))
      .then(flatten)
      .then(resolve);
  });
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  canImport,
  onOpenSourceStorageModal,
  onStartImportWithFiles,
  // Role-based props (optional)
  userRole,
  project,
  hasData: _hasData,
  hasFilters,
  canLabel: _canLabel,
  onLabelAllTasks,
  onClearFilters,
}) => {
  const [dzHovered, setDzHovered] = useState(false);
  const fileInputRef = useRef(null);
  const isImportEnabled = Boolean(canImport);

  const onDrop = async (e) => {
    e.preventDefault();
    if (!isImportEnabled) return;
    const files = await getDroppedFiles(e.dataTransfer);
    if (files?.length) onStartImportWithFiles?.(files);
    setDzHovered(false);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    if (!isImportEnabled) return;
    setDzHovered(true);
  };

  const onDragLeave = () => setDzHovered(false);

  const onBrowseFiles = () => {
    if (!isImportEnabled) return;
    fileInputRef.current?.click();
  };

  const onFileInputChange = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onStartImportWithFiles?.(files);
    e.target.value = "";
  };

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
    <label
      htmlFor={isImportEnabled ? "dm-empty-file-input" : undefined}
      onDragOver={isImportEnabled ? onDragOver : undefined}
      onDrop={isImportEnabled ? onDrop : undefined}
      onDragLeave={isImportEnabled ? onDragLeave : undefined}
      tabIndex={-1}
      data-testid="empty-state-label"
      aria-labelledby="dm-empty-title"
      aria-describedby="dm-empty-desc"
      className={clsx(
        cn("dropzone").mod({ "is-dragging": dzHovered }).toString(),
        "transition-all duration-150 w-full flex items-center justify-center p-base m-0",
        isImportEnabled && "cursor-pointer",
      )}
    >
      <div className="w-full h-full">
        <div className="w-full h-full transition-border-color duration-150 border border-primary-border-subtler rounded-md bg-primary-background flex flex-col items-center justify-center text-center p-wide hover:border-primary-border-bold">
          <div className="flex items-center justify-center bg-primary-emphasis text-primary-icon rounded-full p-tight mb-4">
            <IconUpload width={40} height={40} />
          </div>

          <Typography id="dm-empty-title" variant="headline" size="medium" className="mb-tight">
            Import data to your project
          </Typography>

          <Typography id="dm-empty-desc" size="medium" className="text-neutral-content-subtler mb-8 max-w-xl">
            Connect cloud storage (S3, GCS, Azure, and others) or drag &amp; drop to upload files from your computer.
          </Typography>

          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {isImportEnabled && dzHovered ? "Drop files to upload" : ""}
          </div>

          <div className="flex gap-4 w-full max-w-md">
            <Button
              variant="primary"
              look="filled"
              className="flex-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenSourceStorageModal?.();
              }}
              data-testid="dm-connect-source-storage-button"
            >
              Connect Storage
            </Button>

            {isImportEnabled && (
              <Button
                variant="primary"
                look="outlined"
                className="flex-1"
                onClick={onBrowseFiles}
                data-testid="dm-browse-files-button"
              >
                Browse Files
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

          <input
            id="dm-empty-file-input"
            type="file"
            multiple
            onChange={onFileInputChange}
            style={{ display: "none" }}
            ref={fileInputRef}
            aria-hidden
          />
        </div>
      </div>
    </label>
  );
};
