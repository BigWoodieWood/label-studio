import { memo, useEffect, useRef } from "react";
import { unmountComponentAtNode } from "react-dom";
import type { FC } from "react";
import { generateSampleTaskFromConfig } from "../utils/generateSampleTask";
import { useAtomValue } from "jotai";
import { configAtom, errorAtom, loadingAtom, interfacesAtom } from "../atoms/configAtoms";

type PlaygroundPreviewProps = {};

export const PlaygroundPreview: FC<PlaygroundPreviewProps> = memo(() => {
  const config = useAtomValue(configAtom);
  const loading = useAtomValue(loadingAtom);
  const error = useAtomValue(errorAtom);
  const interfaces = useAtomValue(interfacesAtom);

  const rootRef = useRef<HTMLDivElement>(null);
  const lsfInstance = useRef<any>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    let LabelStudio: any;
    let dependencies: any;

    function cleanup() {
      if (typeof window !== "undefined" && (window as any).LabelStudio) {
        delete (window as any).LabelStudio;
      }
      if (rootRef.current) {
        unmountComponentAtNode(rootRef.current);
      }
      if (lsfInstance.current) {
        lsfInstance.current.destroy();
        lsfInstance.current = null;
      }
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    }

    async function loadLSF() {
      console.time("loadLSF");
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
        settings: {
          forceBottomPanel: true,
          collapsibleBottomPanel: true,
          defaultCollapsedBottomPanel: true,
        },
      });
      console.timeEnd("loadLSF");
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
}, () => true);
