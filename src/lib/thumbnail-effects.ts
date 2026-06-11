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
  style?: "box" | "halo" | "spotlight" | "neon-box"; // highlight style
  label?: string; // optional label for the character
}

export interface VisualEffect {
  type: "arrow" | "circle" | "box" | "star" | "explosion" | "glow" | "text-outline" | "lightning" | "pulse-ring" | "directional-arrow";
  x?: number; // x position (0-1)
  y?: number; // y position (0-1)
  size?: number; // size (0-1)
  color?: string; // hex color
  rotation?: number; // rotation in degrees
  opacity?: number; // 0-1
  label?: string; // text for the effect
  thickness?: number; // stroke thickness
  targetX?: number; // for directional effects (0-1)
  targetY?: number; // for directional effects (0-1)
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
    const style = highlight.style || "box";

    if (style === "spotlight") {
      drawSpotlight(ctx, x, y, w, h, boxColor, highlight.intensity);
    } else if (style === "halo") {
      drawHalo(ctx, x, y, w, h, boxColor, highlight.intensity);
    } else if (style === "neon-box") {
      drawNeonBox(ctx, x, y, w, h, boxColor, highlight.intensity === "high" ? 8 : 6);
      drawPulseRing(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 0.4, boxColor, 3);
    } else {
      // Default box style
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
    }
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

      case "directional-arrow":
        if (effect.targetX !== undefined && effect.targetY !== undefined) {
          const targetX = effect.targetX * canvasWidth;
          const targetY = effect.targetY * canvasHeight;
          drawDirectionalArrow(ctx, x, y, targetX, targetY, color, thickness);
        }
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

      case "lightning":
        drawLightning(ctx, x, y, size, color, thickness);
        break;

      case "pulse-ring":
        drawPulseRing(ctx, x, y, size, color, thickness);
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
 * Draw an arrow pointing in a direction (MASSIVE and visible)
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  size: number,
  color: string,
  thickness: number
) {
  const headlen = size * 0.5;

  // Arrow line (pointing right then rotated)
  const toX = fromX + size * Math.cos(0);
  const toY = fromY + size * Math.sin(0);

  // Draw line with extra glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness + 2;
  ctx.stroke();

  // Arrow head (filled triangle)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(0 - Math.PI / 6), toY - headlen * Math.sin(0 - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(0 + Math.PI / 6), toY - headlen * Math.sin(0 + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a star shape (BRIGHT and bold)
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

  // Glow effect
  ctx.shadowColor = color;
  ctx.shadowBlur = 25;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes * 2; i++) {
    let radius = i % 2 === 0 ? outerRadius : innerRadius;
    let x = cx + Math.sin(i * step) * radius;
    let y = cy - Math.cos(i * step) * radius;
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness + 1;
  ctx.stroke();
  
  // Fill star with semi-transparent color
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Draw explosion effect (MASSIVE)
 */
function drawExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  thickness: number
) {
  const rays = 16; // More rays
  const rayLength = size * 1.5; // Longer rays

  // Outer glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;

  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const x1 = x + Math.cos(angle) * (size * 0.4);
    const y1 = y + Math.sin(angle) * (size * 0.4);
    const x2 = x + Math.cos(angle) * rayLength;
    const y2 = y + Math.sin(angle) * rayLength;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness + 1;
    ctx.stroke();
  }

  // Center glow circle
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
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

/**
 * Draw spotlight effect on a character (viral style)
 */
export function drawSpotlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  intensity: "low" | "medium" | "high" = "high"
) {
  ctx.save();

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const spotlightRadius = Math.max(width, height) * 0.7;

  // Create radial gradient for spotlight
  const spotlightGradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    spotlightRadius * 2
  );

  spotlightGradient.addColorStop(0, color.includes("#") ? color + "40" : color);
  spotlightGradient.addColorStop(0.5, color.includes("#") ? color + "20" : color);
  spotlightGradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = spotlightGradient;
  ctx.fillRect(x - spotlightRadius, y - spotlightRadius, spotlightRadius * 2, spotlightRadius * 2);

  ctx.restore();
}

/**
 * Draw halo/aura effect around character (viral style)
 */
