import { posterFormats, posterTemplates, type PosterConfig, type PosterProduct } from "@/lib/poster-studio";
import { WEBSITE_QR_ROWS, WEBSITE_URL } from "@/lib/poster-qr";

type PosterProductImage = HTMLImageElement | null;
type Canvas = CanvasRenderingContext2D;

function box(ctx: Canvas, x: number, y: number, w: number, h: number, radius: number, color: string, stroke?: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function circle(ctx: Canvas, x: number, y: number, r: number, color: string | CanvasGradient) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}

function star(ctx: Canvas, x: number, y: number, r: number, color: string) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const d = i % 2 === 0 ? r : r * 0.25;
    const px = Math.cos(a) * d, py = Math.sin(a) * d;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
}

function firework(ctx: Canvas, x: number, y: number, radius: number, color: string, opacity = 1) {
  ctx.save(); ctx.globalAlpha = opacity; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = "round";
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    const inner = radius * (i % 3 === 0 ? 0.24 : 0.43);
    const outer = radius * (i % 3 === 0 ? 1.03 : 0.84);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
    ctx.lineTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer); ctx.stroke();
    circle(ctx, x + Math.cos(a) * outer, y + Math.sin(a) * outer, 3, color);
  }
  star(ctx, x, y, radius * .13, color);
  ctx.restore();
}

function drawDiya(ctx: Canvas, x: number, y: number, scale: number, bowl: string, glow: string) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const aura = ctx.createRadialGradient(0, -60, 5, 0, -60, 155);
  aura.addColorStop(0, "rgba(255,214,119,.47)"); aura.addColorStop(1, "rgba(251,202,112,0)");
  circle(ctx, 0, -60, 155, aura);
  ctx.beginPath(); ctx.moveTo(-105, 0); ctx.bezierCurveTo(-75, 91, 72, 91, 105, 0);
  ctx.closePath(); ctx.fillStyle = bowl; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, 107, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#ebb16b"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 1, 83, 16, 0, 0, Math.PI * 2); ctx.fillStyle = "#803f27"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.bezierCurveTo(-63, -61, -17, -95, 0, -131);
  ctx.bezierCurveTo(22, -90, 58, -60, 0, -15); ctx.closePath(); ctx.fillStyle = glow; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -21); ctx.bezierCurveTo(-19, -42, 0, -57, 0, -75);
  ctx.bezierCurveTo(15, -50, 20, -38, 0, -21); ctx.closePath(); ctx.fillStyle = "#fff3bd"; ctx.fill();
  ctx.restore();
}

function textLines(ctx: Canvas, text: string, x: number, y: number, width: number, size: number, lineHeight: number, maxLines: number, color: string, font = "Arial", weight = "400") {
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = []; let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (ctx.measureText(candidate).width <= width || !line) { line = candidate; continue; }
    lines.push(line); line = word;
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    let last = visible[visible.length - 1];
    while (last.length > 1 && ctx.measureText(last + "…").width > width) last = last.slice(0, -1);
    visible[visible.length - 1] = last + "…";
  }
  for (let i = 0; i < visible.length; i++) {
    let value = visible[i];
    while (value.length > 1 && ctx.measureText(value).width > width) value = value.slice(0, -1);
    ctx.fillText(value, x, y + i * lineHeight);
  }
  ctx.restore();
  return y + visible.length * lineHeight;
}

function coverImage(ctx: Canvas, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ratio = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const rw = image.naturalWidth * ratio, rh = image.naturalHeight * ratio;
  ctx.drawImage(image, x + (w - rw) / 2, y + (h - rh) / 2, rw, rh);
}

export function drawWebsiteQr(ctx: Canvas, x: number, y: number, size: number) {
  const count = WEBSITE_QR_ROWS.length;
  ctx.save();
  box(ctx, x - 10, y - 10, size + 20, size + 20, 10, "#ffffff", "#e7d9c1");
  ctx.fillStyle = "#101010";
  const moduleSize = size / count;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (WEBSITE_QR_ROWS[r][c] === "1") {
        ctx.fillRect(x + c * moduleSize, y + r * moduleSize, moduleSize + .05, moduleSize + .05);
      }
    }
  }
  ctx.restore();
}

function decorate(ctx: Canvas, template: PosterConfig["template"], H: number, gold: string, ink: string) {
  ctx.save();
  ctx.globalAlpha = template === "minimal" ? .25 : .66;
  const r = H > 1500 ? 150 : H > 900 ? 85 : 45;
  firework(ctx, 95, H * .18, r, gold, .63);
  firework(ctx, 978, H * .22, r * .82, gold, .66);
  for (let i = 0; i < 22; i++) {
    const x = (i * 197 + 32) % 1060, y = (i * 151 + 53) % (H - 40);
    star(ctx, x, y, i % 4 === 0 ? 11 : 5, i % 2 === 0 ? gold : ink);
  }
  if (template === "emerald" || template === "ruby") {
    ctx.lineWidth = 4; ctx.strokeStyle = gold;
    ctx.strokeRect(26, 26, 1028, H - 52);
    ctx.globalAlpha = .35; ctx.strokeRect(42, 42, 996, H - 84);
  }
  if (template === "minimal") {
    ctx.fillStyle = gold; ctx.fillRect(60, 64, 960, 7);
    ctx.fillRect(60, H - 72, 960, 7);
  }
  ctx.restore();
}

