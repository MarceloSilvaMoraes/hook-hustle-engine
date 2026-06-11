import { useState, useEffect } from "react";
import { X, RotateCcw, Save, Type, Paintbrush, Smile, Award, AlignJustify, Check, Sparkles, Zap } from "lucide-react";
import type { ViralClip } from "@/lib/clips.functions";
import {
  ThumbnailCanvas,
  COLOR_SCHEMES,
  getDefaultConfig,
  type ThumbnailConfig,
} from "./ThumbnailCanvas";

interface ThumbnailEditorModalProps {
  clip: ViralClip;
  initialConfig?: ThumbnailConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string, config: ThumbnailConfig) => void;
  youtubeThumbnailDataUrl?: string | null;
}

const COMMON_EMOJIS = [
  "😂", "🤯", "❤️", "👀", "💎", "🔥", "💀", "🚨", "📈", "🧠", "🤫", "😱", "👇", "💡", "⚠️", "👑", "🚀", "💰"
];

export function ThumbnailEditorModal({
  clip,
  initialConfig,
  isOpen,
  onClose,
  onSave,
  youtubeThumbnailDataUrl,
}: ThumbnailEditorModalProps) {
  const [config, setConfig] = useState<ThumbnailConfig>(() => 
    initialConfig || getDefaultConfig(clip)
  );
  const [currentDataUrl, setCurrentDataUrl] = useState<string>("");

  // Sync state if initialConfig changes
  useEffect(() => {
    if (isOpen) {
      setConfig(initialConfig || getDefaultConfig(clip));
    }
  }, [isOpen, initialConfig, clip]);

  if (!isOpen) return null;

  const handleReset = () => {
    setConfig(getDefaultConfig(clip));
  };

  const handleSave = () => {
    if (currentDataUrl) {
      onSave(currentDataUrl, config);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto md:h-[680px] max-h-[95vh] md:max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white transition-all hover:scale-105"
        >
          <X className="size-5" />
        </button>

        {/* Left Side: Live Preview Panel */}
        <div className="flex-1 bg-zinc-900/40 p-6 md:p-8 flex flex-col items-center justify-center border-r border-zinc-900/60 min-h-[300px] md:min-h-0">
          <div className="w-full max-w-[560px] space-y-4">
            <div className="text-center md:text-left">
              <span className="text-[10px] font-mono tracking-widest text-primary uppercase font-bold">
                Visualização ao Vivo
              </span>
              <h2 className="text-xl font-bold text-white mt-1">Sua Thumbnail (1280x720)</h2>
            </div>
            
            {/* The scaled down Canvas preview */}
            <div className="shadow-2xl rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950 p-1">
              <ThumbnailCanvas
                clip={clip}
                config={config}
                onExport={setCurrentDataUrl}
                width={540}
                youtubeThumbnailDataUrl={youtubeThumbnailDataUrl}
              />
            </div>
            
            <p className="text-center text-xs text-zinc-500 font-mono">
              O canvas acima é renderizado nativamente em alta resolução para o YouTube.
            </p>
          </div>
        </div>

        {/* Right Side: Edit Controls Panel */}
        <div className="w-full md:w-[400px] bg-zinc-950 p-6 md:p-8 flex flex-col justify-between overflow-y-auto h-auto md:h-full">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Editor de Thumbnail</h3>
              <p className="text-xs text-zinc-400 mt-1">Personalize o visual e textos do seu clipe.</p>
            </div>

            <hr className="border-zinc-800/60" />

            {/* Title Control */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <Type className="size-3.5 text-primary" />
                Título Principal
              </label>
              <textarea
                value={config.titleText}
                onChange={(e) => setConfig((prev) => ({ ...prev, titleText: e.target.value }))}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none h-20 font-sans font-medium"
                placeholder="Título vibrante e curto..."
                maxLength={80}
              />
              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                <span>Dica: Use palavras fortes</span>
                <span>{config.titleText.length}/80</span>
              </div>
            </div>

            {/* Subtext Control */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <Type className="size-3.5 text-emerald-500" />
                Subtítulo (Gatilho)
              </label>
              <input
                type="text"
                value={config.subText}
                onChange={(e) => setConfig((prev) => ({ ...prev, subText: e.target.value }))}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-sans"
                placeholder="Frase de impacto inferior..."
                maxLength={60}
              />
              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                <span>Será envolto em aspas</span>
                <span>{config.subText.length}/60</span>
              </div>
            </div>

            {/* Color Scheme Picker */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <Paintbrush className="size-3.5 text-amber-500" />
                Tema de Cores
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(COLOR_SCHEMES).map(([key, info]) => {
                  const isSelected = config.colorScheme === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setConfig((prev) => ({ ...prev, colorScheme: key }))}
                      className={`relative overflow-hidden rounded-xl border p-2 text-left transition-all duration-200 hover:scale-[1.02] ${
                        isSelected 
                          ? "border-white bg-zinc-900" 
                          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
                      }`}
                    >
                      {/* Gradient preview bar */}
                      <div 
                        className="h-2 w-full rounded-full mb-1.5"
                        style={{ background: `linear-gradient(90deg, ${info.colors[0]}, ${info.colors[1]})` }}
                      />
                      <span className="block text-[10px] font-bold text-white leading-tight truncate">
                        {info.label}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 size-3.5 bg-white text-black rounded-full grid place-items-center">
                          <Check className="size-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emoji Control */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <Smile className="size-3.5 text-rose-500" />
                Emoji Decorativo
              </label>
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                {COMMON_EMOJIS.map((emoji) => {
                  const isSelected = config.emoji === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => setConfig((prev) => ({ ...prev, emoji }))}
                      className={`size-8 text-lg rounded-lg transition-all hover:scale-110 active:scale-95 ${
                        isSelected 
                          ? "bg-zinc-800 border border-zinc-600 shadow" 
                          : "hover:bg-zinc-800/40"
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Score & Layout Controls */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              {/* Show Score badge toggle */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <Award className="size-3 text-cyan-500" />
                  Score Badge
                </label>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, showScore: !prev.showScore }))}
                  className={`w-full py-2 px-3 text-xs rounded-xl font-bold border transition-all ${
                    config.showScore
                      ? "bg-zinc-900 border-zinc-700 text-white"
                      : "bg-transparent border-zinc-900 text-zinc-500 hover:border-zinc-800"
                  }`}
                >
                  {config.showScore ? "Exibir Badge" : "Ocultar Badge"}
                </button>
              </div>

              {/* Text Alignment */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <AlignJustify className="size-3 text-violet-500" />
                  Alinhamento
                </label>
                <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
                  {(["top", "center", "bottom"] as const).map((pos) => {
                    const isSelected = config.textPosition === pos;
                    return (
                      <button
                        key={pos}
                        onClick={() => setConfig((prev) => ({ ...prev, textPosition: pos }))}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg uppercase transition-all ${
                          isSelected 
                            ? "bg-zinc-800 text-white shadow-sm" 
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {pos === "top" ? "Topo" : pos === "center" ? "Meio" : "Base"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Viral Effects Section */}
            <div className="border-t border-zinc-800/60 pt-4">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="size-3.5 text-yellow-500" />
                Efeitos Virais
              </h4>
              
              {/* Border Style */}
              <div className="space-y-2 mb-4">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  <Zap className="size-3 inline mr-1" />
                  Estilo de Borda
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["solid", "neon", "double", "gradient", "none"] as const).map((style) => {
                    const enhancements = config.enhancements || {};
                    const isSelected = (enhancements.borderStyle || "gradient") === style;
                    return (
                      <button
                        key={style}
                        onClick={() => setConfig((prev) => ({
                          ...prev,
                          enhancements: {
                            ...prev.enhancements,
                            borderStyle: style,
                          },
                        }))}
                        className={`py-1.5 px-2 text-[10px] rounded-lg font-bold transition-all ${
                          isSelected
                            ? "bg-zinc-800 text-white border border-zinc-600"
                            : "border border-zinc-900 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {style === "solid" ? "Sólido" : style === "neon" ? "Neon" : style === "double" ? "Duplo" : style === "gradient" ? "Gradiente" : "Nenhum"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Corner Badge */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Badge de Canto
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["score", "new", "hot", "trending", "exclusive", null] as const).map((badge) => {
                    const enhancements = config.enhancements || {};
                    const isSelected = (enhancements.cornerBadges || "score") === badge;
                    const badgeLabels: Record<string, string> = {
                      score: "Score",
                      new: "Novo",
                      hot: "Hot",
                      trending: "Tendência",
                      exclusive: "Exclusivo",
                      none: "Nenhum",
                    };
                    return (
                      <button
                        key={badge || "none"}
                        onClick={() => setConfig((prev) => ({
                          ...prev,
                          enhancements: {
                            ...prev.enhancements,
                            cornerBadges: badge,
                          },
                        }))}
                        className={`py-1.5 px-2 text-[10px] rounded-lg font-bold transition-all ${
                          isSelected
                            ? "bg-zinc-800 text-white border border-zinc-600"
                            : "border border-zinc-900 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {badgeLabels[badge || "none"]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8 pt-4 border-t border-zinc-800/60">
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all active:scale-[0.98]"
              title="Restaurar padrão"
            >
              <RotateCcw className="size-3.5" />
              Resetar
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-900 bg-transparent text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900/30 transition-all active:scale-[0.98]"
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary/10"
            >
              <Save className="size-3.5" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
