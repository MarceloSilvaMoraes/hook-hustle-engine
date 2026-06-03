import { useState } from "react";
import { Copy, Check, ChevronDown, Play } from "lucide-react";
import type { ViralClip } from "@/lib/clips.functions";

const TRIGGER_LABELS: Record<string, string> = {
  hook: "The Hook",
  cliffhanger: "Cliffhanger",
  high_value: "High Value",
  controversy: "Controversy",
  emotional: "Emotional",
  humor: "Humor",
};

interface Props {
  clip: ViralClip;
  index: number;
  onPlay?: (clip: ViralClip) => void;
}

export function ClipCard({ clip, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isTop = index === 0;
  const scoreColor = clip.score >= 90 ? "border-primary" : clip.score >= 75 ? "border-primary/60" : "border-border";

  const copyAll = () => {
    const text = `${clip.title}
${clip.startTimestamp} → ${clip.endTimestamp} (${clip.durationSeconds}s)

HOOK: ${clip.hookQuote}

JUSTIFICATIVA: ${clip.justification}

LEGENDAS: ${clip.captionStyle}
B-ROLL: ${clip.brollSuggestion}

TRECHO: "${clip.transcriptExcerpt}"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="group bg-surface border border-border rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 animate-entry flex flex-col"
      style={{ animationDelay: `${200 + index * 100}ms` }}
    >
      <div className="flex justify-between items-start mb-6">
        <div className={`size-16 rounded-full border-4 ${scoreColor} grid place-items-center shrink-0`}>
          <span className="font-display text-2xl leading-none">{clip.score}</span>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Timestamp</div>
          <div className="font-mono text-sm text-primary">
            {clip.startTimestamp} → {clip.endTimestamp}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground mt-1">
            {clip.durationSeconds}s
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors">
        {isTop && <span className="text-primary mr-1">★</span>}
        {clip.title}
      </h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {clip.triggers.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider"
          >
            {TRIGGER_LABELS[t] ?? t}
          </span>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mb-4 italic font-mono bg-black/40 p-3 rounded line-clamp-3">
        "{clip.hookQuote}"
      </p>

      <div className="space-y-3 mb-4">
        <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
          Viral Justification
        </div>
        <p className="text-xs leading-relaxed opacity-80">{clip.justification}</p>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-auto flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-primary hover:text-primary/80 transition-colors pt-3 border-t border-border"
      >
        <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "Recolher direção" : "Direção visual"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 text-xs animate-entry">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
              Legendas dinâmicas
            </div>
            <p className="opacity-80 leading-relaxed">{clip.captionStyle}</p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
              B-Roll / Emojis
            </div>
            <p className="opacity-80 leading-relaxed">{clip.brollSuggestion}</p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
              Trecho da transcrição
            </div>
            <p className="opacity-70 italic font-mono leading-relaxed bg-black/40 p-3 rounded">
              {clip.transcriptExcerpt}
            </p>
          </div>
          <button
            onClick={copyAll}
            className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-display text-xs uppercase tracking-widest py-2.5 rounded-lg transition-all"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copiado" : "Copiar briefing"}
          </button>
        </div>
      )}
    </div>
  );
}
