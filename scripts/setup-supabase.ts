/**
 * 🚀 Setup Automático do Supabase para Thumbnail System
 * 
 * Este script:
 * 1. Executa a migration SQL
 * 2. Cria o bucket de videos
 * 3. Verifica tudo está funcionando
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERRO: Variáveis de ambiente não configuradas!");
  console.error("Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

console.log("🔌 Conectando ao Supabase...");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupDatabase() {
  console.log("\n📊 [1/3] Executando migration SQL...");

  try {
    const sqlPath = path.join(process.cwd(), "supabase", "20260611_thumbnail_optimization.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    // Split SQL por ; e executar cada comando
    const commands = sqlContent
      .split(";")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd && !cmd.startsWith("--"));

    let successCount = 0;
    for (const command of commands) {
      if (command.length < 10) continue; // Pular comandos vazios

      try {
        const { error } = await supabase.rpc("exec", { query: command });
        if (!error) {
          successCount++;
        } else if (!error.message.includes("already exists")) {
          console.warn(`  ⚠️ ${error.message}`);
        }
      } catch (e) {
        // Ignorar erros de "already exists" (tabelas já criadas)
        if (!(e instanceof Error && e.message.includes("already exists"))) {
          console.warn(`  ⚠️ Erro executando comando:`, e);
        }
      }
    }

    console.log(`  ✅ Migration SQL executada (${successCount} comandos)`);
  } catch (error) {
    console.error("  ❌ Erro ao executar migration:", error);
    // Continuar mesmo se falhar - pode ser que as tabelas já existam
  }
}

async function setupStorage() {
  console.log("\n📦 [2/3] Configurando Storage (bucket 'videos')...");

  try {
    // Tentar criar o bucket
    const { data, error } = await supabase.storage.createBucket("videos", {
      public: true,
      allowedMimeTypes: ["video/mp4", "video/quicktime"],
    });

    if (error && error.message.includes("already exists")) {
      console.log("  ✅ Bucket 'videos' já existe");
    } else if (error) {
      console.error("  ⚠️ Erro ao criar bucket:", error.message);
    } else {
      console.log("  ✅ Bucket 'videos' criado com sucesso!");
    }
  } catch (error) {
    console.error("  ⚠️ Erro:", error);
  }
}

async function testConnection() {
  console.log("\n🧪 [3/3] Testando conexão e tabelas...");

  try {
    // Testar table thumbnail_cache
    const { data: cacheTest, error: cacheError } = await supabase
      .from("thumbnail_cache")
      .select("count", { count: "exact" });

    if (cacheError) {
      console.error("  ❌ Erro ao acessar thumbnail_cache:", cacheError.message);
    } else {
      console.log(`  ✅ Tabela 'thumbnail_cache' OK`);
    }

    // Testar table thumbnail_webhooks
    const { data: webhookTest, error: webhookError } = await supabase
      .from("thumbnail_webhooks")
      .select("count", { count: "exact" });

    if (webhookError) {
      console.error("  ❌ Erro ao acessar thumbnail_webhooks:", webhookError.message);
    } else {
      console.log(`  ✅ Tabela 'thumbnail_webhooks' OK`);
    }

    // Testar storage
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.error("  ❌ Erro ao listar buckets:", bucketError.message);
    } else {
      const videoBucket = buckets?.find((b) => b.name === "videos");
      if (videoBucket) {
        console.log(`  ✅ Bucket 'videos' acessível`);
      } else {
        console.warn(`  ⚠️ Bucket 'videos' não encontrado`);
      }
    }
  } catch (error) {
    console.error("  ❌ Erro ao testar:", error);
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  🎬 Setup Automático - Thumbnail Optimization System       ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    await setupDatabase();
    await setupStorage();
    await testConnection();

    console.log("\n✅ Setup concluído!");
    console.log(
      "💡 Dica: Se houver erros acima, execute o SQL manualmente em:"
    );
    console.log("   https://app.supabase.com/project/[seu-projeto]/sql");
    console.log("\n🚀 Agora você pode rodar: npm run dev");
  } catch (error) {
    console.error("\n❌ Erro fatal:", error);
    process.exit(1);
  }
}

main();
