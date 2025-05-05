import React from "react";
import { createRoot } from "react-dom/client";
import { PlaygroundApp } from "./components/PlaygroundApp";

const root = createRoot(document.getElementById("root")!);
root.render(<PlaygroundApp />);
