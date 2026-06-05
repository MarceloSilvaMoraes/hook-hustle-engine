import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ExchangeCodeInput = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().min(1).optional(),
});

export const exchangeYoutubeCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ExchangeCodeInput.parse(data))
  .handler(async ({ data }) => {
    const clientId = (data.clientId || process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "").trim();
    const clientSecret = (data.clientSecret || process.env.GOOGLE_CLIENT_SECRET || "").trim();

    if (!clientId || !clientSecret) {
      return {
        ok: false as const,
        error: "Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no ambiente do servidor antes de iniciar a autenticação do YouTube.",
      };
    }

    const body = new URLSearchParams({
      code: data.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: data.redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const json = await response.json();
    if (!response.ok) {
      return {
        ok: false as const,
        error: json.error_description || json.error || "Falha ao trocar o código do OAuth.",
      };
    }

    return {
      ok: true as const,
      accessToken: json.access_token as string | undefined,
      refreshToken: json.refresh_token as string | undefined,
      expiresIn: json.expires_in as number | undefined,
      tokenType: json.token_type as string | undefined,
      scope: json.scope as string | undefined,
    };
  });

export function buildYoutubeAuthUrl() {
  const clientId = (typeof window !== "undefined" ? localStorage.getItem("youtube_client_id") : "") || (typeof import.meta !== "undefined" ? import.meta.env.VITE_GOOGLE_CLIENT_ID || "" : process.env.VITE_GOOGLE_CLIENT_ID || "");
  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/youtube-callback` : "http://localhost:8080/youtube-callback";
  const scope = encodeURIComponent("https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl");

  return `https://accounts.google.com/o/oauth2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&scope=${scope}&prompt=select_account%20consent&include_granted_scopes=true`;
}
