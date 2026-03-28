import type { TemplateCanvasProps } from "../TemplateEditor";

export default function NewClientWelcomeLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const green = data.colors[0] || "#2d6a4f";
  const light = data.colors[2] || "#e8f5e9";
  const mid = data.colors[1] || "#40916c";

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{
        aspectRatio: "4/5",
        background: `linear-gradient(160deg, ${green} 0%, ${mid} 100%)`,
        fontFamily: "'Inter', 'DM Sans', sans-serif",
      }}
    >
      {/* Confetti dots */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="absolute rounded-full opacity-20"
          style={{
            width: `${6 + (i % 4) * 4}px`, height: `${6 + (i % 4) * 4}px`,
            background: light,
            top: `${5 + (i * 17) % 85}%`, left: `${(i * 23) % 90}%`,
          }} />
      ))}

      {/* Logo */}
      <div className="relative px-8 pt-8 flex items-center gap-3">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="logo" className="h-10 w-auto object-contain brightness-0 invert" />
        ) : (
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <span className="text-white text-sm font-bold">{data.brandName?.[0] || "A"}</span>
          </div>
        )}
        {data.brandName && <span className="text-sm font-medium text-white/80">{data.brandName}</span>}
      </div>

      {/* Welcome badge */}
      <div className="relative px-8 pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-white"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <span className="text-white text-xs font-semibold tracking-wide">NEW CLIENT</span>
        </div>
      </div>

      {/* Headline */}
      <div className="relative px-8 pt-4 cursor-text" onClick={() => onFieldClick("title")}>
        <div
          className={`text-[clamp(22px,5.5vw,30px)] font-black leading-[1.1] text-white ${activeField === "title" ? "ring-2 ring-white/30 rounded-lg px-2 -mx-2" : ""}`}
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.2)" }}
        >
          {data.title}
        </div>
      </div>

      {/* Bullets */}
      <div className="relative px-8 pt-5 flex-1 space-y-3">
        {data.bullets.slice(0, 4).map((b, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 cursor-text ${activeField === `bullet-${i}` ? "ring-2 ring-white/20 rounded-lg px-2 -mx-2" : ""}`}
            onClick={() => onFieldClick(`bullet-${i}`)}
          >
            <div className="mt-1 w-4 h-4 rounded-full shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.25)" }}>
              <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-[clamp(11px,2.5vw,14px)] text-white/90 leading-snug">{b}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="relative px-8 pb-8 pt-5">
        <div
          className={`cursor-text rounded-xl py-3.5 text-center font-bold text-[clamp(12px,2.8vw,15px)] tracking-wide ${activeField === "cta" ? "ring-2 ring-white/50" : "hover:opacity-90"}`}
          style={{ background: "rgba(255,255,255,0.95)", color: green }}
          onClick={() => onFieldClick("cta")}
        >
          {data.cta}
        </div>
      </div>
    </div>
  );
}
