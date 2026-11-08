import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { PDFDocument, PDFImage } from "pdf-lib";

/**
 * Exact approved gold Ganesha SVG, rasterized transparently only at export.
 * All original vector paths remain identical to the user-provided asset.
 * The source lives in /public so the personal calculator PDF uses it too.
 */
export async function embedServerGaneshPdfLogo(pdf: PDFDocument): Promise<PDFImage> {
  const source = await readFile(path.join(process.cwd(), "public", "branding", "pdf-ganesh-gold.svg"));
  const png = await sharp(source).resize({ width: 640, withoutEnlargement: false })
    .png({ compressionLevel: 9 }).toBuffer();
  return pdf.embedPng(png);
}
