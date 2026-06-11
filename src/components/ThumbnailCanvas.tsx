import { useEffect, useRef } from "react";
import type { ViralClip, ClipTrigger } from "@/lib/clips.functions";
import {
  drawCharacterHighlights,
  drawVisualEffects,
  drawNeonBorder,
  drawGradientBorder,
  drawCornerBadge,
  type CharacterHighlight,
  type VisualEffect,
  type ThumbnailEnhancements,
  getDefaultEnhancements,
} from "@/lib/thumbnail-effects";

export interface ThumbnailConfig {
  titleText: string;
  subText: string;
  colorScheme: string; // "humor" | "controversy" | "emotional" | "hook" | "high_value" | "cliffhanger"
  emoji: string;
  showScore: boolean;
  textPosition: "top" | "center" | "bottom";
  // New enhancement options
  enhancements?: ThumbnailEnhancements;
  useViralEffects?: boolean; // Enable aggressive viral effects
}

interface ThumbnailCanvasProps {
  clip: ViralClip;
  config?: ThumbnailConfig;
  onExport?: (dataUrl: string) => void;
  width?: number; // Visual width for scaling preview
  youtubeThumbnailDataUrl?: string | null;
}

export const COLOR_SCHEMES: Record<string, { colors: [string, string]; emoji: string; label: string }> = {
  humor: { colors: ["#FF4500", "#FFD700"], emoji: "😂", label: "Humor" }, // More saturated orange
  controversy: { colors: ["#FF0000", "#FF6600"], emoji: "🤯", label: "Controvérsia" }, // Pure red to orange
  emotional: { colors: ["#6B0066", "#FF00FF"], emoji: "❤️", label: "Emocional" }, // Deep purple to magenta
  hook: { colors: ["#0066FF", "#00CCFF"], emoji: "👀", label: "Gancho" }, // Bright blue to cyan
  high_value: { colors: ["#00CC00", "#00FF00"], emoji: "💎", label: "Alto Valor" }, // Lime green
  cliffhanger: { colors: ["#FF6600", "#FFAA00"], emoji: "🔥", label: "Suspense" }, // Orange to amber
};

export function getDefaultConfig(clip: ViralClip): ThumbnailConfig {
  const mainTrigger = clip.triggers[0] || "hook";
  const scheme = COLOR_SCHEMES[mainTrigger] ? mainTrigger : "hook";
  
  // Determine badge based on score
  const determineBadge = (score: number) => {
    if (score >= 95) return "trending" as const;
    if (score >= 85) return "hot" as const;
    if (score >= 75) return "new" as const;
    return "score" as const;
  };

  // Add character highlight in center-right area (typical focal point)
  const characterHighlights = [
    {
      x: 0.60, // Right side where character usually is
      y: 0.35,
      width: 0.35,
      height: 0.55,
      intensity: "high" as const, // High intensity for main character
    },
  ];

  // Add MASSIVE and MULTIPLE visual effects for extreme viral impact
  const visualEffects = [
    // GIANT arrow pointing UP-RIGHT to character
    {
      type: "arrow" as const,
      x: 0.35,
      y: 0.25,
      size: 0.25,
      color: "#FFFF00",
      rotation: 30,
      opacity: 1,
      thickness: 8,
    },
    // MASSIVE central glow
    {
      type: "glow" as const,
      x: 0.5,
      y: 0.5,
      size: 0.4,
      color: "#FF4500",
      opacity: 0.8,
    },
    // TOP-LEFT star burst
    {
      type: "star" as const,
      x: 0.15,
      y: 0.2,
      size: 0.15,
      color: "#FFD700",
      opacity: 1,
    },
    // TOP-RIGHT star burst
    {
      type: "star" as const,
      x: 0.85,
      y: 0.2,
      size: 0.15,
      color: "#FF6600",
      opacity: 1,
    },
    // Explosion effect - LEFT
    {
      type: "explosion" as const,
      x: 0.1,
      y: 0.1,
      size: 0.12,
      color: "#FF0000",
      opacity: 0.9,
    },
    // Explosion effect - RIGHT
    {
      type: "explosion" as const,
      x: 0.9,
      y: 0.1,
      size: 0.12,
      color: "#FF00FF",
      opacity: 0.9,
    },
    // Circle with glow - CENTER
    {
      type: "circle" as const,
      x: 0.5,
      y: 0.5,
      size: 0.25,
      color: "#FFFF00",
      opacity: 0.7,
    },
  ];

  const enhancements = {
    characterHighlights,
    visualEffects,
    cornerBadges: determineBadge(clip.score),
    borderStyle: "neon" as const, // Neon border for viral effect
    borderThickness: 20, // VERY THICK border
    useGlowEffect: true,
    characterBoxColor: "#FFFF00", // Bright yellow
  };
  
  return {
    titleText: clip.title,
    subText: clip.hookQuote || "",
    colorScheme: scheme,
    emoji: COLOR_SCHEMES[scheme]?.emoji || "👀",
    showScore: true,
    textPosition: "center",
    enhancements,
    useViralEffects: true,
  };
}

