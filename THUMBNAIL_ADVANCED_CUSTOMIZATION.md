# 🔧 Exemplos de Customização Avançada

Se você quer ir além dos presets, aqui estão exemplos de como customizar seus efeitos virais!

## 📝 Exemplos de Código

### 1. Criar um Preset Personalizado

```typescript
import { ThumbnailEnhancements } from "@/lib/thumbnail-effects";

// Seu preset custom
const meuPresetCustom: ThumbnailEnhancements = {
  characterHighlights: [
    {
      x: 0.2,      // 20% do width
      y: 0.35,     // 35% do height
      width: 0.28, // largura do destaque
      height: 0.5, // altura do destaque
      intensity: "high",
      style: "neon-box", // 'box' | 'halo' | 'spotlight' | 'neon-box'
    },
  ],
  visualEffects: [
    {
      type: "explosion",
      x: 0.15,
      y: 0.2,
      size: 0.15,
      color: "#FFD700",
      opacity: 0.9,
    },
    {
      type: "lightning",
      x: 0.85,
      y: 0.3,
      size: 0.15,
      color: "#FFAA00",
      thickness: 4,
    },
  ],
  cornerBadges: "hot",
  borderStyle: "neon",
  borderThickness: 12,
  useGlowEffect: true,
  characterBoxColor: "#FFD700",
};
```

### 2. Adicionar Múltiplos Personagens

```typescript
// Dois personagens, um com halo, outro com spotlight

const multiPersonagensPreset: ThumbnailEnhancements = {
  characterHighlights: [
    {
      x: 0.15,
      y: 0.35,
      width: 0.25,
      height: 0.5,
      intensity: "high",
      style: "halo",
      label: "Personagem 1",
    },
    {
      x: 0.65,
      y: 0.35,
      width: 0.25,
      height: 0.5,
      intensity: "high",
      style: "spotlight",
      label: "Personagem 2",
    },
  ],
  visualEffects: [
    {
      type: "directional-arrow",
      x: 0.15,    // Começa em personagem 1
      y: 0.6,
      targetX: 0.65, // Aponta para personagem 2
      targetY: 0.6,
      color: "#FF0000",
      thickness: 6,
    },
  ],
  cornerBadges: "trending",
  borderStyle: "gradient",
  borderThickness: 14,
  useGlowEffect: true,
  characterBoxColor: "#FF0000",
};
```

### 3. Efeitos Combinados Agressivos

```typescript
// Máximo impacto viral - use com moderação!

const agressivoPreset: ThumbnailEnhancements = {
  characterHighlights: [
    {
      x: 0.22,
      y: 0.3,
      width: 0.28,
      height: 0.55,
      intensity: "high",
      style: "neon-box",
    },
  ],
  visualEffects: [
    // Explosion ao redor
    {
      type: "explosion",
      x: 0.22,
      y: 0.15,
      size: 0.2,
      color: "#FF0000",
      opacity: 0.95,
    },
    // Pulse rings
    {
      type: "pulse-ring",
      x: 0.22,
      y: 0.57,
      size: 0.18,
      color: "#FF0000",
      thickness: 5,
    },
    // Lightning bolts
    {
      type: "lightning",
      x: 0.08,
      y: 0.25,
      size: 0.2,
      color: "#FFAA00",
      thickness: 5,
    },
    {
      type: "lightning",
      x: 0.85,
      y: 0.35,
      size: 0.18,
      color: "#FFAA00",
      thickness: 5,
    },
    // Seta de impacto
    {
      type: "arrow",
      x: 0.5,
      y: 0.8,
      size: 0.25,
      color: "#FFFF00",
      rotation: -90,
      opacity: 0.85,
      thickness: 6,
    },
  ],
  cornerBadges: "trending",
  borderStyle: "neon",
  borderThickness: 16,
  useGlowEffect: true,
  characterBoxColor: "#FF0000",
};
```

### 4. Estilo Minimalista (Contrário)

```typescript
// Menos é mais - elegância na simplicidade

const minimalistaPreset: ThumbnailEnhancements = {
  characterHighlights: [
    {
      x: 0.25,
      y: 0.35,
      width: 0.5,
      height: 0.5,
      intensity: "medium",
      style: "box",
    },
  ],
  visualEffects: [
    {
      type: "circle",
      x: 0.85,
      y: 0.5,
      size: 0.08,
      color: "#FFFFFF",
      thickness: 2,
      opacity: 0.6,
    },
  ],
  cornerBadges: null, // Sem badge
  borderStyle: "solid",
  borderThickness: 2,
  useGlowEffect: false,
  characterBoxColor: "#FFFFFF",
};
```

