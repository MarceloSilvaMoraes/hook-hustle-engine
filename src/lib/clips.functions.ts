import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  transcript: z.string().min(50).max(80000),
  videoTitle: z.string().max(300).optional().default(""),
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { clips: [], error: "LOVABLE_API_KEY não configurada." };
    }

    const userPrompt = `VÍDEO: "${data.videoTitle || "Sem título"}"
PLATAFORMA ALVO: ${data.platform}
TOM: ${data.tone}

TRANSCRIÇÃO:
${data.transcript}

Extraia os 5 melhores clipes virais (30-60s) com timestamps, score, justificativa e direção visual.`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
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
        return { clips: [], error: "Créditos esgotados. Adicione créditos em Settings → Workspace → Usage." };
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
      return { clips: sorted };
    } catch (e) {
      console.error("analyzeTranscript failed:", e);
      return {
        clips: [],
        error: e instanceof Error ? e.message : "Erro desconhecido.",
      };
    }
  });
