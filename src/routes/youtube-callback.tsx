import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { exchangeYoutubeCode } from "@/lib/youtube-auth.functions";

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
            redirectUri: `${window.location.origin}/youtube-callback`,
          },
        });
        if (!result.ok) {
          setStatus(result.error || "Erro ao trocar o código de autorização.");
          return;
        }

        setStatus("Autenticação concluída. Copie o refresh token abaixo para o seu .env.");
        setToken(result.refreshToken || "");
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
