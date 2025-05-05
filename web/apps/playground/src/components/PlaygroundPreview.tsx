import { useEffect, useRef } from "react";
import type { FC } from "react";

interface PlaygroundPreviewProps {
  config: string;
  loading: boolean;
  error: string | null;
  interfaces: string[];
}

export const PlaygroundPreview: FC<PlaygroundPreviewProps> = ({ config, loading, error, interfaces }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const lsfInstance = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    let LabelStudio: any;
    let dependencies: any;

    async function loadLSF() {
      dependencies = await import("@humansignal/editor");
      LabelStudio = (window as any).LabelStudio || dependencies.LabelStudio;
      if (!LabelStudio || !rootRef.current) return;
      if (lsfInstance.current) {
        lsfInstance.current.destroy();
        lsfInstance.current = null;
      }
      lsfInstance.current = new LabelStudio(rootRef.current, {
        config,
        task: { id: 1, data: {}, annotations: [], predictions: [] },
        interfaces,
      });
    }
    if (!loading && !error && config) {
      loadLSF();
    }
    return () => {
      isMounted = false;
      if (lsfInstance.current) {
        lsfInstance.current.destroy();
        lsfInstance.current = null;
      }
    };
    // eslint-disable-next-line
  }, [config, loading, error, interfaces]);

  return (
    <div className="min-h-full flex flex-col items-center justify-center">
      {error ? (
        <div className="text-danger-foreground text-body-medium">{error}</div>
      ) : loading ? (
        <div className="text-secondary-foreground text-body-medium">Loading config...</div>
      ) : (
        <div id="label-studio" ref={rootRef} className="w-full h-full" />
      )}
    </div>
  );
};
