/**
 * 🎬 EXEMPLOS DE USO - PIPELINE PROFISSIONAL DE THUMBNAILS
 * 
 * Este arquivo demonstra como usar a nova geração profissional
 * em diferentes cenários de uso
 */

import { generateProfessionalThumbnail } from "@/lib/thumbnail-professional.functions";

/**
 * EXEMPLO 1: Geração Básica (Recomendado para Começar)
 * 
 * ✅ Tudo automático com valores padrão
 * ✅ Melhor compatibilidade
 */
export async function basicExample(videoPath: string) {
  console.log("📸 Exemplo 1: Geração Básica");
  
  const result = await generateProfessionalThumbnail({
    videoPath,
    clipTitle: "NEYMAR ABRIU O JOGO!",
    clipHook: "Confira a reação...",
    triggerType: "controversy",
    extractAtSeconds: 2, // Padrão
    personPositions: ["center"], // Padrão
    backgroundTemplate: "dark_gradient", // Padrão
    useAdvancedEffects: true, // Padrão
  });

  if (result.success) {
    console.log("✅ Thumbnail gerada!");
    console.log(`📸 Método remoção: ${result.backgroundMethod}`);
    console.log(`⏱️  Tempo: ${result.processingTimeMs}ms`);
    return result.thumbnailDataUrl;
  } else {
    console.error("❌ Erro:", result.error);
    return null;
  }
}

/**
 * EXEMPLO 2: Pessoa Múltipla (Debate, Confronto)
 * 
 * ✅ Duas pessoas nas laterais
 * ✅ Excelente para vídeos de debate
 */
export async function multiplePeopleExample(videoPath: string) {
  console.log("📸 Exemplo 2: Múltiplas Pessoas");
  
  const result = await generateProfessionalThumbnail({
    videoPath,
    clipTitle: "RONALDO VS RONALDINHO",
    clipHook: "Quem é o melhor do Brasil?",
    triggerType: "controversy",
    extractAtSeconds: 5, // Frame no meio do vídeo
    personPositions: ["left", "right"], // ← Duas pessoas!
    backgroundTemplate: "vibrant_gradient",
    useAdvancedEffects: true,
  });

  return result.success ? result.thumbnailDataUrl : null;
}

/**
 * EXEMPLO 3: Templates Diferentes por Tipo
 * 
 * Diferentes gatilhos = Diferentes estilos
 */
export async function multipleTemplatesExample(videoPath: string) {
  console.log("📸 Exemplo 3: Múltiplos Templates");
  
  const scenarios = [
    // Comédia - Gradiente vibrant
    {
      clipTitle: "EU NÃO CONSIGO PARAR DE RIR!",
      clipHook: "Assista até o fim!",
      triggerType: "humor" as const,
      backgroundTemplate: "vibrant_gradient" as const,
    },
    // Polêmica - Dark Gradient com aura
    {
      clipTitle: "ESCÂNDALO DO SÉCULO!",
      clipHook: "Polícia já foi acionada!",
      triggerType: "controversy" as const,
      backgroundTemplate: "dark_gradient" as const,
    },
    // Emocional - City Night para atmosfera
    {
      clipTitle: "HISTÓRIA DE VIDA QUE MUDA TUDO",
      clipHook: "Prepare os lenços...",
      triggerType: "emotional" as const,
      backgroundTemplate: "city_night" as const,
    },
    // High Value - Abstract moderno
    {
      clipTitle: "REVELAÇÃO BILIONÁRIA",
      clipHook: "Você não sabia disso!",
      triggerType: "high_value" as const,
      backgroundTemplate: "vibrant_gradient" as const,
    },
  ];

  const results = await Promise.all(
    scenarios.map((scenario) =>
      generateProfessionalThumbnail({
        videoPath,
        ...scenario,
        extractAtSeconds: 3,
        personPositions: ["center"],
        useAdvancedEffects: true,
      })
    )
  );

  return results.map((r) => r.success ? r.thumbnailDataUrl : null);
}

/**
 * EXEMPLO 4: Otimizado para Lotes (Batch Processing)
 * 
 * Processar múltiplos clipes com controle de erro
 */
