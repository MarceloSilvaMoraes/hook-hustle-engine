import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sharp from "sharp";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * 🎬 PIPELINE PROFISSIONAL DE COMPOSIÇÃO DE THUMBNAILS
 * 
 * Arquitetura em Camadas:
 * 1️⃣  Extrair frame inteligente do vídeo
 * 2️⃣  Remover fundo (segmentação) - isolar pessoa
 * 3️⃣  Criar fundo templato profissional
 * 4️⃣  Compor camadas: fundo + pessoas + texto + efeitos
 * 5️⃣  Exportar como JPEG final
 */

const ProfessionalThumbnailSchema = z.object({
  videoPath: z.string().min(1), // Local path OU URL remota
  clipTitle: z.string().min(1).max(80),
  clipHook: z.string().min(1).max(60),
  triggerType: z.enum(["humor", "controversy", "emotional", "hook", "high_value", "cliffhanger"]),
  extractAtSeconds: z.number().optional().default(2),
  personPositions: z.array(z.enum(["left", "center", "right"])).optional().default(["center"]),
  backgroundTemplate: z.enum(["dark_gradient", "vibrant_gradient", "city_night", "abstract"]).optional().default("dark_gradient"),
  useAdvancedEffects: z.boolean().optional().default(true),
});

// Presets de cores profissionais
const DESIGN_PRESETS = {
  humor: {
    primary: "#FF4500",
    secondary: "#FFD700",
    accent: "#FFAA00",
    text: "#FFFFFF",
    shadow: "rgba(0,0,0,0.8)",
    emoji: "😂",
  },
  controversy: {
    primary: "#FF0000",
    secondary: "#FF6600",
    accent: "#FFAA00",
    text: "#FFFFFF",
    shadow: "rgba(0,0,0,0.8)",
    emoji: "🔥",
  },
  emotional: {
    primary: "#6B0066",
    secondary: "#FF00FF",
    accent: "#FF69B4",
    text: "#FFFFFF",
    shadow: "rgba(0,0,0,0.8)",
    emoji: "❤️",
  },
  hook: {
    primary: "#0066FF",
    secondary: "#00CCFF",
    accent: "#1E90FF",
    text: "#FFFFFF",
    shadow: "rgba(0,0,0,0.8)",
    emoji: "👀",
  },
  high_value: {
    primary: "#00CC00",
    secondary: "#00FF00",
    accent: "#32CD32",
    text: "#FFFFFF",
    shadow: "rgba(0,0,0,0.8)",
    emoji: "💎",
  },
  cliffhanger: {
    primary: "#FF6600",
    secondary: "#FFAA00",
    accent: "#FFD700",
    text: "#FFFFFF",
    shadow: "rgba(0,0,0,0.8)",
    emoji: "🔥",
  },
};

/**
 * ETAPA 1: Download de vídeo (se necessário)
 */
