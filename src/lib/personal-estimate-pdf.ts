import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { CartLine } from "@/lib/cart-calculations";
import { toPaise } from "@/lib/cart-calculations";
import { couponIsActive, couponMinimumMet, couponSavingsPaise, type PublicCoupon } from "@/lib/coupon";
import { business } from "@/lib/business";
import { ESTIMATE_MARGIN, ESTIMATE_PAGE_HEIGHT, ESTIMATE_PAGE_WIDTH, ESTIMATE_RIGHT, drawEstimatePdfBrandHeader, estimatePdfPalette, formatEstimatePdfPaise, printablePdfText, wrapPdfText } from "@/lib/pdf-design";

const pageWidth = ESTIMATE_PAGE_WIDTH;
const pageHeight = ESTIMATE_PAGE_HEIGHT;
const left = ESTIMATE_MARGIN;
const right = ESTIMATE_RIGHT;
const tableColumns = [40, 145, 180, 211, 274, 337, 400, 465, 555];

function rightText(page: PDFPage, value: string, x: number, y: number, width: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  const safe = printablePdfText(value); page.drawText(safe, { x: x + width - font.widthOfTextAtSize(safe, size) - 4, y, size, font, color });
}

async function loadLogo(pdf: PDFDocument): Promise<PDFImage> {
  // The approved, transparent gold Ganesha SVG is exactly the source also
  // used by the server-side admin/requested-items PDF generator.
  const response = await fetch("/branding/pdf-ganesh-gold.svg", { cache: "force-cache" });
  if (!response.ok) throw new Error("The approved SV Groups Ganesha logo could not be loaded.");
  const blob = await response.blob();
  const src = URL.createObjectURL(blob);
  let image: HTMLImageElement;
  try {
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const logo = new Image();
      logo.onload = () => resolve(logo);
      logo.onerror = () => reject(new Error("The approved Ganesha logo could not be rendered."));
      logo.src = src;
    });
    // Transparent lossless PNG from exact SVG geometry, without an image tile.
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 640;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the estimate logo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Uint8Array>((resolve, reject) => {
      canvas.toBlob(file => file ? file.arrayBuffer().then(bytes => resolve(new Uint8Array(bytes))).catch(reject) : reject(new Error("The Ganesha logo could not be embedded.")), "image/png");
    });
    return pdf.embedPng(png);
  } finally {
    URL.revokeObjectURL(src);
  }
}