export async function batchProcessingExample(
  videoPath: string,
  clips: Array<{
    title: string;
    hook: string;
    trigger: string;
    secondsToExtract: number;
  }>
) {
  console.log(`📸 Exemplo 4: Processamento em Lote (${clips.length} clipes)`);
  
  const results = await Promise.allSettled(
    clips.map((clip) =>
      generateProfessionalThumbnail({
        videoPath,
        clipTitle: clip.title,
        clipHook: clip.hook,
        triggerType: clip.trigger as any,
        extractAtSeconds: clip.secondsToExtract,
        personPositions: ["center"],
        backgroundTemplate: "dark_gradient",
        useAdvancedEffects: true,
      })
    )
  );

  // Contar sucessos e erros
  const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
  const failed = results.filter((r) => r.status === "rejected" || !r.value.success).length;

  console.log(`✅ Sucesso: ${successful}/${clips.length}`);
  console.log(`❌ Erros: ${failed}/${clips.length}`);

  return results.map((r) => {
    if (r.status === "fulfilled" && r.value.success) {
      return {
        success: true,
        dataUrl: r.value.thumbnailDataUrl,
        method: r.value.backgroundMethod,
      };
    }
    return { success: false, error: r.status === "rejected" ? "Erro desconhecido" : r.value.error };
  });
}

/**
 * EXEMPLO 5: Com Fallback e Retry
 * 
 * Estratégia robusta para produção
 */
