import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { analyzeTranscript, type ViralClip } from "@/lib/clips.functions";
import { fetchTranscript } from "@/lib/transcript.functions";
import { ClipCard } from "@/components/ClipCard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ViralForce.AI — Extrator de Clipes Virais com IA" },
      {
        name: "description",
        content:
          "Cole a transcrição de um vídeo longo e a IA extrai os 5 melhores clipes virais para TikTok, Reels e Shorts com score, hooks e direção visual.",
      },
      { property: "og:title", content: "ViralForce.AI — Extrator de Clipes Virais" },
      {
        property: "og:description",
        content: "Análise de retenção movida a IA. Identifica hooks, cliffhangers e momentos de alto valor em segundos.",
      },
    ],
  }),
  component: Index,
});

const PLACEHOLDER = `Cole aqui a transcrição completa do seu vídeo longo (podcast, entrevista, aula)...

Exemplo: [00:00] Hoje eu vou te mostrar o erro que 99% dos empreendedores cometem...`;

function Index() {
  const [transcript, setTranscript] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [platform, setPlatform] = useState("TikTok/Reels (9:16)");
  const [tone, setTone] = useState("Alta Energia");
  const [clips, setClips] = useState<ViralClip[]>([]);

  const analyze = useServerFn(analyzeTranscript);

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await analyze({
        data: { transcript, videoTitle, platform, tone },
      });
      if (result.error) throw new Error(result.error);
      return result.clips;
    },
    onSuccess: (data) => {
      setClips(data);
      toast.success(`${data.length} clipes virais extraídos`);
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canAnalyze = transcript.trim().length >= 50 && !mutation.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary selection:text-white">
      <Toaster theme="dark" />

      {/* Header */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 bg-primary rounded-sm flex items-center justify-center">
            <div className="size-2.5 bg-background rounded-full" />
          </div>
          <span className="font-display text-2xl tracking-tighter uppercase text-primary">
            ViralForce.AI
          </span>
        </div>
        <div className="hidden md:flex gap-6 items-center text-xs font-mono uppercase tracking-widest">
          <span className="text-primary flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Engine v4.2 Active
          </span>
          <span className="text-muted-foreground">AI-Powered Clip Extraction</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <header className="mb-12 max-w-3xl animate-entry">
          <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-[0.95] mb-4">
            Extraia <span className="text-primary italic">virais</span>
            <br />
            do seu conteúdo longo
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Cole a transcrição. A IA identifica hooks, cliffhangers e picos de
            retenção — devolve 5 clipes prontos pra TikTok, Reels e Shorts.
          </p>
        </header>

        {/* Editor Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20 animate-entry">
          <div className="lg:col-span-8">
            <label className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
              Raw Transcript
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full h-80 bg-surface border border-border rounded-xl p-6 font-mono text-sm leading-relaxed focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/40"
              placeholder={PLACEHOLDER}
            />
            <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex justify-between">
              <span>{transcript.length.toLocaleString()} caracteres</span>
              <span>{transcript.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} palavras</span>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div>
              <label className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                Título do vídeo
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Ex: Entrevista sobre IA 2026"
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                Plataforma
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 font-medium outline-none focus:border-primary cursor-pointer"
              >
                <option>TikTok/Reels (9:16)</option>
                <option>YouTube Shorts</option>
                <option>LinkedIn Video</option>
              </select>
            </div>

            <div>
              <label className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                Tom
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 font-medium outline-none focus:border-primary cursor-pointer"
              >
                <option>Alta Energia</option>
                <option>Controverso / Provocativo</option>
                <option>Educacional / Limpo</option>
                <option>Emocional / Inspirador</option>
              </select>
            </div>

            <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
              <h3 className="font-display text-xl uppercase mb-2">Pro Engine v4.2</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Analisa hooks, picos de retenção e justificativa viral com base em
                gatilhos comprovados de TikTok/Reels.
              </p>
              <button
                onClick={() => mutation.mutate()}
                disabled={!canAnalyze}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-display text-lg py-4 rounded-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? "ANALISANDO..." : "ANALISAR CONTEÚDO"}
              </button>
              {transcript.trim().length > 0 && transcript.trim().length < 50 && (
                <p className="mt-3 text-xs text-destructive">
                  Mínimo de 50 caracteres na transcrição.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
        {(clips.length > 0 || mutation.isPending) && (
          <section id="results">
            <div className="flex justify-between items-end mb-8 border-b border-border pb-4">
              <h2 className="font-display text-3xl md:text-4xl uppercase tracking-tighter italic">
                Top Viral Clips {clips.length > 0 && <span className="text-muted-foreground">({String(clips.length).padStart(2, "0")})</span>}
              </h2>
              <span className="font-mono text-xs text-muted-foreground hidden md:block">
                ORDENADO POR SCORE
              </span>
            </div>

            {mutation.isPending && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface border border-border rounded-2xl p-6 h-80 animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex justify-between mb-6">
                      <div className="size-16 rounded-full border-4 border-border" />
                      <div className="h-4 w-24 bg-border rounded" />
                    </div>
                    <div className="h-6 w-3/4 bg-border rounded mb-3" />
                    <div className="h-3 w-full bg-border rounded mb-2" />
                    <div className="h-3 w-2/3 bg-border rounded" />
                  </div>
                ))}
              </div>
            )}

            {clips.length > 0 && !mutation.isPending && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {clips.map((clip, idx) => (
                  <ClipCard key={idx} clip={clip} index={idx} />
                ))}
              </div>
            )}
          </section>
        )}

        {clips.length === 0 && !mutation.isPending && (
          <section className="mt-24 grid grid-cols-1 md:grid-cols-4 gap-8 border-t border-border pt-12">
            {[
              { n: "01", t: "Hook", d: "Frase de impacto nos primeiros 3s" },
              { n: "02", t: "Contexto", d: "Autoexplicativo, sem vídeo original" },
              { n: "03", t: "Valor", d: "Lição, opinião forte ou emoção" },
              { n: "04", t: "Fechamento", d: "Cliffhanger ou loop satisfatório" },
            ].map((item) => (
              <div key={item.n}>
                <div className="font-mono text-xs text-primary mb-2">{item.n}</div>
                <h3 className="font-display text-2xl uppercase mb-2">{item.t}</h3>
                <p className="text-sm text-muted-foreground">{item.d}</p>
              </div>
            ))}
          </section>
        )}
      </main>

      <footer className="border-t border-border py-8 px-6 mt-24">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            ViralForce.AI © 2026
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            Powered by Lovable AI
          </span>
        </div>
      </footer>
    </div>
  );
}
