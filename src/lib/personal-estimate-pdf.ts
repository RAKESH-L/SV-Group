import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { CartLine } from "@/lib/cart-calculations";
import { toPaise } from "@/lib/cart-calculations";
import { business } from "@/lib/business";

const pageWidth = 595.28;
const pageHeight = 841.89;
const left = 40;
const right = pageWidth - 40;
const tableColumns = [40, 160, 192, 254, 320, 390, 465, 555];
const formatPdfPaise = (amount: number) => `INR ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: amount % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(amount / 100)}`;

function printable(value: string) { return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[^\u0020-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u20ac]/g, "?").trim(); }
function wrap(value: string, font: PDFFont, size: number, maxWidth: number) {
  const words = printable(value).split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) {
    let rest = word;
    while (font.widthOfTextAtSize(rest, size) > maxWidth) {
      let split = 1;
      while (split < rest.length && font.widthOfTextAtSize(rest.slice(0, split + 1), size) <= maxWidth) split++;
      const part = rest.slice(0, split); rest = rest.slice(split);
      if (line) { lines.push(line); line = ""; }
      lines.push(part);
    }
    const next = line ? `${line} ${rest}` : rest;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) { lines.push(line); line = rest; } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
function rightText(page: PDFPage, value: string, x: number, y: number, width: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  const safe = printable(value); page.drawText(safe, { x: x + width - font.widthOfTextAtSize(safe, size) - 4, y, size, font, color });
}

async function loadLogo(pdf: PDFDocument): Promise<PDFImage> {
  const response = await fetch("/branding/sv-logo-full.webp", { cache: "force-cache" });
  if (!response.ok) throw new Error("The Sri Vinayaka Groups logo could not be loaded.");
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  const scale = Math.min(640 / bitmap.width, 1);
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the estimate logo.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const png = await new Promise<Uint8Array>((resolve, reject) => canvas.toBlob(blob => blob ? blob.arrayBuffer().then(bytes => resolve(new Uint8Array(bytes))) : reject(new Error("The estimate logo could not be prepared.")), "image/png"));
  return pdf.embedPng(png);
}

