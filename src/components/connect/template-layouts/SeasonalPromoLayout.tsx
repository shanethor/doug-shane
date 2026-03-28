import type { TemplateCanvasProps } from "../TemplateEditor";

export default function SeasonalPromoLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const dark = data.colors[0] || "#1a1a1a";
  const orange = data.colors[1] || "#ea580c";
  const light = data.colors[2] || "#fff7ed";

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{
        aspectRatio: "4/5",
        background: dark,
        fontFamily: "'Inter', 'DM Sans', sans-serif",
      }}
    >
      {/* Lightning glow */}
      <div className="absolute inset-0 opacity-10" style={{
        background: `radial-gradient(ellipse at 70% 20%, ${orange}88 0%, transparent 60%)`
      }} />

      {/* Top stripe */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, ${orange}, ${orange}88)` }} />

      {/* LIMITED TIME badge */}
      <div className="relative px-8 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="logo" className="h-8 w-auto object-contain brightness-0 invert" />
          ) : data.brandName ? (
            <span className="text-xs font-medium text-white/50">{data.brandName}</span>
          ) : null}
        </div>
        <div className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5" style={{ background: orange, color: "white" }}>
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
          Limited Time
        </div>
      </div>

      {/* Headline */}
      <div className="relative px-8 pt-5 cursor-text" onClick={() => onFieldClick("title")}>
        <div
          className={`text-[clamp(24px,6vw,34px)] font-black leading-[1.05] text-white ${activeField === "title" ? "ring-2 ring-orange-400/30 rounded-lg px-2 -mx-2" : ""}`}
          style={{ textShadow: `0 0 40px ${orange}66` }}
        >
          {data.title}
        </div>
      </div>

      {/* Divider */}
      <div className="relative px-8 pt-4">
        <div className="h-0.5 w-16 rounded-full" style={{ background: orange }} />
      </div>

      {/* Bullets */}
      <div className="relative px-8 pt-4 flex-1 space-y-3">
        {data.bullets.slice(0, 4).map((b, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 cursor-text ${activeField === `bullet-${i}` ? "ring-2 ring-orange-400/20 rounded-lg px-2 -mx-2" : ""}`}
            onClick={() => onFieldClick(`bullet-${i}`)}
          >
            <div className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center" style={{ background: orange + "20", border: `1px solid ${orange}40` }}>
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill={orange}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <span className="text-[clamp(11px,2.4vw,13px)] text-white/80 leading-snug">{b}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="relative px-8 pb-7 pt-4 space-y-2">
        <div
          className={`cursor-text rounded-xl py-3.5 text-center font-black text-[clamp(12px,2.8vw,15px)] tracking-wide ${activeField === "cta" ? "ring-2 ring-orange-400/60" : "hover:opacity-90"}`}
          style={{ background: orange, color: "white", boxShadow: `0 4px 24px ${orange}55` }}
          onClick={() => onFieldClick("cta")}
        >
          {data.cta}
        </div>
        {data.disclaimer && (
          <p className="text-center text-[8px] text-white/30 leading-snug px-2">{data.disclaimer}</p>
        )}
      </div>
    </div>
  );
}
