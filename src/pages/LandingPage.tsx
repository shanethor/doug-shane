import { useEffect, useRef, useState, useCallback } from "react";

import { Link } from "react-router-dom";

/* ═══ Particle Network Canvas (from ConnectDemo) ═══ */
function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
    resize();
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * c.width, y: Math.random() * c.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5, a: Math.random() * 0.4 + 0.1,
      });
    }
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
        if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(138, 154, 140, ${p.a})`; ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(138, 154, 140, ${0.06 * (1 - d / 120)})`; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

/* ═══ AuRa Logo SVG (sage green) ═══ */
const AuraLogoLarge = ({ size = 80 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
    <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
    <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
  </svg>
);

/* ═══ AURA Logo SVG (nav/footer — sage) ═══ */
const AuraLogoSVG = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
    <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
    <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
  </svg>
);

/* ═══ Branch A Monogram ═══ */
const BranchLogo = ({ color, size = 28 }: { color: string; size?: number }) => (
  <svg viewBox="0 0 28 28" fill="none" width={size} height={size}>
    <rect width="28" height="28" rx="7" fill={color} />
    <path d="M14 6L20 22H17.3L16 19H12L10.7 22H8L14 6Z" fill="white" />
    <rect x="11.5" y="16" width="5" height="1.3" rx=".65" fill={color} />
  </svg>
);

/* ═══ Integration Ticker ═══ */
const integrations = ["Gmail", "Outlook", "Phone", "LinkedIn", "Facebook", "Instagram", "ZoomInfo", "SMS"];

