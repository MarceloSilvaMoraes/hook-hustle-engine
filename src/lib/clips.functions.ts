import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateThumbnailQuick } from "./thumbnail-generation.functions";

const InputSchema = z.object({
  transcript: z.string().min(50).max(80000),
  videoTitle: z.string().max(300).optional().default(""),
  videoPath: z.string().optional(), // 🎬 Caminho do vídeo para gerar thumbnails
  platform: z.string().max(50).optional().default("TikTok/Reels (9:16)"),
  tone: z.string().max(100).optional().default("High Energy"),
});

export type ClipTrigger = "hook" | "cliffhanger" | "high_value" | "controversy" | "emotional" | "humor";

export interface ViralClip {
  title: string;
  score: number;
  startTimestamp: string;
  endTimestamp: string;
  durationSeconds: number;
  hookQuote: string;
  triggers: ClipTrigger[];
  justification: string;
  captionStyle: string;
  brollSuggestion: string;
  transcriptExcerpt: string;
  thumbnailDataUrl?: string; // 🎬 Thumbnail gerada automaticamente
}

export interface ClipAnalysisResult {
  clips: ViralClip[];
  error?: string;
}

const SYSTEM_PROMPT = `Você é um especialista em edição de vídeo viral e análise de retenção de audiência. Analisa transcrições de vídeos longos e identifica os melhores momentos para clipes curtos (TikTok, Reels, Shorts).

CRITÉRIOS DE SELEÇÃO (Score de Viralização 0-100):
- HOOK: Frase de impacto / pergunta intrigante nos primeiros 3s
- CONTEXTO: Autoexplicativo, sem precisar do vídeo original
- VALOR: Lição, piada, opinião forte ou momento emocional
- FECHAMENTO: Cliffhanger ou conclusão satisfatória que incentive loop

Para cada clipe, forneça também direção visual:
- Estilo de legendas dinâmicas (palavras-chave destacadas)
- Sugestão de B-roll/emojis para conceitos abstratos

Retorne EXATAMENTE 5 clipes de 30-60s, ordenados por score (maior primeiro).`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    clips: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título viral curto e magnético (max 80 chars)" },
          score: { type: "number", description: "Pontuação de viralidade 0-100" },
          startTimestamp: { type: "string", description: "Timestamp início no formato mm:ss ou hh:mm:ss" },
          endTimestamp: { type: "string", description: "Timestamp fim no formato mm:ss ou hh:mm:ss" },
          durationSeconds: { type: "number", description: "Duração em segundos (30-60)" },
          hookQuote: { type: "string", description: "A frase exata do hook (primeiros 3s)" },
          triggers: {
            type: "array",
            items: {
              type: "string",
              enum: ["hook", "cliffhanger", "high_value", "controversy", "emotional", "humor"],
            },
          },
          justification: { type: "string", description: "Por que funciona como Short independente (2-3 frases)" },
          captionStyle: { type: "string", description: "Diretriz de legendas: palavras-chave a destacar" },
          brollSuggestion: { type: "string", description: "Sugestão de B-roll/emojis/imagens de apoio" },
          transcriptExcerpt: { type: "string", description: "Trecho da transcrição (max 280 chars)" },
        },
        required: [
          "title",
          "score",
          "startTimestamp",
          "endTimestamp",
          "durationSeconds",
          "hookQuote",
          "triggers",
          "justification",
          "captionStyle",
          "brollSuggestion",
          "transcriptExcerpt",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["clips"],
  additionalProperties: false,
} as const;

