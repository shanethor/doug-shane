import type { TemplateCanvasProps } from "../template-types";

export default function RenewalReminderLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const navy = data.colors[0] || "#1a3a5c";
  const gold = data.colors[1] || "#c9a24b";

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{
        aspectRatio: "4/5",
        background: navy,
        fontFamily: "'Inter', 'DM Sans', sans-serif",
      }}
    >
      {/* Gold accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: gold }} />

      {/* Top geometric shape */}
      <div className="absolute top-0 right-0 w-56 h-56 opacity-10" style={{
        background: `radial-gradient(circle, ${gold} 0%, transparent 70%)`,
        transform: "translate(20%, -20%)"
      }} />

      {/* Logo */}
      <div className="relative px-8 pt-8 flex items-center gap-3">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="logo" className="h-10 w-auto object-contain brightness-0 invert" />
        ) : (
          <div className="h-7 w-7 rounded flex items-center justify-center" style={{ background: gold + "33", border: `1px solid ${gold}44` }}>
            <span className="text-xs font-bold" style={{ color: gold }}>{data.brandName?.[0] || "A"}</span>
          </div>
        )}
        {data.brandName && (
          <span className="text-sm font-semibold text-white/80 tracking-wide">{data.brandName}</span>
        )}
      </div>

      {/* Icon badge */}
      <div className="relative px-8 pt-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: gold + "22", border: `1px solid ${gold}44` }}>
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke={gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </div>
      </div>

      {/* Headline */}
      <div className="relative px-8 pt-5 cursor-text" onClick={() => onFieldClick("title")}>
        <div
          className={`text-[clamp(20px,5vw,28px)] font-black leading-[1.1] text-white transition-all ${activeField === "title" ? "ring-2 ring-white/30 rounded-lg px-2 -mx-2" : ""}`}
        >
          {data.title}
        </div>
      </div>

      {/* Divider */}
      <div className="relative px-8 pt-4">
        <div className="h-px w-12" style={{ background: gold }} />
      </div>

      {/* Bullets */}
      <div className="relative px-8 pt-4 flex-1 space-y-3">
        {data.bullets.slice(0, 4).map((b, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 cursor-text ${activeField === `bullet-${i}` ? "ring-2 ring-white/20 rounded-lg px-2 -mx-2" : ""}`}
            onClick={() => onFieldClick(`bullet-${i}`)}
          >
            <div className="mt-[3px] w-5 h-5 rounded shrink-0 flex items-center justify-center" style={{ background: gold + "22", border: `1px solid ${gold}44` }}>
              <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M2 5l2 2 4-4" stroke={gold} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-[clamp(11px,2.5vw,14px)] text-white/85 leading-snug">{b}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="relative px-8 pb-8 pt-5">
        <div
          className={`cursor-text rounded-xl py-3.5 text-center font-bold text-[clamp(12px,2.8vw,15px)] tracking-wide transition-all ${activeField === "cta" ? "ring-2 ring-white/40" : "hover:opacity-90"}`}
          style={{ background: gold, color: navy }}
          onClick={() => onFieldClick("cta")}
        >
          {data.cta}
        </div>
        {data.disclaimer && (
          <p className="text-center text-[9px] mt-2.5 text-white/40 leading-snug px-2">{data.disclaimer}</p>
        )}
      </div>
    </div>
  );
}