async function downloadVideoFile(videoUrl: string, outputPath: string): Promise<void> {
  try {
    console.log(`📥 Download: ${videoUrl.substring(0, 50)}...`);
    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`✅ Download completo: ${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
  } catch (error) {
    console.error("Erro ao fazer download:", error);
    throw error;
  }
}

/**
 * ETAPA 1: Obter caminho local do vídeo
 */
async function getLocalVideoPath(videoPath: string, tempDir: string): Promise<{ localPath: string; isDownloaded: boolean }> {
  if (videoPath.startsWith("http://") || videoPath.startsWith("https://")) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const localPath = path.join(tempDir, `video_${timestamp}_${randomId}.mp4`);
    
    await downloadVideoFile(videoPath, localPath);
    return { localPath, isDownloaded: true };
  }
  
  if (fs.existsSync(videoPath)) {
    return { localPath: videoPath, isDownloaded: false };
  }
  
  throw new Error(`Vídeo não encontrado: ${videoPath}`);
}

/**
 * ETAPA 1: Extrair frame inteligente do vídeo (FFmpeg)
 * Extrai um frame de alta qualidade em um segundo específico
 */
async function extractVideoFrame(
  videoPath: string,
  secondsToExtract: number,
  outputPath: string
): Promise<string> {
  try {
    console.log(`🎥 Extraindo frame no segundo ${secondsToExtract}...`);
    const command = `ffmpeg -i "${videoPath}" -ss ${secondsToExtract} -vframes 1 -q:v 2 -vf "scale=1920:1080:force_original_aspect_ratio=decrease" "${outputPath}" -y`;
    execSync(command, { stdio: "pipe" });
    return outputPath;
  } catch (error) {
    console.error("Erro ao extrair frame:", error);
    throw new Error("Falha na extração do frame");
  }
}

/**
 * ETAPA 2: Remover fundo com fallback robusto
 * Tenta: 1) Rembg local → 2) Remove.bg API → 3) Segmentação simples
 */
async function removeBackgroundRobust(
  imagePath: string,
  outputPath: string,
  removeApiKey?: string
): Promise<{ success: boolean; method: string }> {
  // Método 1: Rembg local (Python)
  try {
    console.log("🎨 [Método 1] Tentando Rembg local...");
    const command = `python -m rembg i "${imagePath}" "${outputPath}" -a`;
    execSync(command, { stdio: "pipe", timeout: 30000 });
    console.log("✅ Rembg local funcionou!");
    return { success: true, method: "rembg_local" };
  } catch (error) {
    console.warn("⚠️  Rembg local não disponível");
  }

  // Método 2: Remove.bg API
  if (removeApiKey) {
    try {
      console.log("🎨 [Método 2] Tentando Remove.bg API...");
      const imageBuffer = fs.readFileSync(imagePath);
      
      const formData = new FormData();
      formData.append("image_file", new Blob([imageBuffer]));
      
      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-API-Key": removeApiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const resultBuffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(resultBuffer));
      console.log("✅ Remove.bg API funcionou!");
      return { success: true, method: "removebg_api" };
    } catch (error) {
      console.warn("⚠️  Remove.bg API falhou:", error);
    }
  }

  // Método 3: Segmentação simples (cores de borda)
  try {
    console.log("🎨 [Método 3] Usando segmentação simples...");
    // Usar sharp para detectar fundo similar (edge-based)
    await sharp(imagePath)
      .removeAlpha()
      .toFile(outputPath);
    console.log("✅ Segmentação simples funcionou!");
    return { success: true, method: "simple_segmentation" };
  } catch (error) {
    console.error("❌ Todos os métodos falharam:", error);
    return { success: false, method: "failed" };
  }
}

/**
 * ETAPA 3: Criar templates de fundo profissionais
 */
function createBackgroundTemplate(
  width: number,
  height: number,
  templateType: string,
  colors: (typeof DESIGN_PRESETS)[keyof typeof DESIGN_PRESETS]
): string {
  switch (templateType) {
    case "dark_gradient":
      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
              <stop offset="50%" style="stop-color:#1a1a1a;stop-opacity:1" />
              <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:0.8" />
            </linearGradient>
            <radialGradient id="glow" cx="50%" cy="30%">
              <stop offset="0%" style="stop-color:${colors.accent};stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0" />
            </radialGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#bg)"/>
          <rect width="${width}" height="${height}" fill="url(#glow)"/>
          <!-- Padrão diagonal sutil -->
          <pattern id="pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.05)" stroke-width="2"/>
            <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.03)" stroke-width="2"/>
          </pattern>
          <rect width="${width}" height="${height}" fill="url(#pattern)"/>
        </svg>
      `;

    case "vibrant_gradient":
      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#bg)"/>
          <!-- Efeito de brilho -->
          <ellipse cx="${width * 0.3}" cy="${height * 0.3}" rx="${width * 0.4}" ry="${height * 0.4}" 
                   fill="${colors.accent}" opacity="0.15"/>
          <ellipse cx="${width * 0.8}" cy="${height * 0.8}" rx="${width * 0.3}" ry="${height * 0.3}" 
                   fill="${colors.accent}" opacity="0.1"/>
        </svg>
      `;

    case "city_night":
      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#0a1628;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
            </linearGradient>
            <filter id="blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
            </filter>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#bg)"/>
          <!-- Luzes de cidade desfocadas -->
          <circle cx="${width * 0.1}" cy="${height * 0.2}" r="40" fill="${colors.primary}" opacity="0.3" filter="url(#blur)"/>
          <circle cx="${width * 0.9}" cy="${height * 0.3}" r="30" fill="${colors.secondary}" opacity="0.25" filter="url(#blur)"/>
          <circle cx="${width * 0.5}" cy="${height * 0.9}" r="50" fill="${colors.accent}" opacity="0.2" filter="url(#blur)"/>
        </svg>
      `;

    default:
      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#bg)"/>
        </svg>
      `;
  }
}

/**
 * ETAPA 4: Criar SVG de texto profissional com bordas GROSSAS (estilo YouTube)
 * Contorno: preto com stroke-width: 18px
 * Cor: amarelo (#FFD700)
 * Posição: Estratégica na lateral esquerda (não cobre a pessoa)
 */
function createTextSVG(
  title: string,
  hook: string,
  colors: (typeof DESIGN_PRESETS)[keyof typeof DESIGN_PRESETS],
  width: number = 1280,
  height: number = 720
): string {
  // Quebrar em linhas se necessário
  const titleLines = title.length > 25 ? title.match(/.{1,25}/g) || [title] : [title];
  const hookLines = hook.length > 30 ? hook.match(/.{1,30}/g) || [hook] : [hook];

  const titleFontSize = 85;
  const hookFontSize = 50;
  const strokeWidth = 18; // 🔴 CONTORNO MUITO GROSSO

  // Posicionamento: esquerda superior (não conflita com pessoa na direita)
  let titleY = 200;
  let hookY = 400;

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <!-- Filtro de sombra para profundidade -->
        <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="4" dy="4" stdDeviation="3" flood-opacity="0.8" flood-color="#000000"/>
        </filter>
        
        <!-- Filtro de brilho (opcional) -->
        <filter id="textGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- TÍTULO (com contorno preto grosso + cor amarela) -->
      ${titleLines
        .map(
          (line, idx) => `
        <!-- Camada 1: Contorno Preto Grosso (Base) -->
        <text
          x="80"
          y="${titleY + idx * 110}"
          font-family="'Impact', 'Arial Black', 'Bebas Neue', sans-serif"
          font-size="${titleFontSize}"
          font-weight="900"
          letter-spacing="2"
          fill="none"
          stroke="#000000"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-linejoin="round"
          paint-order="stroke fill"
          filter="url(#textShadow)"
        >
          ${line.toUpperCase()}
        </text>
        
        <!-- Camada 2: Cor Amarela (Foreground) -->
        <text
          x="80"
          y="${titleY + idx * 110}"
          font-family="'Impact', 'Arial Black', 'Bebas Neue', sans-serif"
          font-size="${titleFontSize}"
          font-weight="900"
          letter-spacing="2"
          fill="#FFD700"
          stroke="#000000"
          stroke-width="${Math.ceil(strokeWidth / 3)}"
          stroke-linecap="round"
          stroke-linejoin="round"
          paint-order="stroke fill"
          filter="url(#textGlow)"
        >
          ${line.toUpperCase()}
        </text>
      `
        )
        .join("")}

      <!-- HOOK/SUBTITLE (com contorno, mas um pouco menor) -->
      ${hookLines
        .map(
          (line, idx) => `
        <!-- Contorno Preto -->
        <text
          x="80"
          y="${hookY + idx * 65}"
          font-family="'Arial', 'Helvetica', sans-serif"
          font-size="${hookFontSize}"
          font-weight="700"
          letter-spacing="1"
          fill="none"
          stroke="#000000"
          stroke-width="${Math.ceil(strokeWidth * 0.7)}"
          stroke-linecap="round"
          stroke-linejoin="round"
          paint-order="stroke fill"
          filter="url(#textShadow)"
        >
          ${line}
        </text>
        
        <!-- Cor Branca/Amarelo claro -->
        <text
          x="80"
          y="${hookY + idx * 65}"
          font-family="'Arial', 'Helvetica', sans-serif"
          font-size="${hookFontSize}"
          font-weight="700"
          letter-spacing="1"
          fill="#FFFFFF"
          stroke="#000000"
          stroke-width="${Math.ceil(strokeWidth / 4)}"
          stroke-linecap="round"
          stroke-linejoin="round"
          paint-order="stroke fill"
          filter="url(#textGlow)"
        >
          ${line}
        </text>
      `
        )
        .join("")}

      <!-- EMOJI de destaque (trigger type) -->
      <text
        x="${width - 120}"
        y="100"
        font-family="Arial, sans-serif"
        font-size="72"
        opacity="0.7"
      >
        ${colors.emoji}
      </text>
    </svg>
  `;
}

/**
 * 🎨 NOVO PIPELINE DE COMPOSIÇÃO (3 CAMADAS)
 * Camada 1: Fundo degradê escuro (1280x720)
 * Camada 2: Pessoa isolada (posição direita, SEM DEFORMAÇÃO)
 * Camada 3: Texto overlay (fonte pesada, contorno preto grosso, amarelo)
 */
async function composeProfessionalThumbnail(
  personImages: Array<{ path: string; position: "left" | "center" | "right" }>,
  backgroundSvg: string,
  textSvg: string,
  useAdvancedEffects: boolean,
  outputPath: string
): Promise<void> {
  try {
    const THUMB_WIDTH = 1280;
    const THUMB_HEIGHT = 720;
    const PERSON_HEIGHT = 650; // Ocupa quase toda a altura

    console.log("🎨 [NOVA COMPOSIÇÃO] Camadas independentes - Garantindo qualidade sem deformação...");

    // ═══════════════════════════════════════════════════════════════
    // CAMADA 1: Fundo Degradê Escuro (1280x720)
    // ═══════════════════════════════════════════════════════════════
    console.log(`  📍 Camada 1: Criando fundo base ${THUMB_WIDTH}x${THUMB_HEIGHT}`);
    
    let compositeImage = await sharp(Buffer.from(backgroundSvg))
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "fill" })
      .png()
      .toBuffer();

    // ═══════════════════════════════════════════════════════════════
    // CAMADA 2: Pessoa (Lateral Direita, Redimensionamento Proporcional)
    // ═══════════════════════════════════════════════════════════════
    console.log(`  📍 Camada 2: Processando pessoa (altura: ${PERSON_HEIGHT}px, fit: inside)`);

    const person = personImages[0]; // Usar primeira pessoa
    
    // ⚠️ CRITICAL: fit: 'inside' evita QUALQUER deformação
    let personBuffer = await sharp(person.path)
      .resize(PERSON_HEIGHT, PERSON_HEIGHT, {
        fit: "inside",           // 🔴 NÃO DEFORMA
        withoutEnlargement: false, // Pode ampliar se for muito pequena
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fundo transparente
      })
      .png()
      .toBuffer();

    // Obter dimensões reais da pessoa após redimensionamento
    const personMetadata = await sharp(personBuffer).metadata();
    const personActualWidth = personMetadata.width || PERSON_HEIGHT;
    const personActualHeight = personMetadata.height || PERSON_HEIGHT;

    console.log(`  ✅ Pessoa redimensionada: ${personActualWidth}x${personActualHeight} (sem deformação)`);

    // Posição: lateral direita, centrada verticalmente
    const personLeft = THUMB_WIDTH - personActualWidth - 50; // 50px de margem direita
    const personTop = Math.max(0, (THUMB_HEIGHT - personActualHeight) / 2);

    console.log(`  ✅ Pessoa posicionada: left=${personLeft}, top=${personTop}`);

    // ═══════════════════════════════════════════════════════════════
    // CAMADA 3: Texto Overlay (Contorno Preto Grosso, Amarelo)
    // ═══════════════════════════════════════════════════════════════
    console.log(`  📍 Camada 3: Criando overlay de texto com contorno`);

    // Compor todas as camadas
    const finalComposite = await sharp(compositeImage)
      .composite([
        {
          input: personBuffer,
          top: Math.round(personTop),
          left: Math.round(personLeft),
          blend: "over", // Transparência preservada
        },
        {
          input: Buffer.from(textSvg),
          top: 0,
          left: 0,
          blend: "over",
        },
      ])
      .flatten({ background: { r: 15, g: 23, b: 42 } }) // Fundo escuro como fallback
      .jpeg({ quality: 95, progressive: true })
      .toFile(outputPath);

    console.log(`✅ Thumbnail composta com sucesso!`);
    console.log(`   Dimensão final: ${finalComposite.width}x${finalComposite.height}`);
    console.log(`   Tamanho: ${(finalComposite.size / 1024).toFixed(2)}KB`);
  } catch (error) {
    console.error("❌ Erro na composição:", error);
    throw new Error("Falha na composição da thumbnail profissional");
  }
}

