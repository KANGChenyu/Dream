import { resolveAssetUrl } from "../api/assets";
import type { DreamResponse } from "../api/types";
import { getMoodLabel } from "./dreamOptions";

export interface ShareCardExportOptions {
  keywords: string[];
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

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
    throw new Error("当前浏览器不支持生成分享卡片。");
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

  drawGlassPanel(ctx, 110, 70, 860, 1210, 54);
  drawGlassPanel(ctx, 150, 110, 780, 590, 36);

  const image = dream.image_url ? await loadImage(resolveAssetUrl(dream.image_url)) : null;
  ctx.save();
  drawRoundedRect(ctx, 150, 110, 780, 590, 36);
  ctx.clip();
  if (image) {
    const ratio = Math.max(780 / image.width, 590 / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    ctx.drawImage(image, 150 + (780 - width) / 2, 110 + (590 - height) / 2, width, height);
  } else {
    const artGradient = ctx.createLinearGradient(150, 110, 930, 700);
    artGradient.addColorStop(0, "#1a2668");
    artGradient.addColorStop(0.52, "#5869d5");
    artGradient.addColorStop(1, "#cab9ff");
    ctx.fillStyle = artGradient;
    ctx.fillRect(150, 110, 780, 590);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(740, 220, 62, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(6, 10, 40, 0.38)";
  ctx.fillRect(150, 500, 780, 200);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = '700 54px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(getDreamTitle(dream), 220, 610);
  ctx.font = '28px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "rgba(235, 237, 255, 0.82)";
  ctx.fillText(`${dream.dream_date} · 梦境分享卡 · AI 解析`, 220, 660);

  drawGlassPanel(ctx, 150, 730, 780, 220, 30);
  ctx.font = '700 30px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "#f2edff";
  ctx.fillText("✦ 解读摘要", 200, 790);
  ctx.font = '30px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "rgba(244, 246, 255, 0.9)";
  drawWrappedText(ctx, getSummary(dream), 200, 845, 680, 46, 3);

  drawGlassPanel(ctx, 150, 980, 780, 120, 28);
  ctx.font = '700 30px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "#f2edff";
  ctx.fillText("◇ 关键词", 200, 1032);
  ctx.font = '26px "Microsoft YaHei", "PingFang SC", sans-serif';
  options.keywords.slice(0, 6).forEach((keyword, index) => {
    const x = 200 + index * 118;
    drawRoundedRect(ctx, x, 1054, 96, 42, 21);
    ctx.fillStyle = "rgba(132, 110, 245, 0.78)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(keyword.slice(0, 4), x + 20, 1084);
  });

  drawGlassPanel(ctx, 150, 1130, 780, 88, 28);
  ctx.font = '28px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`✦ 神秘     ≋ ${getMoodLabel(dream.mood)}     ✦ 期待`, 220, 1185);

  ctx.font = '700 34px Georgia, "Times New Roman", serif';
  ctx.fillStyle = "#dbcfff";
  ctx.fillText("DreamLog", 230, 1265);
  ctx.font = '24px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = "rgba(235, 237, 255, 0.78)";
  ctx.fillText("· 记录梦境，发现共鸣", 415, 1263);

  triggerDownload(canvas.toDataURL("image/png"), `dreamlog-share-card-${dream.id}.png`);
}