### 5. Padrões de Cores

```typescript
// Cores que funcionam bem em diferentes contextos

const corSchemes = {
  // Energético
  energetico: {
    primary: "#FF0000",
    secondary: "#FFD700",
    tertiary: "#FFAA00",
  },
  
  // Elegante
  elegante: {
    primary: "#6B0066",
    secondary: "#FF00FF",
    tertiary: "#FF69B4",
  },
  
  // Confiança
  confianca: {
    primary: "#0066FF",
    secondary: "#00CCFF",
    tertiary: "#1E90FF",
  },
  
  // Prosperidade
  prosperidade: {
    primary: "#00CC00",
    secondary: "#00FF00",
    tertiary: "#32CD32",
  },
  
  // Urgência
  urgencia: {
    primary: "#FF4500",
    secondary: "#FF6600",
    tertiary: "#FF8C00",
  },
};
```

## 🎬 Receitas Prontas

### Receita: "Choque e Awe"
```typescript
{
  estilo: "neon-box",
  personagens: 1,
  cores: "vermelho + amarelo",
  efeitos: ["explosion", "pulse-ring", "lightning"],
  badge: "TRENDING",
}
```

### Receita: "Curiosidade"
```typescript
{
  estilo: "spotlight",
  personagens: 1,
  cores: "azul + ciano",
  efeitos: ["arrow", "circle"],
  badge: "NEW",
}
```

### Receita: "Drama"
```typescript
{
  estilo: "halo",
  personagens: 1,
  cores: "roxo + magenta",
  efeitos: ["glow"],
  badge: "EXCLUSIVE",
}
```

### Receita: "Sucesso"
```typescript
{
  estilo: "neon-box",
  personagens: 1,
  cores: "verde + ouro",
  efeitos: ["star", "pulse-ring"],
  badge: "TRENDING",
}
```

## 🎨 Guia de Posicionamento

### Layouts Eficientes:

```
LAYOUT 1: Personagem Centro-Esquerda
┌─────────────────────────────┐
│         [TEXTO]             │
│  ╔═══════╗                  │
│  ║       ║ 😂 EMOJI         │
│  ║ PESSOA║                  │
│  ╚═══════╝                  │
│         "FRASE"             │
└─────────────────────────────┘

LAYOUT 2: Personagem Centro
┌─────────────────────────────┐
│    ┌─────────────────┐      │
│    │ [TÍTULO GRANDE]│      │
│    │      PESSOA    │      │
│    │      AQUI      │ 🔥   │
│    │  "subtítulo"   │      │
│    └─────────────────┘      │
└─────────────────────────────┘

LAYOUT 3: Dois Personagens
┌─────────────────────────────┐
│ ╔═════╗    ╔═════╗  🔥     │
│ ║PESS1║ VS ║PESS2║        │
│ ╚═════╝    ╚═════╝        │
│    BATALHA ÉPICA!          │
└─────────────────────────────┘
```

## 📊 Dicas de Debug

### Verificar Posicionamento:
```typescript
// Se o efeito não aparecer, verifique:
console.log("Highlight x:", highlight.x); // Deve ser 0-1
console.log("Highlight y:", highlight.y); // Deve ser 0-1
console.log("Canvas width:", canvasWidth); // Deve ser 1280
console.log("Canvas height:", canvasHeight); // Deve ser 720
```

### Teste de Cores:
```typescript
// Teste diferentes cores com hex válido
const coresValidas = [
  "#FF0000", // Vermelho
  "#00FF00", // Verde
  "#0000FF", // Azul
  "#FFFF00", // Amarelo
  "#FF00FF", // Magenta
];
```

## 🚀 Performance Tips

1. **Limite de efeitos:** Máximo 4-5 efeitos simultâneos
2. **Thickness:** Mantenha entre 2-6 para clareza
3. **Opacity:** Use 0.7-0.95 para visibilidade
4. **Size:** Mantenha relativamente ao canvas (0.1-0.3)

## 🎯 Quando Usar Cada Estilo

| Estilo | Melhor Para | Contexto |
|--------|-----------|---------|
| **Spotlight** | Foco e drama | Mistério, suspense |
| **Halo** | Importância | Emocional, épico |
| **Neon Box** | Modernidade | Tech, viral |
| **Box** | Profissionalismo | Sérios, educação |

---

**Dica Final:** Sempre teste em dispositivos diferentes antes de publicar! 📱💻
