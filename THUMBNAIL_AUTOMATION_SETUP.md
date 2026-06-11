# 🎬 Sistema Automatizado de Geração de Thumbnails

## 📋 Guia de Instalação e Uso

### ⚙️ Dependências Necessárias

#### 1. **FFmpeg** (Extração de Frames)
Necesário para extrair frames em alta qualidade do vídeo

**Windows:**
```bash
# Via Chocolatey
choco install ffmpeg

# Ou baixe em: https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

#### 2. **Python + Rembg** (Remoção de Fundo - Opcional)
Para remover fundo automaticamente (local)

```bash
# Instalar Python 3.8+
# Depois:
pip install rembg[cpu]

# Ou com GPU (CUDA):
pip install rembg[gpu]
```

**OU use a API Remove.bg (sem instalar)** - veja seção `.env`

#### 3. **Node Packages** (Já tem no package.json)
```bash
npm install sharp  # ou já está instalado
```

---

### 🔧 Configuração do Projeto

#### 1. Atualizar `package.json`

Verifique se `sharp` já está instalado:

```bash
npm install sharp
```

#### 2. Configurar Variáveis de Ambiente (`.env`)

**Opção A: Usar Rembg Local (Recomendado - Grátis)**
```env
# Não precisa de configuração, usa Python local
# Certifique-se que Rembg está instalado: pip install rembg[cpu]
```

**Opção B: Usar Remove.bg API (Pago, mas mais rápido)**
```env
REMOVE_BG_API_KEY=tua_chave_api_aqui
# Gera em: https://www.remove.bg/api
# 50 créditos grátis por mês
```

#### 3. Criar Diretório Temporário

O sistema cria automaticamente em:
```
tmp/thumbnails/  (arquivos temporários)
```

---

### 🚀 Como Usar

#### Opção 1: **Geração Completa (Remover Fundo + Compor)**

```typescript
import { generateThumbnailAutomatic } from "@/lib/thumbnail-generation.functions";

// No seu componente/rota React:
const result = await generateThumbnailAutomatic({
  videoPath: "/path/to/video.mp4",
  clipTitle: "RONALDINHO FORA DE SI",
  clipHook: "Não é possível isso!",
  triggerType: "humor",
  extractAtSeconds: 2.5, // Qual segundo do vídeo extrair
  personPosition: "center", // left, center, ou right
});

if (result.success) {
  console.log("✅ Thumbnail gerada:", result.thumbnailDataUrl);
} else {
  console.error("❌ Erro:", result.error);
}
```

#### Opção 2: **Versão Rápida (Sem Remover Fundo)**

Mais rápido, ideal para testes:

```typescript
import { generateThumbnailQuick } from "@/lib/thumbnail-generation.functions";

const result = await generateThumbnailQuick({
  videoPath: "/path/to/video.mp4",
  clipTitle: "MAURO CEZAR EXPLODE",
  clipHook: "Que absurdo!",
  triggerType: "controversy",
  extractAtSeconds: 3,
  personPosition: "left",
});
```

#### Opção 3: **Com API Remove.bg**

Se tiver chave de API:

```typescript
import { generateThumbnailWithRemoveBgApi } from "@/lib/thumbnail-generation.functions";

const result = await generateThumbnailWithRemoveBgApi({
  videoPath: "/path/to/video.mp4",
  clipTitle: "COISA MALUCA",
  clipHook: "Você não vai acreditar",
  triggerType: "high_value",
  extractAtSeconds: 2,
  personPosition: "center",
});
```

---

### 📊 Tipos de Gatilho e Estilos

| Gatilho | Cores | Emoji | Melhor Para |
|---------|-------|-------|-----------|
| `humor` | Laranja/Ouro | 😂 | Vídeos engraçados |
| `controversy` | Vermelho | 🔥 | Vídeos polêmicos |
| `emotional` | Roxo/Magenta | ❤️ | Vídeos emocionais |
| `hook` | Azul/Ciano | 👀 | Ganchos intrigantes |
| `high_value` | Verde | 💎 | Dicas/valor |
| `cliffhanger` | Laranja/Âmbar | 🔥 | Suspense |

---

### 🎨 Posições de Pessoa

```
"left"   → Pessoa na esquerda (70px do lado)
"center" → Pessoa no centro
"right"  → Pessoa na direita
```

---

### 📸 Exemplo Completo (UI React)

```typescript
import { useState } from "react";
import { generateThumbnailAutomatic } from "@/lib/thumbnail-generation.functions";

