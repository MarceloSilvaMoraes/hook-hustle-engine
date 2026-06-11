/**
 * 🎬 EXEMPLO DE INTEGRAÇÃO
 * Como usar o sistema de geração automática de thumbnails
 * 
 * Este arquivo mostra como integrar a geração de thumbnails
 * ao seu fluxo de criação de clipes.
 */

import { generateThumbnailAutomatic, generateThumbnailQuick } from "@/lib/thumbnail-generation.functions";
import { createRenderJob } from "@/lib/render-jobs.functions";
import type { ViralClip } from "@/lib/clips.functions";

/**
 * CENÁRIO 1: Gerar Thumbnail após Criar Clipe
 * 
 * Depois que o IA identificar um clipe, imediatamente
 * gera uma thumbnail profissional automaticamente.
 */
export async function processClipWithThumbnail(
  clip: ViralClip,
  videoPath: string
): Promise<{
  clip: ViralClip;
  thumbnailDataUrl: string;
}> {
  console.log(`🎬 Processando clipe: "${clip.title}"`);

  try {
    // OPÇÃO A: Geração Completa (com remoção de fundo)
    const thumbnailResult = await generateThumbnailAutomatic({
      videoPath,
      clipTitle: clip.title,
      clipHook: clip.hookQuote,
      triggerType: clip.triggers[0] as any,
      extractAtSeconds: 2, // Extrai frame nos 2 segundos iniciais
      personPosition: "center",
    });

    // ALTERNATIVA: Geração Rápida (sem remoção)
    // const thumbnailResult = await generateThumbnailQuick({...});

    if (!thumbnailResult.success) {
      console.error("❌ Erro ao gerar thumbnail:", thumbnailResult.error);
      throw new Error(thumbnailResult.error);
    }

    console.log("✅ Thumbnail gerada com sucesso!");

    return {
      clip: {
        ...clip,
        // Salva a thumbnail como data URL
      },
      thumbnailDataUrl: thumbnailResult.thumbnailDataUrl,
    };
  } catch (error) {
    console.error("Erro no processamento do clipe:", error);
    throw error;
  }
}

/**
 * CENÁRIO 2: Batch Processing - Múltiplos Clipes
 * 
 * Processa vários clipes em paralelo (com limite
 * para não sobrecarregar o servidor)
 */
