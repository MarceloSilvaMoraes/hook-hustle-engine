import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sharp from "sharp";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Sistema Automatizado de Geração de Thumbnails Profissionais
 * Arquitetura: Captura -> Remove Fundo -> Gera Texto -> Compõe Final
 */

const ThumbnailGenerationSchema = z.object({
  videoPath: z.string().min(1),
  clipTitle: z.string().min(1).max(80),
  clipHook: z.string().min(1).max(60),
  triggerType: z.enum(["humor", "controversy", "emotional", "hook", "high_value", "cliffhanger"]),
  extractAtSeconds: z.number().optional().default(2), // Qual segundo extrair o frame
  personPosition: z.enum(["left", "center", "right"]).optional().default("center"),
});

// Configurações de design por tipo de gatilho
const DESIGN_PRESETS = {
  humor: {
    backgroundColor: "#FF4500",
    accentColor: "#FFD700",
    textColor: "#FFFFFF",
    borderColor: "#FFAA00",
    emoji: "😂",
  },
  controversy: {
    backgroundColor: "#FF0000",
    accentColor: "#FF6600",
    textColor: "#FFFFFF",
    borderColor: "#FFAA00",
    emoji: "🔥",
  },
  emotional: {
    backgroundColor: "#6B0066",
    accentColor: "#FF00FF",
    textColor: "#FFFFFF",
    borderColor: "#FF69B4",
    emoji: "❤️",
  },
  hook: {
    backgroundColor: "#0066FF",
    accentColor: "#00CCFF",
    textColor: "#FFFFFF",
    borderColor: "#1E90FF",
    emoji: "👀",
  },
  high_value: {
    backgroundColor: "#00CC00",
    accentColor: "#00FF00",
    textColor: "#000000",
    borderColor: "#32CD32",
    emoji: "💎",
  },
  cliffhanger: {
    backgroundColor: "#FF6600",
    accentColor: "#FFAA00",
    textColor: "#FFFFFF",
    borderColor: "#FFD700",
    emoji: "🔥",
  },
};

/**
 * ETAPA 1: Extrair Frame do Vídeo (FFmpeg)
 * Extrai um frame específico do vídeo em alta qualidade
 */
async function extractVideoFrame(
  videoPath: string,
  secondsToExtract: number,
  outputPath: string
): Promise<string> {
  try {
    const command = `ffmpeg -i "${videoPath}" -ss ${secondsToExtract} -vframes 1 -q:v 2 "${outputPath}" -y`;
    execSync(command, { stdio: "pipe" });
    return outputPath;
  } catch (error) {
    console.error("Erro ao extrair frame:", error);
    throw new Error("Falha na extração do frame do vídeo");
  }
}

/**
 * ETAPA 2: Remover Fundo (Rembg)
 * Remove o background usando Rembg Python
 * Alternativa: usar API remove.bg se não tiver Python local
 */
async function removeBackground(imagePath: string, outputPath: string): Promise<string> {
  try {
    // Tenta usar rembg via Python se instalado
    const command = `python -m rembg i "${imagePath}" "${outputPath}"`;
    execSync(command, { stdio: "pipe" });
    return outputPath;
  } catch (error) {
    console.warn("Rembg não disponível localmente, usando fallback com padding:", error);
    // Fallback: apenas copia a imagem (em produção, use API remove.bg)
    fs.copyFileSync(imagePath, outputPath);
    return outputPath;
  }
}

/**
 * ETAPA 3: Criar Texto SVG Dinâmico
 * Gera SVG com texto chamativo, borda grossa e sombra
 */
