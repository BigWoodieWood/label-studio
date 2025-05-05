import React, { useEffect } from "react";
import { useAtom } from "jotai";
import { CodeEditor } from "@humansignal/ui";
import { PlaygroundPreview } from "./PlaygroundPreview";
import {
  configAtom,
  loadingAtom,
  errorAtom,
  interfacesAtom,
} from "../atoms/configAtoms";
import { getQueryParams, getInterfacesFromParams } from "../utils/query";

export const PlaygroundApp = () => {
  const [config, setConfig] = useAtom(configAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [error, setError] = useAtom(errorAtom);
  const [interfaces, setInterfaces] = useAtom(interfacesAtom);

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

  return (
    <div className="flex h-screen w-screen">
      <div className="flex flex-col flex-1 border-r border-border min-w-0">
        <h2 className="m-0 p-tight text-heading-medium">LabelStudio Config Editor</h2>
        <CodeEditor
          value={config}
          onChange={(_editor, _data, value) => setConfig(value)}
          options={{ mode: "xml", lineNumbers: true }}
          border
          controlled
        />
      </div>
      <div className="flex flex-col flex-2 min-w-0">
        <h2 className="m-0 p-tight text-heading-medium">Preview</h2>
        <div className="p-tight">
          <PlaygroundPreview config={config} loading={loading} error={error} interfaces={interfaces} />
        </div>
      </div>
    </div>
  );
};
