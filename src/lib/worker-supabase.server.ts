// Dedicated Supabase client for the local render worker integration.
// Points to the user's own Supabase project (njdz…), not Lovable Cloud.
// Server-only. Never import from client code.
import { createClient } from "@supabase/supabase-js";

function createWorkerSupabase() {
  const url =
    process.env.WORKER_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";

  const key =
    process.env.WORKER_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "";

  if (!url || !key) {
    const missing = [
      ...(!url ? ["WORKER_SUPABASE_URL / SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL / VITE_SUPABASE_URL"] : []),
      ...(!key
        ? [
            "WORKER_SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY",
          ]
        : []),
    ];
    throw new Error(
      `Configuração do worker Supabase ausente: ${missing.join(", ")}. Adicione esses secrets.`,
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let _client: ReturnType<typeof createWorkerSupabase> | undefined;

export const workerSupabase = new Proxy({} as ReturnType<typeof createWorkerSupabase>, {
  get(_t, prop, receiver) {
    if (!_client) _client = createWorkerSupabase();
    return Reflect.get(_client, prop, receiver);
  },
});
