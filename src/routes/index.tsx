import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { analyzeTranscript, type ViralClip } from "@/lib/clips.functions";
import { fetchTranscript } from "@/lib/transcript.functions";
import { createRenderJob, listRenderJobs, type RenderJob } from "@/lib/render-jobs.functions";
import { ClipCard } from "@/components/ClipCard";
import { Toaster } from "@/components/ui/sonner";
import { buildYoutubeAuthUrl } from "@/lib/youtube-auth.functions";

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

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function platformCaption(platform: string, clip: ViralClip): string {
  const base = `${clip.hookQuote}\n\n${clip.justification}`;
  if (platform.includes("TikTok") || platform.includes("Reels")) return `${base}\n\n#fyp #foryou #viral #parati #brasil`;
  if (platform.includes("Shorts")) return `${base}\n\n#shorts #viral #brasil`;
  if (platform.includes("LinkedIn")) return `${base}\n\nO que você pensa sobre isso? Comenta aí 👇\n\n#carreira #lideranca`;
  return base;
}

function exportInstructions(clips: ViralClip[], videoTitle: string, videoId: string, platform: string) {
  const url = videoId ? `https://youtube.com/watch?v=${videoId}` : "(transcrição manual)";
  const crop = platform.includes("9:16") || platform.includes("Shorts") ? "9:16 (1080x1920)" : platform.includes("LinkedIn") ? "1:1 ou 16:9" : "conforme plataforma";
  const lines: string[] = [
    `VIRALFORCE.AI · BRIEFING DE CORTES`,
    `===================================`,
    `Vídeo: ${videoTitle || "(sem título)"}`,
    `Fonte: ${url}`,
    `Plataforma alvo: ${platform}`,
    `Total de clipes: ${clips.length}`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ``,
    `INSTRUÇÕES (CapCut / InShot / Premiere):`,
    `1. Abra o vídeo original no editor`,
    `2. Para cada clipe, corte nos timestamps abaixo`,
    `3. Aplique crop ${crop}`,
    `4. Cole a legenda sugerida na descrição do post`,
    ``,
    `===================================`,
    ``,
  ];
  clips.forEach((c, i) => {
    lines.push(
      `[CLIPE ${String(i + 1).padStart(2, "0")}] · Score ${c.score}/100`,
      `Título: ${c.title}`,
      `Timestamps: ${c.startTimestamp} → ${c.endTimestamp} (${c.durationSeconds}s)`,
      `Link direto: ${videoId ? `https://youtu.be/${videoId}?t=${parseTimestampToSeconds(c.startTimestamp)}` : "(n/a)"}`,
      `Gatilhos: ${c.triggers.join(", ")}`,
      ``,
      `--- LEGENDA PARA POSTAGEM (${platform}) ---`,
      platformCaption(platform, c),
      ``,
      `--- DIREÇÃO VISUAL ---`,
      `Legendas: ${c.captionStyle}`,
      `B-roll: ${c.brollSuggestion}`,
      ``,
      `--- TRECHO ---`,
      `"${c.transcriptExcerpt}"`,
      ``,
      `===================================`,
      ``,
    );
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `viralforce-${(videoTitle || "clipes").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function isValidGoogleClientId(value: string) {
  return /^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value.trim());
}

function Index() {
  const [transcript, setTranscript] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [platform, setPlatform] = useState("TikTok/Reels (9:16)");
  const [tone, setTone] = useState("Alta Energia");
  const [clips, setClips] = useState<ViralClip[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [googleClientId, setGoogleClientId] = useState("");
  const [playing, setPlaying] = useState<{ start: number; end: number; title: string } | null>(null);

  const analyze = useServerFn(analyzeTranscript);
  const fetchT = useServerFn(fetchTranscript);
  const createJob = useServerFn(createRenderJob);
  const listJobs = useServerFn(listRenderJobs);

  const fetchMutation = useMutation({
    mutationFn: async () => {
      const r = await fetchT({ data: { url: sourceUrl } });
      if (r.error) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => {
      setTranscript(r.transcript);
      if (r.videoTitle) setVideoTitle(r.videoTitle);
      if (r.videoId) setVideoId(r.videoId);
      toast.success("Transcrição importada do YouTube");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderFormat = platform.includes("LinkedIn") ? "16:9" : "9:16";

  const renderMutation = useMutation({
    mutationFn: async () => {
      if (!sourceUrl.trim()) {
        throw new Error("É necessário um link de vídeo para criar um job local.");
      }

      const result = await createJob({
        data: {
          videoUrl: sourceUrl.trim(),
          videoTitle,
          platform,
          renderFormat,
          clipItems: clips,
          instructions: `Renderize localmente em ${renderFormat} a partir do vídeo ${sourceUrl.trim()}`,
        },
      });

      if (result.error || !result.job) {
        throw new Error(result.error || "Falha ao criar o job de renderização.");
      }

      return result.job;
    },
    onSuccess: (job) => {
      setJobs((prev) => [job, ...prev]);
      toast.success("Job criado e enviado para o worker local.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

  const fetchJobs = async () => {
    const result = await listJobs({ data: { limit: 8 } });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setJobs(result.jobs ?? []);
  };

  useEffect(() => {
    void fetchJobs();
    const timer = window.setInterval(() => {
      void fetchJobs();
    }, 20000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedClientId = typeof window !== "undefined" ? localStorage.getItem("youtube_client_id") || "" : "";
    setGoogleClientId(savedClientId);
  }, []);

  const canAnalyze = transcript.trim().length >= 50 && !mutation.isPending;
  const canCreateJob = clips.length > 0 && sourceUrl.trim().length > 0 && !renderMutation.isPending;

  const handleConnectYoutube = () => {
    const clientId = googleClientId.trim() || (typeof window !== "undefined" ? localStorage.getItem("youtube_client_id") : "") || (process.env.VITE_GOOGLE_CLIENT_ID || "");

    if (!clientId.trim()) {
      toast.error("Informe o Client ID do Google para abrir o login do YouTube.");
      return;
    }

    if (!isValidGoogleClientId(clientId)) {
      toast.error("Client ID inválido. Use um OAuth Client do tipo Web application do Google Cloud Console.");
      return;
    }

    localStorage.setItem("youtube_client_id", clientId.trim());
    const url = buildYoutubeAuthUrl();
    window.location.assign(url);
  };

  const handleSaveGoogleClientId = () => {
    const value = googleClientId.trim();
    if (!value) {
      toast.error("Cole o Client ID do Google antes de salvar.");
      return;
    }

    if (!isValidGoogleClientId(value)) {
      toast.error("O valor informado não parece ser um Client ID válido do Google.");
      return;
    }

    localStorage.setItem("youtube_client_id", value);
    toast.success("Client ID do Google salvo localmente.");
  };

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
              Importar do YouTube
            </label>
            <div className="flex gap-2 mb-4">
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Cole o link do YouTube (vídeo ou Short)"
                className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                onClick={() => fetchMutation.mutate()}
                disabled={!sourceUrl.trim() || fetchMutation.isPending}
                className="bg-surface border border-primary text-primary hover:bg-primary hover:text-primary-foreground font-display uppercase tracking-wider text-sm px-6 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {fetchMutation.isPending ? "Buscando..." : "Importar"}
              </button>
            </div>
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleConnectYoutube}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white text-slate-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 13.94c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08V6.94H2.18C1.43 8.31 1 9.88 1 11.5s.43 3.19 1.18 4.56l4.66-2.12z" />
                    <path fill="#EA4335" d="M12 5.98c1.61 0 3.05.55 4.18 1.63l3.13-3.13C17.45 2.99 14.97 2 12 2 7.7 2 3.99 4.47 2.18 7.44l3.66 2.84C6.71 7.91 9.14 5.98 12 5.98z" />
                  </svg>
                  Continuar com Google
                </button>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80">
                  Abre a tela de login do Google para escolher sua conta manualmente.
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="Cole o Client ID do Google OAuth"
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleSaveGoogleClientId}
                  className="border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-display transition-colors"
                >
                  Salvar Client ID
                </button>
              </div>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                Use um OAuth Client do tipo Web application e adicione esta URI de redirecionamento no Google Cloud Console:
                {" "}
                <span className="text-primary">{typeof window !== "undefined" ? `${window.location.origin}/youtube-callback` : "/youtube-callback"}</span>
              </p>
              <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                Se o login falhar, verifique também o GOOGLE_CLIENT_SECRET no servidor do OAuth.
              </p>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-4">
              YouTube/Shorts via legenda automática · TikTok/Reels/X: cole a transcrição manualmente abaixo
            </p>

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
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-display text-lg py-4 rounded-xl transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_12px_30px_-12px_rgba(120,119,198,0.75)] hover:shadow-[0_18px_36px_-12px_rgba(120,119,198,0.95)] ring-1 ring-primary/40"
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
            <div className="flex justify-between items-end mb-8 border-b border-border pb-4 gap-4 flex-wrap">
              <h2 className="font-display text-3xl md:text-4xl uppercase tracking-tighter italic">
                Top Viral Clips {clips.length > 0 && <span className="text-muted-foreground">({String(clips.length).padStart(2, "0")})</span>}
              </h2>
              {clips.length > 0 && (
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() => exportInstructions(clips, videoTitle, videoId, platform)}
                    className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded transition-colors"
                  >
                    ↓ Exportar instruções (.txt)
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectYoutube}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-white text-slate-900 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 13.94c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08V6.94H2.18C1.43 8.31 1 9.88 1 11.5s.43 3.19 1.18 4.56l4.66-2.12z" />
                      <path fill="#EA4335" d="M12 5.98c1.61 0 3.05.55 4.18 1.63l3.13-3.13C17.45 2.99 14.97 2 12 2 7.7 2 3.99 4.47 2.18 7.44l3.66 2.84C6.71 7.91 9.14 5.98 12 5.98z" />
                    </svg>
                    Continuar com Google
                  </button>
                </div>
              )}
            </div>

            {clips.length > 0 && (
              <div className="mb-8 rounded-3xl border border-primary/20 bg-surface p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Local render worker</p>
                    <h3 className="font-display text-2xl mt-2">Crie o job e deixe o worker rodar</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                      A publicação automática no YouTube será habilitada quando as credenciais do canal estiverem prontas.
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Formato</div>
                    <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">{renderFormat}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Plataforma</div>
                    <div className="mt-2 font-semibold">{platform}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Vídeo</div>
                    <div className="mt-2 font-semibold truncate">{sourceUrl || "Sem link"}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Clipes</div>
                    <div className="mt-2 font-semibold">{clips.length}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</div>
                    <div className="mt-2 font-semibold">Aguardando credenciais do YouTube</div>
                  </div>
                </div>
                {!sourceUrl.trim() && (
                  <p className="mt-4 text-sm text-destructive">
                    Para renderizar localmente, o job precisa de um link de vídeo válido.
                  </p>
                )}
              </div>
            )}

            {videoId && playing && (() => {
              const vertical = platform.includes("9:16") || platform.includes("Shorts");
              return (
              <div id="player" className="mb-8 bg-surface border border-primary/40 rounded-2xl p-4 sticky top-20 z-40 shadow-2xl shadow-primary/10">
                <div className="flex justify-between items-center mb-3">
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
                      ▶ {vertical ? "Preview 9:16" : "Preview 16:9"} · {Math.max(1, playing.end - playing.start)}s · {platform}
                    </div>
                    <div className="font-display text-sm truncate">{playing.title}</div>
                  </div>
                  <button
                    onClick={() => setPlaying(null)}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary px-3 py-1 border border-border rounded transition-colors"
                  >
                    Fechar
                  </button>
                </div>
                {vertical ? (
                  <div className="flex justify-center bg-black/60 rounded-lg py-4">
                    <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-border" style={{ width: 280, height: 498 }}>
                      <iframe
                        key={`${playing.start}-${playing.end}-v`}
                        src={`https://www.youtube.com/embed/${videoId}?start=${playing.start}&end=${playing.end}&autoplay=1&rel=0&modestbranding=1&controls=0`}
                        title={playing.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ width: 886, height: 498 }}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                        <div className="font-display text-white text-sm uppercase tracking-tight line-clamp-2 drop-shadow-lg">
                          {playing.title}
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-primary text-primary-foreground rounded font-mono text-[9px] uppercase tracking-widest">
                        9:16
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                    <iframe
                      key={`${playing.start}-${playing.end}`}
                      src={`https://www.youtube.com/embed/${videoId}?start=${playing.start}&end=${playing.end}&autoplay=1&rel=0&modestbranding=1`}
                      title={playing.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full rounded-lg border border-border"
                    />
                  </div>
                )}
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                  {vertical ? "Simulação do crop 9:16 · Renderize no CapCut com os timestamps" : "O player pausa automaticamente no fim do clipe"} · {playing.start}s → {playing.end}s
                </p>
              </div>
              );
            })()}



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
                  <ClipCard
                    key={idx}
                    clip={clip}
                    index={idx}
                    onPlay={
                      videoId
                        ? (c) => {
                            setPlaying({
                              start: parseTimestampToSeconds(c.startTimestamp),
                              end: parseTimestampToSeconds(c.endTimestamp),
                              title: c.title,
                            });
                            setTimeout(() => {
                              document.getElementById("player")?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }, 50);
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {jobs.length > 0 && (
          <section className="mt-14 rounded-3xl border border-border bg-surface p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Fila de renderização</p>
                <h2 className="font-display text-3xl mt-2">Jobs locais</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                  O status é atualizado pelo worker local. Atualize a lista sempre que quiser ver o progresso.
                </p>
              </div>
              <button
                onClick={() => fetchJobs()}
                className="font-mono text-[10px] uppercase tracking-widest border border-primary/40 text-primary px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
              >
                Atualizar status
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-3xl border border-border bg-background p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Job {job.id.slice(0, 8)} · {new Date(job.created_at).toLocaleString("pt-BR")}
                      </div>
                      <div className="mt-2 font-semibold text-lg truncate">{job.video_title || job.video_url}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{job.platform} · {job.render_format}</div>
                    </div>
                    <div className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                      style={{
                        backgroundColor:
                          job.status === "done"
                            ? "rgba(16, 185, 129, 0.12)"
                            : job.status === "failed"
                            ? "rgba(239, 68, 68, 0.12)"
                            : "rgba(59, 130, 246, 0.12)",
                        color:
                          job.status === "done"
                            ? "#10b981"
                            : job.status === "failed"
                            ? "#ef4444"
                            : "#3b82f6",
                      }}
                    >
                      {job.status.replace("_", " ")}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saída</div>
                      <div className="mt-1 text-sm text-foreground break-words">{job.output_path || "Aguardando worker"}</div>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Publicação</div>
                      <button
                        type="button"
                        disabled={job.status !== "done"}
                        className="font-display text-xs uppercase tracking-widest bg-primary text-primary-foreground px-4 py-2 rounded-lg transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Inserir no YouTube
                      </button>
                      <span className="text-[10px] text-muted-foreground">Aguardando credenciais do canal.</span>
                    </div>
                    {job.error_message && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-destructive">Erro</div>
                        <div className="mt-1 text-sm text-destructive">{job.error_message}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
