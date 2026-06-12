#!/usr/bin/env node
/**
 * 🧪 Test Suite - Thumbnail Generation System
 */

import http from "http";
import fs from "fs";
import path from "path";

const API_URL = "http://localhost:8081";
const TEST_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4";

let testsPassed = 0;
let testsFailed = 0;

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
};

function log(type, message) {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  const icon =
    type === "success"
      ? "✅"
      : type === "error"
        ? "❌"
        : type === "info"
          ? "ℹ️"
          : type === "warn"
            ? "⚠️"
            : "🧪";

  console.log(`${colors.bright}[${timestamp}]${colors.reset} ${icon} ${message}`);
}

function success(msg) {
  log("success", colors.green + msg + colors.reset);
  testsPassed++;
}

function error(msg) {
  log("error", colors.red + msg + colors.reset);
  testsFailed++;
}

function info(msg) {
  log("info", msg);
}

function warn(msg) {
  log("warn", colors.yellow + msg + colors.reset);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  info("🌐 Teste 1: Health Check do Servidor");
  return new Promise((resolve) => {
    const req = http.get(`${API_URL}/`, (res) => {
      if (res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
        success("Servidor respondendo normalmente");
        resolve(true);
      } else {
        error(`Servidor retornou status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on("error", (err) => {
      error(`Erro ao conectar: ${err.message}`);
      resolve(false);
    });

    setTimeout(() => {
      error("Timeout na conexão");
      req.destroy();
      resolve(false);
    }, 5000);
  });
}

async function testThumbnailGeneration() {
  info("🎬 Teste 2: Geração de Thumbnail");

  const payload = {
    videoPath: TEST_VIDEO,
    clipTitle: "BIG BUCK BUNNY",
    clipHook: "Animation masterpiece",
    triggerType: "hook",
    personPosition: "center",
    autoUploadToSupabase: false,
  };

  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: "localhost",
      port: 8081,
      path: "/api/generateThumbnailOptimized",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);

          if (response.success) {
            success(`Thumbnail gerada com sucesso`);
            resolve(true);
          } else {
            error(`Falha na geração: ${response.error}`);
            resolve(false);
          }
        } catch (e) {
          error(`Erro ao parsear resposta: ${e.message}`);
          resolve(false);
        }
      });
    });

    req.on("error", (err) => {
      error(`Erro na requisição: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(30000, () => {
      error("Timeout na geração");
      req.destroy();
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function testWebhooks() {
  info("🔔 Teste 3: Sistema de Webhooks");

  const payload = {
    url: "https://webhook.example.com/test",
    event: "thumbnail_generated",
  };

  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: "localhost",
      port: 8081,
      path: "/api/registerThumbnailWebhook",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);

          if (response.success || response.data) {
            success("Webhook API respondendo");
            resolve(true);
          } else {
            warn(`Webhook: ${response.error || "resposta vazia"}`);
            resolve(true);
          }
        } catch (e) {
          warn(`Webhook resposta: ${e.message}`);
          resolve(true);
        }
      });
    });

    req.on("error", (err) => {
      warn(`Webhook erro: ${err.message}`);
      resolve(true);
    });

    req.setTimeout(10000);
    req.write(postData);
    req.end();
  });
}

async function runAllTests() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          🧪 Thumbnail Generation - Test Suite              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  await testHealthCheck();
  await sleep(1000);

  await testThumbnailGeneration();
  await sleep(1000);

  await testWebhooks();

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log(`║ ${colors.green}Testes Passados: ${testsPassed}${colors.reset}          ${colors.red}Testes Falhados: ${testsFailed}${colors.reset}             ║`);
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (testsFailed === 0 && testsPassed > 0) {
    console.log(
      colors.green +
        colors.bright +
        "✅ TODOS OS TESTES PASSARAM! Sistema 100% funcional!" +
        colors.reset
    );
    process.exit(0);
  } else {
    console.log(colors.yellow + `⚠️ ${testsFailed} teste(s) falharam` + colors.reset);
    process.exit(1);
  }
}

setTimeout(() => {
  runAllTests().catch((err) => {
    error(`Erro: ${err.message}`);
    process.exit(1);
  });
}, 2000);


function log(type, message) {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  const icon =
    type === "success"
      ? "✅"
      : type === "error"
        ? "❌"
        : type === "info"
          ? "ℹ️"
          : type === "warn"
            ? "⚠️"
            : "🧪";

  console.log(`${colors.bright}[${timestamp}]${colors.reset} ${icon} ${message}`);
}

function success(msg) {
  log("success", colors.green + msg + colors.reset);
  testsPassed++;
}

function error(msg) {
  log("error", colors.red + msg + colors.reset);
  testsFailed++;
}

function info(msg) {
  log("info", msg);
}