function createTextSVG(
  title: string,
  hook: string,
  colors: (typeof DESIGN_PRESETS)[keyof typeof DESIGN_PRESETS]
): string {
  const titleLines = title.split(" ");
  const hookLines = hook.split(" ");

  // Wrapping de texto para não ultrapassar largura
  const wrapText = (words: string[], maxWidth: number = 600): string[] => {
    let lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + word).length * 18 > maxWidth) {
        lines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        currentLine += word + " ";
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    return lines;
  };

  const titleWrapped = wrapText(titleLines);
  const hookWrapped = wrapText(hookLines);

  const svgHeight = 300 + titleWrapped.length * 80 + hookWrapped.length * 40;

  // SVG com estilos profissionais
  const svg = `
    <svg width="1280" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="4" dy="4" stdDeviation="3" flood-opacity="0.7"/>
        </filter>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Fundo degradado -->
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.backgroundColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.accentColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1280" height="${svgHeight}" fill="url(#bgGradient)"/>

      <!-- Padrão de diagonal (efeito visual) -->
      <pattern id="diag" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.05)" stroke-width="20"/>
      </pattern>
      <rect width="1280" height="${svgHeight}" fill="url(#diag)"/>

      <!-- TÍTULO (Palavras-chave em MAIÚSCULA e BOLD) -->
      ${titleWrapped
        .map(
          (line, idx) => `
        <text
          x="640"
          y="${120 + idx * 90}"
          font-family="Impact, Arial Black, sans-serif"
          font-size="85"
          font-weight="900"
          fill="${colors.textColor}"
          text-anchor="middle"
          filter="url(#shadow)"
          style="text-shadow: -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000"
        >
          ${line.toUpperCase()}
        </text>
        <text
          x="640"
          y="${120 + idx * 90}"
          font-family="Impact, Arial Black, sans-serif"
          font-size="85"
          font-weight="900"
          fill="${colors.accentColor}"
          text-anchor="middle"
          opacity="0.3"
        >
          ${line.toUpperCase()}
        </text>
      `
        )
        .join("")}

      <!-- SUBTÍTULO (Hook em itálico) -->
      ${hookWrapped
        .map(
          (line, idx) => `
        <text
          x="640"
          y="${titleWrapped.length * 90 + 280 + idx * 50}"
          font-family="Bebas Neue, Arial, sans-serif"
          font-size="50"
          font-style="italic"
          font-weight="700"
          fill="#FFFF00"
          text-anchor="middle"
          filter="url(#shadow)"
        >
          "${line}"
        </text>
      `
        )
        .join("")}

      <!-- Emoji decorativo -->
      <text
        x="1100"
        y="100"
        font-size="120"
        text-anchor="middle"
        filter="url(#glow)"
      >
        ${colors.emoji}
      </text>

      <!-- Borda neon -->
      <rect
        x="10"
        y="10"
        width="1260"
        height="${svgHeight - 20}"
        fill="none"
        stroke="${colors.borderColor}"
        stroke-width="8"
        rx="20"
      />
    </svg>
  `;

  return svg;
}

/**
 * ETAPA 4: Compor Thumbnail Final (Sharp)
 * Combina: fundo gradiente + pessoa sem fundo + texto SVG
 */
