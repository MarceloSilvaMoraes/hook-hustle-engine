#!/usr/bin/env node
/**
 * 🧪 Thumbnail System - Functional Test
 * Testa via servidor web real
 */

import http from "http";

const API_URL = "http://localhost:8081";

function log(icon, msg) {
  const time = new Date().toLocaleTimeString("pt-BR");
  console.log(`[${time}] ${icon} ${msg}`);
}

async function getPage() {
  return new Promise((resolve) => {
    const req = http.get(`${API_URL}/`, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on("error", (err) => {
      resolve({ error: err.message });
    });

    setTimeout(() => {
      req.destroy();
      resolve({ error: "timeout" });
    }, 10000);
  });
}

async function checkServerLogs() {
  log("📊", "Verificando se servidor está rodando...");

  const page = await getPage();

  if (page.error) {
    log("❌", `Servidor não respondeu: ${page.error}`);
    return false;
  }

  if (page.status === 200 || page.status === 301) {
    log("✅", `Servidor OK (${page.status})`);
    if (page.body.includes("<!DOCTYPE") || page.body.includes("<html")) {
      log("✅", "Aplicação web carregando corretamente");
      return true;
    }
  }

  log("❌", `Status inesperado: ${page.status}`);
  return false;
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║     🎬 Thumbnail System - Setup & Test Verification        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  log("🚀", "Iniciando verificação...\n");

  const serverOk = await checkServerLogs();

  console.log("\n═══════════════════════════════════════════════════════════\n");

  if (serverOk) {
    console.log("✅ SISTEMA PRONTO PARA TESTAR!\n");
    console.log("📋 Próximas etapas:\n");
    console.log("1️⃣  Acesse http://localhost:8081 no navegador");
    console.log("2️⃣  Execute a migration SQL no Supabase:");
    console.log("   - Abra supabase/20260611_thumbnail_optimization.sql");
    console.log("   - Cole em: https://app.supabase.com/project/[seu]/sql");
    console.log("3️⃣  Crie o bucket 'videos' no Storage do Supabase");
    console.log("4️⃣  Faça upload de um vídeo e teste!");
    console.log("\n💡 As funções de thumbnail estão integradas em:");
    console.log("   - clips.functions.ts (análise IA)");
    console.log("   - render-jobs.functions.ts (fallback)");
    console.log("\n🎯 Tudo será automático quando usar a web!\n");
    process.exit(0);
  } else {
    console.log("❌ SERVIDOR NÃO RESPONDEU\n");
    console.log("Verifique se npm run dev está rodando\n");
    process.exit(1);
  }
}

main();
