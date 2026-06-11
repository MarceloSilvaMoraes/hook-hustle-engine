import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { YoutubeTranscript } from "youtube-transcript";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const InputSchema = z.object({
  url: z.string().url().max(500),
});

export interface FetchTranscriptResult {
  transcript: string;
  videoTitle: string;
  videoId: string;
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

function normalizeTranscriptError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("Transcript is disabled")) {
      return "Transcrição automática desativada neste vídeo. Cole a transcrição manualmente.";
    }
    if (message.includes("Unable to find a transcript") || message.includes("No transcript found") || message.includes("No transcripts are available")) {
      return "Nenhuma transcrição disponível para este vídeo. Cole a transcrição manualmente ou use outro link com legendas.";
    }
    if (message.includes("Video unavailable") || message.includes("video unavailable")) {
      return "Vídeo indisponível ou removido no YouTube.";
    }
    return message;
  }
  return "Falha ao buscar transcrição.";
}

async function fetchTranscriptWithFallback(ytId: string) {
  const languageCandidates = ["pt", "pt-BR", "en", "en-US"];

  for (const lang of languageCandidates) {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(ytId, { lang });
      if (segments?.length) {
        return segments;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("No transcripts are available") && !message.includes("Unable to find a transcript")) {
        continue;
      }
    }
  }

  return YoutubeTranscript.fetchTranscript(ytId).catch(() => [] as never[]);
}

/**
 * Fallback: Extract captions using yt-dlp locally
 */
async function extractCaptionsWithYtDlp(ytId: string): Promise<Array<{ offset: number; text: string }>> {
  try {
    const tempDir = path.join(process.cwd(), ".temp-captions");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputTemplate = path.join(tempDir, `${ytId}.%(ext)s`);
    const url = `https://www.youtube.com/watch?v=${ytId}`;

    // Try Portuguese first, then English
    for (const lang of ["pt", "en"]) {
      try {
        // Execute yt-dlp to download captions
        execSync(
          `yt-dlp --write-auto-sub --sub-lang ${lang} --skip-download -o "${outputTemplate}" "${url}"`,
          { stdio: "ignore", timeout: 30000 },
        );

        // Look for VTT file
        const files = fs.readdirSync(tempDir);
        const vttFile = files.find((f) => f.startsWith(ytId) && f.endsWith(".vtt"));

        if (vttFile) {
          const vttPath = path.join(tempDir, vttFile);
          const content = fs.readFileSync(vttPath, "utf-8");
          fs.unlinkSync(vttPath); // Clean up

          // Parse VTT format
          const segments: Array<{ offset: number; text: string }> = [];
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // VTT timestamp format: 00:00:20.500 --> 00:00:22.000
            if (line.includes("-->")) {
              const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})/);
              if (timeMatch && i + 1 < lines.length) {
                const [, h, m, s] = timeMatch;
                const offset = (parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s)) * 1000;
                let text = lines[i + 1].trim();
                // Remove formatting tags
                text = text.replace(/<[^>]+>/g, "").replace(/\n/g, " ");
                if (text) {
                  segments.push({ offset, text });
                }
              }
            }
          }

          if (segments.length > 0) {
            return segments;
          }
        }
      } catch (e) {
        // Try next language
        continue;
      }
    }

    return [];
  } catch (e) {
    console.warn("⚠️ yt-dlp caption extraction failed:", e instanceof Error ? e.message : e);
    return [];
  }
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
        videoId: ytId ?? "",
        source: "youtube",
        error: `Por enquanto só suporto links do YouTube. Para ${detected}, baixe o áudio e cole a transcrição manualmente (ou peça pra eu integrar Whisper/AssemblyAI).`,
      };
    }

    try {
      const segments = await fetchTranscriptWithFallback(ytId);

      if (!segments || segments.length === 0) {
        // Fallback: Try yt-dlp extraction
        console.log(`📥 Trying yt-dlp caption extraction for ${ytId}...`);
        const ytdlpSegments = await extractCaptionsWithYtDlp(ytId);

        if (!ytdlpSegments || ytdlpSegments.length === 0) {
          return {
            transcript: "",
            videoTitle: "",
            videoId: ytId ?? "",
            source: "youtube",
            error: "Vídeo sem legendas disponíveis. Cole a transcrição manualmente para continuar.",
          };
        }

        // Continue with yt-dlp segments
        const lines = ytdlpSegments.map((s) => {
          const ts = formatTimestamp(s.offset / 1000);
          const text = (s.text || "")
            .replace(/&amp;#39;/g, "'")
            .replace(/&amp;quot;/g, '"')
            .replace(/&amp;/g, "&")
            .replace(/\n/g, " ")
            .trim();
          return `[${ts}] ${text}`;
        });

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

        console.log(`✅ Successfully extracted ${lines.length} caption lines using yt-dlp`);
        return {
          transcript: lines.join("\n"),
          videoTitle,
          videoId: ytId ?? "",
          source: "youtube",
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
        videoId: ytId ?? "",
        source: "youtube",
      };
    } catch (e) {
      console.error("fetchTranscript failed:", e);
      return {
        transcript: "",
        videoTitle: "",
        videoId: ytId ?? "",
        source: "youtube",
        error: normalizeTranscriptError(e),
      };
    }
  });
