import { rgb, type PDFImage, type PDFPage, type PDFFont } from "pdf-lib";

export const ESTIMATE_PAGE_WIDTH = 595.28;
export const ESTIMATE_PAGE_HEIGHT = 841.89;
export const ESTIMATE_MARGIN = 40;
export const ESTIMATE_RIGHT = ESTIMATE_PAGE_WIDTH - ESTIMATE_MARGIN;

/**
 * Unified SV Groups Light Theme PDF styling.
 * Deep forest, approved Ganesha gold (#C99C49), ivory and muted sage are
 * matched to the website rather than the old black-and-yellow PDF treatment.
 */
export const estimatePdfPalette = {
  ink: rgb(0.09, 0.27, 0.20),   // Forest green headings / numbers
  muted: rgb(0.38, 0.46, 0.41), // Sage body text
  gold: rgb(0.788, 0.612, 0.286), // #C99C49: exact approved gold SVG
  pale: rgb(0.97, 0.96, 0.93),  // Ivory panel
  dark: rgb(0.09, 0.278, 0.208), // #174735: exact approved forest SVG
  white: rgb(1, 0.99, 0.96),
  rule: rgb(0.82, 0.85, 0.79),
} as const;

/**
 * All PDFs use the SAME approved transparent vector artwork.
 * pdf-lib has no native SVG image embed, so the SVG is rasterised losslessly
 * to a transparent PNG at export time (client canvas or server Sharp).
 * The path and icon geometry are unchanged from the uploaded SVG.
 */
export function drawEstimatePdfBrandHeader(
  page: PDFPage,
  logo: PDFImage,
  regular: PDFFont,
  bold: PDFFont,
  width: number,
  height: number,
  headerHeight: number,
  margin: number,
) {
  const { dark, gold, white } = estimatePdfPalette;
  page.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: dark });
  page.drawRectangle({ x: 0, y: height - headerHeight - 3, width, height: 3, color: gold });

  // The uploaded SVG renders with transparent surroundings. No solid image
  // tile, white square, legacy diamond emblem or compression artifacts.
  const size = logo.scale(Math.min(54 / logo.width, 54 / logo.height));
  page.drawImage(logo, {
    x: margin + 1,
    y: height - headerHeight + Math.max(10, (headerHeight - size.height) / 2),
    width: size.width,
    height: size.height,
  });

  const titleX = margin + 66;
  const brandY = height - headerHeight / 2 + 4;
  page.drawText("SV", { x: titleX, y: brandY, size: 14, font: bold, color: white });
  page.drawText("GROUPS", { x: titleX + 25, y: brandY, size: 14, font: bold, color: gold });
  page.drawText("SRI VINAYAKA GROUPS", {
    x: titleX, y: brandY - 16, size: 6.7, font: regular, color: white,
  });
}


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