function IntegrationTicker() {
  const doubled = [...integrations, ...integrations];
  return (
    <div className="overflow-hidden mb-6" style={{ maskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)" }}>
      <div className="flex gap-3 animate-[ticker_30s_linear_infinite] hover:[animation-play-state:paused] w-max">
        {doubled.map((name, i) => (
          <span key={i} className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-xs font-medium text-[#A1A1AA] whitespace-nowrap shrink-0">
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══ Carousel Data ═══ */
const branches = [
  {
    key: "risk",
    label: "AURA Risk",
    color: "#01696F",
    colorBright: "#0A8A8F",
    tag: "Insurance Intelligence",
    title: "Risk placement,\nreinvented.",
    desc: "AI-powered submission building, ACORD auto-fill, and carrier matching. From intake to binding in a fraction of the time.",
    feats: ["ACORD Auto-Fill", "Carrier Matching", "Pipeline Tracking", "Loss Run Automation"],
    image: "/images/hero-insurance.jpg",
    tint: "tint-teal",
  },
  {
    key: "property",
    label: "AURA Property",
    color: "#B87333",
    colorBright: "#D4884A",
    tag: "Real Estate Intelligence",
    title: "Property deals,\naccelerated.",
    desc: "Deal sourcing, underwriting analysis, and investor matching powered by relationship intelligence. Coming soon.",
    feats: ["Deal Sourcing", "Market Analysis", "Investor Matching", "Portfolio Tracking"],
    image: "/images/hero-property.jpg",
    tint: "tint-copper",
  },
  {
    key: "wealth",
    label: "AURA Consulting",
    color: "#C9A84C",
    colorBright: "#D4B85C",
    tag: "Consulting Intelligence",
    title: "Consulting services,\nunified.",
    desc: "Holistic client view across insurance, real estate, and investments. One relationship, complete financial intelligence.",
    feats: ["Financial Planning", "Retirement Accounts", "Investment Advisory"],
    image: "/images/hero-wealth.jpg",
    tint: "tint-gold",
  },
];

/* ═══ Partners Data ═══ */
const partnerCards = [
  { num: "01", title: "Real-time tracking", desc: "Private dashboard: Sent → Active Leads → Policies Sold → Premium Placed. Always current." },
  { num: "02", title: "Cross-vertical referrals", desc: "One partnership, three verticals. AURA routes insurance, property, and consulting referrals automatically." },
  { num: "03", title: "Premium-based compensation", desc: "Earn based on premium placed. No caps, no complexity — grow uncapped alongside your referrals." },
  { num: "04", title: "AI-powered intelligence", desc: "AURA Connect enriches every referral with relationship data for the warmest possible path." },
];

/* ═══ Main Component ═══ */
export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const revealRefs = useRef<HTMLElement[]>([]);

  const addRevealRef = useCallback((el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("lp-visible"); }),
      { threshold: 0.06 }
    );
    revealRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    intervalRef.current = setInterval(() => setActiveTab((p) => (p + 1) % 3), 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const selectTab = (idx: number) => {
    setActiveTab(idx);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setActiveTab((p) => (p + 1) % 3), 5000);
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA] overflow-x-hidden" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`
        .lp-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .lp-visible { opacity: 1; transform: translateY(0); }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes branchFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orbitSpin1 { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes orbitSpin2 { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(-360deg); } }
        @keyframes counterSpin1 { 0% { rotate: 0deg; } 100% { rotate: -360deg; } }
        @keyframes counterSpin2 { 0% { rotate: 0deg; } 100% { rotate: 360deg; } }
        @keyframes tabFill { 0% { width: 0; } 100% { width: 100%; } }
      `}</style>

      <ParticleNetwork />

      <div className="relative z-[1]">
        {/* ═══ NAV ═══ */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-[780px]">
          <nav className="flex items-center justify-between py-2 pl-5 pr-2 bg-[#101012]/80 backdrop-blur-[24px] border border-[hsl(140_12%_42%/0.12)] rounded-full">
            <div className="flex items-center gap-6">
              <Link to="/home" className="flex items-center gap-2.5 no-underline">
                <AuraLogoSVG size={22} />
                <span className="text-[15px] font-semibold tracking-[0.08em] text-white">AURA</span>
              </Link>
              <div className="hidden md:flex gap-1">
                <a href="#connect" className="text-[13px] text-[#A1A1AA] no-underline px-3 py-1.5 rounded-full hover:text-[hsl(140_12%_72%)] transition-colors">Connect</a>
                <a href="#concierge" className="text-[13px] text-[#A1A1AA] no-underline px-3 py-1.5 rounded-full hover:text-[hsl(140_12%_72%)] transition-colors">Concierge</a>
                <a href="#branches" className="text-[13px] text-[#A1A1AA] no-underline px-3 py-1.5 rounded-full hover:text-[hsl(140_12%_72%)] transition-colors">Platform</a>
                <a href="#partners" className="text-[13px] text-[#A1A1AA] no-underline px-3 py-1.5 rounded-full hover:text-[hsl(140_12%_72%)] transition-colors">Partners</a>
              </div>
            </div>
            <Link to="/auth" className="text-[13px] font-medium text-[#08080A] bg-[hsl(140_12%_42%)] px-5 py-2 rounded-full hover:bg-[hsl(140_12%_52%)] transition-colors whitespace-nowrap no-underline">
              Open app
            </Link>
          </nav>
        </div>

        {/* ═══ HERO ═══ */}
        <section className="relative min-h-screen flex items-center justify-center">
          {/* Radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,100vw)] h-[min(700px,100vh)] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(140 12% 42% / 0.06) 0%, transparent 70%)" }} />

          <div className="relative z-[2] text-center px-8">
            <div className="flex justify-center mb-8">
              <AuraLogoLarge size={90} />
            </div>
            <h1
              className="text-[clamp(56px,8vw,120px)] max-sm:text-5xl font-bold leading-[1] tracking-[0.06em] text-white mb-6"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.55)" }}
            >
              AuRa
            </h1>
            <p className="text-[17px] font-medium max-w-[520px] mx-auto leading-[1.65] mb-8" style={{ color: "hsl(140 12% 58%)" }}>
              One platform powering <span style={{ color: "hsl(140 12% 72%)" }} className="font-medium">insurance</span>,{" "}
              <span className="text-[#D4884A] font-medium">property</span>, and{" "}
              <span className="text-[#D4B85C] font-medium">consulting</span>. Intelligence for the professionals who protect, build, and grow.
            </p>
            <p className="text-xl font-semibold tracking-wide" style={{ color: "hsl(140 12% 42%)" }}>Intelligence runs on AuRa</p>
          </div>
        </section>

        {/* ═══ AURA CONNECT ═══ */}
        <section className="lp-reveal pt-[120px] max-sm:pt-20 pb-[60px] relative" id="connect" ref={addRevealRef}>
          <div className="max-w-[1200px] mx-auto px-12 max-md:px-8 max-sm:px-5">
            <div className="border-t border-[hsl(140_12%_42%/0.15)] pt-14">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-4" style={{ color: "hsl(140 12% 58%)" }}>AURA Connect</div>
                  <h2 className="text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.04em] leading-[1.05] text-white mb-5">
                    Your network,<br />mapped.
                  </h2>
                  <div className="text-sm text-[#A1A1AA] mb-6"><strong>$250</strong>/month per seat</div>
                  <p className="text-[15px] text-[#71717A] leading-[1.65] mb-6">
                    Seven integrated modules — relationship intelligence, sales pipeline, AI email, calendar, outreach cadences, brand marketing, and Sage assistant — all powered by your first-party data.
                  </p>

                  {/* Module pills */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {[
                      { label: "Connect", icon: "🔗" },
                      { label: "Pipeline", icon: "📊" },
                      { label: "Email", icon: "✉️" },
                      { label: "Calendar", icon: "📅" },
                      { label: "Outreach", icon: "📤" },
                      { label: "Create", icon: "✨" },
                      { label: "Sage", icon: "💬" },
                    ].map((m) => (
                      <span key={m.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border" style={{ borderColor: "hsl(140 12% 42% / 0.2)", background: "hsl(140 12% 42% / 0.06)", color: "hsl(140 12% 72%)" }}>
                        <span>{m.icon}</span>{m.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <Link
                      to="/request-access"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#08080A] px-7 py-3 rounded-[10px] transition-colors no-underline"
                      style={{ background: "hsl(140 12% 42%)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(140 12% 52%)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "hsl(140 12% 42%)")}
                    >
                      Request Access
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link to="/connectdemo/auth" className="text-sm font-medium no-underline transition-colors" style={{ color: "hsl(140 12% 58%)" }}>
                      Try the demo →
                    </Link>
                  </div>
                </div>
                <div>
                  {/* Feature preview cards matching demo modules */}
                  <div className="rounded-[20px] overflow-hidden border border-[hsl(140_12%_42%/0.12)] aspect-[16/9] relative mb-4" style={{ background: "linear-gradient(135deg, hsl(140 12% 42% / 0.08), hsl(140 12% 20% / 0.04))" }}>
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      <AuraLogoLarge size={48} />
                      <p className="text-lg font-bold text-white mt-4 tracking-tight">Intelligence runs on AuRa</p>
                      <p className="text-xs mt-2" style={{ color: "hsl(140 12% 58%)" }}>Relationship intelligence • AI email • Sales pipeline • Marketing</p>
                    </div>
                  </div>
                  <IntegrationTicker />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { t: "Relationship graph", d: "Map every connection across email, social, and calendar into one unified network." },
                      { t: "AI-powered email", d: "Gmail, Outlook, or AuRa view — with smart summarize, AI reply, and pipeline tagging built in." },
                      { t: "Outreach cadences", d: "Tiered contact strategies with automated follow-ups and connection tracking." },
                      { t: "Create & post", d: "AI brand studio with logo extraction, social resizing, and Sage-powered captions." },
                    ].map((f) => (
                      <div key={f.t} className="p-4 border rounded-xl" style={{ background: "hsl(140 12% 42% / 0.04)", borderColor: "hsl(140 12% 42% / 0.1)" }}>
                        <div className="text-[13px] font-semibold text-white mb-1">{f.t}</div>
                        <div className="text-[12px] text-[#71717A] leading-[1.55]">{f.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ AURA CONCIERGE ═══ */}
        <section className="lp-reveal pt-[120px] max-sm:pt-20 pb-[60px] relative" id="concierge" ref={addRevealRef}>
          <div className="max-w-[1200px] mx-auto px-12 max-md:px-8 max-sm:px-5">
            <div className="border-t border-white/[0.06] pt-14">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                {/* Left column */}
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#F59E0B] mb-4">AURA Concierge</div>
                  <h2 className="text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.04em] leading-[1.05] text-white mb-5">
                    Your on‑call<br />build team.
                  </h2>
                  <p className="text-[15px] text-[#71717A] leading-[1.65] mb-6">
                    Systems, tools, and assets that make your business easier to run — and easier to sell.
                  </p>

                  {/* Pricing callout */}
                  <div className="p-5 bg-[#101012] border border-white/[0.06] rounded-xl mb-6">
                    <div className="text-[13px] font-semibold text-white mb-2">Pricing</div>
                    <div className="text-sm text-[#A1A1AA] mb-1"><strong className="text-white">$1,000</strong>/month subscription</div>
                    <div className="text-sm text-[#F59E0B] font-medium mb-1">Launch offer: first 3 months at $500/month</div>
                    <div className="text-[12px] text-[#71717A] leading-[1.55]">1‑week free trial · card on file required · first month billed before your first deliverable ships.</div>
                  </div>

                  {/* Who it's for */}
                  <div className="text-[12px] text-[#52525B] leading-[1.55] mb-6 border-l-2 border-[#F59E0B]/30 pl-3">
                    <span className="text-[#A1A1AA] font-medium">Who it's for:</span> Non‑software businesses doing $500K–$10M+ in revenue, especially owners preparing to grow or sell.
                  </div>

                  {/* Disclaimer */}
                  <div className="text-[11px] text-[#52525B] leading-[1.5] mb-8">
                    <span className="text-[#71717A] font-medium">Disclaimer:</span> AURA Concierge delivers digital assets (websites, dashboards, templates, automations). Physical product shipping is not included. Deliverable timelines vary by scope and complexity. Your 7‑day trial begins at checkout; cancel anytime before it ends to avoid charges.
                  </div>

                  <Link
                    to="/concierge"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#08080A] bg-[#F59E0B] px-7 py-3 rounded-[10px] hover:bg-[#FBBF24] transition-colors no-underline"
                    aria-label="Request Concierge Access"
                  >
                    Request Concierge Access
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {/* Right column — image + feature cards */}
                <div>
                  <div className="rounded-[20px] overflow-hidden border border-white/[0.06] aspect-[16/9] relative mb-4">
                    <img src="/images/concierge-toolkit.png" alt="AURA Concierge — your build toolkit" loading="eager" decoding="async" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#08080A]/60 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#F59E0B]">
                            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                          </svg>
                        ),
                        t: "Custom web tools & landing pages",
                        d: "Simple websites, landing pages, and quote/intake tools that plug into your existing workflows.",
                      },
                      {
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#F59E0B]">
                            <path d="M3 3v18h18" /><path d="M7 16l4-8 4 5 5-6" />
                          </svg>
                        ),
                        t: "Marketing dashboards & reporting",
                        d: "Owner‑ready KPI dashboards pulling from your CRM, ads, and accounting tools.",
                      },
                      {
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#F59E0B]">
                            <path d="M4 4h16v16H4z" /><path d="M9 9h6v6H9z" />
                          </svg>
                        ),
                        t: "Design & template library",
                        d: "Sales decks, one‑pagers, proposal templates, and social graphics — all on brand.",
                      },
                      {
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#F59E0B]">
                            <path d="M12 20V10" /><path d="M6 20V4" /><path d="M18 20v-6" />
                          </svg>
                        ),
                        t: "Sales systems & coaching assets",
                        d: "Pipelines, email sequences, call frameworks, and playbooks so your team can execute.",
                      },
                      {
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#F59E0B]">
                            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                          </svg>
                        ),
                        t: "Process & automation builds",
                        d: "Intake forms, checklists, and automations that connect the tools you already use.",
                      },
                      {
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#F59E0B]">
                            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                          </svg>
                        ),
                        t: "Ongoing support & iteration",
                        d: "Monthly retainer includes revisions, updates, and new builds as your business evolves.",
                      },
                    ].map((f) => (
                      <div key={f.t} className="p-4 bg-[#101012] border border-white/[0.06] rounded-xl">
                        <div className="mb-2">{f.icon}</div>
                        <div className="text-[13px] font-semibold text-white mb-1">{f.t}</div>
                        <div className="text-[12px] text-[#71717A] leading-[1.55]">{f.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ═══ BRANCH CAROUSEL ═══ */}
        <section className="lp-reveal pt-[120px] max-sm:pt-20" id="branches" ref={addRevealRef}>
          <div className="max-w-[1200px] mx-auto px-12 max-md:px-8 max-sm:px-5">
            <div className="border-t border-white/[0.06] pt-14">
              <div className="mb-10">
                <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#71717A] mb-4">AURA Intelligence</div>
                <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.035em] leading-[1.1] text-white">
                  Three verticals.<br />One AI backbone.
                </h2>
                <p className="text-[15px] text-[#71717A] max-w-[500px] mt-3 leading-[1.6]">
                  Insurance, property, and consulting data interact daily — powering cross-vertical intelligence no single-line platform can match.
                </p>
              </div>

              {/* Tab bar */}
              <div className="flex bg-[#101012] border border-white/[0.06] rounded-[14px] overflow-hidden mb-12 max-sm:flex-wrap">
                {branches.map((b, i) => (
                  <button
                    key={b.key}
                    onClick={() => selectTab(i)}
                    className={`flex-1 max-sm:flex-[1_1_100%] flex items-center justify-center gap-2.5 px-6 py-4 max-sm:px-4 max-sm:py-3 cursor-pointer transition-all text-sm font-medium border-2 border-transparent rounded-[14px] relative ${
                      activeTab === i
                        ? "text-white bg-white/[0.06]"
                        : "text-[#52525B] hover:text-[#A1A1AA] bg-transparent"
                    }`}
                    style={activeTab === i ? { borderColor: `${b.color}55`, background: `${b.color}14` } : {}}
                  >
                    <BranchLogo color={b.color} size={28} />
                    <span className="max-sm:hidden">{b.label}</span>
                    <span className="sm:hidden text-[13px]">{b.label}</span>
                    {activeTab === i && (
                      <span
                        className="absolute bottom-0 left-0 h-0.5 rounded-full opacity-30"
                        style={{ background: "currentColor", animation: "tabFill 5s linear forwards" }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Preload all branch images */}
              <div className="hidden" aria-hidden="true">
                {branches.map((b) => (
                  <link key={b.key} rel="preload" as="image" href={b.image} />
                ))}
              </div>

              {/* Panel — all rendered, only active visible */}
              <div className="relative">
              {branches.map((b, i) => (
                <div
                  key={b.key}
                  className={`grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-12 items-center min-h-[380px] transition-opacity duration-300 ${activeTab === i ? "opacity-100" : "opacity-0 absolute pointer-events-none"}`}
                  style={activeTab !== i ? { position: "absolute", top: 0, left: 0, right: 0, visibility: "hidden" } : {}}
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-5">
                      <BranchLogo color={b.color} size={36} />
                      <span className="text-lg font-bold tracking-tight text-white">{b.label}</span>
                    </div>
                    <h3 className="text-[clamp(24px,3vw,36px)] font-bold tracking-[-0.03em] leading-[1.1] text-white mb-4 whitespace-pre-line">{b.title}</h3>
                    <p className="text-[15px] text-[#71717A] leading-[1.65] mb-6">{b.desc}</p>
                    <div className="flex flex-wrap gap-3 gap-y-2.5">
                      {b.feats.map((f) => (
                        <span key={f} className="flex items-center gap-2 text-[13px] font-medium text-[#E4E4E7]">
                          <span className="w-[5px] h-[5px] rounded-full" style={{ background: b.colorBright }} />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[20px] overflow-hidden border border-white/[0.06] aspect-[4/3] relative">
                    <img src={b.image} alt={b.label} loading="eager" decoding="async" className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-600" />
                    <div className="absolute inset-0 pointer-events-none mix-blend-color opacity-45 rounded-[inherit]" style={{ background: b.color }} />
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ PARTNERS ═══ */}
        <section className="lp-reveal pt-[120px] max-sm:pt-20" id="partners" ref={addRevealRef}>
          <div className="max-w-[1200px] mx-auto px-12 max-md:px-8 max-sm:px-5">
            <div className="border-t border-white/[0.06] pt-14">
              <div className="mb-12">
                <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#71717A] mb-4">Partnerships</div>
                <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.035em] leading-[1.1] text-white mb-4">
                  Built on relationships,<br />not transactions.
                </h2>
                <p className="text-[15px] text-[#71717A] leading-[1.65] max-w-[560px]">
                  Refer clients across insurance, property, and consulting — track every touchpoint from introduction to premium placed.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {partnerCards.map((c) => (
                  <div key={c.num} className="p-7 max-sm:p-5 bg-[#101012] border border-white/[0.06] rounded-2xl hover:border-white/[0.12] hover:-translate-y-0.5 transition-all">
                    <div className="text-[11px] font-semibold text-[#52525B] tracking-[0.04em] mb-3.5">{c.num}</div>
                    <div className="text-[15px] font-semibold text-white mb-2">{c.title}</div>
                    <div className="text-[13px] text-[#71717A] leading-[1.55]">{c.desc}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-6">
                <Link
                  to="/become-partner"
                  className="inline-flex items-center gap-2 text-sm font-medium text-white border border-white/20 px-7 py-3 rounded-[10px] hover:border-white/45 hover:bg-white/[0.04] transition-all no-underline"
                >
                  Become a Partner
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <span className="text-[13px] text-[#52525B] italic">Open to individuals and organizations</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="max-w-[1200px] mx-auto pt-[120px] max-sm:pt-16 pb-12 max-sm:pb-6 px-12 max-md:px-8 max-sm:px-5">
          <div className="border-t border-white/[0.06] pt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-12 mb-16">
            <div>
              <div className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.06em] text-white mb-3">
                <AuraLogoSVG size={20} />
                AURA
              </div>
              <p className="text-[13px] text-[#71717A] leading-[1.6] max-w-[260px]">
                Automated Universal Risk Advisor. AI-native infrastructure for insurance, property, and consulting.
              </p>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white mb-4">Platform</div>
              <a href="#connect" className="block text-[13px] text-[#71717A] py-1 hover:text-white transition-colors no-underline">AURA Connect</a>
              <a href="#branches" className="block text-[13px] text-[#71717A] py-1 hover:text-white transition-colors no-underline">AURA Risk</a>
              <a href="#branches" className="block text-[13px] text-[#71717A] py-1 hover:text-white transition-colors no-underline">AURA Property</a>
              <a href="#branches" className="block text-[13px] text-[#71717A] py-1 hover:text-white transition-colors no-underline">AURA Consulting</a>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white mb-4">Company</div>
              <span className="block text-[13px] text-[#71717A] py-1">About</span>
              <span className="block text-[13px] text-[#71717A] py-1">Careers</span>
              <a href="#partners" className="block text-[13px] text-[#71717A] py-1 hover:text-white transition-colors no-underline">Partners</a>
              <span className="block text-[13px] text-[#71717A] py-1">Contact</span>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white mb-4">Resources</div>
              <span className="block text-[13px] text-[#71717A] py-1">Documentation</span>
              <span className="block text-[13px] text-[#71717A] py-1">API</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs text-[#52525B] border-t border-white/[0.06] pt-6">
            <span>&copy; 2026 AURA Risk Group. Delaware C-Corp.</span>
            <div className="flex gap-5">
              <Link to="/privacy" className="text-[#52525B] hover:text-white transition-colors no-underline">Privacy</Link>
              <Link to="/terms" className="text-[#52525B] hover:text-white transition-colors no-underline">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
