import "./jsdom";

import { Handler, HandlerResponse } from "@netlify/functions";
import jsonUrlMakeCodec from "json-url";
import { registerFont } from "canvas";
import { exportToBlob } from "@excalidraw/excalidraw";

import { ImportData, SupportedVersion } from "../../src/static-urls";

const codec = jsonUrlMakeCodec("lzma");

registerFont(require.resolve("./fonts/Cascadia.ttf"), { family: "Cascadia" });
registerFont(require.resolve("./fonts/FG_Virgil.ttf"), { family: "Virgil" });

const DEFAULT_SCALE = 1;

const blobToBytes = async (blob: Blob): Promise<Buffer> => {
  const reader = new window.FileReader();
  const done: Promise<string | ArrayBuffer | null> = new Promise((res) =>
    reader.addEventListener("loadend", () => res(reader.result))
  );
  reader.readAsArrayBuffer(blob);
  const buf = await done;
  if (buf === null || typeof buf == "string") {
    throw new Error("Invalid blob type");
  }
  return Buffer.from(buf);
};

export const handler: Handler = async (event): Promise<HandlerResponse> => {
  const { s: compressed } = event.queryStringParameters!;
  if (!compressed) {
    return {
      statusCode: 400,
      body: "Expected s parameter with compressed image data",
    };
  }

  const { elements, version }: ImportData = await codec.decompress(compressed);
  if (!elements) {
    return {
      statusCode: 400,
      body: "Missing elements from serialized image",
    };
  }
  if (!Object.values(SupportedVersion).includes(version)) {
    return {
      statusCode: 400,
      body: `Unsupported project version. This build supports: ${Object.values(
        SupportedVersion
      ).join(", ")}`,
    };
  }

  const blob = await exportToBlob({
    elements,
    mimeType: "image/png",
    getDimensions: (width, height) => ({ width, height, scale: DEFAULT_SCALE }),
  });
  if (blob === null) {
    return {
      statusCode: 500,
    };
  }

  const buf = await blobToBytes(blob);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "image/png",
    },
    isBase64Encoded: true,
    body: buf.toString("base64"),
  };
};