export async function processBatchClips(
  clips: ViralClip[],
  videoPath: string,
  maxConcurrent: number = 2
): Promise<Array<{ clip: ViralClip; thumbnailDataUrl: string }>> {
  const results = [];

  // Processa em lotes (máximo 2 simultâneos)
  for (let i = 0; i < clips.length; i += maxConcurrent) {
    const batch = clips.slice(i, i + maxConcurrent);

    const batchResults = await Promise.allSettled(
      batch.map((clip, idx) =>
        processClipWithThumbnail(clip, videoPath).then((result) => ({
          index: i + idx,
          ...result,
        }))
      )
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error("Erro em clipe:", result.reason);
      }
    }

    // Pequeno delay entre lotes para não sobrecarregar
    if (i + maxConcurrent < clips.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

/**
 * CENÁRIO 3: Integração com Render Jobs
 * 
 * Cria um job de renderização que inclui a geração
 * automática de thumbnails para cada clipe.
 */
export async function createRenderJobWithAutoThumbnails(
  videoUrl: string,
  videoTitle: string,
  clips: ViralClip[],
  localVideoPath: string
) {
  // 1. Gera thumbnails para todos os clipes
  console.log(`📸 Gerando ${clips.length} thumbnails...`);
  const clipsWithThumbs = await processBatchClips(clips, localVideoPath);

  // 2. Prepara dados para render job
  const clipsForJob = clipsWithThumbs.map(({ clip, thumbnailDataUrl }) => ({
    ...clip,
    thumbnailDataUrl, // Inclui thumbnail gerada
  }));

  // 3. Cria job no Supabase
  const renderJobResult = await createRenderJob({
    videoUrl,
    videoTitle,
    platform: "TikTok/Reels (9:16)",
    renderFormat: "9:16",
    clipItems: clipsForJob,
    instructions: "Thumbnails geradas automaticamente pelo sistema",
  });

  if (renderJobResult.error) {
    throw new Error(renderJobResult.error);
  }

  console.log("✅ Job de renderização criado com ID:", renderJobResult.job?.id);
  return renderJobResult.job;
}

/**
 * CENÁRIO 4: API Endpoint para Geração Manual
 * 
 * Endpoint que permite ao usuário regenerar thumbnails
 * de clipes já existentes com diferentes configurações.
 */
export async function regenerateThumbnailWithOptions(
  videoPath: string,
  clip: ViralClip,
  options: {
    extractAtSeconds?: number;
    personPosition?: "left" | "center" | "right";
    triggerTypeOverride?: string;
  }
) {
  const triggerType = options.triggerTypeOverride || clip.triggers[0];

  console.log(`🔄 Regenerando thumbnail com opções:`, options);

  const result = await generateThumbnailAutomatic({
    videoPath,
    clipTitle: clip.title,
    clipHook: clip.hookQuote,
    triggerType: triggerType as any,
    extractAtSeconds: options.extractAtSeconds ?? 2,
    personPosition: options.personPosition ?? "center",
  });

  return result;
}

/**
 * CENÁRIO 5: Otimização com Cache
 * 
 * Evita regenerar thumbnails iguais usando cache simples
 */
class ThumbnailCache {
  private cache: Map<string, string> = new Map();

  private generateKey(clip: ViralClip, videoPath: string, position: string): string {
    return `${clip.id}_${videoPath}_${clip.triggers[0]}_${position}`;
  }

  async getOrGenerate(
    clip: ViralClip,
    videoPath: string,
    position: "left" | "center" | "right" = "center"
  ): Promise<string> {
    const key = this.generateKey(clip, videoPath, position);

    // Verificar cache
    if (this.cache.has(key)) {
      console.log("💾 Thumbnail encontrada em cache!");
      return this.cache.get(key)!;
    }

    // Gerar nova
    console.log("📸 Gerando nova thumbnail...");
    const result = await generateThumbnailAutomatic({
      videoPath,
      clipTitle: clip.title,
      clipHook: clip.hookQuote,
      triggerType: clip.triggers[0] as any,
      extractAtSeconds: 2,
      personPosition: position,
    });

    if (result.success) {
      // Salvar em cache
      this.cache.set(key, result.thumbnailDataUrl);
      return result.thumbnailDataUrl;
    } else {
      throw new Error(result.error);
    }
  }

  clear(): void {
    this.cache.clear();
    console.log("🗑️ Cache de thumbnails limpo");
  }
}

// Instância única do cache
export const thumbnailCache = new ThumbnailCache();

/**
 * CENÁRIO 6: Versão Gradativa (Fallback)
 * 
 * Tenta versão completa, se falhar tenta rápida,
 * se falhar usa placeholder.
 */
export async function generateThumbnailGraceful(
  videoPath: string,
  clip: ViralClip
): Promise<string | null> {
  try {
    console.log("1️⃣ Tentando geração completa...");
    const result = await generateThumbnailAutomatic({
      videoPath,
      clipTitle: clip.title,
      clipHook: clip.hookQuote,
      triggerType: clip.triggers[0] as any,
    });

    if (result.success) {
      return result.thumbnailDataUrl;
    }

    throw new Error(result.error);
  } catch (error1) {
    try {
      console.log("2️⃣ Tentando geração rápida...");
      const result = await generateThumbnailQuick({
        videoPath,
        clipTitle: clip.title,
        clipHook: clip.hookQuote,
        triggerType: clip.triggers[0] as any,
      });

      if (result.success) {
        return result.thumbnailDataUrl;
      }

      throw new Error(result.error);
    } catch (error2) {
      console.error("3️⃣ Ambas as versões falharam. Usando placeholder.");
      console.error("Erro 1:", error1);
      console.error("Erro 2:", error2);
      return null; // Retorna null e usa placeholder
    }
  }
}

/**
 * EXEMPLO DE USO EM UMA ROTA/HANDLER
 */
export async function exampleClipProcessingWorkflow() {
  // Dados de exemplo
  const videoPath = "/uploads/video-viral.mp4";
  const exampleClips: ViralClip[] = [
    {
      title: "RONALDINHO EXPLOSÃO",
      score: 92,
      startTimestamp: "00:15:30",
      endTimestamp: "00:15:50",
      durationSeconds: 20,
      hookQuote: "Que ridículo!",
      triggers: ["humor"],
      justification: "Momento de máxima comédia",
      captionStyle: "Palavras-chave em amarelo",
      brollSuggestion: "Efeito de explosão",
      transcriptExcerpt: "Aquele momento quando...",
    },
    {
      title: "MAURO CEZAR ABSURDO",
      score: 88,
      startTimestamp: "00:22:00",
      endTimestamp: "00:22:25",
      durationSeconds: 25,
      hookQuote: "Não é possível!",
      triggers: ["controversy"],
      justification: "Crítica polêmica",
      captionStyle: "Texto em vermelho",
      brollSuggestion: "Clips de confronto",
      transcriptExcerpt: "Segundo o comentarista...",
    },
  ];

  try {
    // PASSO 1: Processar clipes e gerar thumbnails
    console.log("🎬 Iniciando processamento de clipes...");
    const processedClips = await processBatchClips(exampleClips, videoPath);

    // PASSO 2: Criar render job com thumbnails
    console.log("📋 Criando render job...");
    const renderJob = await createRenderJobWithAutoThumbnails(
      "https://example.com/video.mp4",
      "Vídeo Viral Example",
      exampleClips,
      videoPath
    );

    console.log("✅ Workflow completo! Job ID:", renderJob?.id);

    return {
      success: true,
      clipsWithThumbnails: processedClips,
      renderJobId: renderJob?.id,
    };
  } catch (error) {
    console.error("❌ Erro no workflow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Exportar tudo para uso em componentes/rotas
export default {
  processClipWithThumbnail,
  processBatchClips,
  createRenderJobWithAutoThumbnails,
  regenerateThumbnailWithOptions,
  thumbnailCache,
  generateThumbnailGraceful,
  exampleClipProcessingWorkflow,
};
