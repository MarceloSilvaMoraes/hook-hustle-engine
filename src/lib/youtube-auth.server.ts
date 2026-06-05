import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getGoogleClientId } from "./youtube-auth.functions";

const ExchangeCodeInput = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});

function getServerCredentials() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  return {
    clientId: clientId && clientId !== "test-client-id" ? clientId : getGoogleClientId(),
    clientSecret,
  };
}

export const exchangeYoutubeCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ExchangeCodeInput.parse(data))
  .handler(async ({ data }) => {
    const { clientId, clientSecret } = getServerCredentials();

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
