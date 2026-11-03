import { detectProductImageType, type ProductImageSource } from "@/lib/image-signature";

export const MAX_PRODUCT_IMAGE_BYTES = 15 * 1024 * 1024;

export type PreparedProductImage = {
  blob: Blob;
  contentType: string;
  extension: string;
  sourceLabel: string;
  convertedFromSvg: boolean;
};

function safeSvg(document: XMLDocument) {
  const root = document.documentElement;
  if (root.localName.toLowerCase() !== "svg" || document.querySelector("parsererror")) throw new Error("This SVG is malformed and could not be safely converted.");

  const allowedElements = new Set(["svg", "g", "defs", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "lineargradient", "radialgradient", "stop", "clippath", "mask"]);
  const allowedAttributes = new Set(["xmlns", "viewbox", "width", "height", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-opacity", "opacity", "d", "points", "transform", "gradientunits", "gradienttransform", "offset", "stop-color", "stop-opacity", "clip-path", "mask", "id", "version", "preserveaspectratio"]);
  let nodeCount = 0;
  const clean = (node: Element) => {
    if (++nodeCount > 8000) throw new Error("This SVG is too complex to safely convert. Export it as PNG or WebP and try again.");
    if (!allowedElements.has(node.localName.toLowerCase())) {
      node.remove();
      return;
    }
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const localReference = /^url\(\s*#[A-Za-z_][\w:.-]*\s*\)$/i.test(value);
      if (!allowedAttributes.has(name) || name.startsWith("on") || /url\s*\(/i.test(value) && !localReference || /(?:https?:|data:|javascript:|file:)/i.test(value)) node.removeAttribute(attribute.name);
    }
    for (const child of Array.from(node.children)) clean(child);
  };
  clean(root);
  if (!root.hasAttribute("viewBox")) {
    const width = Number.parseFloat(root.getAttribute("width") || "");
    const height = Number.parseFloat(root.getAttribute("height") || "");
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error("This SVG has no usable size information and could not be converted.");
    root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  return document;
}

async function rasterizeSvg(file: File): Promise<Blob> {
  if (file.size > 2 * 1024 * 1024) throw new Error("SVG files must be 2 MB or smaller for safe conversion. Export this image as PNG or WebP.");
  const text = await file.text();
  const svgDocument = new DOMParser().parseFromString(text, "image/svg+xml");
  const cleanDocument = safeSvg(svgDocument);
  const source = new Blob([new XMLSerializer().serializeToString(cleanDocument.documentElement)], { type: "image/svg+xml" });
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(source); }
  catch { throw new Error("This SVG could not be safely rasterized in this browser. Export it as PNG or WebP and try again."); }
  try {
    const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height), Math.sqrt(16_000_000 / (bitmap.width * bitmap.height)));
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the SVG image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.82, 0.74]) {
      const converted = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("SVG conversion failed in this browser.")), "image/webp", quality));
      if (converted.size <= MAX_PRODUCT_IMAGE_BYTES) return converted;
    }
    throw new Error("The converted SVG is still too large. Reduce its dimensions and try again.");
  } finally { bitmap.close(); }
}

export async function prepareProductImage(file: File): Promise<PreparedProductImage> {
  if (file.size < 1) throw new Error("The selected image is empty.");
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error("The source image exceeds the 15 MB limit. Choose a smaller image.");
  const header = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const detected: ProductImageSource | null = detectProductImageType(header);
  if (!detected) throw new Error("This file does not have a supported image signature. Choose a valid image file.");
  if (detected.contentType === "image/svg+xml") {
    return { blob: await rasterizeSvg(file), contentType: "image/webp", extension: "webp", sourceLabel: "SVG · safely rasterized to WebP", convertedFromSvg: true };
  }
  return { blob: new Blob([file], { type: detected.contentType }), contentType: detected.contentType, extension: detected.extension, sourceLabel: `${detected.contentType.replace("image/", "").toUpperCase()} · will be optimized as WebP`, convertedFromSvg: false };
}

export function uploadToSignedStorage(options: {
  projectUrl: string;
  anonKey: string;
  bucket: string;
  path: string;
  token: string;
  blob: Blob;
  onProgress: (percent: number) => void;
}) {
  const { projectUrl, anonKey, bucket, path, token, blob, onProgress } = options;
  const target = new URL(`/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`, projectUrl);
  target.searchParams.set("token", token);
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", blob, path);

  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", target.toString());
    request.setRequestHeader("apikey", anonKey);
    request.setRequestHeader("Authorization", `Bearer ${anonKey}`);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100))); };
    request.onerror = () => reject(new Error("Image upload could not reach Supabase Storage. Check your connection and try again."));
    request.onabort = () => reject(new Error("Image upload was cancelled."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) { onProgress(100); resolve(); }
      else reject(new Error("Supabase Storage rejected the image. Check the bucket's supported image formats and 15 MB limit."));
    };
    request.send(form);
  });
}