function drawBackdrop(ctx: Canvas, template: PosterConfig["template"], H: number) {
  const c = posterTemplates[template];
  const main = ctx.createLinearGradient(0, 0, 1080, H);
  main.addColorStop(0, c.bg);
  if (template === "ivory") main.addColorStop(1, "#efe4d0");
  if (template === "midnight") main.addColorStop(1, "#402518");
  if (template === "emerald") main.addColorStop(1, "#286451");
  if (template === "ruby") main.addColorStop(1, "#361823");
  if (template === "minimal") main.addColorStop(1, "#faf9f2");
  ctx.fillStyle = main; ctx.fillRect(0, 0, 1080, H);
  const glow = ctx.createRadialGradient(590, H * .46, 15, 590, H * .46, H * .55);
  const pale = template === "ivory" || template === "minimal";
  glow.addColorStop(0, pale ? "rgba(250,196,117,.27)" : "rgba(244,181,82,.25)");
  glow.addColorStop(1, "rgba(245,195,92,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, H);
  decorate(ctx, template, H, c.gold, c.ink);
}

function drawBrand(ctx: Canvas, x: number, y: number, light: boolean, gold: string, ink: string, small = false) {
  const radius = small ? 29 : 39;
  ctx.save();
  ctx.lineWidth = 4; ctx.strokeStyle = gold; ctx.beginPath(); ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2); ctx.stroke();
  star(ctx, x + radius, y + radius, radius * .64, gold);
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillStyle = ink;
  ctx.font = `700 ${small ? 41 : 58}px Arial`;
  ctx.fillText("SV", x + radius * 2 + 21, y + radius);
  const offset = small ? 132 : 175;
  ctx.fillStyle = gold; ctx.font = `800 ${small ? 31 : 45}px Arial`;
  ctx.fillText("GROUPS", x + radius * 2 + offset, y + radius);
  if (!light) {
    ctx.fillStyle = gold;
    ctx.fillRect(x + 40, y + radius * 2 + 18, small ? 340 : 450, 3);
  }
  ctx.restore();
}