export function ThumbnailGenerator({ clip }) {
  const [loading, setLoading] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateThumbnailAutomatic({
        videoPath: clip.videoPath,
        clipTitle: clip.title,
        clipHook: clip.hookQuote,
        triggerType: clip.triggers[0],
        extractAtSeconds: 2,
        personPosition: "center",
      });

      if (result.success) {
        setThumbnail(result.thumbnailDataUrl);
      } else {
        alert("Erro: " + result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Gerando..." : "Gerar Thumbnail"}
      </button>
      {thumbnail && <img src={thumbnail} alt="Thumbnail" width={320} />}
    </div>
  );
}
```

---

### 🔍 Troubleshooting

#### ❌ "FFmpeg not found"
```bash
# Windows: Adicione FFmpeg ao PATH
# macOS/Linux: sudo apt-get install ffmpeg (ou brew)
# Teste: ffmpeg -version
```

#### ❌ "Rembg not found"
```bash
# Instale Python:
pip install rembg[cpu]

# Ou use a API Remove.bg em vez disso
```

#### ❌ "Sharp module not found"
```bash
npm install sharp
# Se tiver problemas com build nativo:
npm install --save-dev @mapbox/node-pre-gyp
npm rebuild sharp
```

#### ❌ "Imagem muito grande" ou "Timeout"
- Reduza qualidade: mude `q:v 2` para `q:v 5` em FFmpeg
- Use versão rápida: `generateThumbnailQuick()`
- Comprima vídeo de entrada antes

---

### ⚡ Otimizações

#### 1. Cache de Imagens
```typescript
// Salve resultado em cache para não regenerar
const cacheKey = `thumb_${clip.id}`;
const cached = cache.get(cacheKey);
if (cached) return cached;

const result = await generateThumbnailAutomatic(...);
cache.set(cacheKey, result.thumbnailDataUrl);
```

#### 2. Processamento em Background
```typescript
// Use job queue (Bull, RabbitMQ, etc)
await thumbnailQueue.add({
  videoPath,
  clipTitle,
  triggerType,
});
```

#### 3. Múltiplos Formatos
```typescript
// Gere versões para diferentes plataformas
const formats = {
  youtube: { width: 1280, height: 720 },
  instagram: { width: 1080, height: 1350 },
  tiktok: { width: 1080, height: 1920 },
};
```

---

### 📈 Fluxo de Integração Recomendado

```
1. Usuário cria clipe (análise IA)
   ↓
2. Sistema extrai frame automático
   ↓
3. Rembg remove fundo (local) ou API
   ↓
4. Composição com Sharp
   ↓
5. Salva no Supabase Storage
   ↓
6. Exibe em editor de thumbnail
   ↓
7. Usuário pode editar ou usar direto
```

---

### 🎯 Próximos Passos

1. **Instale as dependências:**
   ```bash
   npm install sharp
   pip install rembg[cpu]  # ou pule se usar API
   ```

2. **Configure `.env`:**
   ```env
   # Deixe vazio se usar Rembg local
   # Ou adicione chave do Remove.bg
   ```

3. **Integre no seu workflow:**
   - Chame `generateThumbnailAutomatic()` após criar clipe
   - Ou adicione botão manual no editor

4. **Teste:**
   ```bash
   npm run dev
   # Tente gerar uma thumbnail de um dos seus vídeos
   ```

---

### 💡 Exemplos de Resultados

```
Input:  Video do Ronaldinho rindo
Output: Thumbnail 1280x720 com:
  - Frame do rosto do Ronaldinho (sem fundo)
  - Fundo laranja/ouro gradiente
  - Texto "RONALDINHO FORA DE SI"
  - Hook em amarelo: "Que ridículo!"
  - Emoji 😂 no canto
  - Borda neon brilhante
```

---

**🚀 Agora suas thumbnails são geradas automaticamente e parecem profissionais!**