export const analyzeTranscript = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<ClipAnalysisResult> => {
    const lovableKey = (process.env.LOVABLE_API_KEY || process.env.VITE_LOVABLE_API_KEY || "").trim();
    const openAiKey = (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "").trim();
    const ollamaUrl = (process.env.OLLAMA_BASE_URL || process.env.VITE_OLLAMA_BASE_URL || "http://localhost:11434").trim();
    const ollamaModel = (process.env.OLLAMA_MODEL || process.env.VITE_OLLAMA_MODEL || "mistral").trim();

    // Detectar qual IA configurar
    const isLovableValid = lovableKey && !lovableKey.includes("COLOQUE_SUA_CHAVE_AQUI") && !lovableKey.includes("SEU_TOKEN_AQUI");
    const isOpenAiValid = openAiKey && !openAiKey.includes("COLOQUE_SUA_CHAVE_AQUI") && !openAiKey.includes("SEU_TOKEN_AQUI");

    if (!isLovableValid && !isOpenAiValid && ollamaUrl === "http://localhost:11434") {
      // Usar Ollama local como fallback
      return {
        clips: [],
        error: `Nenhuma chave de IA configurada. Opções disponíveis:\n\n1. Instale OLLAMA: https://ollama.ai/download\n   Depois rode: ollama pull mistral\n\n2. OU configure OPENAI_API_KEY no .env\n\n3. OU configure LOVABLE_API_KEY no .env\n\nPor enquanto, tentando conectar com Ollama em ${ollamaUrl}...`,
      };
    }

    const aiConfig = isLovableValid
      ? {
          provider: "lovable" as const,
          apiKey: lovableKey,
          endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
          model: "google/gemini-2.5-flash",
        }
      : isOpenAiValid
        ? {
            provider: "openai" as const,
            apiKey: openAiKey,
            endpoint: "https://api.openai.com/v1/chat/completions",
            model: "gpt-4o-mini",
          }
        : {
            provider: "ollama" as const,
            endpoint: `${ollamaUrl}/api/chat`,
            model: ollamaModel,
          };

    if (!aiConfig) {
      return {
        clips: [],
        error: "Nenhuma chave de IA válida está configurada. Defina LOVABLE_API_KEY, OPENAI_API_KEY ou configure Ollama no arquivo .env antes de analisar o conteúdo.",
      };
    }

    const userPrompt = `VÍDEO: "${data.videoTitle || "Sem título"}"
PLATAFORMA ALVO: ${data.platform}
TOM: ${data.tone}

TRANSCRIÇÃO:
${data.transcript}

Extraia os 5 melhores clipes virais (30-60s) com timestamps, score, justificativa e direção visual.`;

    try {
      if (aiConfig.provider === "ollama") {
        // Ollama doesn't support tool_choice, so we'll use a simpler prompt
        const response = await fetch(aiConfig.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { 
                role: "user", 
                content: `${userPrompt}\n\nResponda em JSON com esta estrutura exatamente:\n${JSON.stringify({ clips: [] })}`
              },
            ],
            stream: false,
          }),
        }).catch((err) => {
          console.error("Ollama connection error:", err.message);
          return new Response(JSON.stringify({ error: err.message }), { status: 0 });
        });

        if (!response.ok || response.status === 0) {
          const statusText = response.status === 0 
            ? `Não consegui conectar ao Ollama em ${aiConfig.endpoint}`
            : `Ollama retornou status ${response.status}`;
          
          const text = await response.text().catch(() => "");
          console.error("Ollama error:", response.status, text);
          
          return { 
            clips: [], 
            error: `${statusText}.\n\nSolução: Instale Ollama (https://ollama.ai) e rode:\n  ollama pull mistral\n  ollama serve\n\nOu configure uma chave de IA no .env:\n  OPENAI_API_KEY=sk-...\n  LOVABLE_API_KEY=seu-token` 
          };
        }

        const json = await response.json();
        const content = json.message?.content || "";
        
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return { clips: [], error: "Ollama retornou resposta inválida. Tente novamente." };
        }

        const parsed = JSON.parse(jsonMatch[0]) as { clips: ViralClip[] };
        const sorted = [...parsed.clips].sort((a, b) => b.score - a.score);
        
        // 🎬 Gerar thumbnails se videoPath foi fornecido
        if (data.videoPath) {
          console.log(`📸 Gerando thumbnails para ${sorted.length} clipes...`);
          const clipsWithThumbs = await Promise.all(
            sorted.map(async (clip) => {
              try {
                const result = await generateThumbnailQuick({
                  videoPath: data.videoPath!,
                  clipTitle: clip.title,
                  clipHook: clip.hookQuote,
                  triggerType: clip.triggers[0] as any,
                  extractAtSeconds: 2,
                  personPosition: "center",
                });
                return {
                  ...clip,
                  thumbnailDataUrl: result.success ? result.thumbnailDataUrl : undefined,
                };
              } catch (error) {
                console.warn(`⚠️ Thumbnail falhou para "${clip.title}":`, error);
                return clip;
              }
            })
          );
          return { clips: clipsWithThumbs };
        }
        
        return { clips: sorted };
      }

      // OpenAI or Lovable (with tool_choice)
      const response = await fetch(aiConfig.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_viral_clips",
                description: "Retorna os 5 melhores clipes virais identificados",
                parameters: RESPONSE_SCHEMA,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_viral_clips" } },
        }),
      });

      if (response.status === 429) {
        return { clips: [], error: "Limite de requisições atingido. Tente novamente em alguns instantes." };
      }
      if (response.status === 402) {
        return { clips: [], error: "Créditos esgotados. Abra Settings → Workspace → Billing and usage para recarregar créditos." };
      }
      if (!response.ok) {
        const text = await response.text();
        console.error("AI gateway error:", response.status, text);
        return { clips: [], error: `Erro na análise (${response.status}).` };
      }

      const json = await response.json();
      const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        return { clips: [], error: "Resposta inválida do modelo." };
      }

      const parsed = JSON.parse(toolCall.function.arguments) as { clips: ViralClip[] };
      const sorted = [...parsed.clips].sort((a, b) => b.score - a.score);
      
      // 🎬 Gerar thumbnails se videoPath foi fornecido
      if (data.videoPath) {
        console.log(`📸 Gerando thumbnails para ${sorted.length} clipes...`);
        const clipsWithThumbs = await Promise.all(
          sorted.map(async (clip) => {
            try {
              const result = await generateThumbnailQuick({
                videoPath: data.videoPath!,
                clipTitle: clip.title,
                clipHook: clip.hookQuote,
                triggerType: clip.triggers[0] as any,
                extractAtSeconds: 2,
                personPosition: "center",
              });
              return {
                ...clip,
                thumbnailDataUrl: result.success ? result.thumbnailDataUrl : undefined,
              };
            } catch (error) {
              console.warn(`⚠️ Thumbnail falhou para "${clip.title}":`, error);
              return clip;
            }
          })
        );
        return { clips: clipsWithThumbs };
      }
      
      return { clips: sorted };
    } catch (e) {
      console.error("analyzeTranscript failed:", e);
      return {
        clips: [],
        error: e instanceof Error ? e.message : "Erro desconhecido.",
      };
    }
  });
