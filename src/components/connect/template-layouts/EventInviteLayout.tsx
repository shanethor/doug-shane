import type { TemplateCanvasProps } from "../template-types";

export default function EventInviteLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const purple = data.colors[0] || "#3d1a6e";
  const light = data.colors[1] || "#a78bfa";
  const gold = data.colors[2] || "#f0c040";

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{
        aspectRatio: "4/5",
        background: `linear-gradient(155deg, ${purple} 0%, #1a0a35 100%)`,
        fontFamily: "'Inter', 'DM Sans', sans-serif",
      }}
    >
      {/* Top gold bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${gold}, ${light})` }} />

      {/* Decorative glows */}
      <div className="absolute top-8 left-4 w-40 h-40 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${light}, transparent)` }} />
      <div className="absolute bottom-20 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${gold}, transparent)`, transform: "translateX(30%)" }} />

      {/* YOU'RE INVITED badge */}
      <div className="relative px-8 pt-8 flex items-center gap-3">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="logo" className="h-9 w-auto object-contain brightness-0 invert" />
        ) : null}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: gold + "22", border: `1px solid ${gold}55` }}>
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill={gold}><path d="M8 0L9.79 5.26H15.6L10.9 8.52L12.7 13.78L8 10.52L3.3 13.78L5.1 8.52L0.4 5.26H6.21L8 0Z"/></svg>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: gold }}>You're Invited</span>
        </div>
      </div>

      {/* Headline */}
      <div className="relative px-8 pt-5 cursor-text" onClick={() => onFieldClick("title")}>
        <div
          className={`text-[clamp(22px,5.5vw,30px)] font-black leading-[1.1] text-white ${activeField === "title" ? "ring-2 ring-purple-300/30 rounded-lg px-2 -mx-2" : ""}`}
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}
        >
          {data.title}
        </div>
      </div>

      {/* Date/time fields */}
      {data.dateTime && (
        <div className="relative px-8 pt-3 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke={light} strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <span className="text-xs text-white/70">{data.dateTime}</span>
        </div>
      )}
      {data.location && (
        <div className="relative px-8 pt-1.5 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke={light} strokeWidth="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span className="text-xs text-white/70">{data.location}</span>
        </div>
      )}

      {/* Divider */}
      <div className="relative px-8 pt-4"><div className="h-px" style={{ background: `linear-gradient(90deg, ${light}44, transparent)` }} /></div>

      {/* Bullets */}
      <div className="relative px-8 pt-4 flex-1 space-y-2.5">
        {data.bullets.slice(0, 4).map((b, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 cursor-text ${activeField === `bullet-${i}` ? "ring-2 ring-purple-300/20 rounded-lg px-2 -mx-2" : ""}`}
            onClick={() => onFieldClick(`bullet-${i}`)}
          >
            <div className="mt-1 w-3.5 h-3.5 rounded-sm shrink-0" style={{ background: light + "30", border: `1px solid ${light}40` }}>
              <svg viewBox="0 0 10 10" className="w-full h-full"><path d="M2 5l2 2 4-4" stroke={light} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-[clamp(11px,2.4vw,13px)] text-white/80 leading-snug">{b}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="relative px-8 pb-8 pt-4">
        <div
          className={`cursor-text rounded-xl py-3.5 text-center font-bold text-[clamp(12px,2.8vw,15px)] tracking-wide ${activeField === "cta" ? "ring-2 ring-yellow-300/50" : "hover:opacity-90"}`}
          style={{ background: `linear-gradient(90deg, ${gold}, ${gold}cc)`, color: purple }}
          onClick={() => onFieldClick("cta")}
        >
          {data.cta}
        </div>
        {data.disclaimer && (
          <p className="text-center text-[8px] mt-2 text-white/30 leading-snug px-2">{data.disclaimer}</p>
        )}
      </div>
    </div>
  );
}
