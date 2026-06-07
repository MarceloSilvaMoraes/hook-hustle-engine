# 🚀 GUIA MANUAL - Instalar Ollama (Windows)

## ⚠️ IMPORTANTE: Execute COMO ADMINISTRADOR

O Ollama precisa ser instalado manualmente porque é um programa Windows que requer permissões elevadas.

---

## 📥 PASSO 1: Download

1. Abra seu navegador
2. Vá para: **https://ollama.ai/download**
3. Clique em **"Download for Windows"**
4. Salve o arquivo em uma pasta que você lembra (ex: Downloads)

---

## 💻 PASSO 2: Instalar

1. Procure o arquivo `OllamaSetup.exe` (ou similar) que você baixou
2. **Clique com botão direito**
3. Selecione **"Executar como Administrador"**
4. Clique em **"Sim"** se perguntado
5. Siga o wizard de instalação (é só clicar "Next" e "Install")
6. **Aguarde a conclusão** - pode levar 2-3 minutos

---

## ✅ PASSO 3: Verificar Instalação

Abra um **novo PowerShell** e execute:

```powershell
ollama --version
```

Se ver uma versão (ex: `ollama version 0.1.X`), a instalação funcionou! ✓

---

## 🤖 PASSO 4: Baixar Modelo Mistral

No mesmo PowerShell, execute:

```powershell
ollama pull mistral
```

⏳ **Isso vai levar 10-15 minutos** (download de 1.3GB)

Você verá mensagens como:
```
pulling manifest
downloading layers
verifying sha256 digest
writing manifest
removing any unused layers
success
```

---

## 🔌 PASSO 5: Iniciar Ollama Server

Abra um **novo PowerShell** e execute:

```powershell
ollama serve
```

Você verá:
```
Ollama is running on 127.0.0.1:11434
```

✅ **DEIXE ESTE TERMINAL ABERTO** enquanto usa a app!

---

## 🎯 PASSO 6: Testar no Navegador

1. Abra http://127.0.0.1:8081/ (app local)
2. Cole uma transcrição de vídeo
3. Clique em **"ANALISAR CONTEÚDO"**
4. Aguarde a IA extrair os clipes 🎬

---

## 📋 Resumo dos 3 Terminais que Você Precisa Rodar:

| Terminal | Comando | Descrição |
|----------|---------|-----------|
| **Terminal 1** | `npm run dev -- --port 8081` | App ViralForce.AI |
| **Terminal 2** | `ollama serve` | Servidor de IA |
| **Terminal 3** | `python worker.py` | Bot de render/YouTube (opcional) |

---

## ❓ Problemas?

### "Ollama não é reconhecido"
- Você pode ter que **reiniciar o PC** após instalar
- Ou abra um novo PowerShell

### "Conexão recusada"
- Verifique se `ollama serve` está rodando
- Teste: `Test-NetConnection -ComputerName localhost -Port 11434`

### "Modelo não encontra"
- Execute novamente: `ollama pull mistral`

---

## 🎉 Pronto!

Quando todos os 3 terminais estão rodando, a app vai:
1. ✅ Aceitar URLs de vídeos do YouTube
2. ✅ Analisar transcrições com IA **LOCAL**
3. ✅ Extrair 5 clipes virais
4. ✅ Renderizar e postar no YouTube

**Tudo 100% GRATUITO e SEM LIMITES!**