export async function robustExample(
  videoPath: string,
  maxRetries: number = 3
) {
  console.log("📸 Exemplo 5: Robusto com Retry");
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/${maxRetries}...`);
      
      const result = await generateProfessionalThumbnail({
        videoPath,
        clipTitle: "CONTEÚDO VIRAL",
        clipHook: "Você vai amar!",
        triggerType: "hook",
        extractAtSeconds: 2,
        personPositions: ["center"],
        backgroundTemplate: "dark_gradient",
        useAdvancedEffects: true,
      });

      if (result.success) {
        console.log(`✅ Sucesso na tentativa ${attempt}`);
        return result;
      }
      
      console.warn(`⚠️  Falha: ${result.error}`);
      
      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  console.error(`❌ Falhou após ${maxRetries} tentativas`);
  return { success: false, error: "Max retries exceeded" };
}

/**
 * EXEMPLO 6: Com Monitoramento de Performance
 * 
 * Rastrear tempo de cada etapa
 */
export async function performanceMonitoringExample(videoPath: string) {
  console.log("📸 Exemplo 6: Monitoramento de Performance");
  
  const startTime = Date.now();
  
  const result = await generateProfessionalThumbnail({
    videoPath,
    clipTitle: "RECORDE MUNDIAL!",
    clipHook: "Ninguém conseguiu fazer antes!",
    triggerType: "high_value",
    extractAtSeconds: 10,
    personPositions: ["center"],
    backgroundTemplate: "vibrant_gradient",
    useAdvancedEffects: true,
  });

  const totalTime = Date.now() - startTime;

  console.log("⏱️  ESTATÍSTICAS:");
  console.log(`  • Tempo total: ${totalTime}ms`);
  console.log(`  • Tempo interno: ${result.processingTimeMs}ms`);
  console.log(`  • Overhead: ${totalTime - result.processingTimeMs}ms`);
  console.log(`  • Método remoção: ${result.backgroundMethod}`);

  // Benchmark
  if (totalTime < 2000) {
    console.log("🚀 Muito rápido!");
  } else if (totalTime < 5000) {
    console.log("⚡ Bom desempenho");
  } else {
    console.warn("⚠️  Lento demais, considere usar cache");
  }

  return result;
}

/**
 * EXEMPLO 7: Integração com UI React
 * 
 * Como usar em um componente React
 */
export function ThumbnailGeneratorComponent({
  videoPath,
  onSuccess,
  onError,
}: {
  videoPath: string;
  onSuccess: (dataUrl: string) => void;
  onError: (error: string) => void;
}) {
  const [loading, setLoading] = React.useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateProfessionalThumbnail({
        videoPath,
        clipTitle: "CLIPE INCRÍVEL",
        clipHook: "Assista agora!",
        triggerType: "hook",
        extractAtSeconds: 2,
        personPositions: ["center"],
        backgroundTemplate: "dark_gradient",
        useAdvancedEffects: true,
      });

      if (result.success) {
        onSuccess(result.thumbnailDataUrl);
      } else {
        onError(result.error);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={loading}>
      {loading ? "⏳ Gerando..." : "📸 Gerar Thumbnail"}
    </button>
  );
}

/**
 * EXEMPLO 8: Com Arquivo Local
 * 
 * Usar vídeos do servidor local
 */
export async function localFileExample() {
  console.log("📸 Exemplo 8: Arquivo Local");
  
  const videoPath = "/storage/videos/meu-video.mp4"; // Path local
  
  const result = await generateProfessionalThumbnail({
    videoPath, // ← Path local automaticamente detectado
    clipTitle: "VÍDEO LOCAL",
    clipHook: "Do servidor!",
    triggerType: "humor",
    extractAtSeconds: 3,
    personPositions: ["center"],
    backgroundTemplate: "dark_gradient",
    useAdvancedEffects: true,
  });

  return result;
}

/**
 * EXEMPLO 9: Com URL Remota
 * 
 * Download automático e geração
 */
export async function remoteUrlExample() {
  console.log("📸 Exemplo 9: URL Remota");
  
  const videoUrl = "https://supabase.../videos/video.mp4"; // URL remota
  
  const result = await generateProfessionalThumbnail({
    videoPath: videoUrl, // ← URL automaticamente detectada
    clipTitle: "VÍDEO REMOTO",
    clipHook: "Do Supabase!",
    triggerType: "controversy",
    extractAtSeconds: 5,
    personPositions: ["center"],
    backgroundTemplate: "vibrant_gradient",
    useAdvancedEffects: true,
  });

  return result;
}

/**
 * EXEMPLO 10: Caso de Uso Real - Fluxo Completo
 * 
 * Integrado com análise de clipes IA
 */
export async function fullFlowExample(
  videoPath: string,
  aiClips: Array<{ title: string; hookQuote: string; triggers: string[] }>
) {
  console.log("📸 Exemplo 10: Fluxo Completo");
  
  // 1. Para cada clipe detectado pela IA
  const clipsWithThumbs = await Promise.all(
    aiClips.map(async (clip) => {
      console.log(`  📸 Processando: "${clip.title}"`);
      
      // 2. Gerar thumbnail profissional
      const result = await generateProfessionalThumbnail({
        videoPath,
        clipTitle: clip.title,
        clipHook: clip.hookQuote,
        triggerType: (clip.triggers[0] || "hook") as any,
        extractAtSeconds: 2,
        personPositions: ["center"],
        backgroundTemplate: "dark_gradient",
        useAdvancedEffects: true,
      });

      // 3. Retornar clipe com thumbnail
      return {
        ...clip,
        thumbnailDataUrl: result.success ? result.thumbnailDataUrl : null,
        backgroundMethod: result.backgroundMethod,
        processingTimeMs: result.processingTimeMs,
      };
    })
  );

  // 4. Estatísticas
  const successful = clipsWithThumbs.filter((c) => c.thumbnailDataUrl).length;
  console.log(`✅ ${successful}/${aiClips.length} thumbnails geradas com sucesso`);

  return clipsWithThumbs;
}

/**
 * EXECUTAR EXEMPLOS:
 * 
 * const videoPath = "/path/to/video.mp4";
 * 
 * // Exemplo 1
 * await basicExample(videoPath);
 * 
 * // Exemplo 2
 * await multiplePeopleExample(videoPath);
 * 
 * // Exemplo 3
 * await multipleTemplatesExample(videoPath);
 * 
 * // Exemplo 6 (Performance)
 * await performanceMonitoringExample(videoPath);
 */

export default {
  basicExample,
  multiplePeopleExample,
  multipleTemplatesExample,
  batchProcessingExample,
  robustExample,
  performanceMonitoringExample,
  localFileExample,
  remoteUrlExample,
  fullFlowExample,
};