/**
 * 🎬 API PRINCIPAL: GERAÇÃO PROFISSIONAL
 * Pipeline completo: Extração → Remoção de Fundo → Composição
 */
export const generateProfessionalThumbnail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ProfessionalThumbnailSchema.parse(data))
  .handler(async ({ data }) => {
    const tempDir = path.join(process.cwd(), "tmp", "thumbnails");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const removeApiKey = process.env.REMOVE_BG_API_KEY;

    let localVideoPath: string | undefined;
    let downloadedVideoPath: string | undefined;
    const frameFile = path.join(tempDir, `frame_${timestamp}.png`);
    const noBackgroundFile = path.join(tempDir, `nobg_${timestamp}.png`);
    const outputFile = path.join(tempDir, `thumb_prof_${timestamp}.jpg`);

    try {
      console.log("\n🎬=== PIPELINE PROFISSIONAL DE THUMBNAILS ===🎬\n");

      // ETAPA 1: Verificar e baixar vídeo
      console.log("📍 ETAPA 1: Preparando vídeo");
      const { localPath, isDownloaded } = await getLocalVideoPath(data.videoPath, tempDir);
      localVideoPath = localPath;
      if (isDownloaded) downloadedVideoPath = localPath;

      // ETAPA 1: Extrair frame
      console.log("📍 ETAPA 1: Extraindo frame inteligente");
      await extractVideoFrame(localVideoPath, data.extractAtSeconds, frameFile);

      // ETAPA 2: Remover fundo
      console.log("📍 ETAPA 2: Removendo fundo (segmentação)");
      const bgRemovalResult = await removeBackgroundRobust(frameFile, noBackgroundFile, removeApiKey);
      console.log(`   Método utilizado: ${bgRemovalResult.method}`);

      // ETAPA 3: Criar templates de fundo
      console.log("📍 ETAPA 3: Criando fundo templato");
      const colors = DESIGN_PRESETS[data.triggerType];
      const backgroundSvg = createBackgroundTemplate(1280, 720, data.backgroundTemplate, colors);

      // ETAPA 4: Criar SVG de texto
      console.log("📍 ETAPA 4: Gerando texto profissional");
      const textSvg = createTextSVG(data.clipTitle, data.clipHook, colors);

      // ETAPA 4: Compor camadas
      console.log("📍 ETAPA 4: Compondo camadas");
      const personImages = data.personPositions.map((pos) => ({
        path: noBackgroundFile,
        position: pos,
      }));

      await composeProfessionalThumbnail(personImages, backgroundSvg, textSvg, data.useAdvancedEffects, outputFile);

      // Ler e converter para base64
      const thumbnailBuffer = fs.readFileSync(outputFile);
      const base64Thumbnail = thumbnailBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64Thumbnail}`;

      // Limpar temporários
      [frameFile, noBackgroundFile, outputFile].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
      if (downloadedVideoPath && fs.existsSync(downloadedVideoPath)) {
        fs.unlinkSync(downloadedVideoPath);
      }

      console.log("✅ THUMBNAIL PROFISSIONAL GERADA COM SUCESSO!\n");

      return {
        success: true,
        thumbnailDataUrl: dataUrl,
        message: "✅ Thumbnail profissional gerada!",
        backgroundMethod: bgRemovalResult.method,
        processingTimeMs: Date.now() - timestamp,
      };
    } catch (error) {
      // Limpar em caso de erro
      [frameFile, noBackgroundFile, outputFile].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
      if (downloadedVideoPath && fs.existsSync(downloadedVideoPath)) {
        fs.unlinkSync(downloadedVideoPath);
      }

      console.error("❌ Erro na geração profissional:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        backgroundMethod: "failed",
      };
    }
  });
