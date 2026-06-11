# ✅ Guia Prático de Testes - Thumbnail System

## 🚀 Início Rápido

Você está **95% pronto** para testar. Basta 3 coisas:

### 1️⃣ Executar Migration SQL (5 minutos)

Copie o conteúdo de `supabase/20260611_thumbnail_optimization.sql` e execute no Supabase:

```bash
# Via CLI
supabase db push

# OU manualmente:
# 1. Acesse: https://app.supabase.com/project/[seu-projeto]/sql
# 2. Cole o SQL
# 3. Execute
```

**O que será criado:**
- ✅ Tabela `thumbnail_cache` (para armazenar thumbnails)
- ✅ Tabela `thumbnail_webhooks` (para notificações)
- ✅ Tabela `thumbnail_processing_logs` (para analytics)

### 2️⃣ Criar Bucket de Storage (2 minutos)

No Supabase Dashboard:
1. Vá para **Storage** → **Create new bucket**
2. Nome: `videos`
3. Deixar público (política padrão)
4. Create

### 3️⃣ Verificar Dependências (1 minuto)

```bash
# FFmpeg
ffmpeg -version

# Sharp (deve estar em node_modules/)
ls node_modules/sharp

# Python + Rembg (opcional)
python -c "import rembg; print('✅ Rembg pronto')"
```

---

## 🧪 Testes

### Teste 1: Geração Simples

**Setup:** Vídeo local no seu PC

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Fazer requisição
curl -X POST http://localhost:3000/api/generateThumbnailOptimized \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath": "/path/to/your/video.mp4",
    "clipTitle": "PLOT TWIST INCRÍVEL",
    "clipHook": "Você não vai acreditar no final",
    "triggerType": "cliffhanger",
    "personPosition": "center",
    "autoUploadToSupabase": false
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "thumbnailDataUrl": "data:image/jpeg;base64,...",
  "fromCache": false,
  "processingTimeMs": 12450,
  "source": "generated_and_optimized"
}
```

---

### Teste 2: Geração com URL Remota

**Setup:** Usar vídeo da internet

```bash
curl -X POST http://localhost:3000/api/generateThumbnailOptimized \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath": "https://example.com/video.mp4",
    "clipTitle": "REAÇÃO VIRAL",
    "clipHook": "Confira como reagi",
    "triggerType": "humor",
    "autoUploadToSupabase": true
  }'
```

**Fluxo:**
1. ✅ Download do vídeo remoto
2. ✅ Upload para Supabase Storage
3. ✅ Extração de frame
4. ✅ Remoção de fundo
5. ✅ Composição com texto
6. ✅ Retorna thumbnail

**Tempo esperado:** 15-20 segundos (primeira vez)

---

### Teste 3: Cache Hit

**Setup:** Chamar a MESMA requisição 2x

```bash
# Primeira vez (sem cache)
curl -X POST http://localhost:3000/api/generateThumbnailOptimized \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath": "https://example.com/video.mp4",
    "clipTitle": "REAÇÃO VIRAL",
    "clipHook": "Confira como reagi",
    "triggerType": "humor"
  }'
# Resposta: processingTimeMs: ~15000

# Segunda vez (COM cache)
curl -X POST http://localhost:3000/api/generateThumbnailOptimized \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath": "https://example.com/video.mp4",
    "clipTitle": "REAÇÃO VIRAL",
    "clipHook": "Confira como reagi",
    "triggerType": "humor"
  }'
# Resposta: processingTimeMs: ~50, fromCache: true
```

**Resultado esperado:**
- 🚀 **99% mais rápido** (15000ms → 50ms)

---

### Teste 4: Webhook Notifications

**Setup:** Registrar webhook e escutar eventos

```bash
# Terminal 3: Escutar webhooks (exemplo com ngrok)
ngrok http 3001
# → Gera URL tipo: https://abc123.ngrok.io

# Terminal 2: Registrar webhook
curl -X POST http://localhost:3000/api/registerThumbnailWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://abc123.ngrok.io/webhook",
    "event": "thumbnail_generated"
  }'

# Resposta:
# {"success": true, "webhookId": "..."}

