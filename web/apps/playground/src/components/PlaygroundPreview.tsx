import { useEffect, useRef } from "react";
import { unmountComponentAtNode } from "react-dom";
import type { FC } from "react";
import { generateSampleTaskFromConfig } from "../utils/generateSampleTask";

interface PlaygroundPreviewProps {
  config: string;
  loading: boolean;
  error: string | null;
  interfaces: string[];
}

export const PlaygroundPreview: FC<PlaygroundPreviewProps> = ({ config, loading, error, interfaces }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const lsfInstance = useRef<any>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    let LabelStudio: any;
    let dependencies: any;

    function cleanup() {
      if (lsfInstance.current) {
        lsfInstance.current.destroy();
        lsfInstance.current = null;
        if (rootRef.current) {
          unmountComponentAtNode(rootRef.current);
        }
      }
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    }

    async function loadLSF() {
      dependencies = await import("@humansignal/editor");
      LabelStudio = dependencies.LabelStudio;
      if (!LabelStudio || !rootRef.current) return;
      cleanup();
      const sampleTask = generateSampleTaskFromConfig(config);
      const annotations = sampleTask.annotation
        ? [{ id: 1, result: [sampleTask.annotation] }]
        : [{ id: 1, result: [] }];
      lsfInstance.current = new LabelStudio(rootRef.current, {
        config,
        task: {
          id: 1,
          data: sampleTask.data,
          annotations,
          predictions: [],
        },
        interfaces,
        forceBottomPanel: true,
      });
    }

    if (!loading && !error && config) {
      rafId.current = requestAnimationFrame(() => {
        loadLSF();
      });
    }

    return () => {
      cleanup();
    };
    // eslint-disable-next-line
  }, [config, loading, error, interfaces]);

  return (
    <div className="h-full flex flex-col items-center justify-center">
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
