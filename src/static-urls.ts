import { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import jsonUrlInit from "json-url";

const DEFAULT_STATIC_CODEC = "lzma";
const codec = jsonUrlInit(DEFAULT_STATIC_CODEC);

export enum SupportedVersion {
  VERSION_2 = 2,
}

export interface ExportData {
  version: SupportedVersion;
  elements: readonly NonDeletedExcalidrawElement[];
}

export interface ImportData extends ExportData {
  elements: NonDeletedExcalidrawElement[];
}

export const loadFromStaticUrl = async (
  urlPart: string
): Promise<ImportData> => {
  let data: ImportData;
  try {
    data = await codec.decompress(urlPart);
  } catch (e) {
    console.error("Failed to read from url part:", e);
    throw new Error(`Failed to read from url: ${e.message}`);
  }
  if (!Object.values(SupportedVersion).includes(data.version)) {
    throw new Error(
      `Unsupported data version. This app can read: ${Object.values(
        SupportedVersion
      ).join(", ")}`
    );
  }
  return data;
};

export const exportToStaticUrl = async (
  elements: readonly NonDeletedExcalidrawElement[]
): Promise<string> => {
  const data: ExportData = {
    version: SupportedVersion.VERSION_2,
    elements,
  };

  return await codec.compress(data);
};