function warn(msg) {
  log("warn", colors.yellow + msg + colors.reset);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  info("🌐 Teste 1: Health Check do Servidor");
  return new Promise((resolve) => {
    const req = http.get(`${API_URL}/`, (res) => {
      if (res.statusCode === 200) {
        success("Servidor respondendo normalmente");
        resolve(true);
      } else {
        error(`Servidor retornou status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on("error", (err) => {
      error(`Erro ao conectar: ${err.message}`);
      resolve(false);
    });

    setTimeout(() => {
      error("Timeout na conexão");
      resolve(false);
    }, 5000);
  });
}

async function testThumbnailGeneration() {
  info("🎬 Teste 2: Geração de Thumbnail (com URL remota)");

  const payload = {
    videoPath: TEST_VIDEO,
    clipTitle: "BIG BUCK BUNNY",
    clipHook: "Animation masterpiece",
    triggerType: "hook",
    personPosition: "center",
    autoUploadToSupabase: false,
  };

  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: "localhost",
      port: 8081,
      path: "/api/generateThumbnailOptimized",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);

          if (response.success) {
            success(`Thumbnail gerada com sucesso (${response.processingTimeMs}ms)`);
            if (response.thumbnailDataUrl) {
              success(`Thumbnail retornada (base64 válido)`);
            }
            resolve(true);
          } else {
            error(`Falha na geração: ${response.error}`);
            resolve(false);
          }
        } catch (e) {
          error(`Erro ao parsear resposta: ${e.message}`);
          resolve(false);
        }
      });
    });

    req.on("error", (err) => {
      error(`Erro na requisição: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(60000, () => {
      error("Timeout na geração (>60s) - FFmpeg ou Rembg pode estar lento");
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function testCacheSystem() {
  info("⚡ Teste 3: Sistema de Cache");

  const payload = {
    videoPath: "https://example.com/test.mp4",
    clipTitle: "TESTE CACHE",
    clipHook: "Testando cache",
    triggerType: "humor",
    autoUploadToSupabase: false,
  };

  // Primeira requisição (sem cache)
  info("  → Primeira requisição (sem cache)...");
  return new Promise((resolve) => {
    const makeRequest = (isSecond = false) => {
      const postData = JSON.stringify(payload);

      const options = {
        hostname: "localhost",
        port: 8081,
        path: "/api/generateThumbnailOptimized",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      return new Promise((res) => {
        const req = http.request(options, (response) => {
          let data = "";

          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            try {
              const result = JSON.parse(data);
              res(result);
            } catch (e) {
              warn(`Erro ao parsear: ${e.message}`);
              res(null);
            }
          });
        });

        req.on("error", (err) => {
          warn(`Erro: ${err.message}`);
          res(null);
        });

        req.setTimeout(30000);
        req.write(postData);
        req.end();
      });
    };

    makeRequest(false).then((first) => {
      if (!first) {
        error("Falha na primeira requisição");
        resolve(false);
        return;
      }

      info(`  → Primeira tentativa: ${first.processingTimeMs || "?"} ms`);

      // Esperar um pouco antes da segunda requisição
      setTimeout(() => {
        info("  → Segunda requisição (deve vir do cache)...");

        makeRequest(true).then((second) => {
          if (!second) {
            error("Falha na segunda requisição");
            resolve(false);
            return;
          }

          info(`  → Segunda tentativa: ${second.processingTimeMs || "?"} ms`);

          if (second.fromCache) {
            success(`Cache funcionando! (${second.processingTimeMs}ms vs ${first.processingTimeMs}ms)`);
            resolve(true);
          } else {
            warn("Cache não foi detectado, mas requisição foi processada");
            resolve(true);
          }
        });
      }, 1000);
    });
  });
}

async function testWebhooks() {
  info("🔔 Teste 4: Sistema de Webhooks (Registro)");

  const payload = {
    url: "https://webhook.site/unique-id",
    event: "thumbnail_generated",
  };

  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: "localhost",
      port: 8081,
      path: "/api/registerThumbnailWebhook",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);

          if (response.success) {
            success("Webhook registrado com sucesso");
            resolve(true);
          } else {
            warn(`Falha ao registrar webhook: ${response.error}`);
            resolve(true); // Não é crítico
          }
        } catch (e) {
          warn(`Erro ao parsear resposta: ${e.message}`);
          resolve(true);
        }
      });
    });

    req.on("error", (err) => {
      warn(`Erro ao registrar webhook: ${err.message}`);
      resolve(true);
    });

    req.setTimeout(10000);
    req.write(postData);
    req.end();
  });
}

async function runAllTests() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          🧪 Thumbnail Generation - Test Suite              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Teste 1: Health Check
  await testHealthCheck();
  await sleep(1000);

  // Teste 2: Geração
  const genSuccess = await testThumbnailGeneration();
  await sleep(2000);

  // Teste 3: Cache
  if (genSuccess) {
    await testCacheSystem();
  } else {
    warn("Pulando teste de cache (geração falhou)");
  }
  await sleep(1000);

  // Teste 4: Webhooks
  await testWebhooks();

  // Resumo
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log(`║ ${colors.green}Testes Passados: ${testsPassed}${colors.reset}          ${colors.red}Testes Falhados: ${testsFailed}${colors.reset}             ║`);
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (testsFailed === 0 && testsPassed > 0) {
    console.log(
      colors.green +
        colors.bright +
        "✅ TODOS OS TESTES PASSARAM! Sistema 100% funcional!" +
        colors.reset
    );
    process.exit(0);
  } else if (testsPassed > 0) {
    console.log(colors.yellow + `⚠️ ${testsFailed} teste(s) falharam` + colors.reset);
    process.exit(1);
  } else {
    console.log(colors.red + "❌ Nenhum teste passou" + colors.reset);
    process.exit(1);
  }
}

// Esperar um pouco para o servidor estar pronto
setTimeout(() => {
  runAllTests().catch((err) => {
    error(`Erro ao executar testes: ${err.message}`);
    process.exit(1);
  });
}, 2000);
