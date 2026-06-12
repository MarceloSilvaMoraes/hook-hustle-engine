# 🎬 SETUP - PIPELINE PROFISSIONAL DE THUMBNAILS

## 📋 Requisitos

### Obrigatório
- ✅ Node.js (já instalado)
- ✅ npm (já instalado)
- ✅ FFmpeg (para extração de frames)
- ✅ Sharp (já como dependência)

### Recomendado
- ⭐ Python 3.8+ (para Rembg local)
- ⭐ Remove.bg API Key (fallback quando Rembg falha)

---

## 🚀 Instalação Rápida

### 1️⃣ Verificar FFmpeg

```bash
# Windows
ffmpeg -version

# Se não encontrado, instale:
# Opção A: Chocolatey
choco install ffmpeg

# Opção B: Scoop
scoop install ffmpeg

# Opção C: Baixar manualmente
# Visite: https://ffmpeg.org/download.html
```

### 2️⃣ Instalar Python + Rembg (Opcional mas Recomendado)

```bash
# Instalar Python 3.8+
# Visite: https://www.python.org/downloads/

# Verificar instalação
python --version

# Instalar Rembg
pip install rembg

# Ou com upgrade
pip install --upgrade rembg

# Verificar se funcionou
python -m rembg --version
```

### 3️⃣ (Opcional) Configurar Remove.bg API

```bash
# 1. Criar conta em https://www.remove.bg
# 2. Ir em API → Get API Key
# 3. Copiar a chave e adicionar ao .env

# No arquivo .env da raiz do projeto:
REMOVE_BG_API_KEY=your_api_key_here_abc123xyz

# Salvar e reiniciar o servidor
```

### 4️⃣ Atualizar Build

```bash
# Compilar o projeto
npm run build

# ✅ Deve compilar sem erros
```

---

## ✅ Verificar Setup

```bash
# 1. Verificar FFmpeg
ffmpeg -version
# Output: ffmpeg version X.X.X

# 2. Verificar Python
python --version
# Output: Python 3.X.X

# 3. Verificar Rembg
python -m rembg --help
# Output: usage: rembg [-h] ...

# 4. Verificar que o build não tem erros
npm run build
# Output: ✓ built in X.XXs
```

---

## 📝 Configuração de Arquivo de Ambiente

### Arquivo: `.env` (na raiz do projeto)

```env
# Remove.bg API (OPCIONAL - para fallback quando Rembg falha)
REMOVE_BG_API_KEY=

# Supabase (provavelmente já configurado)
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

### Verificar `.env` existente

```bash
# Ver o arquivo
cat .env

# Ou editar
nano .env
```

---

## 🧪 Testar o Sistema

### Teste 1: Verificar Compilação

```bash
npm run build
# ✅ Procure por: dist/server/assets/thumbnail-professional.functions-*.js
```

### Teste 2: Usar em Código TypeScript

```typescript
import { generateProfessionalThumbnail } from "@/lib/thumbnail-professional.functions";

// Teste com arquivo local
const result = await generateProfessionalThumbnail({
  videoPath: "/caminho/para/seu/video.mp4",
  clipTitle: "TESTE THUMBNAIL",
  clipHook: "Funcionando!",
  triggerType: "humor",
  extractAtSeconds: 2,
  personPositions: ["center"],
  backgroundTemplate: "dark_gradient",
  useAdvancedEffects: true,
});

console.log(result);
// {
//   success: true,
//   thumbnailDataUrl: "data:image/jpeg;base64,...",
//   backgroundMethod: "rembg_local",
//   processingTimeMs: 3450
// }
```

### Teste 3: Via API (Se tiver uma rota)

```bash
# POST /api/thumbnail-professional
curl -X POST http://localhost:5173/api/thumbnail-professional \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath": "/path/to/video.mp4",
    "clipTitle": "TESTE",
    "clipHook": "Funcionando!",
    "triggerType": "humor",
    "extractAtSeconds": 2,
    "personPositions": ["center"],
    "backgroundTemplate": "dark_gradient",
    "useAdvancedEffects": true
  }'
```

---

## 🔍 Troubleshooting

### ❌ "ffmpeg not found"

```bash
# Instalar FFmpeg
choco install ffmpeg  # Windows Chocolatey
brew install ffmpeg   # macOS
apt-get install ffmpeg  # Linux

# Verificar instalação
ffmpeg -version
```

### ❌ "python: command not found"

```bash
# Instalar Python
# Visite: https://www.python.org/downloads/
# IMPORTANTE: Marque "Add Python to PATH" durante a instalação

# Verificar
python --version
```

### ❌ "rembg: No module named rembg"

```bash
# Instalar Rembg
pip install rembg

# Ou se tiver múltiplas versões Python
python -m pip install rembg
python3 -m pip install rembg
```

### ❌ "Remove.bg API 403"

```bash
# Verificar API Key
cat .env | grep REMOVE_BG_API_KEY

# Se vazio, adicione a chave
REMOVE_BG_API_KEY=your_actual_key_here

# Reiniciar o servidor
npm run dev
```

### ⚠️ "Thumbnail muito lenta"

```typescript
// Se levando mais de 5 segundos:

// 1. Verificar se Rembg está funcionando
python -m rembg --help

// 2. Se falhar, sistema usa Remove.bg API (mais rápido)
// Certifique-se que REMOVE_BG_API_KEY está no .env

// 3. Se RemBG falhar também, usa segmentação simples (1-2 segundos)
```

### ⚠️ "Pessoa aparece cortada"

```typescript
// Use posição diferente
personPositions: ["left"]   // Em vez de "center"
// ou
personPositions: ["right"]  // Em vez de "center"

// Ou extraia em segundo diferente
extractAtSeconds: 5  // Em vez de 2
```

---

## 📊 Performance Esperada

| Configuração | Tempo | Qualidade |
|---|---|---|
| Rembg local + Dark Gradient | 3-5s | Excelente |
| Remove.bg API + Vibrant Gradient | 2-4s | Excelente |
| Segmentação simples | 1-2s | Boa |

---

## 🎯 Próximas Verificações

### ✅ Após Setup, Verifique:

1. **FFmpeg**
   ```bash
   ffmpeg -version
   ```

2. **Python/Rembg**
   ```bash
   python -m rembg --help
   ```

3. **Node/npm**
   ```bash
   npm --version
   npm run build
   ```

4. **Arquivo .env**
   ```bash
   cat .env | grep REMOVE_BG
   ```

5. **Build sem erros**
   ```bash
   npm run build 2>&1 | grep -i error
   ```

---

## 📚 Recursos Adicionais

- **FFmpeg Manual:** https://ffmpeg.org/documentation.html
- **Rembg Docs:** https://github.com/danielgatis/rembg
- **Remove.bg API:** https://www.remove.bg/api
- **Sharp Docs:** https://sharp.pixelplumbing.com/

---

## 🔄 Próximo Passo

Após completar a instalação:

```bash
# 1. Compilar
npm run build

# 2. Começar desenvolvimento
npm run dev

# 3. Testar novo sistema em clips.functions.ts
# Irá usar generateProfessionalThumbnail automaticamente
```

---

**Status:** ✅ Setup Completo  
**Última atualização:** 2026-06-11

---

## ❓ Dúvidas?

Se o sistema não funcionar:

1. Verifique que **FFmpeg está instalado** e no PATH
2. Verifique que **Python/Rembg está funcional**
3. Se Remove.bg está habilitado, verifique **API Key no .env**
4. Rode `npm run build` novamente para recompilar
5. Verifique **console do navegador** para erros detalhados

Pronto! Sistema está operacional! 🚀