export async function createPersonalEstimatePdf(lines: CartLine[]) {
  if (!lines.length) throw new Error("Add at least one product before downloading an estimate.");
  const pdf = await PDFDocument.create();
  pdf.setTitle("SRI VINAYAKA GROUPS - PERSONAL PRICE ESTIMATE");
  pdf.setAuthor(business.name);
  pdf.setSubject("Personal price estimate for informational use only");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(pdf);
  const ink = rgb(0.13, 0.11, 0.09), muted = rgb(0.39, 0.36, 0.31), gold = rgb(0.78, 0.53, 0.19), pale = rgb(1, 0.97, 0.91), dark = rgb(0.11, 0.09, 0.07), white = rgb(0.98, 0.95, 0.88);
  const totals = lines.reduce((sum, line) => {
    const qty = Math.max(0, Math.trunc(line.quantity));
    const originalUnit = toPaise(line.product.originalPrice), indicativeUnit = toPaise(line.product.discountedPrice);
    return { quantity: sum.quantity + qty, original: sum.original + originalUnit * qty, indicative: sum.indicative + indicativeUnit * qty };
  }, { quantity: 0, original: 0, indicative: 0 });
  const savings = totals.original - totals.indicative;
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]); pages.push(page);
    page.drawRectangle({ x: 0, y: pageHeight - 105, width: pageWidth, height: 105, color: dark });
    page.drawRectangle({ x: 0, y: pageHeight - 108, width: pageWidth, height: 3, color: gold });
    const dims = logo.scale(Math.min(176 / logo.width, 61 / logo.height));
    page.drawImage(logo, { x: left, y: pageHeight - 91, width: dims.width, height: dims.height });
    page.drawText("PERSONAL PRICE ESTIMATE", { x: 252, y: pageHeight - 53, size: 13, font: bold, color: gold });
    page.drawText("Indicative catalogue pricing", { x: 252, y: pageHeight - 72, size: 8, font: regular, color: white });
    page.drawText(`Prepared ${new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date())} IST`, { x: 252, y: pageHeight - 88, size: 7, font: regular, color: white });
    y = pageHeight - 128;
  };
  const drawTableHeader = () => {
    const headerHeight = 32, labels = ["Product", "Qty", "Original\nunit price", "Indicative\nunit price", "Original\ntotal", "Indicative\ntotal", "Savings"];
    page.drawRectangle({ x: left, y: y - headerHeight, width: right - left, height: headerHeight, color: dark });
    labels.forEach((label, index) => {
      const x = tableColumns[index] + 5; const lines = label.split("\n");
      lines.forEach((line, row) => page.drawText(line, { x, y: y - 12 - row * 9, size: 6.5, font: bold, color: white }));
    });
    y -= headerHeight;
  };
  newPage(); drawTableHeader();
  for (const line of lines) {
    const quantity = Math.max(0, Math.trunc(line.quantity));
    if (quantity < 1) continue;
    const nameLines = wrap(line.product.name, regular, 7.2, tableColumns[1] - tableColumns[0] - 10);
    const rowHeight = Math.max(27, nameLines.length * 9 + 12);
    if (y - rowHeight < 78) { newPage(); drawTableHeader(); }
    page.drawRectangle({ x: left, y: y - rowHeight, width: right - left, height: rowHeight, color: lines.indexOf(line) % 2 ? pale : rgb(1, 1, 1) });
    nameLines.forEach((nameLine, index) => page.drawText(nameLine, { x: tableColumns[0] + 5, y: y - 13 - index * 9, size: 7.2, font: regular, color: ink }));
    const originalUnit = toPaise(line.product.originalPrice), indicativeUnit = toPaise(line.product.discountedPrice);
    const values = [String(quantity), formatPdfPaise(originalUnit), formatPdfPaise(indicativeUnit), formatPdfPaise(originalUnit * quantity), formatPdfPaise(indicativeUnit * quantity), formatPdfPaise((originalUnit - indicativeUnit) * quantity)];
    values.forEach((value, index) => rightText(page, value, tableColumns[index + 1], y - 16, tableColumns[index + 2] - tableColumns[index + 1], regular, 6.5, ink));
    page.drawLine({ start: { x: left, y: y - rowHeight }, end: { x: right, y: y - rowHeight }, thickness: 0.35, color: rgb(0.83, 0.79, 0.71) });
    y -= rowHeight;
  }

  const disclaimer = "This is a personal price estimate for informational use only. It is not a quotation for acceptance, order, reservation, invoice, or confirmation of sale. Prices are indicative and may change.";
  const disclaimerLines = wrap(disclaimer, regular, 7.5, right - left - 20);
  const summaryHeight = 147, disclaimerHeight = disclaimerLines.length * 10 + 24;
  if (y - summaryHeight - disclaimerHeight < 56) { newPage(); y -= 12; }
  y -= 12;
  page.drawRectangle({ x: left, y: y - summaryHeight, width: right - left, height: summaryHeight, color: pale, borderColor: gold, borderWidth: 1 });
  page.drawText("ESTIMATE SUMMARY", { x: left + 14, y: y - 20, size: 9, font: bold, color: gold });
  const rows: [string, string][] = [
    ["Distinct products", String(lines.length)], ["Total quantity", String(totals.quantity)],
    ["Original subtotal", formatPdfPaise(totals.original)], ["Indicative subtotal", formatPdfPaise(totals.indicative)],
    ["Total estimated savings", formatPdfPaise(savings)], ["Estimated final total", formatPdfPaise(totals.indicative)],
  ];
  rows.forEach(([label, value], index) => {
    const rowY = y - 39 - index * 17;
    page.drawText(label, { x: left + 14, y: rowY, size: index === 5 ? 8 : 7.5, font: index === 5 ? bold : regular, color: ink });
    rightText(page, value, right - 170, rowY, 155, index === 5 ? bold : regular, index === 5 ? 9 : 7.5, index === 5 ? gold : ink);
  });
  y -= summaryHeight + 15;
  page.drawRectangle({ x: left, y: y - disclaimerHeight, width: right - left, height: disclaimerHeight, color: rgb(0.99, 0.95, 0.84), borderColor: gold, borderWidth: 0.7 });
  page.drawText("INFORMATIONAL USE ONLY", { x: left + 10, y: y - 14, size: 7.5, font: bold, color: ink });
  disclaimerLines.forEach((line, index) => page.drawText(line, { x: left + 10, y: y - 26 - index * 10, size: 7.5, font: regular, color: ink }));
  y -= disclaimerHeight + 15;
  page.drawText(`${business.name} | ${business.phone} | ${business.email} | ${business.address}`, { x: left, y: Math.max(24, y), size: 7, font: regular, color: muted, maxWidth: right - left });
  pages.forEach((current, index) => current.drawText(`Page ${index + 1} of ${pages.length}`, { x: right - 55, y: 24, size: 7, font: regular, color: muted }));
  return pdf.save();
}
