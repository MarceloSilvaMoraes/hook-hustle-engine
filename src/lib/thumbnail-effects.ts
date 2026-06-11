/**
 * Visual effects and enhancements for viral thumbnails
 * Inspired by popular YouTube thumbnails with high engagement
 */

export interface CharacterHighlight {
  x: number; // x position (0-1, relative to width)
  y: number; // y position (0-1, relative to height)
  width: number; // width (0-1, relative to width)
  height: number; // height (0-1, relative to height)
  intensity: "low" | "medium" | "high"; // how much to highlight
}

export interface VisualEffect {
  type: "arrow" | "circle" | "box" | "star" | "explosion" | "glow" | "text-outline";
  x?: number; // x position (0-1)
  y?: number; // y position (0-1)
  size?: number; // size (0-1)
  color?: string; // hex color
  rotation?: number; // rotation in degrees
  opacity?: number; // 0-1
  label?: string; // text for the effect
  thickness?: number; // stroke thickness
}

export interface ThumbnailEnhancements {
  characterHighlights: CharacterHighlight[];
  visualEffects: VisualEffect[];
  cornerBadges: "score" | "new" | "hot" | "trending" | "exclusive" | null;
  borderStyle: "solid" | "neon" | "double" | "gradient" | "none";
  borderThickness: number; // in pixels at 1280x720
  useGlowEffect: boolean;
  characterBoxColor: string; // color for highlighting character boxes
}

export function getDefaultEnhancements(): ThumbnailEnhancements {
  return {
    characterHighlights: [],
    visualEffects: [
      // Arrow pointing to character/focal point
      {
        type: "arrow",
        x: 0.5,
        y: 0.15,
        size: 0.15,
        color: "#FFD700",
        rotation: 45,
        opacity: 0.9,
      },
      // Glow effect around center
      {
        type: "glow",
        x: 0.5,
        y: 0.5,
        size: 0.25,
        color: "#FF6B00",
        opacity: 0.6,
      },
    ],
    cornerBadges: "score",
    borderStyle: "gradient",
    borderThickness: 12,
    useGlowEffect: true,
    characterBoxColor: "#FFD700",
  };
}

/**
 * Draw character highlights with various styles
 */
