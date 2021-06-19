import React, { useMemo, useState } from "react";
import Excalidraw from "@excalidraw/excalidraw";
import "./App.css";
import { exportToStaticUrl, loadFromStaticUrl } from "./static-urls";
import {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/excalidraw/types/element/types";
import { AppState } from "@excalidraw/excalidraw/types/types";

const STATIC_DATA_KEY = "s";
const STATIC_DATA_MARKER = `#${STATIC_DATA_KEY}=`;

const uiProps: React.ComponentProps<typeof Excalidraw> = {
  onExportToBackend: (elements, appState, canvas) =>
    console.log("export to backend", { elements, appState, canvas }),
};

interface InitialData {
  elements?: ExcalidrawElement[];
  appState?: AppState;
}

const initFromUrl = async (): Promise<InitialData> => {
  if (!window.location.hash.startsWith(STATIC_DATA_MARKER)) {
    return {};
  }

  const encodedProject = window.location.hash.substr(STATIC_DATA_MARKER.length);
  if (encodedProject.length === 0) {
    return {};
  }

  const { elements } = await loadFromStaticUrl(encodedProject);
  window.location.hash = "";

  return {
    elements,
  };
};

const exportToBackend = async (
  elements: readonly NonDeletedExcalidrawElement[]
) => {
  const encodedProject = await exportToStaticUrl(elements);

  const url = new URL(window.location.href);
  url.pathname = "/share";
  const params = new URLSearchParams();
  params.set(STATIC_DATA_KEY, encodedProject);
  url.search = params.toString();
  const urlString = url.toString();
  await navigator.clipboard.writeText(urlString);

  window.alert(`Copied to clipboard`);
};

function App() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialData = useMemo(
    () =>
      initFromUrl()
        .then((p) => {
          setErrorMessage(null);
          return p;
        })
        .catch((e) => {
          setErrorMessage(e.message);
          return {};
        }),
    []
  );

  if (errorMessage !== null) {
    return <div>Error: {errorMessage}</div>;
  }

  return (
    <Excalidraw
      {...uiProps}
      initialData={initialData}
      onExportToBackend={(elements) => exportToBackend(elements)}
    />
  );
}

export default App;
