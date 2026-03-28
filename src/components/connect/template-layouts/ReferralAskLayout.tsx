import type { TemplateCanvasProps } from "../TemplateEditor";

export default function ReferralAskLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c1, c2] = [data.colors[0] || "#8A9A8C", data.colors[1] || "#5a6a5c"];
  const accent = data.colors[2] || "#F5F5F0";

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{
        aspectRatio: "4/5",
        background: `linear-gradient(145deg, ${c2}ee 0%, ${c1}cc 60%, ${c2}ff 100%)`,
        fontFamily: "'Inter', 'DM Sans', sans-serif",
      }}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20" style={{ background: accent, transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10" style={{ background: accent, transform: "translate(-40%, 40%)" }} />
      <div className="absolute top-1/3 right-4 w-24 h-24 rounded-full opacity-15" style={{ background: accent }} />

      {/* Logo area */}
      <div className="relative px-8 pt-8 flex items-center gap-3">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="logo" className="h-10 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        ) : (
          <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
            <span className="text-white/60 text-xs font-bold">{data.brandName?.[0] || "A"}</span>
          </div>
        )}
        {data.brandName && (
          <span className="text-sm font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.85)" }}>{data.brandName}</span>
        )}
      </div>

      {/* Icon */}
      <div className="relative px-8 pt-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}>
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </div>
      </div>

      {/* Headline */}
      <div
        className={`relative px-8 pt-5 cursor-text group ${activeField === "title" ? "outline-none" : ""}`}
        onClick={() => onFieldClick("title")}
      >
        <div
          className={`text-[clamp(22px,5.5vw,30px)] font-black leading-[1.1] text-white transition-all ${activeField === "title" ? "ring-2 ring-white/40 rounded-lg px-2 -mx-2" : "group-hover:opacity-90"}`}
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
        >
          {data.title}
        </div>
      </div>

      {/* Bullets */}
      <div className="relative px-8 pt-5 flex-1 space-y-3">
        {data.bullets.slice(0, 4).map((b, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 cursor-text group ${activeField === `bullet-${i}` ? "ring-2 ring-white/30 rounded-lg px-2 -mx-2" : ""}`}
            onClick={() => onFieldClick(`bullet-${i}`)}
          >
            <div className="mt-1 w-4 h-4 rounded-full shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5"><path d="M2 6l2.5 2.5L10 3.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-[clamp(11px,2.5vw,14px)] text-white/90 leading-snug">{b}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="relative px-8 pb-8 pt-5">
        <div
          className={`cursor-text rounded-xl py-3.5 text-center font-bold text-[clamp(12px,2.8vw,15px)] tracking-wide transition-all ${activeField === "cta" ? "ring-2 ring-white/60" : "hover:opacity-90"}`}
          style={{ background: "rgba(255,255,255,0.95)", color: c2 }}
          onClick={() => onFieldClick("cta")}
        >
          {data.cta}
        </div>
        {data.disclaimer && (
          <p className="text-center text-[10px] mt-2.5 opacity-50 text-white leading-snug">{data.disclaimer}</p>
        )}
      </div>
    </div>
  );
}
