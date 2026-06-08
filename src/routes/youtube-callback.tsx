import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { exchangeYoutubeCode } from "@/lib/youtube-auth.server";
import { resolveOAuthRedirectUri } from "@/lib/youtube-auth.functions";

export const Route = createFileRoute("/youtube-callback")({
  component: YoutubeCallback,
});

function YoutubeCallback() {
  const exchange = useServerFn(exchangeYoutubeCode);
  const [status, setStatus] = useState("Autenticando com o Google...");
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus(`Falha na autenticação: ${error}`);
      return;
    }

    if (!code) {
      setStatus("Nenhum código de autorização foi recebido.");
      return;
    }

    void (async () => {
      try {
        const result = await exchange({
          data: {
            code,
            redirectUri: resolveOAuthRedirectUri(window.location.origin),
          },
        });
        if (!result.ok) {
          setStatus(result.error || "Erro ao trocar o código de autorização.");
          return;
        }

        const refreshToken = result.refreshToken || "";
        if (refreshToken) {
          const pendingName = window.localStorage.getItem("pending_channel_profile_name");
          if (pendingName) {
            const existingProfilesStr = window.localStorage.getItem("hook_hustle_youtube_profiles") || "[]";
            let profiles = [];
            try {
              profiles = JSON.parse(existingProfilesStr);
              if (!Array.isArray(profiles)) profiles = [];
            } catch {
              profiles = [];
            }
            profiles = profiles.filter((p: any) => p.name !== pendingName);
            profiles.push({
              name: pendingName,
              refreshToken: refreshToken,
              connectedAt: new Date().toISOString(),
              defaultHashtags: "",
              defaultTags: "",
              privacyStatus: "private"
            });
            window.localStorage.setItem("hook_hustle_youtube_profiles", JSON.stringify(profiles));
            window.localStorage.removeItem("pending_channel_profile_name");
          } else {
            window.localStorage.setItem("hook_hustle_youtube_refresh_token", refreshToken);
          }
        }

        setStatus("Autenticação concluída. Redirecionando de volta ao app...");
        setToken(refreshToken);

        window.setTimeout(() => {
          window.location.replace(window.location.origin);
        }, 800);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Erro inesperado durante a autenticação.");
      }
    })();
  }, [exchange]);

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-surface p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-widest text-primary">OAuth do YouTube</p>
        <h1 className="mt-3 font-display text-4xl uppercase">Conecte sua conta do YouTube</h1>
        <p className="mt-4 text-sm text-muted-foreground">Este fluxo abre a tela de login do Google e devolve o token que você precisa para a publicação automática.</p>
        <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-sm font-mono whitespace-pre-wrap break-all">{status}</div>
        {token ? (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-widest text-primary">YOUTUBE_REFRESH_TOKEN</p>
            <p className="mt-2 break-all font-mono text-sm">{token}</p>
            <p className="mt-3 text-xs text-muted-foreground">Cole este valor no seu .env e depois ative YOUTUBE_AUTO_PUBLISH=true.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