export function drawCharacterHighlights(
  ctx: CanvasRenderingContext2D,
  highlights: CharacterHighlight[],
  canvasWidth: number,
  canvasHeight: number,
  boxColor: string
) {
  highlights.forEach((highlight) => {
    const x = highlight.x * canvasWidth;
    const y = highlight.y * canvasHeight;
    const w = highlight.width * canvasWidth;
    const h = highlight.height * canvasHeight;

    ctx.save();

    if (highlight.intensity === "high") {
      // Neon glow effect
      ctx.shadowColor = boxColor;
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else if (highlight.intensity === "medium") {
      // Medium glow
      ctx.shadowColor = boxColor;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Draw the box
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = highlight.intensity === "high" ? 6 : 4;
    ctx.globalAlpha = highlight.intensity === "high" ? 0.9 : 0.7;

    // Rounded rectangle
    const radius = 15;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  });
}

/**
 * Draw decorative visual effects like arrows, circles, etc.
 */
export function drawVisualEffects(
  ctx: CanvasRenderingContext2D,
  effects: VisualEffect[],
  canvasWidth: number,
  canvasHeight: number
) {
  effects.forEach((effect) => {
    ctx.save();

    const x = (effect.x ?? 0.5) * canvasWidth;
    const y = (effect.y ?? 0.5) * canvasHeight;
    const size = (effect.size ?? 0.1) * Math.min(canvasWidth, canvasHeight);
    const color = effect.color ?? "#FFD700";
    const opacity = effect.opacity ?? 1;
    const thickness = effect.thickness ?? 3;

    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = thickness;

    if (effect.rotation) {
      ctx.translate(x, y);
      ctx.rotate((effect.rotation * Math.PI) / 180);
      ctx.translate(-x, -y);
    }

    switch (effect.type) {
      case "arrow":
        drawArrow(ctx, x, y, size, color, thickness);
        break;

      case "circle":
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case "box":
        ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        break;

      case "star":
        drawStar(ctx, x, y, 5, size, size / 2, color, thickness);
        break;

      case "explosion":
        drawExplosion(ctx, x, y, size, color, thickness);
        break;

      case "glow":
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case "text-outline":
        if (effect.label) {
          ctx.font = `bold ${size}px 'Outfit', 'Montserrat', sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.strokeText(effect.label, x, y);
        }
        break;
    }

    ctx.restore();
  });
}

/**
 * Draw an arrow pointing in a direction
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  size: number,
  color: string,
  thickness: number
) {
  const headlen = size * 0.4;
  const angle = 0; // pointing right

  // Arrow line
  const toX = fromX + size * Math.cos(angle);
  const toY = fromY + size * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrow head
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a star shape
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  color: string,
  thickness: number
) {
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes * 2; i++) {
    let radius = i % 2 === 0 ? outerRadius : innerRadius;
    let x = cx + Math.sin(i * step) * radius;
    let y = cy - Math.cos(i * step) * radius;
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

/**
 * Draw explosion effect
 */
function drawExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  thickness: number
) {
  const rays = 12;
  const rayLength = size;

  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const x1 = x + Math.cos(angle) * (size * 0.3);
    const y1 = y + Math.sin(angle) * (size * 0.3);
    const x2 = x + Math.cos(angle) * rayLength;
    const y2 = y + Math.sin(angle) * rayLength;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

/**
 * Draw a neon border effect
 */
export function drawNeonBorder(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  color: string,
  thickness: number
) {
  ctx.save();

  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.globalAlpha = 1;

  ctx.strokeRect(thickness / 2, thickness / 2, canvasWidth - thickness, canvasHeight - thickness);

  // Inner glow line for extra effect
  ctx.shadowBlur = 15;
  ctx.lineWidth = thickness / 2;
  ctx.globalAlpha = 0.6;
  ctx.strokeRect(thickness, thickness, canvasWidth - thickness * 2, canvasHeight - thickness * 2);

  ctx.restore();
}

/**
 * Draw gradient border
 */
export function drawGradientBorder(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  color1: string,
  color2: string,
  thickness: number
) {
  ctx.save();

  // Top border
  let grad = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, thickness);

  // Right border
  grad = ctx.createLinearGradient(canvasWidth, 0, canvasWidth, canvasHeight);
  grad.addColorStop(0, color2);
  grad.addColorStop(1, color1);
  ctx.fillStyle = grad;
  ctx.fillRect(canvasWidth - thickness, 0, thickness, canvasHeight);

  // Bottom border
  grad = ctx.createLinearGradient(0, canvasHeight, canvasWidth, canvasHeight);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, canvasHeight - thickness, canvasWidth, thickness);

  // Left border
  grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  grad.addColorStop(0, color2);
  grad.addColorStop(1, color1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, thickness, canvasHeight);

  ctx.restore();
}

/**
 * Draw corner badges
 */
export function drawCornerBadge(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  badgeType: "score" | "new" | "hot" | "trending" | "exclusive",
  color: string
) {
  ctx.save();

  const badgeSize = 100;
  const x = canvasWidth - badgeSize / 2 - 10;
  const y = badgeSize / 2 + 10;

  // Triangle background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - badgeSize / 2, y - badgeSize / 2);
  ctx.lineTo(x + badgeSize / 2, y - badgeSize / 2);
  ctx.lineTo(x, y + badgeSize / 2);
  ctx.closePath();
  ctx.fill();

  // Badge text
  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px 'Outfit', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const badgeTexts: Record<string, string> = {
    new: "🆕 NEW",
    hot: "🔥 HOT",
    trending: "📈 TRENDING",
    exclusive: "⭐ EXCLUSIVE",
  };

  ctx.fillText(badgeTexts[badgeType] || badgeType.toUpperCase(), x, y - 5);

  ctx.restore();
}
