/**
 * TESTE COM VÍDEO REAL DO YOUTUBE
 * Gera thumbnail profissional com pessoa real
 */

import sharp from "sharp";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🎬 TESTE COM VÍDEO REAL DO YOUTUBE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const youtubeUrl = "https://www.youtube.com/watch?v=4yDzEyg24no";
  const videoFile = path.join(process.cwd(), ".temp-youtube-video.mp4");
  const startTime = Date.now();

  try {
    // 1. BAIXAR VÍDEO DO YOUTUBE
    console.log("📥 ETAPA 1: Baixando vídeo do YouTube");
    console.log(`   URL: ${youtubeUrl}`);

    try {
      execSync(
        `yt-dlp -f "best[height<=720]" -o "${videoFile}" "${youtubeUrl}" 2>&1`,
        { stdio: "pipe" }
      );
      console.log("   ✅ Vídeo baixado com sucesso\n");
    } catch (e) {
      // Tentar sem o filtro de qualidade
      console.log("   ⏳ Tentando download sem filtro...");
      execSync(`yt-dlp -o "${videoFile}" "${youtubeUrl}" 2>&1`, {
        stdio: "pipe",
      });
      console.log("   ✅ Vídeo baixado\n");
    }

    // Verificar se arquivo existe
    if (!fs.existsSync(videoFile)) {
      throw new Error("Falha ao baixar vídeo");
    }

    const videoSize = (fs.statSync(videoFile).size / (1024 * 1024)).toFixed(2);
    console.log(`   └─ Tamanho: ${videoSize} MB\n`);

    // 2. EXTRAIR FRAME
    console.log("📸 ETAPA 2: Extrair frame do vídeo");
    const frameFile = path.join(process.cwd(), ".temp-youtube-frame.png");

    execSync(
      `ffmpeg -i "${videoFile}" -ss 3 -vframes 1 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black" -q:v 2 "${frameFile}" -y 2>nul`,
      { stdio: "pipe" }
    );
    console.log("   ✅ Frame extraído (1920x1080)\n");

    // 3. REMOVER FUNDO COM REMBG
    console.log("🎨 ETAPA 3: Remover fundo (isolar pessoa com IA)");
    const noBgFile = path.join(process.cwd(), ".temp-youtube-no-bg.png");

    try {
      console.log("   └─ Processando com Rembg (IA)...");
      execSync(`python -m rembg i "${frameFile}" "${noBgFile}" -a 2>&1`, {
        stdio: "pipe",
        timeout: 60000,
      });
      console.log("   ✅ Pessoa isolada com sucesso!\n");
    } catch (e) {
      console.log("   ⚠️  Rembg não respondeu, usando imagem original\n");
      fs.copyFileSync(frameFile, noBgFile);
    }

    // 4. CRIAR FUNDO
    console.log("🎨 ETAPA 4: Criar fundo profissional");
    const bgSvg = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#FF4500;stop-opacity:0.95" />
            <stop offset="100%" style="stop-color:#FF6600;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#grad)"/>
      </svg>
    `;

    const bgFile = path.join(process.cwd(), ".temp-youtube-bg.svg");
    fs.writeFileSync(bgFile, bgSvg);
    console.log("   ✅ Fundo criado\n");

    // 5. CRIAR TEXTO
    console.log("✍️  ETAPA 5: Criar texto profissional");
    const textSvg = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="4" dy="4" stdDeviation="6" flood-opacity="0.95" flood-color="black"/>
          </filter>
        </defs>
        
        <text x="640" y="200" 
              font-family="Impact, Arial Black, sans-serif" 
              font-size="90" 
              font-weight="900"
              text-anchor="middle"
              fill="white"
              stroke="black"
              stroke-width="7"
              stroke-linejoin="round"
              filter="url(#shadow)"
              paint-order="stroke fill">
          VOCÊ NÃO VAI
        </text>
        
        <text x="640" y="290" 
              font-family="Impact, Arial Black, sans-serif" 
              font-size="90" 
              font-weight="900"
              text-anchor="middle"
              fill="#FFD700"
              stroke="black"
              stroke-width="7"
              stroke-linejoin="round"
              filter="url(#shadow)"
              paint-order="stroke fill">
          ACREDITAR!
        </text>
        
        <text x="640" y="420" 
              font-family="Arial, sans-serif" 
              font-size="50" 
              text-anchor="middle"
              fill="white"
              stroke="black"
              stroke-width="4"
              filter="url(#shadow)"
              paint-order="stroke fill">
          Assista até o final 🔥
        </text>
        
        <rect x="420" y="480" width="440" height="90" rx="20" 
              fill="rgba(255, 69, 0, 0.95)" 
              stroke="white" 
              stroke-width="4"/>
        <text x="640" y="540" 
              font-family="Arial, sans-serif" 
              font-size="50" 
              font-weight="bold"
              text-anchor="middle"
              fill="white"
              filter="url(#shadow)">
          🔥 IMPERDÍVEL 🔥
        </text>
      </svg>
    `;

    const textFile = path.join(process.cwd(), ".temp-youtube-text.svg");
    fs.writeFileSync(textFile, textSvg);
    console.log("   ✅ Texto criado\n");

    // 6. REDIMENSIONAR
    console.log("📐 ETAPA 6: Preparar camadas");

    const personResized = path.join(
      process.cwd(),
      ".temp-youtube-person-resized.png"
    );
    const textResized = path.join(
      process.cwd(),
      ".temp-youtube-text-resized.png"
    );

    await sharp(noBgFile)
      .resize(900, 720, { fit: "inside", position: "center" })
      .extend({
        top: 0,
        bottom: 0,
        left: (1280 - 900) / 2,
        right: (1280 - 900) / 2,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(personResized);

    await sharp(textFile)
      .resize(1280, 720, { fit: "contain", position: "center" })
      .png()
      .toFile(textResized);

    console.log("   ✅ Camadas redimensionadas\n");

    // 7. COMPOR
    console.log("🎬 ETAPA 7: Compor camadas finais");
    console.log("   ├─ Fundo profissional");
    console.log("   ├─ Pessoa real (isolada)");
    console.log("   └─ Texto com efeitos\n");

    const result = await sharp(bgFile)
      .resize(1280, 720, { fit: "cover", position: "center" })
      .composite([
        {
          input: personResized,
          top: 0,
          left: 0,
        },
        {
          input: textResized,
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 95, progressive: true, mozjpeg: true })
      .toBuffer();

    // 8. SALVAR
    const outputPath = path.join(
      process.cwd(),
      "THUMBNAIL-YOUTUBE-REAL.jpg"
    );
    fs.writeFileSync(outputPath, result);

    const elapsed = Date.now() - startTime;

    // LIMPEZA
    [
      videoFile,
      frameFile,
      noBgFile,
      bgFile,
      textFile,
      personResized,
      textResized,
    ].forEach((f) => {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (e) {
        // ignorar
      }
    });

    // RESULTADO
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("✅ THUMBNAIL GERADA COM SUCESSO!");
    console.log("═══════════════════════════════════════════════════════════════\n");

    console.log("📊 RESUMO:");
    console.log(`   ├─ Arquivo: ${outputPath}`);
    console.log(`   ├─ Tamanho: ${(result.length / 1024).toFixed(2)} KB`);
    console.log(`   ├─ Resolução: 1280x720 pixels`);
    console.log(`   ├─ Qualidade: 95% JPEG (mozjpeg)`);
    console.log(`   └─ Tempo: ${elapsed}ms\n`);

    console.log("🎬 WHAT YOU SHOULD SEE:");
    console.log("   ✅ Pessoa real do vídeo no centro");
    console.log("   ✅ Fundo laranja/vermelho profissional atrás");
    console.log("   ✅ Texto branco e dourado sobreposto");
    console.log("   ✅ Badge 'IMPERDÍVEL' destacado\n");

    console.log("📂 ARQUIVO SALVO EM:");
    console.log(`   → ${outputPath}\n`);

    console.log("🚀 PRÓXIMOS PASSOS:");
    console.log("   1. Abra o arquivo para visualizar");
    console.log("   2. Confirme se a pessoa está visível");
    console.log("   3. Valide qualidade");
    console.log("   4. Use em produção\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERRO:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
