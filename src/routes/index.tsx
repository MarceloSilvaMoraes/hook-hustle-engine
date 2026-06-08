import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { analyzeTranscript, type ViralClip } from "@/lib/clips.functions";
import { fetchTranscript } from "@/lib/transcript.functions";
import { createRenderJob, listRenderJobs, clearOldRenderJobs, retryRenderJob, deleteRenderJob, type RenderJob } from "@/lib/render-jobs.functions";
import type { RenderJobClip } from "@/lib/render-jobs.types";

import { ClipCard } from "@/components/ClipCard";
import { Toaster } from "@/components/ui/sonner";
import { getGoogleClientId, resolveOAuthRedirectUri } from "@/lib/youtube-auth.functions";
import { exchangeYoutubeCode } from "@/lib/youtube-auth.server";
import { publishJobToYoutube } from "@/lib/youtube-publish.functions";
import { publishJobToTiktok } from "@/lib/tiktok-publish.functions";


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

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup" | "redirect";
            redirect_uri: string;
            prompt?: string;
            access_type?: "online" | "offline";
            include_granted_scopes?: boolean;
            select_account?: boolean;
            callback?: (response: { code?: string; error?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

function extractYoutubeLinks(outputPath: string | null): string[] {
  if (!outputPath) return [];
  const lower = outputPath.toLowerCase();
  const marker = "youtube:";
  const idx = lower.indexOf(marker);
  if (idx === -1) {
    return outputPath
      .split(" | ")
      .map((s) => s.trim())
      .filter((s) => s.includes("youtube.com/watch") || s.includes("youtu.be/"));
  }
  const section = outputPath.slice(idx + marker.length);
  return section
    .split(" | ")
    .map((s) => s.trim())
    .filter((s) => s.includes("youtube.com/watch") || s.includes("youtu.be/"));
}

function extractTikTokPublishInfo(outputPath: string | null): string | null {
  if (!outputPath) return null;
  const marker = "TikTok:";
  const idx = outputPath.indexOf(marker);
  if (idx === -1) return null;
  return outputPath.slice(idx + marker.length).trim();
}


interface YoutubeProfile {
  name: string;
  refreshToken: string;
  connectedAt: string;
  defaultHashtags?: string;
  defaultTags?: string;
  privacyStatus?: "public" | "private" | "unlisted";
}

interface TikTokProfile {
  name: string;
  sessionCookie: string; // sessionid cookie value from TikTok
  addedAt: string;
  defaultHashtags?: string;
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
  const [gsiReady, setGsiReady] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [oauthStatus, setOauthStatus] = useState("Aguardando login do Google...");
  const [youtubeRefreshToken, setYoutubeRefreshToken] = useState("");
  const [playing, setPlaying] = useState<{ start: number; end: number; title: string } | null>(null);

  const [youtubeProfiles, setYoutubeProfiles] = useState<YoutubeProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [newProfileName, setNewProfileName] = useState<string>("");
  const [editingProfileName, setEditingProfileName] = useState<string | null>(null);
  const [editingHashtags, setEditingHashtags] = useState<string>("");
  const [editingTags, setEditingTags] = useState<string>("");
  const [editingPrivacy, setEditingPrivacy] = useState<"public" | "private" | "unlisted">("private");

  // TikTok state
  const [tiktokProfiles, setTiktokProfiles] = useState<TikTokProfile[]>([]);
  const [selectedTikTokProfile, setSelectedTikTokProfile] = useState<string>("");
  const [newTikTokProfileName, setNewTikTokProfileName] = useState<string>("");
  const [newTikTokSessionCookie, setNewTikTokSessionCookie] = useState<string>("");
  const [newTikTokHashtags, setNewTikTokHashtags] = useState<string>("#shorts,#tiktok,#viral");
  const [channelTab, setChannelTab] = useState<"youtube" | "tiktok">("youtube");


  const analyze = useServerFn(analyzeTranscript);
  const exchange = useServerFn(exchangeYoutubeCode);
  const fetchT = useServerFn(fetchTranscript);
  const createJob = useServerFn(createRenderJob);
  const listJobs = useServerFn(listRenderJobs);
  const publish = useServerFn(publishJobToYoutube);
  const publishTiktok = useServerFn(publishJobToTiktok);
  const clearJobs = useServerFn(clearOldRenderJobs);

  const clearOldJobsMutation = useMutation({
    mutationFn: async () => {
      const result = await clearJobs();
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success("Histórico de jobs limpo.");
      void fetchJobs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

      let jobInstructions = `Renderize localmente em ${renderFormat} a partir do vídeo ${sourceUrl.trim()}`;
      if (selectedProfile) {
        const profile = youtubeProfiles.find(p => p.name === selectedProfile);
        if (profile && profile.refreshToken) {
          jobInstructions = JSON.stringify({
            youtube_refresh_token: profile.refreshToken,
            privacy_status: profile.privacyStatus || "private",
            default_hashtags: profile.defaultHashtags || "",
            default_tags: profile.defaultTags || "",
            target_profile_name: profile.name,
          });
        }
      } else if (selectedTikTokProfile) {
        const profile = tiktokProfiles.find(p => p.name === selectedTikTokProfile);
        if (profile) {
          jobInstructions = JSON.stringify({
            target_platform: "tiktok",
            tiktok_session_cookie: profile.sessionCookie || "",
            tiktok_profile_name: profile.name,
            default_hashtags: profile.defaultHashtags || "",
          });
        }
      }

      const result = await createJob({
        data: {
          videoUrl: sourceUrl.trim(),
          videoTitle,
          platform,
          renderFormat,
          clipItems: clips,
          instructions: jobInstructions,
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

  const publishMutation = useMutation({
    mutationFn: async ({ jobId, profile }: { jobId: string; profile?: YoutubeProfile }) => {
      let youtubeConfig;
      if (profile && profile.refreshToken) {
        youtubeConfig = {
          youtube_refresh_token: profile.refreshToken,
          privacy_status: profile.privacyStatus || "private",
          default_hashtags: profile.defaultHashtags || "",
          default_tags: profile.defaultTags || "",
        };
      }
      const result = await publish({ data: { jobId, youtubeConfig } });
      if (!result.ok) {
        throw new Error(result.error || "Falha ao publicar no YouTube.");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Solicitação de publicação enviada ao worker local.");
      void fetchJobs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishTiktokMutation = useMutation({
    mutationFn: async ({ jobId, profile }: { jobId: string; profile: TikTokProfile }) => {
      const tiktokConfig = {
        target_platform: "tiktok" as const,
        tiktok_session_cookie: profile.sessionCookie || "",
        tiktok_profile_name: profile.name,
        default_hashtags: profile.defaultHashtags || "",
      };
      const result = await publishTiktok({ data: { jobId, tiktokConfig } });
      if (!result.ok) {
        throw new Error(result.error || "Falha ao publicar no TikTok.");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Solicitação de publicação no TikTok enviada ao worker local.");
      void fetchJobs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const retryJob = useServerFn(retryRenderJob);
  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const result = await retryJob({ data: { jobId } });
      if (!result.ok) {
        throw new Error(result.error || "Falha ao reiniciar o job.");
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void fetchJobs();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delJob = useServerFn(deleteRenderJob);
  const deleteMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const result = await delJob({ data: { jobId } });
      if (!result.ok) {
        throw new Error(result.error || "Falha ao excluir o job.");
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void fetchJobs();
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
    if (typeof window === "undefined") return;

    const syncYoutubeAuth = () => {
      const savedToken = window.localStorage.getItem("hook_hustle_youtube_refresh_token") || "";
      if (savedToken) {
        setYoutubeRefreshToken(savedToken);
        setOauthStatus("Autenticação concluída. Token do YouTube disponível para o worker local.");
      } else {
        setYoutubeRefreshToken("");
        setOauthStatus("Aguardando login do Google...");
      }

      const savedProfiles = window.localStorage.getItem("hook_hustle_youtube_profiles") || "";
      if (savedProfiles) {
        try {
          const parsed = JSON.parse(savedProfiles);
          if (Array.isArray(parsed)) {
            setYoutubeProfiles(parsed);
          }
        } catch {}
      } else {
        const initial = [
          { name: "Humor", refreshToken: "", connectedAt: "", defaultHashtags: "#humor,#comedia,#shorts", defaultTags: "humor,comedia,engraçado", privacyStatus: "private" as const },
          { name: "Futebol", refreshToken: "", connectedAt: "", defaultHashtags: "#futebol,#gols,#shorts", defaultTags: "futebol,gols,esporte", privacyStatus: "private" as const },
          { name: "Tecnologia", refreshToken: "", connectedAt: "", defaultHashtags: "#tecnologia,#curiosidades,#shorts", defaultTags: "tecnologia,curiosidades,atualidades", privacyStatus: "private" as const }
        ];
        window.localStorage.setItem("hook_hustle_youtube_profiles", JSON.stringify(initial));
        setYoutubeProfiles(initial);
      }

      // Load TikTok profiles
      const savedTikTok = window.localStorage.getItem("hook_hustle_tiktok_profiles") || "";
      if (savedTikTok) {
        try {
          const parsed = JSON.parse(savedTikTok);
          if (Array.isArray(parsed)) setTiktokProfiles(parsed);
        } catch {}
      } else {
        const ttInitial: TikTokProfile[] = [
          { name: "Humor TT", sessionCookie: "", addedAt: "", defaultHashtags: "#humor,#comedia,#fyp" },
          { name: "Futebol TT", sessionCookie: "", addedAt: "", defaultHashtags: "#futebol,#gols,#fyp" },
          { name: "Tecnologia TT", sessionCookie: "", addedAt: "", defaultHashtags: "#tecnologia,#tech,#fyp" },
        ];
        window.localStorage.setItem("hook_hustle_tiktok_profiles", JSON.stringify(ttInitial));
        setTiktokProfiles(ttInitial);
      }
    };

    syncYoutubeAuth();
    window.addEventListener("storage", syncYoutubeAuth);
    return () => {
      window.removeEventListener("storage", syncYoutubeAuth);
    };
  }, []);


  const hasActiveJob = jobs.some((j) => ["pending", "in_progress", "published_requested"].includes(j.status));

  useEffect(() => {
    if (typeof window === "undefined") return;

    void fetchJobs();
    const interval = hasActiveJob ? 2500 : 20000;
    const timer = window.setInterval(() => {
      void fetchJobs();
    }, interval);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasActiveJob]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setRedirectUri(resolveOAuthRedirectUri(window.location.origin));

    const existing = document.querySelector("script[src='https://accounts.google.com/gsi/client']");
    if (existing) {
      setGsiReady(Boolean(window.google?.accounts?.oauth2?.initCodeClient));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiReady(Boolean(window.google?.accounts?.oauth2?.initCodeClient));
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  const canAnalyze = transcript.trim().length >= 50 && !mutation.isPending;
  const canCreateJob = clips.length > 0 && sourceUrl.trim().length > 0 && !renderMutation.isPending;
  // O worker usa as credenciais do .env local — o botão deve estar sempre habilitado para jobs prontos
  const canPublishToYoutube = jobs.some((job) => job.status === "done" || job.status === "completed");
  const youtubeAuthLabel = youtubeRefreshToken ? "Autenticação concluída" : "Worker configurado via .env";
  const youtubeAuthHint = youtubeRefreshToken
    ? "Token do YouTube disponível. O worker local pode publicar quando o job terminar."
    : "O worker local usará as credenciais do arquivo .env para publicar no YouTube.";


  const handleConnectYoutube = () => {
    const clientId = getGoogleClientId();
    const effectiveRedirectUri = resolveOAuthRedirectUri(typeof window !== "undefined" ? window.location.origin : undefined);

    if (youtubeRefreshToken) {
      setOauthStatus("Você já está autenticado com o Google. O token salvo será usado pelo worker local.");
      return;
    }

    if (!clientId) {
      toast.error("Configure VITE_GOOGLE_CLIENT_ID no ambiente para abrir o login do Google.");
      return;
    }

    if (!effectiveRedirectUri) {
      toast.error("Não foi possível determinar a URI de redirecionamento. Recarregue a página e tente novamente.");
      return;
    }

    if (!gsiReady || !window.google?.accounts?.oauth2?.initCodeClient) {
      toast.error("Aguarde o carregamento do Google Sign-In e tente novamente.");
      return;
    }

    setOauthStatus("Redirecionando para o Google...");

    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: "openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl",
      ux_mode: "redirect",
      redirect_uri: effectiveRedirectUri,
      prompt: "consent select_account",
      access_type: "offline",
      include_granted_scopes: true,
    });

    codeClient.requestCode();
  };

  const handleConnectProfile = (profileName: string) => {
    const clientId = getGoogleClientId();
    const effectiveRedirectUri = resolveOAuthRedirectUri(typeof window !== "undefined" ? window.location.origin : undefined);

    if (!clientId) {
      toast.error("Configure VITE_GOOGLE_CLIENT_ID no ambiente para abrir o login do Google.");
      return;
    }

    if (!effectiveRedirectUri) {
      toast.error("Não foi possível determinar a URI de redirecionamento. Recarregue a página.");
      return;
    }

    if (!gsiReady || !window.google?.accounts?.oauth2?.initCodeClient) {
      toast.error("Aguarde o carregamento do Google Sign-In e tente novamente.");
      return;
    }

    window.localStorage.setItem("pending_channel_profile_name", profileName);
    toast.success("Redirecionando para o Google...");

    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: "openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl",
      ux_mode: "redirect",
      redirect_uri: effectiveRedirectUri,
      prompt: "consent select_account",
      access_type: "offline",
      include_granted_scopes: true,
    });

    codeClient.requestCode();
  };

  const handleAddProfile = () => {
    if (!newProfileName.trim()) {
      toast.error("Insira o nome do canal.");
      return;
    }
    const name = newProfileName.trim();
    if (youtubeProfiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Já existe um canal com este nome.");
      return;
    }

    const updated = [
      ...youtubeProfiles,
      {
        name,
        refreshToken: "",
        connectedAt: "",
        defaultHashtags: "#shorts,#viral",
        defaultTags: "cortes,shorts",
        privacyStatus: "private" as const
      }
    ];
    setYoutubeProfiles(updated);
    window.localStorage.setItem("hook_hustle_youtube_profiles", JSON.stringify(updated));
    setNewProfileName("");
    toast.success(`Canal "${name}" adicionado. Agora conecte sua conta do Google.`);
  };

  const handleRemoveProfile = (profileName: string) => {
    if (confirm(`Deseja realmente remover o canal "${profileName}"?`)) {
      const updated = youtubeProfiles.filter(p => p.name !== profileName);
      setYoutubeProfiles(updated);
      window.localStorage.setItem("hook_hustle_youtube_profiles", JSON.stringify(updated));
      if (selectedProfile === profileName) {
        setSelectedProfile("");
      }
      toast.success(`Canal "${profileName}" removido.`);
    }
  };

  const handleSaveProfileSettings = (profileName: string) => {
    const updated = youtubeProfiles.map(p => {
      if (p.name === profileName) {
        return {
          ...p,
          defaultHashtags: editingHashtags,
          defaultTags: editingTags,
          privacyStatus: editingPrivacy,
        };
      }
      return p;
    });
    setYoutubeProfiles(updated);
    window.localStorage.setItem("hook_hustle_youtube_profiles", JSON.stringify(updated));
    setEditingProfileName(null);
    toast.success("Configurações do canal salvas!");
  };

  const handleStartEditProfile = (profile: YoutubeProfile) => {
    setEditingProfileName(profile.name);
    setEditingHashtags(profile.defaultHashtags || "");
    setEditingTags(profile.defaultTags || "");
    setEditingPrivacy(profile.privacyStatus || "private");
  };

  // ── TikTok handlers ──
  const handleAddTikTokProfile = () => {
    if (!newTikTokProfileName.trim()) {
      toast.error("Insira o nome do perfil TikTok.");
      return;
    }
    const name = newTikTokProfileName.trim();
    if (tiktokProfiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Já existe um perfil TikTok com este nome.");
      return;
    }
    const updated = [
      ...tiktokProfiles,
      {
        name,
        sessionCookie: newTikTokSessionCookie.trim(),
        addedAt: new Date().toISOString(),
        defaultHashtags: newTikTokHashtags.trim() || "#shorts,#tiktok,#viral",
      }
    ];
    setTiktokProfiles(updated);
    window.localStorage.setItem("hook_hustle_tiktok_profiles", JSON.stringify(updated));
    setNewTikTokProfileName("");
    setNewTikTokSessionCookie("");
    setNewTikTokHashtags("#shorts,#tiktok,#viral");
    toast.success(`Perfil TikTok "${name}" adicionado!`);
  };

  const handleRemoveTikTokProfile = (profileName: string) => {
    if (confirm(`Remover perfil TikTok "${profileName}"?`)) {
      const updated = tiktokProfiles.filter(p => p.name !== profileName);
      setTiktokProfiles(updated);
      window.localStorage.setItem("hook_hustle_tiktok_profiles", JSON.stringify(updated));
      if (selectedTikTokProfile === profileName) setSelectedTikTokProfile("");
      toast.success(`Perfil TikTok "${profileName}" removido.`);
    }
  };

  /**
   * TikTok semi-automatic upload:
   * Opens TikTok Creator Studio upload page — no API required, no ToS risk.
   * The worker can also be configured with sessionid cookie to automate this.
   */
  const handlePublishTikTok = (jobId: string, profile: TikTokProfile) => {
    // Find the job to get its output path
    const job = jobs.find(j => j.id === jobId);
    const outputPath = job?.output_path || "";
    const localFiles = outputPath
      .split(" | ")
      .filter(s => s.trim() && !s.includes("youtube.com") && !s.includes("Progress:"))
      .map(s => s.trim());

    // Build instructions payload for the worker
    const instructions = JSON.stringify({
      target_platform: "tiktok",
      tiktok_session_cookie: profile.sessionCookie || "",
      tiktok_profile_name: profile.name,
      default_hashtags: profile.defaultHashtags || "#shorts,#tiktok,#viral",
    });

    // Open TikTok Creator Studio — the user logs in and uploads manually (safe approach)
    window.open("https://www.tiktok.com/creator-center/upload", "_blank", "noopener,noreferrer");

    if (localFiles.length > 0) {
      toast.success(
        `Creator Studio aberto! Seus arquivos estão em:\n${localFiles.slice(0, 3).join("\n")}`,
        { duration: 8000 }
      );
    } else {
      toast.info("Creator Studio do TikTok aberto. Faça upload dos clipes renderizados.");
    }

    // Log instructions for future automated worker support
    console.info("[TikTok] instructions payload:", instructions, jobId);
  };

  const getJobStatusLabel = (status: RenderJob["status"]) => {
    switch (status) {
      case "pending":
        return "na fila";
      case "in_progress":
        return "processando";
      case "published_requested":
        return "aguardando publicação";
      case "done":
        return "renderizado";
      case "completed":
        return "publicado";
      case "failed":
        return "falhou";
      default:
        return String(status);
    }
  };

  const isJobReadyToPublish = (status: RenderJob["status"]) => status === "done" || status === "completed";
  const isJobSuccess = (status: RenderJob["status"]) => status === "done" || status === "completed";
  const isJobPublishing = (status: RenderJob["status"]) => status === "published_requested";

  const activeJob = jobs.find((j) => j.status === "in_progress");
  const hasPending = jobs.some((j) => j.status === "pending" || j.status === "published_requested");
  const workerStatus = activeJob
    ? { label: "Worker Processando... ⚡", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", dotBg: "bg-amber-400", glow: "animate-ping bg-amber-300" }
    : hasPending
    ? { label: "Aguardando Fila ⏳", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", dotBg: "bg-blue-400", glow: "animate-pulse bg-blue-300" }
    : { label: "Worker Ativo & Pronto 🟢", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dotBg: "bg-emerald-400", glow: "bg-emerald-300" };

  const processingJob = activeJob || jobs.find((j) => j.status === "pending" || j.status === "published_requested");
  const historyJobs = jobs.filter((j) => !["in_progress", "pending", "published_requested"].includes(j.status));

  // Extract all YouTube published clips from all jobs that have YouTube links
  const youtubePublishedClips = jobs.flatMap((job) => {
    const links = extractYoutubeLinks(job.output_path);
    const clipItems = (job.clip_items as RenderJobClip[]) || [];
    return links.map((url, i) => {
      const videoIdMatch = url.match(/[?&]v=([^&]+)/);
      return {
        url,
        videoId: videoIdMatch ? videoIdMatch[1] : "",
        title: clipItems[i]?.title || `Clipe ${i + 1}`,
        jobTitle: job.video_title || job.video_url,
        publishedAt: job.completed_at || job.created_at,
        jobId: job.id,
      };
    });
  });

  // Extract all TikTok published clips from all jobs that have TikTok upload markers
  const tiktokPublishedClips = jobs.flatMap((job) => {
    const isTikTokPub = extractTikTokPublishInfo(job.output_path);
    if (!isTikTokPub) return [];
    
    // Extract local file paths (before YouTube links or progress markers)
    const files = (job.output_path || "").split(" | ").filter(s => s.trim() && !s.includes("youtube.com") && !s.includes("Progress:") && !s.includes("TikTok:"));
    const clipItems = (job.clip_items as RenderJobClip[]) || [];
    
    return files.map((file, i) => {
      return {
        file,
        title: clipItems[i]?.title || `Clipe ${i + 1}`,
        jobTitle: job.video_title || job.video_url,
        publishedAt: job.completed_at || job.created_at,
        jobId: job.id,
        profileName: isTikTokPub,
      };
    });
  });



  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary/30 selection:text-white" style={{background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,0.12), transparent), #09090f"}}>
      <Toaster theme="dark" richColors />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.07] px-6 h-16 flex items-center justify-between" style={{background: "rgba(9,9,15,0.85)", backdropFilter: "blur(16px)"}}>
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg flex items-center justify-center" style={{background: "linear-gradient(135deg, #7c3aed, #5b21b6)"}}>
            <svg viewBox="0 0 24 24" className="size-4 fill-white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <span className="font-display text-2xl tracking-tighter uppercase" style={{background: "linear-gradient(135deg, #a78bfa, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"}}>
            ViralForce.AI
          </span>
        </div>
        <div className="hidden md:flex gap-3 items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-widest" style={{background: "rgba(204,0,0,0.15)", border: "1px solid rgba(204,0,0,0.3)", color: "#ff6b6b"}}>
            <svg viewBox="0 0 24 24" className="size-2.5 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            YouTube
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-widest" style={{background: "rgba(254,44,85,0.12)", border: "1px solid rgba(254,44,85,0.28)", color: "#fe2c55"}}>
            <svg viewBox="0 0 24 24" className="size-2.5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
            TikTok
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Engine v4.2
          </span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <header className="mb-14 max-w-3xl animate-entry">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest mb-4" style={{background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa"}}>
            <span className="size-1.5 rounded-full bg-violet-400 animate-pulse" />
            AI-Powered · YouTube · TikTok · Reels
          </div>
          <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-[0.92] mb-5">
            Extraia{" "}
            <span style={{background: "linear-gradient(135deg, #a78bfa, #7c3aed, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"}}>
              virais
            </span>
            <br />
            do seu conteúdo longo
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
            Cole a transcrição. A IA identifica hooks, cliffhangers e picos de
            retenção — devolve 5 clipes prontos pra <span className="text-red-400 font-semibold">YouTube</span>, <span className="text-pink-400 font-semibold">TikTok</span> e Reels.
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
                className="flex-1 input-base"
              />
              <button
                onClick={() => fetchMutation.mutate()}
                disabled={!sourceUrl.trim() || fetchMutation.isPending}
                className="btn btn-ghost shrink-0 px-5 py-3 text-[11px]"
              >
                {fetchMutation.isPending ? "Buscando..." : "Importar"}
              </button>
            </div>
            {/* ── Multi-Platform Channel Manager ── */}
            <div className="mb-6 rounded-2xl p-5" style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)"}}>
              {/* Tab header */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex rounded-xl overflow-hidden border border-white/10" style={{background: "rgba(0,0,0,0.3)"}}>
                  <button
                    type="button"
                    onClick={() => setChannelTab("youtube")}
                    className={`flex items-center gap-2 px-4 py-2 text-[11px] font-mono font-semibold uppercase tracking-widest transition-all cursor-pointer ${channelTab === "youtube" ? "text-white" : "text-muted-foreground hover:text-red-400"}`}
                    style={channelTab === "youtube" ? {background: "rgba(204,0,0,0.85)"} : {}}
                  >
                    <svg viewBox="0 0 24 24" className="size-3 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    YouTube ({youtubeProfiles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelTab("tiktok")}
                    className={`flex items-center gap-2 px-4 py-2 text-[11px] font-mono font-semibold uppercase tracking-widest transition-all cursor-pointer ${channelTab === "tiktok" ? "text-white" : "text-muted-foreground hover:text-pink-400"}`}
                    style={channelTab === "tiktok" ? {background: "linear-gradient(135deg, #fe2c55, #010101)"} : {}}
                  >
                    <svg viewBox="0 0 24 24" className="size-3 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                    TikTok ({tiktokProfiles.length})
                  </button>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {channelTab === "youtube" ? "Autenticação OAuth2 via Google" : "Upload semi-automático via Creator Studio"}
                </p>
              </div>

              {/* ── YouTube Tab ── */}
              {channelTab === "youtube" && (
                <div>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddProfile()}
                      placeholder="Nome do canal (ex: Canal Futebol)"
                      className="flex-1 input-base"
                    />
                    <button type="button" onClick={handleAddProfile} className="btn btn-primary shrink-0">
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {youtubeProfiles.map((profile) => {
                      const isEditing = editingProfileName === profile.name;
                      return (
                        <div key={profile.name} className="p-3 rounded-xl" style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)"}}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="size-2 rounded-full" style={{backgroundColor: profile.refreshToken ? "#10b981" : "#6b7280"}} />
                              <span className="text-sm font-semibold">{profile.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {profile.refreshToken ? `Conectado · ${profile.privacyStatus || "private"}` : "Não conectado"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button type="button" onClick={() => handleConnectProfile(profile.name)}
                                className={`btn ${profile.refreshToken ? "btn-success" : "btn-youtube"}`}>
                                {profile.refreshToken ? "Reconectar" : "Conectar Google"}
                              </button>
                              <button type="button" onClick={() => isEditing ? handleSaveProfileSettings(profile.name) : handleStartEditProfile(profile)}
                                className="btn btn-ghost">
                                {isEditing ? "Salvar" : "Config"}
                              </button>
                              <button type="button" onClick={() => handleRemoveProfile(profile.name)} className="btn btn-danger">
                                ✕
                              </button>
                            </div>
                          </div>
                          {isEditing && (
                            <div className="mt-3 pt-3 border-t border-white/[0.06] grid gap-2 grid-cols-1 sm:grid-cols-3">
                              <div>
                                <label className="font-mono text-[9px] text-muted-foreground uppercase block mb-1">Hashtags</label>
                                <input type="text" value={editingHashtags} onChange={(e) => setEditingHashtags(e.target.value)} placeholder="#shorts,#viral" className="input-base text-[11px] py-1.5"/>
                              </div>
                              <div>
                                <label className="font-mono text-[9px] text-muted-foreground uppercase block mb-1">Tags SEO</label>
                                <input type="text" value={editingTags} onChange={(e) => setEditingTags(e.target.value)} placeholder="tag1,tag2" className="input-base text-[11px] py-1.5"/>
                              </div>
                              <div>
                                <label className="font-mono text-[9px] text-muted-foreground uppercase block mb-1">Privacidade</label>
                                <select value={editingPrivacy} onChange={(e) => setEditingPrivacy(e.target.value as any)}
                                  className="input-base text-[11px] py-1.5 cursor-pointer">
                                  <option value="private">Privado</option>
                                  <option value="public">Público</option>
                                  <option value="unlisted">Não Listado</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[10px] font-mono text-muted-foreground/50">
                    Redirect URI: <span className="text-violet-400">{redirectUri || "Carregando..."}</span>
                  </p>
                </div>
              )}

              {/* ── TikTok Tab ── */}
              {channelTab === "tiktok" && (
                <div>
                  <div className="mb-4 p-3 rounded-xl text-xs font-mono" style={{background: "rgba(254,44,85,0.07)", border: "1px solid rgba(254,44,85,0.18)"}}>
                    <div className="flex items-start gap-2">
                      <svg viewBox="0 0 24 24" className="size-4 fill-pink-400 shrink-0 mt-0.5"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                      <div>
                        <p className="text-pink-400 font-semibold mb-1">Upload Semi-Automático (Seguro)</p>
                        <p className="text-muted-foreground leading-relaxed">
                          O TikTok não possui API de upload pública. Ao clicar em <strong className="text-foreground">"Subir TikTok"</strong> em um job pronto,
                          o <strong className="text-foreground">Creator Studio</strong> abre automaticamente no browser — você só precisa fazer o upload.
                          Você pode ter <strong className="text-foreground">múltiplos perfis</strong> e logar em contas diferentes simultaneamente usando perfis do Chrome/Edge separados.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Add TikTok profile */}
                  <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" value={newTikTokProfileName} onChange={(e) => setNewTikTokProfileName(e.target.value)}
                        placeholder="Nome do perfil (ex: Humor TT)" className="input-base"/>
                      <input type="text" value={newTikTokHashtags} onChange={(e) => setNewTikTokHashtags(e.target.value)}
                        placeholder="#shorts,#tiktok,#viral" className="input-base"/>
                    </div>
                    <button type="button" onClick={handleAddTikTokProfile} className="btn btn-tiktok w-full justify-center py-2.5">
                      <svg viewBox="0 0 24 24" className="size-3.5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                      Adicionar Perfil TikTok
                    </button>
                  </div>

                  <div className="space-y-2">
                    {tiktokProfiles.map((profile) => (
                      <div key={profile.name} className="p-3 rounded-xl flex items-center justify-between gap-2 flex-wrap" style={{background: "rgba(254,44,85,0.05)", border: "1px solid rgba(254,44,85,0.14)"}}>
                        <div className="min-w-0 flex items-center gap-2">
                          <svg viewBox="0 0 24 24" className="size-3.5 fill-pink-500 shrink-0"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                          <span className="text-sm font-semibold">{profile.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{profile.defaultHashtags}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button type="button"
                            onClick={() => { window.open("https://www.tiktok.com/login", "_blank"); toast.info(`Faça login no TikTok como "${profile.name}" no browser que abriu.`); }}
                            className="btn btn-tiktok">
                            Abrir TikTok
                          </button>
                          <button type="button" onClick={() => handleRemoveTikTokProfile(profile.name)} className="btn btn-danger">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>


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

            <div className="p-6 rounded-2xl" style={{background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)"}}>
              <h3 className="font-display text-xl uppercase mb-2">Pro Engine v4.2</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Analisa hooks, picos de retenção e justificativa viral com base em
                gatilhos comprovados de TikTok/Reels.
              </p>
              <button
                onClick={() => mutation.mutate()}
                disabled={!canAnalyze}
                className="w-full font-display text-base py-4 rounded-xl transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: canAnalyze ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "rgba(124,58,237,0.3)",
                  color: "#fff",
                  boxShadow: canAnalyze ? "0 12px 32px -8px rgba(124,58,237,0.7)" : "none",
                  border: "1px solid rgba(124,58,237,0.4)",
                }}
              >
                {mutation.isPending ? "⚡ ANALISANDO..." : "⚡ ANALISAR CONTEÚDO"}
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
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => exportInstructions(clips, videoTitle, videoId, platform)}
                    className="btn btn-ghost"
                  >
                    ↓ Exportar (.txt)
                  </button>

                  <button
                    type="button"
                    onClick={() => renderMutation.mutate()}
                    disabled={!canCreateJob || renderMutation.isPending}
                    className="btn btn-primary"
                  >
                    {renderMutation.isPending ? "Criando job..." : "⚡ Renderizar no PC"}
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
                      O worker local corta o vídeo e publica no YouTube. Se faltar alguma credencial, o erro aparece abaixo no job.
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
                    <div className="mt-2 font-semibold">{youtubeAuthLabel}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{youtubeAuthHint}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="font-display text-xs uppercase tracking-widest text-muted-foreground block mb-1">
                      Canal de Destino (YouTube)
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Os clipes serão renderizados localmente e enviados automaticamente para o canal selecionado.
                    </p>
                  </div>
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className="bg-background border border-border rounded-xl px-4 py-2.5 font-mono text-xs text-foreground min-w-[240px] outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">Apenas local (Sem upload automático)</option>
                    {youtubeProfiles.filter(p => p.refreshToken).map((p) => (
                      <option key={p.name} value={p.name}>
                        📺 {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {youtubeRefreshToken && (
                  <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-widest text-primary">YOUTUBE_REFRESH_TOKEN</div>
                        <div className="mt-1 font-mono text-xs break-all text-muted-foreground">{youtubeRefreshToken}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(youtubeRefreshToken);
                          toast.success("Token copiado! Cole no .env do worker.py");
                        }}
                        className="shrink-0 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-primary/20"
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Cole no <code className="font-mono">.env</code> do worker.py como <code className="font-mono">YOUTUBE_REFRESH_TOKEN=...</code> e defina <code className="font-mono">YOUTUBE_AUTO_PUBLISH=true</code>.
                    </p>
                  </div>
                )}
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

        <section className="mt-14 rounded-3xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Fila de renderização</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <h2 className="font-display text-3xl">Jobs locais</h2>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-medium ${workerStatus.color}`}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={`${workerStatus.glow} absolute inline-flex h-full w-full rounded-full opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${workerStatus.dotBg}`}></span>
                    </span>
                    {workerStatus.label}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                  O status é atualizado pelo worker local. Atualize a lista sempre que quiser ver o progresso.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  onClick={() => clearOldJobsMutation.mutate()}
                  disabled={clearOldJobsMutation.isPending || !jobs.some(j => ["done", "completed", "failed"].includes(j.status))}
                  className="btn btn-danger"
                >
                  {clearOldJobsMutation.isPending ? "Limpando..." : "Limpar Histórico"}
                </button>
                <button
                  onClick={() => fetchJobs()}
                  className="btn btn-ghost"
                >
                  ↻ Atualizar
                </button>
              </div>
            </div>

            {/* Quick Platform Switcher */}
            {(youtubeProfiles.length > 0 || tiktokProfiles.length > 0) && (
              <div className="mt-5 p-4 rounded-2xl" style={{background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)"}}>
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground shrink-0 mt-1.5">Destino:</span>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {/* No upload */}
                    <button type="button" onClick={() => { setSelectedProfile(""); setSelectedTikTokProfile(""); }}
                      className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full transition-all cursor-pointer ${!selectedProfile && !selectedTikTokProfile ? "bg-white/10 border border-white/25 text-foreground" : "border border-white/10 text-muted-foreground hover:border-white/20"}`}>
                      <span className="size-1.5 rounded-full bg-white/30" />Sem upload
                    </button>

                    {/* YouTube profiles */}
                    {youtubeProfiles.map(p => {
                      const isActive = selectedProfile === p.name;
                      const ok = Boolean(p.refreshToken);
                      return (
                        <button key={`yt-${p.name}`} type="button"
                          onClick={() => { if (!ok) { toast.error(`"${p.name}" não autenticado`); return; } setSelectedProfile(isActive ? "" : p.name); setSelectedTikTokProfile(""); }}
                          className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                            isActive ? "text-white" : ok ? "border border-white/10 text-muted-foreground hover:border-red-500/30 hover:text-red-400" : "border border-white/[0.07] text-white/20 cursor-not-allowed"
                          }`}
                          style={isActive ? {background: "rgba(204,0,0,0.9)", border: "1px solid rgba(204,0,0,0.4)"} : {}}>
                          <svg viewBox="0 0 24 24" className="size-2.5 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          {p.name}
                          {!ok && <span className="text-[8px] opacity-50">✕</span>}
                        </button>
                      );
                    })}

                    {/* TikTok profiles */}
                    {tiktokProfiles.map(p => {
                      const isActive = selectedTikTokProfile === p.name;
                      return (
                        <button key={`tt-${p.name}`} type="button"
                          onClick={() => { setSelectedTikTokProfile(isActive ? "" : p.name); setSelectedProfile(""); }}
                          className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                            isActive ? "text-white" : "border border-pink-500/20 text-pink-400/60 hover:border-pink-500/40 hover:text-pink-400"
                          }`}
                          style={isActive ? {background: "linear-gradient(135deg, #fe2c55, #1a1a1a)", border: "1px solid rgba(254,44,85,0.5)"} : {}}>
                          <svg viewBox="0 0 24 24" className="size-2.5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                          {p.name}
                        </button>
                      );
                    })}

                    {/* Active label */}
                    {(selectedProfile || selectedTikTokProfile) && (
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        Próximo job → {selectedProfile ? `YT: ${selectedProfile}` : `TT: ${selectedTikTokProfile}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Active Job Card */}

            {processingJob && (
              <div className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-[0_8px_32px_0_rgba(120,119,198,0.08)] backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-primary bg-primary/10 rounded-bl-2xl">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Processando
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Job Ativo</span>
                    <h3 className="font-display text-2xl mt-1 text-foreground truncate max-w-xl">
                      {processingJob.video_title || processingJob.video_url}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground font-mono">
                      ID: {processingJob.id} · {processingJob.platform} · {processingJob.render_format}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-left md:text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Deseja realmente reiniciar este job?")) {
                          retryMutation.mutate(processingJob.id);
                        }
                      }}
                      disabled={retryMutation.isPending}
                      className="btn btn-warning"
                    >
                      {retryMutation.isPending ? "Reiniciando..." : "Reiniciar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Deseja realmente excluir este job ativo?")) {
                          deleteMutation.mutate(processingJob.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="btn btn-danger"
                    >
                      {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
                    </button>
                    <span className="inline-flex rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary border border-primary/20">
                      {processingJob.status.replace("_", " ")}
                    </span>
                  </div>

                </div>
                <div className="mt-6">
                  {(() => {
                    const progressMsg = processingJob.output_path?.includes("Progress:")
                      ? processingJob.output_path.split(" | ").find(p => p.includes("Progress:"))?.replace("Progress:", "").trim()
                      : null;
                    const statusMsg = progressMsg ?? (
                      processingJob.status === "in_progress"
                        ? "Baixando, Cortando & Renderizando..."
                        : processingJob.status === "published_requested"
                        ? "Aguardando worker para enviar ao YouTube..."
                        : "Aguardando na fila do worker..."
                    );
                    const isYoutubeUpload = progressMsg?.includes("YouTube") || processingJob.status === "published_requested";
                    return (
                      <>
                        <div className="flex justify-between items-center text-xs font-mono mb-2">
                          <span className="text-muted-foreground">Progresso do Processamento</span>
                          <span className={`animate-pulse font-medium ${isYoutubeUpload ? "text-red-400" : "text-primary"}`}>
                            {isYoutubeUpload ? "⬆ " : "⚙ "}{statusMsg}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface border border-border rounded-full overflow-hidden">
                          <div className={`h-full rounded-full animate-pulse w-full ${isYoutubeUpload ? "bg-red-500" : "bg-primary"}`} />
                        </div>
                        {progressMsg && (
                          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs font-mono text-primary flex items-center gap-2">
                            <span className="animate-spin text-base">⟳</span>
                            <span>{progressMsg}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* YouTube Published Videos Gallery */}
            {youtubePublishedClips.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF0000 0%, #cc0000 100%)" }}>
                      <svg viewBox="0 0 24 24" className="size-4 fill-white" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </div>
                    <div>
                      <h3 className="font-display text-lg tracking-tight">Publicados no YouTube</h3>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{youtubePublishedClips.length} clipe{youtubePublishedClips.length !== 1 ? "s" : ""} enviado{youtubePublishedClips.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {youtubePublishedClips.map((clip, idx) => (
                    <a
                      key={`${clip.jobId}-${idx}`}
                      href={clip.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-2xl overflow-hidden border border-border/60 bg-background/50 hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/10"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-surface overflow-hidden">
                        {clip.videoId ? (
                          <img
                            src={`https://img.youtube.com/vi/${clip.videoId}/mqdefault.jpg`}
                            alt={clip.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-surface">
                            <svg viewBox="0 0 24 24" className="size-10 opacity-20 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                          <div className="size-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                            <svg viewBox="0 0 24 24" className="size-5 fill-white ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                        {/* Index badge */}
                        <div className="absolute top-2 left-2 bg-black/70 rounded-md px-1.5 py-0.5 font-mono text-[9px] text-white uppercase tracking-widest">
                          Clipe {idx + 1}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <div className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-red-400 transition-colors leading-snug">
                          {clip.title}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                          <span className="truncate max-w-[140px]">{clip.jobTitle}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                          {new Date(clip.publishedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* TikTok Published Videos Gallery */}
            {tiktokPublishedClips.length > 0 && (
              <div className="mt-6 border-t border-border/40 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded-lg flex items-center justify-center bg-black border border-pink-500/30">
                      <svg viewBox="0 0 24 24" className="size-4 fill-pink-500"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                    </div>
                    <div>
                      <h3 className="font-display text-lg tracking-tight">Publicados no TikTok</h3>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{tiktokPublishedClips.length} clipe{tiktokPublishedClips.length !== 1 ? "s" : ""} enviado{tiktokPublishedClips.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tiktokPublishedClips.map((clip, idx) => (
                    <div
                      key={`${clip.jobId}-${idx}`}
                      className="group block rounded-2xl overflow-hidden border border-border/60 bg-background/50 hover:border-pink-500/40 hover:bg-pink-500/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-500/10"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-surface overflow-hidden flex items-center justify-center">
                        <div className="size-10 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                          <svg viewBox="0 0 24 24" className="size-5 fill-pink-500"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                        </div>
                        {/* Index badge */}
                        <div className="absolute top-2 left-2 bg-black/70 rounded-md px-1.5 py-0.5 font-mono text-[9px] text-white uppercase tracking-widest">
                          Clipe {idx + 1}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <div className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
                          {clip.title}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span className="truncate max-w-[120px]">{clip.jobTitle}</span>
                          <span className="text-pink-400 font-bold bg-pink-500/5 px-1.5 py-0.5 rounded border border-pink-500/10">{clip.profileName}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                          {new Date(clip.publishedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compact History List */}
            <div className="mt-6 flex flex-col gap-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">Histórico de Jobs</h3>
              {historyJobs.map((job) => {
                const jobYoutubeLinks = extractYoutubeLinks(job.output_path);
                return (
                  <div key={job.id} className="p-4 rounded-2xl border border-border/60 bg-background/50 hover:bg-background/80 hover:border-border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                          Job {job.id.slice(0, 8)}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {new Date(job.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="mt-1 font-semibold text-foreground truncate">{job.video_title || job.video_url}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {job.platform} · {job.render_format} · Out: <span className="text-foreground/80 break-all">{job.output_path || "N/A"}</span>
                      </div>
                      {jobYoutubeLinks.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mr-1">YouTube:</span>
                          {jobYoutubeLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-[11px] font-mono text-red-400 font-semibold transition-colors cursor-pointer"
                            >
                              <svg viewBox="0 0 24 24" className="size-3 fill-current" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                              Clipe {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}

                      {extractTikTokPublishInfo(job.output_path) && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mr-1">TikTok:</span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/25 text-[11px] font-mono text-pink-400 font-semibold">
                            <svg viewBox="0 0 24 24" className="size-2.5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                            {extractTikTokPublishInfo(job.output_path)}
                          </span>
                        </div>
                      )}

                    {job.error_message && (
                      <div className="mt-1.5 text-xs text-destructive/90 font-mono bg-destructive/5 border border-destructive/10 rounded px-2 py-1 flex items-start gap-1">
                        <span className="font-bold shrink-0">Erro:</span>
                        <span className="break-all">{job.error_message}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap md:flex-nowrap">
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border"
                      style={{
                        backgroundColor:
                          isJobSuccess(job.status)
                            ? "rgba(16, 185, 129, 0.12)"
                            : isJobPublishing(job.status)
                            ? "rgba(245, 158, 11, 0.14)"
                            : job.status === "failed"
                            ? "rgba(239, 68, 68, 0.12)"
                            : "rgba(59, 130, 246, 0.12)",
                        borderColor:
                          isJobSuccess(job.status)
                            ? "rgba(16, 185, 129, 0.25)"
                            : isJobPublishing(job.status)
                            ? "rgba(245, 158, 11, 0.3)"
                            : job.status === "failed"
                            ? "rgba(239, 68, 68, 0.25)"
                            : "rgba(59, 130, 246, 0.25)",
                        color:
                          isJobSuccess(job.status)
                            ? "#10b981"
                            : isJobPublishing(job.status)
                            ? "#f59e0b"
                            : job.status === "failed"
                            ? "#ef4444"
                            : "#3b82f6",
                      }}
                    >
                      {getJobStatusLabel(job.status)}
                    </span>
                    {isJobReadyToPublish(job.status) && (() => {
                      const connectedProfiles = youtubeProfiles.filter(p => p.refreshToken);
                      const activeProfile = selectedProfile
                        ? connectedProfiles.find(p => p.name === selectedProfile)
                        : null;

                      if (activeProfile) {
                        return (
                          <button
                            type="button"
                            onClick={() => publishMutation.mutate({ jobId: job.id, profile: activeProfile })}
                            disabled={publishMutation.isPending}
                            className="btn btn-youtube"
                          >
                            <svg viewBox="0 0 24 24" className="size-3 fill-current" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                            {publishMutation.isPending ? "Subindo..." : activeProfile.name}
                          </button>
                        );
                      }

                      if (connectedProfiles.length > 0) {
                        return (
                          <div className="relative group inline-block text-left">
                            <button
                              type="button"
                              disabled={publishMutation.isPending}
                              className="btn btn-youtube"
                            >
                              <svg viewBox="0 0 24 24" className="size-3 fill-current" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                              {publishMutation.isPending ? "Subindo..." : "YouTube ▾"}
                            </button>
                            <div className="absolute right-0 bottom-full mb-1 w-48 bg-surface border border-border rounded-xl shadow-xl hidden group-hover:block hover:block z-50 overflow-hidden font-mono text-xs">
                              <div className="px-3 py-2 bg-background border-b border-border text-[9px] uppercase tracking-widest text-muted-foreground">Escolha o Canal:</div>
                              {connectedProfiles.map((p) => (
                                <button
                                  key={p.name}
                                  type="button"
                                  onClick={() => publishMutation.mutate({ jobId: job.id, profile: p })}
                                  className="w-full text-left px-3 py-2 hover:bg-primary hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                                >
                                  <span>{p.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      
                      return null;
                    })()}

                    {isJobReadyToPublish(job.status) && (() => {
                      const activeTikTokProfile = selectedTikTokProfile
                        ? tiktokProfiles.find(p => p.name === selectedTikTokProfile)
                        : null;

                      if (activeTikTokProfile) {
                        return (
                          <button
                            type="button"
                            onClick={() => publishTiktokMutation.mutate({ jobId: job.id, profile: activeTikTokProfile })}
                            disabled={publishTiktokMutation.isPending}
                            className="btn btn-tiktok"
                            style={{ animation: "ttGlow 2s ease-in-out infinite" }}
                          >
                            <svg viewBox="0 0 24 24" className="size-3 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                            {publishTiktokMutation.isPending ? "Subindo..." : activeTikTokProfile.name}
                          </button>
                        );
                      }

                      if (tiktokProfiles.length > 0) {
                        return (
                          <div className="relative group inline-block text-left">
                            <button
                              type="button"
                              disabled={publishTiktokMutation.isPending}
                              className="btn btn-tiktok"
                            >
                              <svg viewBox="0 0 24 24" className="size-3 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.35 6.34 6.34 0 006.34-6.35V9.01a8.27 8.27 0 004.85 1.56V7.12a4.85 4.85 0 01-1.09-.43z"/></svg>
                              {publishTiktokMutation.isPending ? "Subindo..." : "TikTok ▾"}
                            </button>
                            <div className="absolute right-0 bottom-full mb-1 w-48 bg-surface border border-border rounded-xl shadow-xl hidden group-hover:block hover:block z-50 overflow-hidden font-mono text-xs">
                              <div className="px-3 py-2 bg-background border-b border-border text-[9px] uppercase tracking-widest text-muted-foreground">Escolha o Perfil:</div>
                              {tiktokProfiles.map((p) => (
                                <button
                                  key={p.name}
                                  type="button"
                                  onClick={() => publishTiktokMutation.mutate({ jobId: job.id, profile: p })}
                                  className="w-full text-left px-3 py-2 hover:bg-primary hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                                >
                                  <span>{p.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      
                      return null;
                    })()}

                    {job.status === "failed" && (
                      <button
                        type="button"
                        onClick={() => retryMutation.mutate(job.id)}
                        disabled={retryMutation.isPending}
                        className="btn btn-warning"
                      >
                        {retryMutation.isPending ? "Reiniciando..." : "Tentar Novamente"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Deseja realmente excluir este job?")) {
                          deleteMutation.mutate(job.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="btn btn-danger"
                    >
                      {deleteMutation.isPending ? "..." : "Excluir"}
                    </button>
                  </div>
                </div>
              );
            })}
              {historyJobs.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground font-mono uppercase tracking-widest border border-dashed border-border rounded-2xl">
                  Nenhum job finalizado no histórico
                </div>
              )}
            </div>
          </section>

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