export async function createPersonalEstimatePdf(lines: CartLine[], coupon?: PublicCoupon | null) {
  if (!lines.length) throw new Error("Add at least one product before downloading an estimate.");
  const pdf = await PDFDocument.create();
  pdf.setTitle("SRI VINAYAKA GROUPS - PERSONAL PRICE ESTIMATE");
  pdf.setAuthor(business.name);
  pdf.setSubject("Personal price estimate for informational use only");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(pdf);
  const { ink, muted, gold, pale, dark, white } = estimatePdfPalette;
  const activeLines = lines.filter(line => line.quantity > 0);
  const totals = activeLines.reduce((sum, line) => {
    const qty = Math.max(0, Math.trunc(line.quantity));
    const originalUnit = toPaise(line.product.originalPrice), indicativeUnit = toPaise(line.product.discountedPrice);
    return { quantity: sum.quantity + qty, original: sum.original + originalUnit * qty, indicative: sum.indicative + indicativeUnit * qty };
  }, { quantity: 0, original: 0, indicative: 0 });
  const savings = totals.original - totals.indicative;
  const validCoupon = coupon && couponIsActive(coupon) && couponMinimumMet(coupon, totals.indicative) ? coupon : null;
  const couponDiscount = validCoupon ? couponSavingsPaise(totals.indicative, validCoupon.percentOff) : 0;
  const estimatedFinal = totals.indicative - couponDiscount;
  const combinedSavings = totals.original - estimatedFinal;
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]); pages.push(page);
    drawEstimatePdfBrandHeader(page, logo, regular, bold, pageWidth, pageHeight, 105, left);
    page.drawText("PERSONAL PRICE ESTIMATE", { x: 252, y: pageHeight - 53, size: 13, font: bold, color: gold });
    page.drawText("Indicative catalogue pricing", { x: 252, y: pageHeight - 72, size: 8, font: regular, color: white });
    page.drawText(`Prepared ${new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date())} IST`, { x: 252, y: pageHeight - 88, size: 7, font: regular, color: white });
    y = pageHeight - 128;
  };
  const drawTableHeader = () => {
    const headerHeight = 34, labels = ["Product /\ncategory", "Qty", "Discount", "Original\nunit", "Indicative\nunit", "Original\ntotal", "Savings", "Indicative\ntotal"];
    page.drawRectangle({ x: left, y: y - headerHeight, width: right - left, height: headerHeight, color: dark });
    labels.forEach((label, index) => {
      const x = tableColumns[index] + 4; const lines = label.split("\n");
      lines.forEach((line, row) => page.drawText(line, { x, y: y - 12 - row * 9, size: 6.1, font: bold, color: white }));
    });
    y -= headerHeight;
  };
  newPage(); drawTableHeader();
  for (const line of activeLines) {
    const quantity = Math.max(0, Math.trunc(line.quantity));
    if (quantity < 1) continue;
    const nameLines = wrapPdfText(line.product.name, regular, 6.8, tableColumns[1] - tableColumns[0] - 10);
    const rowHeight = Math.max(31, (nameLines.length + 1) * 9 + 12);
    if (y - rowHeight < 78) { newPage(); drawTableHeader(); }
    page.drawRectangle({ x: left, y: y - rowHeight, width: right - left, height: rowHeight, color: lines.indexOf(line) % 2 ? pale : rgb(1, 1, 1) });
    nameLines.forEach((nameLine, index) => page.drawText(nameLine, { x: tableColumns[0] + 5, y: y - 12 - index * 9, size: 6.8, font: regular, color: ink }));
    const category = wrapPdfText(line.product.category.name, regular, 5.8, tableColumns[1] - tableColumns[0] - 10).join(" ");
    page.drawText(printablePdfText(category), { x: tableColumns[0] + 5, y: y - 14 - nameLines.length * 9, size: 5.8, font: regular, color: muted });
    const originalUnit = toPaise(line.product.originalPrice), indicativeUnit = toPaise(line.product.discountedPrice);
    const discount = originalUnit > 0 ? (((originalUnit - indicativeUnit) * 100) / originalUnit).toFixed(2) + "%" : "0.00%";
    const values = [String(quantity), discount, formatEstimatePdfPaise(originalUnit), formatEstimatePdfPaise(indicativeUnit), formatEstimatePdfPaise(originalUnit * quantity), formatEstimatePdfPaise((originalUnit - indicativeUnit) * quantity), formatEstimatePdfPaise(indicativeUnit * quantity)];
    values.forEach((value, index) => rightText(page, value, tableColumns[index + 1], y - 17, tableColumns[index + 2] - tableColumns[index + 1], regular, 5.7, ink));
    page.drawLine({ start: { x: left, y: y - rowHeight }, end: { x: right, y: y - rowHeight }, thickness: 0.35, color: rgb(0.83, 0.79, 0.71) });
    y -= rowHeight;
  }

  const disclaimer = "This is a personal price estimate for informational use only. It is not a quotation for acceptance, order, reservation, invoice, or confirmation of sale. Prices are indicative and may change.";
  const disclaimerLines = wrapPdfText(disclaimer, regular, 7.5, right - left - 20);
  const summaryHeight = validCoupon ? 214 : 164, disclaimerHeight = disclaimerLines.length * 10 + 24;
  if (y - summaryHeight - disclaimerHeight < 56) { newPage(); y -= 12; }
  y -= 12;
  page.drawRectangle({ x: left, y: y - summaryHeight, width: right - left, height: summaryHeight, color: pale, borderColor: gold, borderWidth: 1 });
  page.drawText("ESTIMATE SUMMARY", { x: left + 14, y: y - 20, size: 9, font: bold, color: gold });
  const rows: [string, string][] = [
    ["Distinct products", String(activeLines.length)], ["Total quantity", String(totals.quantity)],
    ["Original subtotal", formatEstimatePdfPaise(totals.original)], ["Discounted catalogue subtotal", formatEstimatePdfPaise(totals.indicative)],
    ["Catalogue savings", formatEstimatePdfPaise(savings)],
    ...(validCoupon ? [
      ["Coupon applied", `${validCoupon.code} (${validCoupon.percentOff}% extra)`],
      ["Additional coupon savings", formatEstimatePdfPaise(couponDiscount)],
    ] as [string, string][] : []),
    ["Total estimated savings", formatEstimatePdfPaise(combinedSavings)],
    ["Effective discount", totals.original > 0 ? `${((combinedSavings * 100) / totals.original).toFixed(2)}%` : "0.00%"],
    ["Estimated final total", formatEstimatePdfPaise(estimatedFinal)],
  ];
  rows.forEach(([label, value], index) => {
    const rowY = y - 37 - index * 15;
    page.drawText(label, { x: left + 14, y: rowY, size: index === rows.length - 1 ? 8 : 7.5, font: index === rows.length - 1 ? bold : regular, color: ink });
    rightText(page, value, right - 230, rowY, 215, index === rows.length - 1 ? bold : regular, index === rows.length - 1 ? 9 : 7.5, index === rows.length - 1 ? gold : ink);
  });
  y -= summaryHeight + 15;
  page.drawRectangle({ x: left, y: y - disclaimerHeight, width: right - left, height: disclaimerHeight, color: rgb(0.99, 0.95, 0.84), borderColor: gold, borderWidth: 0.7 });
  page.drawText("INFORMATIONAL USE ONLY", { x: left + 10, y: y - 14, size: 7.5, font: bold, color: ink });
  disclaimerLines.forEach((line, index) => page.drawText(line, { x: left + 10, y: y - 26 - index * 10, size: 7.5, font: regular, color: ink }));
  y -= disclaimerHeight + 15;
  pages.forEach((current, index) => {
    current.drawLine({ start: { x: left, y: 42 }, end: { x: right, y: 42 }, thickness: 0.6, color: gold });
    current.drawText(`${business.name} | ${business.phone} | ${business.email} | ${business.address}`,
      { x: left, y: 27, size: 6.5, font: regular, color: muted, maxWidth: right - left - 78 });
    current.drawText(`Page ${index + 1} of ${pages.length}`,
      { x: right - 64, y: 27, size: 6.5, font: regular, color: muted });
  });
  return pdf.save();
}
