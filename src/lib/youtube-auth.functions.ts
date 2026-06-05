
export const FALLBACK_GOOGLE_CLIENT_ID = "60097047397-pkr5gq70r5r2h1hv01556eivnbaqd07h.apps.googleusercontent.com";

export function resolveOAuthRedirectUri(origin?: string) {
  if (origin) return `${origin.replace(/\/$/, "")}/youtube-callback`;

  if (process.env.VITE_GOOGLE_REDIRECT_URI) {
    return process.env.VITE_GOOGLE_REDIRECT_URI;
  }

  return process.env.NODE_ENV === "production"
    ? "https://hook-hustle-engine.lovable.app/youtube-callback"
    : "http://localhost:8080/youtube-callback";
}

export function buildYoutubeAuthUrl() {
  const clientId = (typeof import.meta !== "undefined" ? import.meta.env.VITE_GOOGLE_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID : process.env.VITE_GOOGLE_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID);
  const redirectUri = resolveOAuthRedirectUri(typeof window !== "undefined" ? window.location.origin : undefined);
  const scope = encodeURIComponent("https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl");

  return `https://accounts.google.com/o/oauth2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&scope=${scope}&prompt=select_account%20consent&include_granted_scopes=true`;
}
