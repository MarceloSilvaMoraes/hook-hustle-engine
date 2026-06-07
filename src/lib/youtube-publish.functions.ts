import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { workerSupabase } from "./worker-supabase.server";

const admin = workerSupabase as any;

const PublishJobInput = z.object({
  jobId: z.string().min(1),
});

export const publishJobToYoutube = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PublishJobInput.parse(data))
  .handler(async ({ data }) => {
    const { jobId } = data;

    try {
      // Fetch the current job
      const { data: jobData, error: fetchError } = await supabaseAdmin
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

      // Check if job is completed
      if (jobData.status !== "done" && jobData.status !== "completed") {
        return {
          ok: false as const,
          error: `Job ainda não foi concluído. Status atual: ${jobData.status}`,
        };
      }

      // Check if output has YouTube links
      const outputPath = jobData.output_path || "";
      if (!outputPath.includes("youtube.com")) {
        // If no YouTube link yet, just mark as "published_requested"
        // The worker will handle actual publishing if configured
        const { error: updateError } = await supabaseAdmin
          .from("render_jobs")
          .update({
            status: "published_requested",
            updated_at: new Date().toISOString(),
          })
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
      }

      // Already has YouTube links
      return {
        ok: true as const,
        message: "Job já foi publicado no YouTube.",
        youtubeLinks: outputPath.split(" | ").filter((link) => link.includes("youtube.com")),
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Erro ao publicar no YouTube.",
      };
    }
  });