export function ThumbnailCanvas({ clip, config, onExport, width = 320, youtubeThumbnailDataUrl }: ThumbnailCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calculate scaled height for 16:9 ratio
  const height = Math.round((width * 9) / 16);
  
  const currentConfig = config || getDefaultConfig(clip);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawCanvas = (bgImg: HTMLImageElement | null) => {
      // 1. Reset and Clear Canvas (Native resolution: 1280x720)
      ctx.clearRect(0, 0, 1280, 720);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const schemeInfo = COLOR_SCHEMES[currentConfig.colorScheme] || COLOR_SCHEMES.hook;

      // 2. Background (Image or Gradient)
      if (bgImg) {
        // Draw YouTube thumbnail to cover canvas (FULL ORIGINAL IMAGE)
        ctx.drawImage(bgImg, 0, 0, 1280, 720);

        // MUCH DARKER overlay to make effects pop - keep original visible but darker
        const overlay = ctx.createLinearGradient(0, 0, 1280, 0);
        overlay.addColorStop(0, "rgba(0, 0, 0, 0.65)");
        overlay.addColorStop(0.5, "rgba(0, 0, 0, 0.45)");
        overlay.addColorStop(1, "rgba(0, 0, 0, 0.3)");
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, 1280, 720);
      } else {
        // Fallback gradient if no image
        const grad = ctx.createLinearGradient(0, 0, 1280, 720);
        grad.addColorStop(0, schemeInfo.colors[0]);
        grad.addColorStop(1, schemeInfo.colors[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1280, 720);

        // Subtle background pattern (diagonal stripes)
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        for (let i = -720; i < 1280; i += 60) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 150, 720);
          ctx.lineTo(i + 190, 720);
          ctx.lineTo(i + 40, 0);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 3. AGGRESSIVE Themed Border (neon or gradient)
      const enhancements = currentConfig.enhancements || getDefaultEnhancements();
      
      if (enhancements.borderStyle === "gradient") {
        drawGradientBorder(ctx, 1280, 720, schemeInfo.colors[0], schemeInfo.colors[1], enhancements.borderThickness);
      } else if (enhancements.borderStyle === "neon") {
        drawNeonBorder(ctx, 1280, 720, schemeInfo.colors[0], enhancements.borderThickness);
      } else if (enhancements.borderStyle === "double") {
        ctx.strokeStyle = schemeInfo.colors[0];
        ctx.lineWidth = enhancements.borderThickness;
        ctx.strokeRect(enhancements.borderThickness / 2, enhancements.borderThickness / 2, 1280 - enhancements.borderThickness, 720 - enhancements.borderThickness);
        ctx.strokeRect(enhancements.borderThickness * 2, enhancements.borderThickness * 2, 1280 - enhancements.borderThickness * 4, 720 - enhancements.borderThickness * 4);
      } else if (enhancements.borderStyle !== "none") {
        ctx.strokeStyle = schemeInfo.colors[0];
        ctx.lineWidth = enhancements.borderThickness;
        ctx.strokeRect(0, 0, 1280, 720);
      }

      // Add outer glow effect
      const outerGlow = ctx.createRadialGradient(640, 360, 400, 640, 360, 900);
      outerGlow.addColorStop(0, "rgba(0, 0, 0, 0)");
      outerGlow.addColorStop(0.7, "rgba(0, 0, 0, 0.2)");
      outerGlow.addColorStop(1, "rgba(0, 0, 0, 0.6)");
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, 1280, 720);

      // 4. Large Decorative Emoji (Right side) - MASSIVE
      if (currentConfig.emoji) {
        ctx.save();
        ctx.font = "320px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif"; // HUGE
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.translate(1040, 430);
        ctx.rotate((20 * Math.PI) / 180);
        ctx.globalAlpha = 1; // FULL OPACITY
        
        // Triple shadow for extreme glow
        ctx.shadowColor = "rgba(255, 200, 0, 0.8)";
        ctx.shadowBlur = 60;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.fillText(currentConfig.emoji, 0, 0);
        
        // Add extra color glow
        ctx.shadowColor = schemeInfo.colors[0];
        ctx.shadowBlur = 40;
        ctx.globalAlpha = 0.6;
        ctx.fillText(currentConfig.emoji, 0, 0);
        
        ctx.restore();
      }

      // 4.5 Draw MASSIVE Visual Effects FIRST (under text but over image)
      if (currentConfig.useViralEffects && enhancements.visualEffects && enhancements.visualEffects.length > 0) {
        drawVisualEffects(ctx, enhancements.visualEffects, 1280, 720);
      }

      // 4.6 Draw Character Highlights (big golden boxes)
      if (enhancements.characterHighlights && enhancements.characterHighlights.length > 0) {
        drawCharacterHighlights(ctx, enhancements.characterHighlights, 1280, 720, enhancements.characterBoxColor);
      }

      // 5. Score Badge (Top Right) - ENHANCED
      if (currentConfig.showScore) {
        ctx.save();
        const bx = 1130;
        const by = 110;
        const radius = 75;

        // Outer Glow/Border - MASSIVE
        ctx.shadowColor = schemeInfo.colors[0];
        ctx.shadowBlur = 40;
        
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#09090b"; // dark surface
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 8;
        ctx.fill();
        ctx.stroke();

        // Inner glow ring
        ctx.beginPath();
        ctx.arc(bx, by, radius - 10, 0, 2 * Math.PI);
        ctx.strokeStyle = schemeInfo.colors[0];
        ctx.lineWidth = 3;
        ctx.stroke();

        // Score Value
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "900 60px 'Outfit', 'Montserrat', 'Inter', sans-serif";
        ctx.fillText(clip.score.toString(), bx, by - 10);

        // Score Label
        ctx.font = "bold 14px 'Outfit', 'Montserrat', 'Inter', sans-serif";
        ctx.fillStyle = schemeInfo.colors[1];
        ctx.fillText("VIRAL", bx, by + 32);
        ctx.restore();
      }

      // 5.7 Draw Corner Badge - PROMINENT
      if (enhancements.cornerBadges) {
        drawCornerBadge(ctx, 1280, 720, enhancements.cornerBadges, schemeInfo.colors[0]);
      }

      // 6. Draw Text (Title & Subtitle)
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      const titleFontSize = 95; // Increased from 75
      ctx.font = `900 ${titleFontSize}px 'Outfit', 'Montserrat', 'Inter', 'Segoe UI', sans-serif`;
      
      const maxTextWidth = 750; // Keep space for emoji/score on the right
      const titleLineHeight = titleFontSize * 1.1;
      const titleLines = wrapText(ctx, currentConfig.titleText.toUpperCase(), maxTextWidth);
      
      const subFontSize = 50; // Increased from 42
      ctx.font = `italic 700 ${subFontSize}px 'Outfit', 'Montserrat', 'Inter', 'Segoe UI', sans-serif`;
      const subLineHeight = subFontSize * 1.2;
      const subLines = currentConfig.subText ? wrapText(ctx, `"${currentConfig.subText}"`, maxTextWidth) : [];
      
      const textGap = 30;
      const totalTitleHeight = titleLines.length * titleLineHeight;
      const totalSubHeight = subLines.length > 0 ? (subLines.length * subLineHeight) + textGap : 0;
      const totalTextHeight = totalTitleHeight + totalSubHeight;
      
      let startY = 100; // Default top
      if (currentConfig.textPosition === "center") {
        startY = (720 - totalTextHeight) / 2;
      } else if (currentConfig.textPosition === "bottom") {
        startY = 720 - 120 - totalTextHeight;
      }
      
      // Draw Title Lines
      titleLines.forEach((line, idx) => {
        const lineY = startY + idx * titleLineHeight;
        
        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 8;
        
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 18; // Thicker outline for more impact
        ctx.font = `900 ${titleFontSize}px 'Outfit', 'Montserrat', 'Inter', 'Segoe UI', sans-serif`;
        ctx.strokeText(line, 60, lineY);
        
        // Main white text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(line, 60, lineY);
        
        // Optional: Add color highlight/glow to first line
        if (idx === 0) {
          ctx.fillStyle = schemeInfo.colors[1];
          ctx.globalAlpha = 0.3;
          ctx.fillText(line, 62, lineY + 2);
          ctx.globalAlpha = 1;
        }
      });
      
      // Draw Subtitle Lines (Subtext)
      if (subLines.length > 0) {
        const subStartY = startY + totalTitleHeight + textGap;
        
        subLines.forEach((line, idx) => {
          const lineY = subStartY + idx * subLineHeight;
          
          ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 6;
          
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 12;
          ctx.font = `italic 700 ${subFontSize}px 'Outfit', 'Montserrat', 'Inter', 'Segoe UI', sans-serif`;
          ctx.strokeText(line, 60, lineY);
          
          // Bright yellow/gold for subtitle
          ctx.fillStyle = "#FFFF00";
          ctx.fillText(line, 60, lineY);
        });
      }

      ctx.restore();

      // 7. Trigger Export callback
      if (onExport) {
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
          onExport(dataUrl);
        } catch (err) {
          console.error("Erro ao exportar canvas da thumbnail:", err);
        }
      }
    };

    if (youtubeThumbnailDataUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = youtubeThumbnailDataUrl;
      img.onload = () => {
        drawCanvas(img);
      };
      img.onerror = (e) => {
        console.error("Erro ao carregar imagem de fundo da thumbnail. Usando fallback de gradiente.", e);
        drawCanvas(null);
      };
    } else {
      drawCanvas(null);
    }
  }, [clip, currentConfig, youtubeThumbnailDataUrl, onExport]);

  // Helper to wrap text
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  return (
    <div 
      className="relative overflow-hidden rounded-xl bg-slate-950 border border-border flex items-center justify-center"
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        aspectRatio: "16 / 9"
      }}
    >
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
