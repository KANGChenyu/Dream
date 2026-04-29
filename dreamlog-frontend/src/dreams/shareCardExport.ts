import { resolveAssetUrl } from "../api/assets";
import type { DreamResponse } from "../api/types";
import { getMoodLabel } from "./dreamOptions";

export interface ShareCardExportOptions {
  keywords: string[];
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const CARD_X = 100;
const CARD_Y = 70;
const CARD_INNER_X = 150;
const CARD_INNER_WIDTH = 780;

const LABEL_SHARE_CARD = "\u68a6\u5883\u5206\u4eab\u5361";
const LABEL_AI_ANALYSIS = "AI \u89e3\u6790";
const LABEL_SUMMARY = "\u2726 \u89e3\u8bfb\u6458\u8981";
const LABEL_KEYWORDS = "\u25c7 \u5173\u952e\u8bcd";
const LABEL_MYSTERY = "\u2726 \u795e\u79d8";
const LABEL_EXPECTATION = "\u2726 \u671f\u5f85";
const LABEL_BRAND_LINE = "\u00b7 \u8bb0\u5f55\u68a6\u5883\uff0c\u53d1\u73b0\u5171\u9e23";

function getDreamTitle(dream: DreamResponse) {
  return dream.title ?? dream.content.slice(0, 18);
}

function getSummary(dream: DreamResponse) {
  return dream.interpretation?.summary ?? dream.content.slice(0, 96);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const chars = Array.from(text);
  let line = "";
  let lineCount = 0;

  for (const char of chars) {
    const nextLine = line + char;
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = char;
      lineCount += 1;
      if (lineCount >= maxLines - 1) {
        break;
      }
    } else {
      line = nextLine;
    }
  }

  if (line && lineCount < maxLines) {
    ctx.fillText(line, x, y);
  }
}

function drawGlassPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 32
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = "rgba(35, 47, 136, 0.56)";
  ctx.fill();
  ctx.strokeStyle = "rgba(210, 204, 255, 0.62)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawMoonIcon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(x + radius * 0.45, y - radius * 0.18, radius * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export async function downloadDreamShareCard(dream: DreamResponse, options: ShareCardExportOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u751f\u6210\u5206\u4eab\u5361\u7247\u3002");
  }

  const background = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, "#151d57");
  background.addColorStop(0.45, "#38499f");
  background.addColorStop(1, "#8c6bf0");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = "#ffffff";
  for (let index = 0; index < 32; index += 1) {
    const x = (index * 137) % CARD_WIDTH;
    const y = (index * 211) % CARD_HEIGHT;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (index % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawGlassPanel(ctx, CARD_X, CARD_Y, 880, 1210, 58);
  drawGlassPanel(ctx, CARD_INNER_X, 110, CARD_INNER_WIDTH, 590, 36);

  const image = dream.image_url ? await loadImage(resolveAssetUrl(dream.image_url)) : null;
  ctx.save();
  drawRoundedRect(ctx, CARD_INNER_X, 110, CARD_INNER_WIDTH, 590, 36);
  ctx.clip();
  if (image) {
    const ratio = Math.max(CARD_INNER_WIDTH / image.width, 590 / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    ctx.drawImage(image, CARD_INNER_X + (CARD_INNER_WIDTH - width) / 2, 110 + (590 - height) / 2, width, height);
  } else {
    const artGradient = ctx.createLinearGradient(CARD_INNER_X, 110, 930, 700);
    artGradient.addColorStop(0, "#1a2668");
    artGradient.addColorStop(0.52, "#5869d5");
    artGradient.addColorStop(1, "#cab9ff");
    ctx.fillStyle = artGradient;
    ctx.fillRect(CARD_INNER_X, 110, CARD_INNER_WIDTH, 590);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(740, 220, 62, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(6, 10, 40, 0.38)";
  ctx.fillRect(CARD_INNER_X, 500, CARD_INNER_WIDTH, 200);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = '700 54px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(getDreamTitle(dream), 220, 610);
  ctx.font = '28px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "rgba(235, 237, 255, 0.82)";
  ctx.fillText(`${dream.dream_date} \u00b7 ${LABEL_SHARE_CARD} \u00b7 ${LABEL_AI_ANALYSIS}`, 220, 660);

  drawGlassPanel(ctx, CARD_INNER_X, 730, CARD_INNER_WIDTH, 200, 30);
  ctx.font = '700 30px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "#f2edff";
  ctx.fillText(LABEL_SUMMARY, 200, 790);
  ctx.font = '30px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "rgba(244, 246, 255, 0.9)";
  drawWrappedText(ctx, getSummary(dream), 200, 845, 680, 46, 3);

  drawGlassPanel(ctx, CARD_INNER_X, 955, CARD_INNER_WIDTH, 130, 28);
  ctx.font = '700 30px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "#f2edff";
  ctx.fillText(LABEL_KEYWORDS, 200, 1012);
  ctx.font = '26px "Microsoft YaHei", "PingFang SC", sans-serif';
  options.keywords.slice(0, 5).forEach((keyword, index) => {
    const x = 200 + index * 128;
    drawRoundedRect(ctx, x, 1032, 104, 44, 22);
    ctx.fillStyle = "rgba(132, 110, 245, 0.78)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(keyword.slice(0, 4), x + 22, 1064);
  });

  drawGlassPanel(ctx, CARD_INNER_X, 1110, CARD_INNER_WIDTH, 92, 28);
  ctx.font = '28px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${LABEL_MYSTERY}     \u2248 ${getMoodLabel(dream.mood)}     ${LABEL_EXPECTATION}`, 220, 1168);

  drawGlassPanel(ctx, CARD_INNER_X, 1225, CARD_INNER_WIDTH, 82, 24);
  const footerGradient = ctx.createLinearGradient(175, 1238, 233, 1296);
  footerGradient.addColorStop(0, "#5166e1");
  footerGradient.addColorStop(1, "#8a62e5");
  drawRoundedRect(ctx, 175, 1238, 58, 58, 16);
  ctx.fillStyle = footerGradient;
  ctx.fill();
  drawMoonIcon(ctx, 205, 1267, 16);

  ctx.font = '700 34px Georgia, "Times New Roman", serif';
  ctx.fillStyle = "#dbcfff";
  ctx.fillText("DreamLog", 255, 1275);
  ctx.font = '24px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "rgba(235, 237, 255, 0.78)";
  ctx.fillText(LABEL_BRAND_LINE, 445, 1273);

  triggerDownload(canvas.toDataURL("image/png"), `dreamlog-share-card-${dream.id}.png`);
}
