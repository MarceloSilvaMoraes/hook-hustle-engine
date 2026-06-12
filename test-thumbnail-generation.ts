/**
 * Script de teste para gerar thumbnail profissional
 * Uso: npx tsx test-thumbnail-generation.ts
 */

import { generateProfessionalThumbnail } from "@/lib/thumbnail-professional.functions";
import * as fs from "fs";
import * as path from "path";

async function testThumbnailGeneration() {
  console.log("🎬 INICIANDO TESTE DE GERAÇÃO DE THUMBNAIL PROFISSIONAL\n");

  try {
    const videoPath = path.join(process.cwd(), "test-video.mp4");

    // Verificar se arquivo de vídeo existe
    if (!fs.existsSync(videoPath)) {
      console.error("❌ Vídeo de teste não encontrado:", videoPath);
      process.exit(1);
    }

    console.log("✅ Vídeo encontrado:", videoPath);
    console.log("📊 Tamanho:", (fs.statSync(videoPath).size / 1024 / 1024).toFixed(2), "MB\n");

    console.log("🚀 Gerando thumbnail profissional...\n");

    const startTime = Date.now();

    const result = await generateProfessionalThumbnail({
      videoPath,
      clipTitle: "NEYMAR ABRIU O JOGO!",
      clipHook: "Confira a reação explosiva 💥",
      triggerType: "controversy",
      extractAtSeconds: 2,
      personPositions: ["center"],
      backgroundTemplate: "dark_gradient",
      useAdvancedEffects: true,
    });

    const elapsed = Date.now() - startTime;

    console.log("✅ THUMBNAIL GERADA COM SUCESSO!\n");
    console.log("📊 RESULTADO:");
    console.log("   ├─ Success:", result.success);
    console.log("   ├─ Tempo de processamento:", elapsed, "ms");
    console.log("   ├─ Método de remoção de fundo:", result.backgroundMethod);
    console.log("   ├─ Tamanho data URL:", (result.thumbnailDataUrl.length / 1024).toFixed(2), "KB");
    console.log("");

    // Salvar thumbnail em arquivo
    const outputPath = path.join(process.cwd(), "test-thumbnail-output.jpg");
    const base64Data = result.thumbnailDataUrl.split(",")[1];
    fs.writeFileSync(outputPath, Buffer.from(base64Data, "base64"));

    console.log("💾 Thumbnail salva em:", outputPath);
    console.log("   ├─ Tamanho do arquivo:", (fs.statSync(outputPath).size / 1024).toFixed(2), "KB");
    console.log("");

    console.log("🎉 TESTE COMPLETO!");
    console.log("   ├─ Abra a thumbnail para verificar qualidade");
    console.log("   ├─ Verifique se a pessoa foi isolada do fundo");
    console.log("   ├─ Verifique se o texto está legível");
    console.log("   └─ Verifique se os efeitos foram aplicados\n");

    // Retornar sucesso
    process.exit(0);
  } catch (error) {
    console.error("❌ ERRO ao gerar thumbnail:");
    console.error(error);
    process.exit(1);
  }
}

// Executar teste
testThumbnailGeneration();
