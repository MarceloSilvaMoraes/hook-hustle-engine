import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workerSupabase } from "./worker-supabase.server";
import type { RenderJobClip, RenderJobRow } from "./render-jobs.types";

const RenderJobClipSchema = z.object({
  title: z.string().min(1).max(200),
  score: z.number().min(0).max(100),
  startTimestamp: z.string().min(1).max(20),
  endTimestamp: z.string().min(1).max(20),
  durationSeconds: z.number().min(1).max(300),
  hookQuote: z.string().min(1).max(500),
  triggers: z.array(z.string()).min(1),
  justification: z.string().min(1).max(1000),
  captionStyle: z.string().min(1).max(500),
  brollSuggestion: z.string().min(1).max(500),
  transcriptExcerpt: z.string().min(1).max(1000),
});

const createRenderJobInput = z.object({
  videoUrl: z.string().url().max(500),
  videoTitle: z.string().max(300).optional().default(""),
  platform: z.string().max(80).default("TikTok/Reels (9:16)"),
  renderFormat: z.string().max(80).default("9:16"),
  clipItems: z.array(RenderJobClipSchema).min(1),
  instructions: z.string().max(5000).optional().default(""),
});

const listRenderJobsInput = z.object({
  limit: z.number().int().min(1).max(50).optional().default(10),
});

const admin = workerSupabase as any;

export type RenderJob = RenderJobRow;

function formatRenderJobsError(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  const message = error?.message || error?.details || error?.hint || "Falha ao acessar a tabela render_jobs no Supabase.";
  if (typeof message === "string" && message.toLowerCase().includes("could not find the table")) {
    return "Tabela render_jobs não encontrada no Supabase. Execute supabase/render_jobs.sql no seu projeto Supabase.";
  }
  return message;
}

export const createRenderJob = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createRenderJobInput.parse(data))
  .handler(async ({ data }) => {
    const payload = {
      video_url: data.videoUrl,
      video_title: data.videoTitle,
      platform: data.platform,
      render_format: data.renderFormat,
      clip_items: data.clipItems,
      instructions: data.instructions,
      status: "pending",
      requested_by: null,
    };

    const response = await admin.from("render_jobs").insert(payload).select("*").single();
    if (response.error) {
      return { job: null, error: formatRenderJobsError(response.error) };
    }

    return { job: response.data as RenderJobRow };
  });

export const listRenderJobs = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => listRenderJobsInput.parse(data))
  .handler(async ({ data }) => {
    const response = await admin
      .from("render_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (response.error) {
      return { jobs: [], error: formatRenderJobsError(response.error) };
    }

    return { jobs: response.data as RenderJobRow[] };
  });

export const clearOldRenderJobs = createServerFn({ method: "POST" })
  .handler(async () => {
    const response = await admin
      .from("render_jobs")
      .delete()
      .in("status", ["done", "completed", "failed"]);

    if (response.error) {
      return { ok: false, error: formatRenderJobsError(response.error) };
    }

    return { ok: true };
  });

export const retryRenderJob = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ jobId: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { jobId } = data;
    try {
      const { data: jobData, error: fetchError } = await admin
        .from("render_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (fetchError || !jobData) {
        return { ok: false as const, error: "Job não encontrado." };
      }

      // If output_path exists and looks like local files (doesn't contain youtube.com but has path),
      // we can retry publishing. Otherwise, retry rendering.
      const hasOutputFiles = jobData.output_path && 
                             !jobData.output_path.includes("youtube.com") && 
                             jobData.output_path.trim().length > 0;
      
      const newStatus = hasOutputFiles ? "published_requested" : "pending";

      const { error: updateError } = await admin
        .from("render_jobs")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", jobId);

      if (updateError) {
        return { ok: false as const, error: "Falha ao reiniciar o job." };
      }

      return { 
        ok: true as const, 
        message: newStatus === "published_requested" 
          ? "Solicitação de publicação reenviada." 
          : "Job de renderização reiniciado na fila." 
      };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Erro ao reiniciar o job." };
    }
  });

