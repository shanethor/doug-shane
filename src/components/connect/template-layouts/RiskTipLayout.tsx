import type { TemplateCanvasProps } from "../TemplateEditor";

export default function RiskTipLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const navy = data.colors[0] || "#0f1f3d";
  const gold = data.colors[1] || "#f0b429";

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{
        aspectRatio: "4/5",
        background: navy,
        fontFamily: "'Inter', 'DM Sans', sans-serif",
      }}
    >
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(${gold}44 1px, transparent 1px), linear-gradient(90deg, ${gold}44 1px, transparent 1px)`,
        backgroundSize: "32px 32px"
      }} />

      {/* Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15" style={{
        background: `radial-gradient(circle, ${gold} 0%, transparent 70%)`,
        transform: "translate(10%, -10%)"
      }} />

      {/* Logo */}
      <div className="relative px-8 pt-7 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="logo" className="h-9 w-auto object-contain brightness-0 invert" />
          ) : (
            <div className="h-7 w-7 rounded flex items-center justify-center" style={{ background: gold + "22", border: `1px solid ${gold}33` }}>
              <span className="text-xs font-bold" style={{ color: gold }}>{data.brandName?.[0] || "A"}</span>
            </div>
          )}
          {data.brandName && <span className="text-xs font-medium text-white/60">{data.brandName}</span>}
        </div>
        {/* Week badge */}
        <div className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase" style={{ background: gold + "22", color: gold, border: `1px solid ${gold}44` }}>
          Weekly Tip
        </div>
      </div>

      {/* Lightbulb icon */}
      <div className="relative px-8 pt-5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: gold + "20", border: `1px solid ${gold}33` }}>
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill={gold}><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>
        </div>
      </div>

      {/* Label + Headline */}
      <div className="relative px-8 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: gold }}>Risk Tip</p>
        <div
          className={`text-[clamp(20px,5vw,27px)] font-black leading-[1.1] text-white cursor-text ${activeField === "title" ? "ring-2 ring-white/20 rounded-lg px-2 -mx-2" : ""}`}
          onClick={() => onFieldClick("title")}
        >
          {data.title}
        </div>
      </div>

      {/* Divider */}
      <div className="relative px-8 pt-4"><div className="h-px" style={{ background: `linear-gradient(90deg, ${gold}66, transparent)` }} /></div>

      {/* Bullets */}
      <div className="relative px-8 pt-4 flex-1 space-y-3">
        {data.bullets.slice(0, 4).map((b, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 cursor-text ${activeField === `bullet-${i}` ? "ring-2 ring-white/15 rounded-lg px-2 -mx-2" : ""}`}
            onClick={() => onFieldClick(`bullet-${i}`)}
          >
            <div className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: gold + "20", color: gold }}>
              {i + 1}
            </div>
            <span className="text-[clamp(11px,2.3vw,13px)] text-white/80 leading-snug">{b}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="relative px-8 pb-7 pt-4 space-y-2">
        <div
          className={`cursor-text rounded-xl py-3 text-center font-bold text-[clamp(11px,2.5vw,14px)] tracking-wide ${activeField === "cta" ? "ring-2 ring-yellow-300/50" : "hover:opacity-90"}`}
          style={{ background: gold, color: navy }}
          onClick={() => onFieldClick("cta")}
        >
          {data.cta}
        </div>
        {data.disclaimer && (
          <p className="text-center text-[8px] text-white/35 leading-snug px-2">{data.disclaimer}</p>
        )}
      </div>
    </div>
  );
}
