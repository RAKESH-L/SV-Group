import { rgb, type PDFFont } from "pdf-lib";

export const ESTIMATE_PAGE_WIDTH = 595.28;
export const ESTIMATE_PAGE_HEIGHT = 841.89;
export const ESTIMATE_MARGIN = 40;
export const ESTIMATE_RIGHT = ESTIMATE_PAGE_WIDTH - ESTIMATE_MARGIN;

export const estimatePdfPalette = {
  ink: rgb(0.13, 0.11, 0.09),
  muted: rgb(0.39, 0.36, 0.31),
  gold: rgb(0.78, 0.53, 0.19),
  pale: rgb(1, 0.97, 0.91),
  dark: rgb(0.11, 0.09, 0.07),
  white: rgb(0.98, 0.95, 0.88),
  rule: rgb(0.83, 0.79, 0.71),
} as const;

export function printablePdfText(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\u0020-\u00ff\u20ac]/g, "?")
    .trim();
}

export function wrapPdfText(value: string, font: PDFFont, size: number, maxWidth: number) {
  const words = printablePdfText(value).split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    let rest = word;
    while (font.widthOfTextAtSize(rest, size) > maxWidth) {
      let split = 1;
      while (split < rest.length && font.widthOfTextAtSize(rest.slice(0, split + 1), size) <= maxWidth) split++;
      if (line) { lines.push(line); line = ""; }
      lines.push(rest.slice(0, split));
      rest = rest.slice(split);
    }

    const candidate = line ? `${line} ${rest}` : rest;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = rest;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function formatEstimatePdfPaise(amount: number) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount / 100)}`;
}