export function drawHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  intensity: "low" | "medium" | "high" = "high"
) {
  ctx.save();

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.max(width, height) * 0.6;

  // Multiple halo layers for more impact
  const layers = intensity === "high" ? 4 : intensity === "medium" ? 2 : 1;

  for (let i = 0; i < layers; i++) {
    const layerRadius = radius + i * 10;
    const alpha = intensity === "high" ? 0.3 - i * 0.05 : intensity === "medium" ? 0.2 - i * 0.03 : 0.1;

    ctx.shadowColor = color;
    ctx.shadowBlur = 20 + i * 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 - i * 0.5;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.arc(centerX, centerY, layerRadius, 0, 2 * Math.PI);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draw lightning bolt effect
 */
export function drawLightning(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  thickness: number
) {
  ctx.save();

  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;

  // Lightning pattern
  const points = [
    [0, 0],
    [size * 0.2, size * 0.3],
    [size * 0.1, size * 0.5],
    [size * 0.3, size * 0.7],
    [0, size],
  ];

  ctx.beginPath();
  ctx.moveTo(x + points[0][0], y + points[0][1]);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(x + points[i][0], y + points[i][1]);
  }

  ctx.stroke();

  // Fill with semi-transparent color
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = thickness * 2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/**
 * Draw pulse ring effect (expanding circle)
 */
export function drawPulseRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  thickness: number
) {
  ctx.save();

  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.globalAlpha = 0.8;

  // Draw 3 expanding rings
  for (let i = 0; i < 3; i++) {
    const ringRadius = radius - i * 20;
    if (ringRadius > 0) {
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw neon box around character (more viral)
 */
export function drawNeonBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  thickness: number = 6
) {
  ctx.save();

  const cornerSize = Math.min(width, height) * 0.15;

  // Glow effect
  ctx.shadowColor = color;
  ctx.shadowBlur = 25;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw corners only (more viral aesthetic)
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;

  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(x, y + cornerSize);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerSize, y);
  ctx.stroke();

  // Top-right corner
  ctx.beginPath();
  ctx.moveTo(x + width - cornerSize, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + cornerSize);
  ctx.stroke();

  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(x + width, y + height - cornerSize);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width - cornerSize, y + height);
  ctx.stroke();

  // Bottom-left corner
  ctx.beginPath();
  ctx.moveTo(x + cornerSize, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + height - cornerSize);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw directional arrow pointing from one point to another
 */
function drawDirectionalArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  thickness: number
) {
  ctx.save();

  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const headlen = 30;

  // Glow effect
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;

  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness + 2;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Draw arrowhead
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Get preset viral thumbnail enhancements based on trigger type
 */
export function getViralPreset(triggerType: string): ThumbnailEnhancements {
  const baseColor = "#FFD700";
  const accentColor = "#FF0000";

  const presets: Record<string, ThumbnailEnhancements> = {
    humor: {
      characterHighlights: [
        {
          x: 0.15,
          y: 0.4,
          width: 0.25,
          height: 0.45,
          intensity: "high",
          style: "spotlight",
        },
      ],
      visualEffects: [
        {
          type: "explosion",
          x: 0.15,
          y: 0.2,
          size: 0.15,
          color: "#FFD700",
          opacity: 0.9,
        },
        {
          type: "lightning",
          x: 0.85,
          y: 0.3,
          size: 0.15,
          color: "#FFAA00",
          thickness: 4,
        },
      ],
      cornerBadges: "hot",
      borderStyle: "neon",
      borderThickness: 12,
      useGlowEffect: true,
      characterBoxColor: "#FFD700",
    },
    controversy: {
      characterHighlights: [
        {
          x: 0.25,
          y: 0.35,
          width: 0.3,
          height: 0.5,
          intensity: "high",
          style: "neon-box",
        },
      ],
      visualEffects: [
        {
          type: "pulse-ring",
          x: 0.25,
          y: 0.6,
          size: 0.15,
          color: "#FF0000",
          thickness: 4,
        },
        {
          type: "arrow",
          x: 0.8,
          y: 0.25,
          size: 0.2,
          color: "#FF0000",
          rotation: 45,
          opacity: 0.9,
        },
      ],
      cornerBadges: "trending",
      borderStyle: "gradient",
      borderThickness: 14,
      useGlowEffect: true,
      characterBoxColor: "#FF0000",
    },
    emotional: {
      characterHighlights: [
        {
          x: 0.2,
          y: 0.3,
          width: 0.28,
          height: 0.52,
          intensity: "high",
          style: "halo",
        },
      ],
      visualEffects: [
        {
          type: "glow",
          x: 0.2,
          y: 0.55,
          size: 0.25,
          color: "#FF00FF",
          opacity: 0.4,
        },
      ],
      cornerBadges: "exclusive",
      borderStyle: "gradient",
      borderThickness: 10,
      useGlowEffect: true,
      characterBoxColor: "#FF00FF",
    },
    hook: {
      characterHighlights: [
        {
          x: 0.15,
          y: 0.35,
          width: 0.3,
          height: 0.5,
          intensity: "high",
          style: "spotlight",
        },
      ],
      visualEffects: [
        {
          type: "circle",
          x: 0.85,
          y: 0.5,
          size: 0.1,
          color: "#00CCFF",
          thickness: 5,
          opacity: 0.8,
        },
        {
          type: "arrow",
          x: 0.75,
          y: 0.3,
          size: 0.18,
          color: "#00CCFF",
          rotation: 135,
          opacity: 0.85,
        },
      ],
      cornerBadges: "new",
      borderStyle: "neon",
      borderThickness: 11,
      useGlowEffect: true,
      characterBoxColor: "#00CCFF",
    },
    high_value: {
      characterHighlights: [
        {
          x: 0.22,
          y: 0.32,
          width: 0.27,
          height: 0.5,
          intensity: "high",
          style: "neon-box",
        },
      ],
      visualEffects: [
        {
          type: "star",
          x: 0.8,
          y: 0.3,
          size: 0.18,
          color: "#00FF00",
          thickness: 4,
          opacity: 0.9,
        },
        {
          type: "pulse-ring",
          x: 0.8,
          y: 0.3,
          size: 0.12,
          color: "#00FF00",
          thickness: 3,
        },
      ],
      cornerBadges: "trending",
      borderStyle: "gradient",
      borderThickness: 12,
      useGlowEffect: true,
      characterBoxColor: "#00FF00",
    },
    cliffhanger: {
      characterHighlights: [
        {
          x: 0.18,
          y: 0.33,
          width: 0.29,
          height: 0.52,
          intensity: "high",
          style: "halo",
        },
      ],
      visualEffects: [
        {
          type: "lightning",
          x: 0.82,
          y: 0.25,
          size: 0.2,
          color: "#FF6600",
          thickness: 5,
        },
        {
          type: "explosion",
          x: 0.12,
          y: 0.25,
          size: 0.12,
          color: "#FFAA00",
          opacity: 0.85,
        },
      ],
      cornerBadges: "hot",
      borderStyle: "neon",
      borderThickness: 13,
      useGlowEffect: true,
      characterBoxColor: "#FF6600",
    },
  };

  return presets[triggerType] || presets.hook;
}


