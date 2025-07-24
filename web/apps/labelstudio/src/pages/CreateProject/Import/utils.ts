import { API } from "apps/labelstudio/src/providers/ApiProvider";

/**
 * Check if the error is a rate limit error (429 status)
 */
const isRateLimit = (error: any): boolean => {
  return error?.$meta?.status === 429 || error?.status === 429;
};

/**
 * Create a user-friendly rate limit error for import
 */
const createRateLimitError = (originalError: any) => {
  // Extend the original error with our custom properties
  originalError.name = 'ImportRateLimitError';
  originalError.id = 'IMPORT_RATE_LIMIT';
  originalError.detail = "Could not upload file(s): Upload rate limit reached";
  originalError.message = "Only one file can be imported per second. Please wait a moment, then retry your upload.";
  
  return originalError;
};

export const importFiles = async ({
  files,
  query,
  body,
  project,
  onUploadStart,
  onUploadFinish,
  onFinish,
  onError,
  dontCommitToProject,
}: {
  files: { name: string }[];
  query: any;
  body: any;
  project: any;
  onUploadStart?: (files: { name: string }[]) => void;
  onUploadFinish?: (files: { name: string }[]) => void;
  onFinish?: (response: any) => void;
  onError?: (response: any) => void;
  dontCommitToProject?: boolean;
}) => {
  onUploadStart?.(files);

  const contentType = body instanceof FormData
    ? "multipart/form-data" // usual multipart for usual files
    : "application/x-www-form-urlencoded"; // chad urlencoded for URL uploads
      
  try {
    const res = await API.invoke(
      "importFiles",
      { pk: project.id, ...query },
      { headers: { "Content-Type": contentType }, body },
    );

    if (res && !res.error) {
      onFinish?.(res);
    } else if (res?.error) {
      // Check if this is a rate limit error
      if (isRateLimit(res)) {
        onError?.(createRateLimitError(res));
      } else {
        onError?.(res);
      }
    }

    onUploadFinish?.(files);
  } catch (err) {
    onUploadFinish?.(files);
    
    // Check if this is a rate limit error
    if (isRateLimit(err)) {
      onError?.(createRateLimitError(err));
    } else {
      onError?.(err);
    }
  }
};
