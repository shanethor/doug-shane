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

/* ═══ AURA Logo SVG (sage green) ═══ */
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

/* ═══ AI Research Stats ═══ */
const researchStats = [
  {
    heading: "Productivity up to 4× faster",
    text: "PwC's 2025 Global AI Jobs Barometer found that AI‑exposed sectors saw productivity growth jump from 7% to 27%, with roughly three times higher growth in revenue per employee.",
    source: "PwC",
  },
  {
    heading: "30–45% lower support costs",
    text: "Case studies of AI customer‑service automation report 30–45% reductions in support costs and 2–3× gains in agent productivity when routine inquiries are automated.",
    source: "Industry Research",
  },
  {
    heading: "Faster sales motion",
    text: "BCG's work with AI sales agents shows companies increasing qualified prospects by double‑digit percentages and running parts of the sales process up to eight times faster.",
    source: "BCG",
  },
  {
    heading: "Up to 40% cost reduction",
    text: "Early generative‑AI deployments have delivered up to 40% reductions in operating costs when high‑volume, repetitive workflows are automated.",
    source: "McKinsey / Industry",
  },
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
                <a href="#leads" className="text-[13px] text-[#A1A1AA] no-underline px-3 py-1.5 rounded-full hover:text-[hsl(140_12%_72%)] transition-colors">Leads</a>
                <a href="#connect" className="text-[13px] text-[#A1A1AA] no-underline px-3 py-1.5 rounded-full hover:text-[hsl(140_12%_72%)] transition-colors">Connect</a>
                <a href="#research" className="text-[13px] text-[#A1A1AA] no-underline px-3 py-1.5 rounded-full hover:text-[hsl(140_12%_72%)] transition-colors">Why AI</a>
              </div>
            </div>
            <Link to="/get-started" className="text-[13px] font-medium text-[#08080A] bg-[hsl(140_12%_42%)] px-5 py-2 rounded-full hover:bg-[hsl(140_12%_52%)] transition-colors whitespace-nowrap no-underline">
              Open app
            </Link>
          </nav>
        </div>

        {/* ═══ HERO ═══ */}
        <section className="relative min-h-screen flex items-center justify-center">
          {/* Radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,100vw)] h-[min(700px,100vh)] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(140 12% 42% / 0.06) 0%, transparent 70%)" }} />

          <div className="relative z-[2] text-center px-8 max-w-[720px]">
            <div className="flex justify-center mb-8">
              <AuraLogoLarge size={90} />
            </div>
            <h1
              className="text-[clamp(40px,6vw,72px)] max-sm:text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-white mb-6"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.55)" }}
            >
              AI‑Native Tools and Agents for Modern Firms
            </h1>
            <p className="text-[17px] font-medium max-w-[600px] mx-auto leading-[1.65] mb-8" style={{ color: "hsl(140 12% 58%)" }}>
              <span style={{ color: "hsl(140 12% 72%)" }} className="font-semibold">AURA CONNECT</span> gives your team an AI‑powered workspace for email, calendar, pipeline, and insurance workflows.{" "}
              <span className="text-[#F59E0B] font-semibold">AURA AGENT</span> builds the custom agents and automations that make it yours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                to="/connectdemo/auth"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#08080A] px-7 py-3 rounded-[10px] transition-colors no-underline"
                style={{ background: "hsl(140 12% 42%)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(140 12% 52%)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "hsl(140 12% 42%)")}
              >
                Try our demo
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/request-access"
                className="inline-flex items-center gap-2 text-sm font-medium text-white border border-[hsl(140_12%_42%/0.4)] px-7 py-3 rounded-[10px] hover:border-[hsl(140_12%_42%/0.7)] hover:bg-[hsl(140_12%_42%/0.06)] transition-all no-underline"
              >
                Create an Account
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <p className="text-lg font-semibold tracking-wide" style={{ color: "hsl(140 12% 42%)" }}>Intelligence runs on AURA</p>
          </div>
        </section>

        {/* ═══ AURA LEADS (moved above Connect) ═══ */}
        <section className="lp-reveal pt-[120px] max-sm:pt-20 pb-[60px] relative" id="leads" ref={addRevealRef}>
          <div className="max-w-[1200px] mx-auto px-12 max-md:px-8 max-sm:px-5">
            <div className="border-t border-[hsl(140_12%_42%/0.15)] pt-14">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-4" style={{ color: "hsl(140 12% 58%)" }}>AURA Leads</div>
                  <h2 className="text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.04em] leading-[1.05] text-white mb-5">
                    Targeted Leads,<br />Any Industry
                  </h2>
                  <p className="text-[15px] text-[#71717A] leading-[1.65] mb-6">
                    AURA sources and delivers qualified leads across every industry we serve — insurance, real estate, mortgage, financial advisory, contracting, and general business. Tell us your specialization once, and we match you with prospects who are actively looking for what you offer.
                  </p>

                  {/* How it works */}
                  <div className="p-5 border rounded-xl mb-6" style={{ background: "hsl(140 12% 42% / 0.04)", borderColor: "hsl(140 12% 42% / 0.15)" }}>
                    <div className="text-[13px] font-semibold text-white mb-3">How purchasing leads works</div>
                    <ol className="space-y-2 text-[12px] text-[#A1A1AA] leading-[1.6] list-decimal list-inside">
                      <li><strong className="text-white">Select your industry</strong> — choose from 40+ specializations across insurance, real estate, financial advisory, contracting, and more.</li>
                      <li><strong className="text-white">Pick your sources</strong> — select from 70+ verified public and commercial databases (FEMA, ATTOM, property transfers, trade registries, etc.).</li>
                      <li><strong className="text-white">AI sources &amp; enriches</strong> — AURA scans selected databases, scores each lead, and enriches every result with verified email, phone, and social profiles.</li>
                      <li><strong className="text-white">Review &amp; purchase</strong> — browse scored leads rated Hot (80+), Warm (50–79), or Cold (&lt;50). Purchase individually or in bulk.</li>
                      <li><strong className="text-white">Push to pipeline</strong> — one click sends any lead into your sales pipeline with outreach tools ready to go.</li>
                    </ol>
                  </div>

                  <ul className="space-y-2.5 mb-6 text-[13px] text-[#A1A1AA]">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      Every lead includes verified contact info — email, phone, and social media profiles — or it doesn't get delivered.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      Enriched via Apollo, Hunter, and PDL — company data, job titles, intent signals, and decision‑maker identification included.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      Per‑lead pricing tailored to your industry — starting as low as $15 per lead for consulting and general business.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      AURA Connect subscribers get free leads every month and a 40% discount. Studio members get 3× free leads and 60% off.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      Lead Marketplace — trade, swap, or sell leads with other AURA users. Your public AURA Rating (0–100) tracks reliability and deal success.
                    </li>
                  </ul>

                  <div className="text-[12px] text-[#52525B] leading-[1.55] mb-6 border-l-2 pl-3" style={{ borderColor: "hsl(140 12% 42% / 0.3)" }}>
                    Leads are available to anyone with an AURA account. Subscribe to AURA Connect for free monthly leads and discounted pricing.
                  </div>

                  <div className="flex items-center gap-4">
                    <Link
                      to="/get-started?redirect=/connect/leads"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#08080A] px-7 py-3 rounded-[10px] transition-colors no-underline"
                      style={{ background: "hsl(140 12% 42%)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(140 12% 52%)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "hsl(140 12% 42%)")}
                    >
                      Get Started
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Right column */}
                <div>
                  <div className="rounded-[20px] overflow-hidden border border-[hsl(140_12%_42%/0.12)] aspect-[16/9] relative mb-4" style={{ background: "linear-gradient(135deg, hsl(140 12% 42% / 0.08), hsl(140 12% 20% / 0.04))" }}>
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mb-3" style={{ color: "hsl(140 12% 58%)" }}>
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M11 8v6" /><path d="M8 11h6" />
                      </svg>
                      <p className="text-lg font-bold text-white tracking-tight">AI‑Sourced &amp; Enriched Leads</p>
                      <p className="text-xs mt-2" style={{ color: "hsl(140 12% 58%)" }}>70+ databases • Verified contacts • Intent scoring • Any industry</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {[
                      { t: "Insurance", d: "Commercial and personal lines prospects from business filings, permits, and market triggers.", price: "$25/lead" },
                      { t: "Real Estate & Property", d: "Buyers, sellers, and investors sourced from listing activity, permits, and ownership records.", price: "$100/lead" },
                      { t: "Financial Advisory", d: "High‑net‑worth individuals and business owners from wealth signals and life event triggers.", price: "$100/lead" },
                      { t: "Consulting & General", d: "B2B decision‑makers and business owners matched to your service offering.", price: "$15/lead" },
                    ].map((f) => (
                      <div key={f.t} className="p-4 border rounded-xl" style={{ background: "hsl(140 12% 42% / 0.04)", borderColor: "hsl(140 12% 42% / 0.1)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[13px] font-semibold text-white">{f.t}</div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 72%)" }}>{f.price}</span>
                        </div>
                        <div className="text-[12px] text-[#71717A] leading-[1.55]">{f.d}</div>
                      </div>
                    ))}
                  </div>

                  {/* What's included with every lead */}
                  <div className="p-4 border rounded-xl" style={{ background: "hsl(140 12% 42% / 0.04)", borderColor: "hsl(140 12% 42% / 0.1)" }}>
                    <div className="text-[12px] font-semibold text-white mb-2">Every lead includes</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-[#A1A1AA]">
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: "hsl(140 12% 52%)" }} />Verified email address</span>
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: "hsl(140 12% 52%)" }} />Phone number</span>
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: "hsl(140 12% 52%)" }} />Social media profiles</span>
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: "hsl(140 12% 52%)" }} />Company &amp; job title</span>
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: "hsl(140 12% 52%)" }} />AURA score (0–100)</span>
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: "hsl(140 12% 52%)" }} />Intent &amp; trigger signals</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                    AI Workspace for<br />Producers & Teams
                  </h2>

                  {/* Pricing block */}
                  <div className="p-5 border rounded-xl mb-6" style={{ background: "hsl(140 12% 42% / 0.04)", borderColor: "hsl(140 12% 42% / 0.15)" }}>
                    <div className="text-sm text-[#A1A1AA] mb-1"><strong className="text-white text-lg">$249</strong>/month per account</div>
                    <div className="text-sm font-medium mb-1" style={{ color: "hsl(140 12% 62%)" }}>Launch offer: $99/month during buildout</div>
                    <div className="text-[12px] text-[#71717A] leading-[1.55]">Month‑to‑month SaaS · no long‑term contract required.</div>
                  </div>

                  <p className="text-[15px] text-[#71717A] leading-[1.65] mb-5">
                    An AI‑native workspace that maps your professional network, powers your email and calendar with intelligence, manages your sales pipeline, automates outreach cadences, and creates on‑brand marketing content — all from one platform.
                  </p>

                  {/* Key features */}
                  <ul className="space-y-2 mb-6 text-[13px] text-[#A1A1AA]">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      Interactive relationship graph mapping every connection across email, social, and calendar.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      AI‑powered email hub with Gmail, Outlook, and AURA layouts — smart summarize, AI reply, and pipeline tagging built in.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      Sales pipeline, calendar, and tiered outreach cadences with automated follow‑ups.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      AI brand studio for flyers, social graphics, and Sage‑powered captions and posting.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      Sage AI assistant for real‑time coaching, content generation, and workflow guidance.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(140 12% 52%)" }} />
                      Free targeted leads every month — sourced and matched to your industry automatically.
                    </li>
                  </ul>

                  <p className="text-[12px] text-[#52525B] leading-[1.55] mb-6 border-l-2 pl-3" style={{ borderColor: "hsl(140 12% 42% / 0.3)" }}>
                    CONNECT is designed to help teams capture the kind of productivity gains studies now show from well‑deployed AI — high single‑digit to low double‑digit improvements in year one.
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
                      <p className="text-lg font-bold text-white mt-4 tracking-tight">Intelligence runs on AURA</p>
                      <p className="text-xs mt-2" style={{ color: "hsl(140 12% 58%)" }}>Relationship intelligence • AI email • Sales pipeline • Marketing</p>
                    </div>
                  </div>
                  <IntegrationTicker />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { t: "Relationship graph", d: "Map every connection across email, social, and calendar into one unified network." },
                      { t: "AI-powered email", d: "Gmail, Outlook, or AURA view — with smart summarize, AI reply, and pipeline tagging built in." },
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

        {/* ═══ AURA STUDIO — hidden for now ═══ */}

        {/* ═══ WHY AI-NATIVE MATTERS — Research Section ═══ */}
        <section className="lp-reveal pt-[120px] max-sm:pt-20 pb-[60px] relative" id="research" ref={addRevealRef}>
          <div className="max-w-[1200px] mx-auto px-12 max-md:px-8 max-sm:px-5">
            <div className="border-t border-white/[0.06] pt-14">
              <div className="mb-10">
                <div className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-4" style={{ color: "hsl(140 12% 58%)" }}>The ROI of AI</div>
                <h2 className="text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.035em] leading-[1.1] text-white mb-3">
                  Why AI‑Native Matters
                </h2>
                <p className="text-[15px] text-[#71717A] max-w-[560px] leading-[1.6]">
                  Teams that embrace AI are already seeing step‑change improvements in productivity and cost. Here's what independent research shows.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {researchStats.map((s) => (
                  <div key={s.heading} className="p-6 rounded-2xl border transition-all hover:border-[hsl(140_12%_42%/0.25)] hover:-translate-y-0.5" style={{ background: "hsl(140 12% 42% / 0.04)", borderColor: "hsl(140 12% 42% / 0.1)" }}>
                    <div className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-3" style={{ color: "hsl(140 12% 58%)" }}>{s.source}</div>
                    <div className="text-[15px] font-bold text-white mb-2 leading-tight">{s.heading}</div>
                    <div className="text-[12px] text-[#71717A] leading-[1.6]">{s.text}</div>
                  </div>
                ))}
              </div>

              <p className="text-[14px] text-[#71717A] leading-[1.65] max-w-[700px]">
                <span className="font-semibold text-white">AURA CONNECT</span> and <span className="font-semibold text-[#F59E0B]">AURA AGENT</span> are built to help small and mid‑sized firms capture these same gains — without hiring an internal AI team.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ BRANCH CAROUSEL — hidden for launch ═══ */}
        {/* <section className="lp-reveal pt-[120px] max-sm:pt-20" id="branches" ref={addRevealRef}> ... </section> */}

        {/* ═══ PARTNERS — hidden for launch ═══ */}
        {/* <section className="lp-reveal pt-[120px] max-sm:pt-20" id="partners" ref={addRevealRef}> ... </section> */}

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
              <a href="#leads" className="block text-[13px] text-[#71717A] py-1 hover:text-white transition-colors no-underline">AURA Leads</a>
              <a href="#connect" className="block text-[13px] text-[#71717A] py-1 hover:text-white transition-colors no-underline">AURA Connect</a>
              <a href="#studio" className="block text-[13px] text-[#71717A] py-1 hover:text-white transition-colors no-underline">AURA Studio</a>
              <a href="#research" className="block text-[13px] text-[#71717A] py-1 hover:text-white transition-colors no-underline">Why AI</a>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white mb-4">Company</div>
              <span className="block text-[13px] text-[#71717A] py-1">About</span>
              <span className="block text-[13px] text-[#71717A] py-1">Careers</span>
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
