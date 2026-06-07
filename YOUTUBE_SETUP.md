# 🎥 Configurar YouTube para Auto-Upload

## ✅ Status Atual

Você já tem:
- ✅ `YOUTUBE_CLIENT_ID` configurado
- ✅ `YOUTUBE_CLIENT_SECRET` configurado
- ✅ `YOUTUBE_AUTO_PUBLISH=true` ativado
- ❌ **`YOUTUBE_REFRESH_TOKEN` = FALTANDO**

## 🔑 O que é o YOUTUBE_REFRESH_TOKEN?

É um token especial que permite ao seu worker enviar vídeos para YouTube **sem precisar fazer login novamente**. Funciona assim:

```
🎬 Seu video → 🤖 Worker → 📤 YouTube Upload ✅
               (usando REFRESH_TOKEN)
```

---

## 📋 Como Obter o YOUTUBE_REFRESH_TOKEN

### Passo 1: Ativar a API do YouTube (Já deve estar)
1. Abra: https://console.cloud.google.com
2. Procure por **"YouTube Data API v3"**
3. Clique em **Enable**

### Passo 2: Gerar o Código de Autorização

Execute este comando no PowerShell:

```powershell
$clientId = "60097047397-pkr5gq70r5r2h1hv01556eivnbaqd07h.apps.googleusercontent.com"
$redirectUri = "http://127.0.0.1:8081/youtube-callback"
$scope = "https://www.googleapis.com/auth/youtube.upload"

$authUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=$clientId&redirect_uri=$redirectUri&response_type=code&scope=$scope&access_type=offline"

Write-Host "Abra esta URL no navegador:"
Write-Host $authUrl
```

Copie a URL e abra no navegador.

### Passo 3: Autorizar e Pegar o Código

1. Faça login com a conta que tem o canal YouTube
2. Clique em **"Permitir"**
3. Você será redirecionado para: `http://127.0.0.1:8081/youtube-callback?code=XXXX...`
4. **Copie o código** que aparece depois de `code=`

### Passo 4: Trocar Código por Refresh Token

Execute este script em Python:

```python
import requests
import json

# Seus dados
CLIENT_ID = "60097047397-pkr5gq70r5r2h1hv01556eivnbaqd07h.apps.googleusercontent.com"
CLIENT_SECRET = "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"
AUTHORIZATION_CODE = "AQUI_COLE_O_CODIGO_QUE_VOCE_COPIOU"
REDIRECT_URI = "http://127.0.0.1:8081/youtube-callback"

# Trocar código por token
url = "https://oauth2.googleapis.com/token"
data = {
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "code": AUTHORIZATION_CODE,
    "grant_type": "authorization_code",
    "redirect_uri": REDIRECT_URI
}

response = requests.post(url, data=data)
tokens = response.json()

print("\n🎉 SUCESSO! Aqui estão seus tokens:")
print("\nRefresh Token (COPIE ISTO):")
print(tokens.get("refresh_token"))
print("\nAccess Token (válido por 1 hora):")
print(tokens.get("access_token"))
```

**Salve o `refresh_token` que aparecer!**

### Passo 5: Adicionar ao .env

Abra `env.env` e adicione:

```bash
YOUTUBE_REFRESH_TOKEN=COLE_O_REFRESH_TOKEN_AQUI
```

Exemplo:
```bash
YOUTUBE_REFRESH_TOKEN=1//0gHQyP7bnTz4bCgYIARAAGAw...
```

---

## ✅ Verificar se Está Funcionando

Execute o worker:
```powershell
cd c:\Users\user\Desktop\hook-hustle-engine
python worker.py
```

Você deve ver:
```
✅ YouTube refresh token válido
🚀 Worker iniciado...
Aguardando jobs em http://localhost:5432
```

Se der erro de autenticação, o token pode ter expirado. Repita os passos.

---

## 🧪 Testar Upload (Manual)

Para testar sem renderizar clipes:

```python
from google_auth_oauthlib.flow import InstalledAppFlow
from google_auth_transport.requests import Request
from google.oauth2.credentials import Credentials
from google.api_python_client import discovery
import os

# Suas credenciais
CLIENT_ID = "60097047397-pkr5gq70r5r2h1hv01556eivnbaqd07h.apps.googleusercontent.com"
CLIENT_SECRET = "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"
REFRESH_TOKEN = "COLE_AQUI"

# Criar credenciais
creds = Credentials.new_from_json({
    "type": "authorized_user",
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "refresh_token": REFRESH_TOKEN,
})

# Conectar ao YouTube
youtube = discovery.build('youtube', 'v3', credentials=creds)

# Listar canais
request = youtube.channels().list(part='snippet', mine=True)
response = request.execute()

print("📺 Seus canais:")
for channel in response['items']:
    print(f"  - {channel['snippet']['title']}")
```

Se isso funcionar, o upload de vídeos também vai funcionar!

---

## ❌ Problemas Comuns

### "invalid_grant"
- ❌ Refresh token expirou
- ✅ Solução: Gere um novo (repita passos 2-4)

### "invalid_client"
- ❌ CLIENT_ID ou CLIENT_SECRET incorretos
- ✅ Solução: Verifique em https://console.cloud.google.com

### "Permission Denied"
- ❌ Sua conta não tem permissão para fazer upload
- ✅ Solução: Use uma conta com canal YouTube verificado

---

## 📚 Referência Rápida

| Variável | Onde Obter | Exemplo |
|----------|-----------|---------|
| `YOUTUBE_CLIENT_ID` | Google Cloud Console | `60097047397-...apps.googleusercontent.com` |
| `YOUTUBE_CLIENT_SECRET` | Google Cloud Console | `GOCSPX-...` |
| `YOUTUBE_REFRESH_TOKEN` | **Este guia (Passos 2-4)** | `1//0gHQyP7bnTz4...` |
| `YOUTUBE_AUTO_PUBLISH` | Ativar upload automático | `true` |
| `YOUTUBE_PRIVACY_STATUS` | Privacidade do vídeo | `private` / `public` / `unlisted` |

---

## ✨ Resumo

Depois que configurar o `YOUTUBE_REFRESH_TOKEN`:

1. ✅ Videos vão ser renderizados automaticamente
2. ✅ Videos vão ser enviados para YouTube automaticamente
3. ✅ Seus clipes vão aparecer no seu canal YouTube!

🎉 **Tudo funcionando end-to-end!**