async function composeThumbnail(
  personImagePath: string,
  textSvg: string,
  triggerType: keyof typeof DESIGN_PRESETS,
  personPosition: "left" | "center" | "right",
  outputPath: string
): Promise<string> {
  const colors = DESIGN_PRESETS[triggerType];

  // Criar fundo gradiente base (1280x720)
  const backgroundSvg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.backgroundColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.accentColor};stop-opacity:1" />
        </linearGradient>
        <pattern id="pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="60" y2="60" stroke="rgba(255,255,255,0.08)" stroke-width="15"/>
        </pattern>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect width="1280" height="720" fill="url(#pattern)"/>
    </svg>
  `;

  // Calcular posição da pessoa baseado em personPosition
  const positionMap = {
    left: { x: 80, width: 350, height: 650 },
    center: { x: 465, width: 350, height: 650 },
    right: { x: 850, width: 350, height: 650 },
  };

  const position = positionMap[personPosition];

  try {
    // Redimensionar imagem da pessoa para caber no espaço
    const personBuffer = await sharp(personImagePath)
      .resize(position.width, position.height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fundo transparente
      })
      .png()
      .toBuffer();

    // Texto SVG como buffer
    const textBuffer = Buffer.from(textSvg);

    // Compor camadas: fundo + pessoa + texto
    const compositeBuffer = await sharp(Buffer.from(backgroundSvg))
      .composite([
        { input: personBuffer, top: 35, left: position.x, blend: "over" },
        { input: textBuffer, top: 0, left: 0, blend: "over" },
      ])
      .jpeg({ quality: 95, progressive: true })
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error("Erro ao compor thumbnail:", error);
    throw new Error("Falha na composição final da thumbnail");
  }
}

/**
 * API Principal: Gera Thumbnail Completa
 */
export const generateThumbnailAutomatic = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ThumbnailGenerationSchema.parse(data))
  .handler(async ({ data }) => {
    const tempDir = path.join(process.cwd(), "tmp", "thumbnails");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const frameFile = path.join(tempDir, `frame_${timestamp}.jpg`);
    const noBackgroundFile = path.join(tempDir, `nobg_${timestamp}.png`);
    const outputFile = path.join(tempDir, `thumbnail_${timestamp}.jpg`);

    try {
      console.log("🎬 [1/4] Extraindo frame do vídeo...");
      await extractVideoFrame(data.videoPath, data.extractAtSeconds, frameFile);

      console.log("✂️ [2/4] Removendo fundo...");
      await removeBackground(frameFile, noBackgroundFile);

      console.log("✍️ [3/4] Gerando texto dinâmico...");
      const textSvg = createTextSVG(data.clipTitle, data.clipHook, DESIGN_PRESETS[data.triggerType]);

      console.log("🎨 [4/4] Compondo thumbnail final...");
      await composeThumbnail(noBackgroundFile, textSvg, data.triggerType, data.personPosition, outputFile);

      // Ler arquivo e converter para base64
      const thumbnailBuffer = fs.readFileSync(outputFile);
      const base64Thumbnail = thumbnailBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64Thumbnail}`;

      // Limpar arquivos temporários
      [frameFile, noBackgroundFile, outputFile].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });

      return {
        success: true,
        thumbnailDataUrl: dataUrl,
        message: "✅ Thumbnail gerada com sucesso!",
      };
    } catch (error) {
      // Limpar em caso de erro
      [frameFile, noBackgroundFile, outputFile].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });

      console.error("Erro ao gerar thumbnail:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

/**
 * Versão com API Remove.bg (alternativa ao Rembg local)
 */
export const generateThumbnailWithRemoveBgApi = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ThumbnailGenerationSchema.parse(data))
  .handler(async ({ data }) => {
    const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

    if (!REMOVE_BG_API_KEY) {
      return {
        success: false,
        error: "Remove.bg API key não configurada. Configure REMOVE_BG_API_KEY no .env",
      };
    }

    const tempDir = path.join(process.cwd(), "tmp", "thumbnails");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const frameFile = path.join(tempDir, `frame_${timestamp}.jpg`);
    const noBackgroundFile = path.join(tempDir, `nobg_${timestamp}.png`);
    const outputFile = path.join(tempDir, `thumbnail_${timestamp}.jpg`);

    try {
      console.log("🎬 [1/4] Extraindo frame do vídeo...");
      await extractVideoFrame(data.videoPath, data.extractAtSeconds, frameFile);

      console.log("✂️ [2/4] Removendo fundo via API...");
      const frameBuffer = fs.readFileSync(frameFile);
      const formData = new FormData();
      formData.append("image_file", new Blob([frameBuffer]), "frame.jpg");

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": REMOVE_BG_API_KEY },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Remove.bg API error: ${response.status}`);
      }

      const resultBuffer = await response.arrayBuffer();
      fs.writeFileSync(noBackgroundFile, Buffer.from(resultBuffer));

      console.log("✍️ [3/4] Gerando texto dinâmico...");
      const textSvg = createTextSVG(data.clipTitle, data.clipHook, DESIGN_PRESETS[data.triggerType]);

      console.log("🎨 [4/4] Compondo thumbnail final...");
      await composeThumbnail(noBackgroundFile, textSvg, data.triggerType, data.personPosition, outputFile);

      // Ler e converter para base64
      const thumbnailBuffer = fs.readFileSync(outputFile);
      const base64Thumbnail = thumbnailBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64Thumbnail}`;

      // Limpar temporários
      [frameFile, noBackgroundFile, outputFile].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });

      return {
        success: true,
        thumbnailDataUrl: dataUrl,
        message: "✅ Thumbnail gerada com sucesso via Remove.bg!",
      };
    } catch (error) {
      [frameFile, noBackgroundFile, outputFile].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });

      console.error("Erro ao gerar thumbnail com API:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro na geração",
      };
    }
  });

/**
 * Versão rápida (sem remover fundo - apenas compor)
 * Use para testes ou quando o vídeo já tem fundo apropriado
 */
export const generateThumbnailQuick = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ThumbnailGenerationSchema.parse(data))
  .handler(async ({ data }) => {
    const tempDir = path.join(process.cwd(), "tmp", "thumbnails");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const frameFile = path.join(tempDir, `frame_${timestamp}.jpg`);
    const outputFile = path.join(tempDir, `thumbnail_quick_${timestamp}.jpg`);

    try {
      console.log("🎬 Extraindo frame...");
      await extractVideoFrame(data.videoPath, data.extractAtSeconds, frameFile);

      console.log("✍️ Gerando texto...");
      const textSvg = createTextSVG(data.clipTitle, data.clipHook, DESIGN_PRESETS[data.triggerType]);

      console.log("🎨 Compondo...");
      const colors = DESIGN_PRESETS[data.triggerType];
      const bgSvg = `
        <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${colors.backgroundColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${colors.accentColor};stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="1280" height="720" fill="url(#bg)"/>
        </svg>
      `;

      const compositeBuffer = await sharp(Buffer.from(bgSvg))
        .composite([
          {
            input: frameFile,
            top: 35,
            left: 65,
            blend: "over",
          },
          { input: Buffer.from(textSvg), top: 0, left: 0, blend: "over" },
        ])
        .jpeg({ quality: 95 })
        .toFile(outputFile);

      const thumbnailBuffer = fs.readFileSync(outputFile);
      const dataUrl = `data:image/jpeg;base64,${thumbnailBuffer.toString("base64")}`;

      [frameFile, outputFile].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });

      return {
        success: true,
        thumbnailDataUrl: dataUrl,
        message: "✅ Thumbnail rápida gerada!",
      };
    } catch (error) {
      [frameFile, outputFile].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro na geração",
      };
    }
  });
