import { IconUpload } from "@humansignal/icons";
import { Button, IconExternal, Typography } from "@humansignal/ui";
import { clsx } from "clsx";
import { useState } from "react";
import { getDocsUrl } from "../../../../../editor/src/utils/docs";
import { cn } from "../../../utils/bem";

/**
 * Empty state for Data Manager when there is no data yet
 * Props:
 * - canImport: boolean — whether import is enabled in interfaces
 * - onOpenSourceStorageModal: () => void — opens Connect Source Storage modal
 * - onStartImportWithFiles: (files: File[]) => void — triggers Import modal with files
 */
export const EmptyState = ({ canImport, onOpenSourceStorageModal, onStartImportWithFiles }) => {
  const [dzHovered, setDzHovered] = useState(false);

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

  const onDrop = async (e) => {
    e.preventDefault();
    const files = await getDroppedFiles(e.dataTransfer);
    if (files?.length) onStartImportWithFiles?.(files);
    setDzHovered(false);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDzHovered(true);
  };

  const onDragLeave = () => setDzHovered(false);

  const onBrowseFiles = () => {
    const input = document.getElementById("dm-empty-file-input");
    input?.click();
  };

  const onFileInputChange = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onStartImportWithFiles?.(files);
    e.target.value = "";
  };

  return (
    <label
      htmlFor="dm-empty-file-input"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      data-testid="empty-state-label"
      aria-label="Import data by dragging files or using the buttons below"
      className={clsx(
        cn("dropzone").mod({ "is-dragging": dzHovered }).toString(),
        "transition-all duration-150 w-full flex items-center justify-center p-base m-0 cursor-pointer",
      )}
    >
      <div className="w-full h-full">
        <div className="w-full h-full transition-border-color duration-150 border border-primary-border-subtler rounded-md bg-primary-background flex flex-col items-center justify-center text-center p-wide hover:border-primary-border-bold">
          <div className="flex items-center justify-center bg-primary-emphasis text-primary-icon rounded-full p-tight mb-4">
            <IconUpload size={40} />
          </div>

          <Typography variant="headline" size="medium" className="mb-tight">
            Import data to your project
          </Typography>

          <Typography size="medium" className="text-neutral-content-subtler mb-8 max-w-xl">
            Connect cloud storage (S3, GCS, Azure, and others) or drag &amp; drop to upload files from your computer.
          </Typography>

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
              aria-label="Connect Source Storage"
            >
              Connect Storage
            </Button>

            {canImport && (
              <Button
                variant="primary"
                look="outlined"
                className="flex-1"
                onClick={onBrowseFiles}
                aria-label="Upload files"
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
              <IconExternal width={20} height={20} />
            </a>
          )}

          <input
            id="dm-empty-file-input"
            type="file"
            multiple
            onChange={onFileInputChange}
            style={{ display: "none" }}
            aria-hidden
          />
        </div>
      </div>
    </label>
  );
};