function drawPosterArt(ctx: Canvas, config: PosterConfig, product: PosterProduct | null, image: PosterProductImage, y: number, height: number, ink: string, gold: string, light: boolean) {
  const cx = 540, mid = y + height * .49;
  if (image && product) {
    ctx.save();
    box(ctx, 278, y, 524, height, 42, light ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.09)", gold);
    ctx.beginPath(); ctx.roundRect(294, y + 16, 492, height - 32, 30); ctx.clip();
    coverImage(ctx, image, 314, y + 30, 452, height - 100);
    ctx.restore();
    box(ctx, 300, y + height - 86, 480, 65, 18, light ? "#173f34" : "#f2d5a0");
    textLines(ctx, product.name, 320, y + height - 73, 438, 27, 31, 2, light ? "#fff9e8" : "#203529", "Arial", "700");
  } else {
    ctx.save();
    const halo = ctx.createRadialGradient(cx, mid - 30, 12, cx, mid, height * .61);
    halo.addColorStop(0, light ? "rgba(242,195,116,.45)" : "rgba(251,200,113,.28)");
    halo.addColorStop(1, "rgba(244,179,104,0)");
    circle(ctx, cx, mid, height * .61, halo);
    ctx.lineWidth = 2; ctx.strokeStyle = gold; ctx.globalAlpha = .3;
    ctx.beginPath(); ctx.arc(cx, mid, height * .47, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, mid, height * .37, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    drawDiya(ctx, cx, y + height * .72, Math.min(2.1, height / 220), config.template === "emerald" ? "#c66a3f" : "#ac4e35", "#f7c06b");
    star(ctx, cx - height * .32, mid - height * .24, 22, gold);
    star(ctx, cx + height * .34, mid - height * .15, 26, gold);
    ctx.restore();
  }
}

function drawOffer(ctx: Canvas, config: PosterConfig, x: number, y: number, w: number, h: number, ink: string, gold: string, light: boolean) {
  if (!config.offer.trim()) return;
  box(ctx, x, y, w, h, 25, light ? "#194639" : "rgba(245,202,128,.15)", gold);
  star(ctx, x + 35, y + h / 2, 19, gold);
  textLines(ctx, config.offer, x + 72, y + 23, w - 108, 35, 39, h > 90 ? 2 : 1, light ? "#fff9e9" : ink, "Arial", "700");
}

function portrait(ctx: Canvas, config: PosterConfig, product: PosterProduct | null, image: PosterProductImage, H: number) {
  const c = posterTemplates[config.template], light = config.template === "ivory" || config.template === "minimal";
  const tall = H > 1500, medium = H > 1180;
  drawBrand(ctx, 90, tall ? 89 : 70, light, c.gold, c.ink);
  const eyebrowY = tall ? 220 : 165;
  textLines(ctx, config.eyebrow.toUpperCase(), 96, eyebrowY, 900, 27, 32, 1, c.accent, "Arial", "800");
  const titleY = tall ? 297 : medium ? 240 : 205;
  const titleSize = tall ? 91 : medium ? 80 : 69;
  const titleEnd = textLines(ctx, config.headline, 94, titleY, 875, titleSize, titleSize * 1.08, tall ? 3 : 2, c.ink, "Georgia", "700");
  const descEnd = textLines(ctx, config.description, 96, titleEnd + 19, 880, tall ? 33 : 28, tall ? 48 : 41, tall ? 3 : 2, c.ink, "Arial", "400");
  const visualY = Math.max(descEnd + 10, H * (tall ? .42 : medium ? .425 : .43));
  const visualH = tall ? 460 : medium ? 336 : 256;
  drawPosterArt(ctx, config, product, image, visualY, visualH, c.ink, c.gold, light);
  const offerY = H - (tall ? 510 : medium ? 385 : 345);
  drawOffer(ctx, config, 84, offerY, 912, tall ? 115 : 85, c.ink, c.gold, light);
  const qrSize = tall ? 245 : medium ? 191 : 160;
  const qrY = H - (tall ? 370 : medium ? 280 : 250);
  if (config.showQr) drawWebsiteQr(ctx, 102, qrY, qrSize);
  const detailsX = config.showQr ? (tall ? 410 : medium ? 360 : 315) : 105;
  const detailWidth = 970 - detailsX;
  textLines(ctx, "SCAN & VISIT OUR WEBSITE", detailsX, qrY + 5, detailWidth, tall ? 30 : 24, 32, 1, c.accent, "Arial", "800");
  textLines(ctx, "sv-groups-catalogue.vercel.app", detailsX, qrY + (tall ? 50 : 40), detailWidth, tall ? 28 : 23, 30, 2, c.ink, "Arial", "700");
  if (config.showPhone) textLines(ctx, "ENQUIRIES · 9986885682", detailsX, qrY + (tall ? 110 : medium ? 95 : 80), detailWidth, tall ? 30 : 23, 29, 2, c.ink, "Arial", "700");
  const buttonY = H - (tall ? 93 : 62);
  box(ctx, 100, buttonY, 880, tall ? 55 : 43, 20, light ? "#194639" : "#e6bc74");
  textLines(ctx, config.buttonText.toUpperCase(), 145, buttonY + (tall ? 12 : 9), 780, tall ? 29 : 23, 29, 1, light ? "#fffaf0" : "#23180e", "Arial", "800");
}

function landscape(ctx: Canvas, config: PosterConfig, product: PosterProduct | null, image: PosterProductImage, H: number) {
  const c = posterTemplates[config.template], light = config.template === "ivory" || config.template === "minimal";
  drawBrand(ctx, 46, 22, light, c.gold, c.ink, true);
  textLines(ctx, config.eyebrow.toUpperCase(), 475, 25, 390, 15, 18, 1, c.accent, "Arial", "800");
  textLines(ctx, config.headline, 475, 50, config.showQr ? 365 : 510, 39, 43, 2, c.ink, "Georgia", "700");
  textLines(ctx, config.description, 475, 132, config.showQr ? 365 : 480, 17, 23, 2, c.ink, "Arial");
  if (config.offer) {
    box(ctx, 38, 141, 417, 70, 14, light ? "#194639" : "rgba(244,195,113,.15)", c.gold);
    textLines(ctx, config.offer, 54, 151, 381, 21, 24, 2, light ? "#fff9ea" : c.ink, "Arial", "700");
  } else if (product && image) {
    coverImage(ctx, image, 80, 138, 290, 80);
  }
  if (config.showQr) {
    drawWebsiteQr(ctx, 894, 27, 170);
    textLines(ctx, "SCAN ME", 911, 211, 150, 21, 23, 1, c.ink, "Arial", "800");
  }
  textLines(ctx, config.showPhone ? "9986885682 · TUMKUR" : WEBSITE_URL.replace("https://", ""), 485, 226, 380, 18, 19, 1, c.ink, "Arial", "700");
}

export function drawPoster(
  ctx: Canvas,
  config: PosterConfig,
  product: PosterProduct | null,
  productImage: PosterProductImage,
) {
  const format = posterFormats[config.format];
  const W = 1080, H = format.height / format.width * W;
  ctx.save();
  ctx.setTransform(ctx.canvas.width / W, 0, 0, ctx.canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawBackdrop(ctx, config.template, H);
  if (config.format === "banner") landscape(ctx, config, product, productImage, H);
  else portrait(ctx, config, product, productImage, H);
  ctx.restore();
}
