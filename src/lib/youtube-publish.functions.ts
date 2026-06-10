import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { workerSupabase } from "./worker-supabase.server";

const admin = workerSupabase as any;

const PublishJobInput = z.object({
  jobId: z.string().min(1),
  clipIndex: z.number().optional(),
  youtubeConfig: z.object({
    youtube_refresh_token: z.string(),
    privacy_status: z.string(),
    default_hashtags: z.string().optional().default(""),
    default_tags: z.string().optional().default(""),
  }).optional(),
});

export const publishJobToYoutube = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PublishJobInput.parse(data))
  .handler(async ({ data }) => {
    const { jobId, clipIndex, youtubeConfig } = data;

    try {
      // Fetch the current job
      const { data: jobData, error: fetchError } = await admin
        .from("render_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (fetchError || !jobData) {
        return {
          ok: false as const,
          error: "Job não encontrado.",
        };
      }

      if (jobData.status === "published_requested") {
        return {
          ok: true as const,
          message: "A publicação já foi solicitada e está aguardando o worker local.",
        };
      }

      // Check if job is completed
      if (jobData.status !== "done" && jobData.status !== "completed" && jobData.status !== "failed") {
        return {
          ok: false as const,
          error: `Job ainda não foi concluído. Status atual: ${jobData.status}`,
        };
      }

      // If clipIndex is specified, check if that specific clip was already published
      const clipItems = Array.isArray(jobData.clip_items) ? jobData.clip_items : [];
      if (clipIndex !== undefined && clipItems[clipIndex] && (clipItems[clipIndex] as any).youtube_url) {
        return {
          ok: true as const,
          message: "Este clipe já foi publicado no YouTube.",
          youtubeUrl: (clipItems[clipIndex] as any).youtube_url,
        };
      }

      const instructionsObj = youtubeConfig 
        ? { ...youtubeConfig, clip_index: clipIndex } 
        : { clip_index: clipIndex };

      const updatePayload: any = {
        status: "published_requested",
        updated_at: new Date().toISOString(),
        error_message: null,
        instructions: JSON.stringify(instructionsObj),
      };

      const { error: updateError } = await admin
        .from("render_jobs")
        .update(updatePayload)
        .eq("id", jobId);

      if (updateError) {
        return {
          ok: false as const,
          error: "Falha ao registrar solicitação de publicação.",
        };
      }

      return {
        ok: true as const,
        message: "Solicitação de publicação registrada. O worker irá processar em breve.",
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Erro ao publicar no YouTube.",
      };
    }
  });
