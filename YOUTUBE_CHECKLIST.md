# ✅ CHECKLIST - Configurar YouTube Upload Automático

## ✨ O que falta para seus vídeos subirem para YouTube

Você está **MUITO PERTO**! Faltam apenas 2 coisas simples:

---

## 1️⃣ Obter o YOUTUBE_REFRESH_TOKEN (15 minutos)

### Passo A: Gere um código de autorização

Abra este link no navegador (copie exatamente):

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=60097047397-pkr5gq70r5r2h1hv01556eivnbaqd07h.apps.googleusercontent.com&redirect_uri=http://127.0.0.1:8081/youtube-callback&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&access_type=offline
```

**Ou execute no PowerShell:**
```powershell
$url = "https://accounts.google.com/o/oauth2/v2/auth?client_id=60097047397-pkr5gq70r5r2h1hv01556eivnbaqd07h.apps.googleusercontent.com&redirect_uri=http://127.0.0.1:8081/youtube-callback&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&access_type=offline"
Start-Process $url
```

### Passo B: Autorize com sua conta YouTube

1. Clique em "Permitir"
2. Você verá uma página em branco com: `http://127.0.0.1:8081/youtube-callback?code=XXXXX...`
3. **Copie o código** (a parte depois de `code=`)

### Passo C: Troque código por refresh_token

Abra PowerShell e execute:

```powershell
# Cole o código que você copiou aqui:
$code = "COLE_AQUI_O_CODIGO"

$response = Invoke-WebRequest -Uri "https://oauth2.googleapis.com/token" -Method Post -Body @{
    client_id = "60097047397-pkr5gq70r5r2h1hv01556eivnbaqd07h.apps.googleusercontent.com"
    client_secret = "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"
    code = $code
    grant_type = "authorization_code"
    redirect_uri = "http://127.0.0.1:8081/youtube-callback"
} -ContentType "application/x-www-form-urlencoded" | ConvertFrom-Json

Write-Host "REFRESH_TOKEN (copie isto):"
Write-Host $response.refresh_token
```

**Copie o refresh_token que aparecer!**

---

## 2️⃣ Adicionar ao .env (2 minutos)

Abra o arquivo `env.env` e adicione/atualize:

```bash
YOUTUBE_AUTO_PUBLISH=true
YOUTUBE_CLIENT_ID=60097047397-pkr5gq70r5r2h1hv01556eivnbaqd07h.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=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
YOUTUBE_REFRESH_TOKEN=COLE_AQUI_O_TOKEN_QUE_VOCE_COPIOU
YOUTUBE_PRIVACY_STATUS=private
```

**Salve o arquivo!**

---

## 3️⃣ Testar (5 minutos)

### Terminal 1: App Local
```powershell
cd c:\Users\user\Desktop\hook-hustle-engine
npm run dev -- --port 8081
```

### Terminal 2: Ollama (IA)
```powershell
ollama serve
```

### Terminal 3: Worker (Upload)
```powershell
cd c:\Users\user\Desktop\hook-hustle-engine
python worker.py
```

---

## 🎯 Fluxo Completo (depois de configurado)

```
1. Você cola URL do YouTube na app
   ↓
2. Transcrição é baixada automaticamente
   ↓
3. Você clica "ANALISAR CONTEÚDO"
   ↓
4. IA (Ollama) extrai 5 clipes virais
   ↓
5. Você clica "RENDERIZAR CLIPES"
   ↓
6. Worker renderiza os vídeos (ffmpeg)
   ↓
7. Worker sobe automaticamente para YouTube
   ↓
8. ✅ Vídeos aparecem no seu canal (privados por padrão)
```

---

## 📋 Checklist Final

- [ ] Obtive o código de autorização (Passo A)
- [ ] Autorizar com minha conta YouTube (Passo B)
- [ ] Copiei o código (Passo C)
- [ ] Gerei o refresh_token (Passo C)
- [ ] Atualizei o env.env (Etapa 2)
- [ ] Salvei o arquivo
- [ ] Iniciei os 3 terminais (Etapa 3)
- [ ] Testei a app completa

---

## 🆘 Problemas?

### "invalid_client"
- Verifique se YOUTUBE_CLIENT_ID e CLIENT_SECRET estão corretos

### "invalid_grant"
- O código de autorização expirou (válido por 10 min)
- Gere um novo código

### "Permission Denied"  
- Sua conta não tem permissão para fazer upload
- Use uma conta com canal YouTube verificado

### Worker não sobe vídeo
- Confirme se `YOUTUBE_AUTO_PUBLISH=true` está no .env
- Verifique se worker.py está rodando
- Veja os logs do worker para erros

---

## 🎉 Pronto!

Depois disso, você terá:
✅ IA local e gratuita (Ollama)
✅ Extração automática de clipes
✅ Renderização automática de vídeos
✅ Upload automático para YouTube
✅ **Tudo sem pagar nada!**

---

## 📚 Referência Completa

Para mais detalhes:
- [YOUTUBE_SETUP.md](YOUTUBE_SETUP.md) - Guia detalhado completo
- [INSTALACAO_MANUAL.md](INSTALACAO_MANUAL.md) - Instalação de Ollama
- [COMECE_AQUI.md](COMECE_AQUI.md) - Overview geral
