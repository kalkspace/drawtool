import "./jsdom";

import { Handler, HandlerResponse } from "@netlify/functions";
import jsonUrlMakeCodec from "json-url";
import { registerFont } from "canvas";
import { exportToBlob, exportToSvg } from "@excalidraw/excalidraw";

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

enum ImageType {
  PNG = "png",
  JPG = "jpg",
  SVG = "svg",
}

const imageTypeToMime: Record<ImageType, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  svg: "image/svg+xml",
};

interface QueryParams {
  s?: string;
  type?: ImageType;
  scale?: string;
}

export const handler: Handler = async (event): Promise<HandlerResponse> => {
  const {
    s: compressed,
    type: imageType = ImageType.PNG,
    scale: scaleStr,
  }: QueryParams = event.queryStringParameters ?? {};
  if (!compressed) {
    return {
      statusCode: 400,
      body: "Expected s parameter with compressed image data",
    };
  }

  if (!Object.values(ImageType).includes(imageType)) {
    return {
      statusCode: 400,
      body: `Invalid image type. Supports one of: ${Object.values(
        ImageType
      ).join(", ")}`,
    };
  }

  const mimeType = imageTypeToMime[imageType];

  let scale = scaleStr ? Number(scaleStr) : DEFAULT_SCALE;
  if (Number.isNaN(scale) || scale <= 0) {
    return {
      statusCode: 400,
      body: `Invalid scale value`,
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

  if (imageType === ImageType.SVG) {
    const svg = exportToSvg({ elements });
    return {
      statusCode: 200,
      body: `<?xml version="1.0" encoding="UTF-8"?> ${svg.outerHTML}`,
      headers: {
        "Content-Type": mimeType,
      },
    };
  }

  const blob = await exportToBlob({
    elements,
    mimeType,
    getDimensions: (width, height) => ({
      width: width * scale,
      height: height * scale,
      scale,
    }),
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
      "Content-Type": mimeType,
    },
    isBase64Encoded: true,
    body: buf.toString("base64"),
  };
};
