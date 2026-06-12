import { createFileRoute } from "@tanstack/react-router";
import { generateProfessionalThumbnail } from "@/lib/thumbnail-professional.functions";
import * as path from "path";

export const Route = createFileRoute("/test-thumbnail")({
  component: TestThumbnailComponent,
});

async function TestThumbnailComponent() {
  try {
    const videoPath = path.join(process.cwd(), "test-video.mp4");

    console.log("🎬 Gerando thumbnail de teste...");
    const startTime = Date.now();

    const result = await generateProfessionalThumbnail({
      videoPath,
      clipTitle: "NEYMAR ABRIU O JOGO!",
      clipHook: "Confira a reação explosiva 💥",
      triggerType: "controversy",
      extractAtSeconds: 2,
      personPositions: ["center"],
      backgroundTemplate: "dark_gradient",
      useAdvancedEffects: true,
    });

    const elapsed = Date.now() - startTime;

    return (
      <div style={{ padding: "20px", fontFamily: "monospace" }}>
        <h1>✅ THUMBNAIL GERADA COM SUCESSO!</h1>
        <pre>
          {JSON.stringify(
            {
              success: result.success,
              tempo_ms: elapsed,
              metodo_remoção_fundo: result.backgroundMethod,
              tamanho_data_url_kb: (result.thumbnailDataUrl.length / 1024).toFixed(2),
            },
            null,
            2
          )}
        </pre>
        <h2>Preview:</h2>
        <img
          src={result.thumbnailDataUrl}
          alt="Thumbnail gerada"
          style={{ maxWidth: "100%", border: "2px solid #ddd" }}
        />
      </div>
    );
  } catch (error) {
    return (
      <div style={{ padding: "20px", fontFamily: "monospace", color: "red" }}>
        <h1>❌ ERRO ao gerar thumbnail</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
}