# Terminal 1 (seu servidor escutando):
# POST /webhook
# {
#   "event": "thumbnail_generated",
#   "clipTitle": "PLOT TWIST",
#   "timestamp": 1718019234000,
#   "processingTimeMs": 12450,
#   "hasImage": true
# }
```

---

## 🎯 Fluxo Completo Web (Integração)

### Cenário: Usuário faz upload de vídeo no seu app

```
Frontend:
1. Usuário faz upload de vídeo (FormData)
2. Backend recebe e salva localmente ou em S3
3. Chama analyzeTranscript com videoUrl

Backend (clips.functions.ts):
1. IA analisa transcrição → gera 5 clipes
2. Para cada clipe:
   - Chama generateThumbnailOptimized()
   - ← Automático: cache + upload + webhook!
3. Retorna clipes com thumbnails

Frontend:
1. Recebe clipes com thumbnailDataUrl
2. Renderiza em tempo real!
3. User pode:
   - Editar (ThumbnailEditorModal)
   - Exportar
   - Publicar
```

---

## 📊 Métricas Esperadas

| Métrica | Valor | Status |
|---------|-------|--------|
| **Cache hit** | ~50ms | ⚡ Ultra-rápido |
| **Primeira geração** | 15-20s | ✅ Aceitável |
| **Com Supabase Storage** | 8-12s | 🚀 Otimizado |
| **Webhook latência** | ~100ms | ✅ Tempo real |
| **Taxa de sucesso** | 95%+ | ✅ Confiável |

---

## 🐛 Troubleshooting

### ❌ "FFmpeg not found"
```bash
# Windows
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg

# Verificar
ffmpeg -version
```

### ❌ "Rembg module not found"
```bash
# Opção 1: Instalar Rembg local
pip install rembg[cpu]

# Opção 2: Usar Remove.bg API (sem Python)
# Configure no .env:
REMOVE_BG_API_KEY=sua_chave_aqui
```

### ❌ "Sharp compilation failed"
```bash
# Reinstalar Sharp com bindings nativos
npm install --save sharp --build-from-source

# Ou
npm install --save sharp@latest
```

### ❌ "Supabase connection failed"
```bash
# Verificar .env
grep SUPABASE env.env

# Testar conexão
curl -X GET \
  "https://[seu-projeto].supabase.co/rest/v1/thumbnail_cache?limit=1" \
  -H "apikey: [sua-chave]" \
  -H "Authorization: Bearer [sua-chave]"
```

### ❌ "Storage bucket not found"
```bash
# Criar bucket via CLI
supabase storage buckets create videos

# Ou manualmente no dashboard:
# Storage → Create new bucket → Name: videos
```

---

## ✅ Checklist Pré-Teste

- [ ] FFmpeg instalado e no PATH
- [ ] Node modules instalados (`npm install`)
- [ ] Sharp compilado com sucesso
- [ ] `.env` preenchido com Supabase
- [ ] Migration SQL executada
- [ ] Bucket "videos" criado no Supabase
- [ ] Servidor rodando (`npm run dev`)
- [ ] Teste simples funcionando (curl)
- [ ] Cache funcionando (2x mesma requisição)
- [ ] Webhook registrado (opcional)

---

## 🚀 Próximos Passos Após Teste

1. **Integrar em clips.functions.ts**
   ```typescript
   import { generateThumbnailOptimized } from "./thumbnail-optimization.functions";
   
   // Já está pronto no código!
   ```

2. **Testar fluxo completo da web**
   - Upload vídeo → IA analisa → thumbnails geradas automáticas

3. **Configurar webhooks para seu sistema**
   - Receber notificações quando thumbnail ficar pronta
   - Atualizar UI em tempo real

4. **Monitorar performance**
   - Cache hit rate
   - Tempo médio de geração
   - Taxa de sucesso

---

## 📞 Suporte

Qualquer dúvida:
1. Verifique os logs do servidor (`npm run dev` mostra tudo)
2. Procure em `THUMBNAIL_OPTIMIZATION.md` (documentação completa)
3. Cheque este guia novamente

**Boa sorte com os testes! 🎬**
