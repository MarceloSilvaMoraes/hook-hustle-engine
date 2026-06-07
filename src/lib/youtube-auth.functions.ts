
export const DEFAULT_GOOGLE_CLIENT_ID = "60097047397-pkr5gq70r5r2h1hv01556eivnbaqd07h.apps.googleusercontent.com";

export function getGoogleClientId() {
  const configured = (
    (typeof import.meta !== "undefined" ? import.meta.env.VITE_GOOGLE_CLIENT_ID : process.env.VITE_GOOGLE_CLIENT_ID) ||
    process.env.GOOGLE_CLIENT_ID ||
    ""
  )
    .trim();

  if (!configured || configured === "test-client-id") {
    return DEFAULT_GOOGLE_CLIENT_ID;
  }

  return configured;
}

function normalizeLocalOrigin(origin?: string) {
  if (!origin) return undefined;

  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "[::1]" || url.hostname === "::1") {
      url.hostname = "127.0.0.1";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return origin.replace(/\/$/, "");
  }
}

export function resolveOAuthRedirectUri(origin?: string) {
  const normalizedOrigin = normalizeLocalOrigin(origin);
  if (normalizedOrigin) {
    return `${normalizedOrigin.replace(/\/$/, "")}/youtube-callback`;
  }

  if (process.env.VITE_GOOGLE_REDIRECT_URI) {
    return process.env.VITE_GOOGLE_REDIRECT_URI;
  }

  return process.env.NODE_ENV === "production"
    ? "https://hook-hustle-engine.lovable.app/youtube-callback"
    : "http://localhost:8081/youtube-callback";
}

export function buildYoutubeAuthUrl() {
  const clientId = getGoogleClientId();
  const redirectUri = resolveOAuthRedirectUri(typeof window !== "undefined" ? window.location.origin : undefined);
  const scope = encodeURIComponent("https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl");

  return `https://accounts.google.com/o/oauth2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&scope=${scope}&prompt=select_account%20consent&include_granted_scopes=true`;
}
