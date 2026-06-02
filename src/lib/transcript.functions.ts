import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { YoutubeTranscript } from "youtube-transcript";

const InputSchema = z.object({
  url: z.string().url().max(500),
});

export interface FetchTranscriptResult {
  transcript: string;
  videoTitle: string;
  source: "youtube";
  error?: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const fetchTranscript = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<FetchTranscriptResult> => {
    const url = data.url.trim();
    const ytId = extractYouTubeId(url);

    if (!ytId) {
      const lower = url.toLowerCase();
      const detected =
        lower.includes("tiktok.com") ? "TikTok"
        : lower.includes("instagram.com") ? "Instagram"
        : lower.includes("linkedin.com") ? "LinkedIn"
        : lower.includes("x.com") || lower.includes("twitter.com") ? "X/Twitter"
        : "essa rede";
      return {
        transcript: "",
        videoTitle: "",
        source: "youtube",
        error: `Por enquanto só suporto links do YouTube. Para ${detected}, baixe o áudio e cole a transcrição manualmente (ou peça pra eu integrar Whisper/AssemblyAI).`,
      };
    }

    try {
      const segments = await YoutubeTranscript.fetchTranscript(ytId, { lang: "pt" }).catch(() =>
        YoutubeTranscript.fetchTranscript(ytId),
      );

      if (!segments || segments.length === 0) {
        return {
          transcript: "",
          videoTitle: "",
          source: "youtube",
          error: "Vídeo sem legendas disponíveis.",
        };
      }

      const lines = segments.map((s) => {
        const ts = formatTimestamp(s.offset / 1000);
        const text = (s.text || "")
          .replace(/&amp;#39;/g, "'")
          .replace(/&amp;quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/\n/g, " ")
          .trim();
        return `[${ts}] ${text}`;
      });

      // Try to grab title via oEmbed (no API key needed)
      let videoTitle = "";
      try {
        const r = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`,
        );
        if (r.ok) {
          const j = (await r.json()) as { title?: string };
          videoTitle = j.title ?? "";
        }
      } catch {
        // ignore
      }

      return {
        transcript: lines.join("\n"),
        videoTitle,
        source: "youtube",
      };
    } catch (e) {
      console.error("fetchTranscript failed:", e);
      return {
        transcript: "",
        videoTitle: "",
        source: "youtube",
        error: e instanceof Error ? e.message : "Falha ao buscar transcrição.",
      };
    }
  });
