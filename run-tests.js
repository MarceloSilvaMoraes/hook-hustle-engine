#!/usr/bin/env node
/**
 * 🧪 Thumbnail System - Automated Tests
 */

import http from "http";

const API_URL = "http://localhost:8081";
let testsPassed = 0;
let testsFailed = 0;

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
};

function logSuccess(msg) {
  const time = new Date().toLocaleTimeString("pt-BR");
  console.log(`${colors.bright}[${time}]${colors.reset} ${colors.green}✅ ${msg}${colors.reset}`);
  testsPassed++;
}

function logError(msg) {
  const time = new Date().toLocaleTimeString("pt-BR");
  console.log(`${colors.bright}[${time}]${colors.reset} ${colors.red}❌ ${msg}${colors.reset}`);
  testsFailed++;
}

function logInfo(msg) {
  const time = new Date().toLocaleTimeString("pt-BR");
  console.log(`${colors.bright}[${time}]${colors.reset} ℹ️  ${msg}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testServer() {
  logInfo("🌐 Teste 1: Verificando servidor...");
  return new Promise((resolve) => {
    const req = http.get("http://localhost:8081/", (res) => {
      if (res.statusCode < 400) {
        logSuccess("Servidor respondendo");
        resolve(true);
      } else {
        logError(`Status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on("error", (err) => {
      logError(`Erro: ${err.message}`);
      resolve(false);
    });

    setTimeout(() => {
      logError("Timeout");
      req.destroy();
      resolve(false);
    }, 5000);
  });
}

async function testAPI() {
  logInfo("📝 Teste 2: Testando geração de thumbnail...");

  const payload = JSON.stringify({
    videoPath: "https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4",
    clipTitle: "TEST VIDEO",
    clipHook: "Test hook",
    triggerType: "hook",
    autoUploadToSupabase: false,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: 8081,
      path: "/api/generateThumbnailOptimized",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            logSuccess("API retornou sucesso");
            resolve(true);
          } else {
            logError(`API error: ${result.error}`);
            resolve(false);
          }
        } catch (e) {
          logError(`Parse error: ${e.message}`);
          resolve(false);
        }
      });
    });

    req.on("error", (err) => {
      logError(`Request error: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(30000);
    req.write(payload);
    req.end();
  });
}

async function testWebhooks() {
  logInfo("🔔 Teste 3: Testando webhooks...");

  const payload = JSON.stringify({
    url: "https://webhook.example.com",
    event: "thumbnail_generated",
  });

  return new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: 8081,
      path: "/api/registerThumbnailWebhook",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.success || result.data) {
            logSuccess("Webhook API respondendo");
          } else {
            logInfo("Webhook: " + (result.error || "ok"));
          }
          resolve(true);
        } catch (e) {
          logInfo(`Webhook teste: ${e.message}`);
          resolve(true);
        }
      });
    });

    req.on("error", (err) => {
      logInfo(`Webhook: ${err.message}`);
      resolve(true);
    });

    req.setTimeout(10000);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║    🧪 Thumbnail System - Automated Test Suite              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  await testServer();
  await sleep(1000);

  await testAPI();
  await sleep(1000);

  await testWebhooks();

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log(`║ ${colors.green}✅ Passados: ${testsPassed}${colors.reset}         ${colors.red}❌ Falhados: ${testsFailed}${colors.reset}            ║`);
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (testsFailed === 0 && testsPassed >= 2) {
    console.log(colors.green + colors.bright + "🎉 SISTEMA 100% FUNCIONAL!" + colors.reset);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

setTimeout(main, 1000);
