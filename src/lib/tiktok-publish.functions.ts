import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { workerSupabase } from "./worker-supabase.server";

const admin = workerSupabase as any;

const PublishTiktokJobInput = z.object({
  jobId: z.string().min(1),
  clipIndex: z.number().optional(),
  tiktokConfig: z.object({
    target_platform: z.literal("tiktok"),
    tiktok_session_cookie: z.string().optional().default(""),
    tiktok_profile_name: z.string(),
    default_hashtags: z.string().optional().default(""),
  }),
});

export const publishJobToTiktok = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PublishTiktokJobInput.parse(data))
  .handler(async ({ data }) => {
    const { jobId, clipIndex, tiktokConfig } = data;

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

      // Update payload to request publish
      const instructionsObj = { ...tiktokConfig, clip_index: clipIndex };
      const updatePayload = {
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
          error: "Falha ao registrar solicitação de publicação no TikTok.",
        };
      }

      return {
        ok: true as const,
        message: "Solicitação de publicação no TikTok registrada. O worker irá abrir o Creator Studio em breve.",
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Erro ao publicar no TikTok.",
      };
    }
  });
