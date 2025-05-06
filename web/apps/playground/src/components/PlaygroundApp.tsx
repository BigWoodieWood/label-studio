import React, { useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import { CodeEditor } from "@humansignal/ui";
import { PlaygroundPreview } from "./PlaygroundPreview";
import { configAtom, loadingAtom, errorAtom, interfacesAtom } from "../atoms/configAtoms";
import { getQueryParams, getInterfacesFromParams } from "../utils/query";
import { completeAfter, completeIfInTag } from "../utils/codeEditor";
import tags from "../utils/schema.json";

import { cnm } from "@humansignal/shad/utils";
import styles from "./PlaygroundApp.module.scss";


export const PlaygroundApp = () => {
  const [config, setConfig] = useAtom(configAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [error, setError] = useAtom(errorAtom);
  const [interfaces, setInterfaces] = useAtom(interfacesAtom);
  const [editorWidth, setEditorWidth] = useState(50); // percent
  const dragging = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const params = getQueryParams();
    const configParam = params.get("config");
    const configUrl = params.get("configUrl");
    setInterfaces(getInterfacesFromParams(params));

    async function loadConfig() {
      if (configParam) {
        try {
          const decoded = atob(configParam);

          setConfig(decoded);
        } catch (e) {
          setError("Failed to decode base64 config. Are you sure it's a valid base64 string?");
        }
        return;
      }
      if (configUrl) {
        setLoading(true);
        try {
          const res = await fetch(configUrl);
          if (!res.ok) throw new Error("Failed to fetch config from URL.");
          const text = await res.text();
          setConfig(text);
        } catch (e) {
          setError("Failed to fetch config from URL.");
        } finally {
          setLoading(false);
        }
      }
    }
    loadConfig();
    // eslint-disable-next-line
  }, [setConfig, setError, setLoading, setInterfaces]);

  // Draggable divider logic
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const percent = (e.clientX / window.innerWidth) * 100;
      setEditorWidth(Math.max(20, Math.min(80, percent)));
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div
      className={cnm("flex flex-col h-screen w-screen", {
        [styles.root]: true,
      })}
    >
      {/* Minimal top bar */}
      <div className="flex items-center h-10 px-tight text-heading-medium select-none border-b border-neutral-border">
        <span className="font-semibold tracking-tight text-body-medium">LabelStudio Playground</span>
      </div>
      {/* Editor/Preview split */}
      <div className="flex flex-1 min-h-0 min-w-0 relative">
        {/* Editor Panel */}
        <div className="flex flex-col min-w-0 h-full" style={{ width: `${editorWidth}%` }}>
          <div className="flex-1 min-h-0 min-w-0">
            <CodeEditor
              ref={editorRef}
              value={config}
              onChange={(_editor, _data, value) => setConfig(value)}
              border={false}
              // @ts-ignore
              autoCloseTags
              smartIndent
              detach
              extensions={["hint", "xml-hint"]}
              options={{
                mode: "xml",
                theme: "default",
                lineNumbers: true,
                extraKeys: {
                  "'<'": completeAfter,
                  "' '": completeIfInTag,
                  "'='": completeIfInTag,
                  "Ctrl-Space": "autocomplete",
                },
                hintOptions: { schemaInfo: tags },
              }}
            />
          </div>
        </div>
        {/* Divider */}
        <div
          className="w-2 cursor-col-resize bg-neutral-border-subtler hover:bg-neutral-border-subtle transition-colors duration-100 z-10"
          onMouseDown={() => (dragging.current = true)}
          role="separator"
          aria-orientation="vertical"
          tabIndex={-1}
        />
        {/* Preview Panel */}
        <div className="flex flex-col min-w-0 h-full" style={{ width: `${100 - editorWidth}%` }}>
          <div className="flex-1 min-h-0 min-w-0">
            <PlaygroundPreview config={config} loading={loading} error={error} interfaces={interfaces} />
          </div>
        </div>
      </div>
    </div>
  );
};
