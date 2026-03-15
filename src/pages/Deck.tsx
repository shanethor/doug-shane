import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Brain, DollarSign, Users, Target, Rocket, BarChart3, Shield, Database, Eye, Layers, Zap, Heart, Smartphone, FolderOpen, MessageCircle, Bot, Activity, LayoutDashboard, CreditCard, FileText, ArrowRight, Repeat, PieChart, Building2, Briefcase, HandCoins } from "lucide-react";

const SLIDES = [
  { id: "title", label: "Title" },
  { id: "origin", label: "Origin" },
  { id: "problem", label: "Problem" },
  { id: "built-by", label: "Unfair Advantage" },
  { id: "solution", label: "Solution" },
  { id: "how", label: "How It Works" },
  { id: "seven-engines", label: "7 Revenue Engines" },
  { id: "commission", label: "Commission Flow" },
  { id: "personal-lines", label: "PL & Life" },
  { id: "pulse", label: "Pulse" },
  { id: "business-model", label: "Business Model" },
  { id: "growth-engine", label: "Growth Engine" },
  { id: "architecture", label: "Architecture" },
  { id: "moat", label: "The Moat" },
  { id: "wedge", label: "Expansion" },
  { id: "insured", label: "Client Experience" },
  { id: "why-wins", label: "Why We Win" },
  { id: "market", label: "Market" },
  { id: "gtm", label: "Go-to-Market" },
  { id: "projections", label: "Projections" },
  { id: "pnl", label: "P&L" },
  { id: "roi", label: "Investor ROI" },
  { id: "cap-table", label: "Cap Table" },
  { id: "the-ask", label: "The Ask" },
];

export default function Deck() {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");

  const go = useCallback((dir: 1 | -1) => {
    setCurrent((c) => {
      const next = c + dir;
      if (next < 0 || next >= SLIDES.length) return c;
      setAnimDir(dir === 1 ? "right" : "left");
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go]);

  const slideComponents = [
    <TitleSlide />,
    <OriginSlide />,
    <ProblemSlide />,
    <BuiltBySlide />,
    <SolutionSlide />,
    <HowSlide />,
    <SevenEnginesSlide />,
    <CommissionSlide />,
    <PersonalLinesSlide />,
    <PulseSlide />,
    <CommandCenterSlide />,
    <BusinessModelSlide />,
    <GrowthEngineSlide />,
    <ArchitectureSlide />,
    <MoatSlide />,
    <WedgeSlide />,
    <InsuredExperienceSlide />,
    <WhyWinsSlide />,
    <MarketSlide />,
    <GTMSlide />,
    <ProjectionsSlide />,
    <PnLSlide />,
    <ROISlide />,
    <CapTableSlide />,
    <TheAskSlide />,
  ];

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/60 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-foreground">AURA</span>
          <span className="text-[11px] text-muted-foreground tracking-widest uppercase">Risk Group</span>
        </div>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setAnimDir(i > current ? "right" : "left"); setCurrent(i); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-medium tabular-nums">{current + 1}/{SLIDES.length}</span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div
          key={current}
          className={`absolute inset-0 overflow-y-auto p-6 md:p-12 ${animDir === "right" ? "animate-slide-in-right" : "animate-slide-in-left"}`}
        >
          <div className="w-full max-w-5xl mx-auto min-h-full flex items-center">
            <div className="w-full">{slideComponents[current]}</div>
          </div>
        </div>
        {current > 0 && (
          <button onClick={() => go(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/80 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-card transition-all">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {current < SLIDES.length - 1 && (
          <button onClick={() => go(1)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/80 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-card transition-all">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Shared ─── */
function SlideHeader({ icon: Icon, tag, title, subtitle }: { icon: any; tag: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">{tag}</span>
      </div>
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-muted-foreground max-w-2xl">{subtitle}</p>}
    </div>
  );
}

function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover-lift">
      <div className="text-2xl md:text-3xl font-bold text-foreground">{value}</div>
      <div className="text-sm font-medium text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-xs text-muted-foreground/70 mt-1">{sub}</div>}
    </div>
  );
}

/* ─── 1: Title ─── */
function TitleSlide() {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-foreground leading-none mb-2">
        <span className="aura-gradient-text">AURA</span>
      </h1>
      <p className="text-2xl md:text-3xl font-semibold text-muted-foreground tracking-wide mb-8">Risk Group</p>
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
        AI-Native Commercial Insurance<br />
        <span className="aura-gradient-text">Brokerage</span>
      </h2>
      <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
        Seven revenue engines. Phantom equity. AI-driven growth.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-6 text-center">
        <div><p className="text-3xl font-extrabold text-foreground">$5M</p><p className="text-xs text-muted-foreground mt-1">Post-Money Valuation</p></div>
        <div><p className="text-3xl font-extrabold text-foreground">$500K</p><p className="text-xs text-muted-foreground mt-1">Seed Investment</p></div>
        <div><p className="text-3xl font-extrabold text-foreground">$50.6M</p><p className="text-xs text-muted-foreground mt-1">Yr 5 Revenue Target</p></div>
      </div>
      <p className="mt-8 text-lg font-semibold text-foreground">Insurance runs on AURA.</p>
      <div className="mt-6 text-sm text-muted-foreground/60">Confidential Investment Deck · 2026</div>
    </div>
  );
}

/* ─── 2: Origin ─── */
function OriginSlide() {
  return (
    <div>
      <SlideHeader icon={Heart} tag="The Origin" title="This did not start as a software idea." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Producers are expected to advise clients on risk, but most of their time is spent managing process instead of closing business. The biggest risk is not the insured — it is the systems everything runs on.
          </p>
          <p className="text-sm font-semibold text-foreground leading-relaxed mt-4">
            AURA is being built from inside the job, not outside of it.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 hover-lift">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Founding Team</p>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Doug Wenz</span><br />Founder & Active Commercial Producer
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Shane Thorsteinson</span><br />Co-Founder & Lead Engineer
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Built-in communications (email, phone, chat) let AI identify pain points weekly — a continuous improvement flywheel no competitor has.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 3: Problem ─── */
function ProblemSlide() {
  return (
    <div>
      <SlideHeader icon={Shield} tag="The Problem" title="Producers lose 60% of their week to admin." subtitle="The average commercial producer spends more time on paperwork than protecting clients." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <StatCard value="3–5 hours" label="Per submission" sub="Same data re-entered across forms, carriers, and systems" />
        <StatCard value="23%" label="Submission error rate" sub="Delays, E&O exposure, and lost accounts" />
        <StatCard value="$4.2B" label="Spent on admin annually" sub="Industry-wide cost of process nobody signed up for" />
      </div>
      <div className="mt-4 rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="text-center md:text-left">
            <p className="text-3xl font-extrabold text-foreground">$1.05T</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">US P&C premiums (2024)</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              A trillion-dollar industry running on systems built decades ago. Independent agents are gaining market share — captives lost ~6 points since 2013. The infrastructure hasn't kept up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 4: Unfair Advantage ─── */
function BuiltBySlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Unfair Advantage" title="Built inside the industry. Not outside of it." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
          <h3 className="text-sm font-semibold text-destructive mb-3">Every other insurtech</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Built by technologists who studied the workflow</li>
            <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Never carried quota or owned the client relationship</li>
            <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Optimized for process efficiency, not producer success</li>
          </ul>
        </div>
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">AURA</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Built by an active commercial producer</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Running inside a live agency with real accounts</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Day 1 carrier appointments via Associated Insurance</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> 7 diversified revenue engines from day one</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground"><strong className="text-foreground">No one else combines all seven:</strong> producer equity, AI-native infrastructure, diversified revenue, vertical specialization, relationship-first culture, owned payments, and MGA capability.</p>
      </div>
    </div>
  );
}

/* ─── 5: Solution ─── */
function SolutionSlide() {
  return (
    <div>
      <SlideHeader icon={Brain} tag="The Solution" title="AURA is the intelligence layer between the producer and insurance data." subtitle="Submission automation is the entry point. Intelligence is the platform." />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
        <StatCard value="75%+" label="Reduction in submission time" sub="Hours → minutes per account" />
        <StatCard value="Cross-Fill" label="7 ACORD forms live" sub="No duplicate entry across forms" />
        <StatCard value="AI Audit" label="Coverage gap detection" sub="Every submission reviewed" />
        <StatCard value="Real-Time" label="Activity intelligence" sub="Pulse notifications & alerts" />
        <StatCard value="Dashboard" label="Producer analytics" sub="MTD/YTD metrics, pipeline" />
        <StatCard value="Loss Runs" label="Automated requests" sub="E-sign, track, AI analysis" />
      </div>
    </div>
  );
}

/* ─── 6: How It Works ─── */
function HowSlide() {
  return (
    <div>
      <SlideHeader icon={Rocket} tag="How It Works" title="Three steps. One conversation." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {[
          { step: "01", title: "Upload & Chat", desc: "Upload documents or talk to AURA. The AI extracts business data, coverage needs, and loss history automatically." },
          { step: "02", title: "Intelligence Cross-Fill", desc: "AURA completes ACORD forms, supplementals, and submissions instantly. Flags coverage gaps before they become E&O." },
          { step: "03", title: "Review & Submit", desc: "Producer reviews, corrects if needed, sends a complete package. Nothing leaves without producer approval." },
        ].map((s) => (
          <div key={s.step} className="rounded-xl border border-border bg-card p-6 hover-lift">
            <div className="text-4xl font-bold text-primary/20 mb-3">{s.step}</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 7: Seven Revenue Engines (NEW) ─── */
function SevenEnginesSlide() {
  const engines = [
    { num: "1", title: "Coach-Led Commercial", desc: "BOR Growth System. 15–25 producers Yr 1, scaling to 200+ by Yr 5.", yr3: "$10.3M", yr5: "$24.2M", margin: "20–25%" },
    { num: "2", title: "Personal Lines Partners", desc: "Mortgage & FA partnerships. 100–400 policies per partner/yr. No producer commission.", yr3: "$4.0M", yr5: "$11.2M", margin: "35–45%" },
    { num: "3", title: "Life Cross-Sell", desc: "Cross-sell on every PL client. 91% bundled retention vs. 67% single-line.", yr3: "$1.6M", yr5: "$4.9M", margin: "60%+" },
    { num: "4", title: "Vertical Inbound Leads", desc: "Industry-specific landing pages. $100–200 CPL vs $424 industry average.", yr3: "$1.5M", yr5: "$4.2M", margin: "25–30%" },
    { num: "5", title: "Data & Programs", desc: "MGA formation, captives, parametric products at $15M+ book size.", yr3: "$0.35M", yr5: "$1.2M", margin: "50%+" },
    { num: "6", title: "Input 1 / Agency Bill", desc: "Convenience fees, premium finance, ACH savings. Own the payment experience.", yr3: "$0.84M", yr5: "$2.4M", margin: "40–50%" },
    { num: "7", title: "MGA / Programs", desc: "Binding authority on top verticals. Retain 25–35% of premium vs 10–15% as broker.", yr3: "$0", yr5: "$2.5M", margin: "50–65%" },
  ];
  return (
    <div>
      <SlideHeader icon={Layers} tag="Revenue Engines" title="Seven engines. Not a single-channel dependency." subtitle="Diversified from day one. Even if commercial ramp is slower, PL partnerships and vertical leads provide base revenue." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        {engines.map((e) => (
          <div key={e.num} className="rounded-xl border border-border bg-card p-4 hover-lift flex gap-3">
            <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{e.num}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{e.title}</h3>
                <span className="text-xs text-muted-foreground/60">{e.margin}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-muted-foreground">Yr 3: <strong className="text-foreground">{e.yr3}</strong></span>
                <span className="text-muted-foreground">Yr 5: <strong className="text-foreground">{e.yr5}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-3 text-center">
        <p className="text-sm text-muted-foreground">Yr 3 Total: <strong className="text-foreground">$18.6M</strong> · Yr 5 Total: <strong className="text-foreground">$50.6M</strong></p>
      </div>
    </div>
  );
}

/* ─── 8: Commission Waterfall (NEW) ─── */
function CommissionSlide() {
  return (
    <div>
      <SlideHeader icon={HandCoins} tag="Unit Economics" title="Commission flow on a $10K premium." subtitle="15% avg commission = $1,500 gross. AURA's retained share grows as books mature." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Waterfall — $10K Premium</p>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/30 text-xs text-muted-foreground"><th className="text-left py-2">Recipient</th><th className="text-right py-2">New</th><th className="text-right py-2">Renewal</th></tr></thead>
            <tbody>
              {[
                { who: "Gross Commission", n: "$1,500 (100%)", r: "$1,500 (100%)" },
                { who: "Producer", n: "$600 (40%)", r: "$450 (30%)" },
                { who: "Associated", n: "$300 (20%)", r: "$350 (23%)" },
                { who: "Coach Override", n: "$60 (4%)", r: "$60 (4%)" },
                { who: "AURA Retained", n: "$540 (36%)", r: "$640 (43%)" },
              ].map((r) => (
                <tr key={r.who} className="border-b border-border/10">
                  <td className="py-2 text-xs font-medium text-foreground">{r.who}</td>
                  <td className="py-2 text-xs text-right text-muted-foreground">{r.n}</td>
                  <td className="py-2 text-xs text-right text-muted-foreground">{r.r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-foreground mb-2">Built-in margin expansion</p>
            <p className="text-xs text-muted-foreground">As books mature from new → renewal, AURA's retained share increases from 36% to 43% — automatic margin expansion.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Coach Override Tiers</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>$0–$500K team production</span><span className="font-semibold text-foreground">3%</span></div>
              <div className="flex justify-between"><span>$500K–$1.5M</span><span className="font-semibold text-foreground">4%</span></div>
              <div className="flex justify-between"><span>$1.5M–$3M</span><span className="font-semibold text-foreground">5%</span></div>
              <div className="flex justify-between"><span>$3M+</span><span className="font-semibold text-foreground">6%</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 9: Personal Lines & Life (NEW) ─── */
function PersonalLinesSlide() {
  return (
    <div>
      <SlideHeader icon={Building2} tag="Engines 2 & 3" title="Personal lines + life cross-sell." subtitle="Mortgage & FA partnerships. No producer commission. AI-augmented service team. RESPA-compliant ABA structure." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Revenue Per Household</p>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border/30 text-muted-foreground"><th className="text-left py-2">Product</th><th className="text-right py-2">Avg Premium</th><th className="text-right py-2">Commission</th></tr></thead>
            <tbody>
              {[
                { p: "Homeowners", prem: "$2,500", comm: "$300–$375" },
                { p: "Auto", prem: "$1,800", comm: "$180–$216" },
                { p: "P&C Subtotal", prem: "$4,300", comm: "$480–$591" },
                { p: "Term Life", prem: "$800", comm: "$480 (60% 1st yr)" },
                { p: "Full Bundle/HH", prem: "$5,100", comm: "$960–$1,071" },
              ].map((r) => (
                <tr key={r.p} className={`border-b border-border/10 ${r.p === "Full Bundle/HH" ? "font-semibold" : ""}`}>
                  <td className="py-1.5 text-foreground">{r.p}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{r.prem}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{r.comm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-foreground mb-2">Retention Multiplier</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Single-line</span><span className="font-semibold text-foreground">67%</span></div>
              <div className="flex justify-between"><span>Bundled P&C</span><span className="font-semibold text-foreground">91%</span></div>
              <div className="flex justify-between"><span>P&C + Life</span><span className="font-semibold text-primary">95%+</span></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">62% of auto+home+life clients stay 5+ years.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground"><strong className="text-foreground">Scale:</strong> 5–8 mortgage partnerships Yr 1 → 30–50 by Yr 3. 1 service person per 1,200–1,800 policies (AI-augmented).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 10: Pulse ─── */
function PulseSlide() {
  return (
    <div>
      <SlideHeader icon={Activity} tag="Live Feature" title="Pulse — Real-Time Activity Intelligence" subtitle="Keeps producers ahead of every account — automatically." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: FileText, title: "Loss Run Tracking", desc: "Status from requested → received → processed. No follow-up needed." },
          { icon: Activity, title: "Aging Alerts", desc: "Flags leads untouched for 48+ hours. Every account stays visible." },
          { icon: Database, title: "Document Processing", desc: "Alerts when documents are uploaded, extracted, and mapped to ACORD fields." },
          { icon: MessageCircle, title: "Email Intelligence", desc: "Incoming emails auto-tagged and surfaced. Right context, right moment." },
          { icon: Target, title: "Activity Counter", desc: "Live badge count of pending actions. See what needs attention instantly." },
          { icon: Eye, title: "AI Transparency", desc: "Every extraction, form fill, and package build is tracked. Full visibility." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-5 hover-lift">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 11: Command Center ─── */
function CommandCenterSlide() {
  return (
    <div>
      <SlideHeader icon={LayoutDashboard} tag="Live Feature" title="Producer Command Center" subtitle="Every number a producer needs to know, always current." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 hover-lift text-center">
          <p className="text-4xl font-extrabold text-foreground">$63,047</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">MTD New Business</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 hover-lift text-center">
          <p className="text-4xl font-extrabold text-foreground">88.8%</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">Goal Attainment</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {["MTD/YTD tracking vs targets", "Pipeline stage distribution", "Hit ratio & policies per client", "Hunt / Build / Defense modes", "Multi-producer comparison", "\"Behind Pace\" real-time urgency"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />{item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 12: Business Model ─── */
function BusinessModelSlide() {
  return (
    <div>
      <SlideHeader icon={CreditCard} tag="Business Model" title="AURA is the AI brokerage." subtitle="Producers join, write business under our paper, keep more because the platform makes them better." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">How Producers Join & Earn</p>
          <div className="space-y-4">
            {[
              { step: "1", title: "Join AURA", desc: "Credentialed under AURA's carrier appointments and E&O umbrella. Zero setup cost." },
              { step: "2", title: "Full platform access", desc: "ACORD workspace, Pulse, Command Center, AI coaching, sales simulations." },
              { step: "3", title: "Write business", desc: "40% new / 30% renewal split. AURA is the producing brokerage." },
              { step: "4", title: "Book compounds", desc: "Renewals build passive income. Phantom equity vests over 3–4 years." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{item.step}</span>
                <div><p className="text-sm font-semibold text-foreground">{item.title}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Why Producers Stay</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> <strong className="text-foreground">Book Equity Account:</strong> Golden handcuffs that vest over time</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> <strong className="text-foreground">Phantom Equity:</strong> 8–12% pool, non-dilutive cash payouts</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> <strong className="text-foreground">AI Tools:</strong> Switching costs grow as platform learns their book</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground"><strong className="text-foreground">AI staffing efficiency:</strong> 1 CSR per 8–10 producers (vs. industry 1 per 3–4). Revenue/employee 2–4x traditional agencies.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 13: Growth Engine ─── */
function GrowthEngineSlide() {
  return (
    <div>
      <SlideHeader icon={Repeat} tag="Growth Engine" title="The producer flywheel." subtitle="Each producer added makes the next easier to recruit. Each submission makes the platform stronger." />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
        {[
          { step: "01", title: "Recruit", desc: "Better tools, more carrier access, higher effective splits." },
          { step: "02", title: "Equip", desc: "Full platform: AI forms, Pulse, Command Center, coaching." },
          { step: "03", title: "Perform", desc: "Close more, faster. Submission time drops. Hit ratio tracked." },
          { step: "04", title: "Retain", desc: "Switching costs grow. BEA + phantom equity make leaving irrational." },
          { step: "05", title: "Compound", desc: "Renewals generate passive revenue. Producers recruit peers." },
        ].map((s) => (
          <div key={s.step} className="rounded-xl border border-border bg-card p-4 hover-lift">
            <div className="text-3xl font-bold text-primary/20 mb-2">{s.step}</div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{s.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Yr 1:</strong> 15–25 producers · <strong className="text-foreground">Yr 2:</strong> 40–70 · <strong className="text-foreground">Yr 3:</strong> 80–130 · <strong className="text-foreground">Yr 5:</strong> 200+ producers, $50.6M revenue
        </p>
      </div>
    </div>
  );
}

/* ─── 14: Architecture ─── */
function ArchitectureSlide() {
  return (
    <div>
      <SlideHeader icon={Layers} tag="Intelligence Architecture" title="Data. Thinking. Human." subtitle="AURA is not a CRM. It is the intelligence layer between insurance data and the producer." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        {[
          { icon: Database, title: "Layer 1 — Data", desc: "Unifies and structures all agency data.", items: ["Policies, applications, loss runs, COIs", "Property, vehicle, exposure data", "Year-over-year changes & history"], border: "border-primary/40" },
          { icon: Brain, title: "Layer 2 — Thinking", desc: "Analyzes data and surfaces what matters.", items: ["Detects missing coverages and gaps", "Flags inconsistent limits", "Compares against history & peers"], border: "border-primary/30" },
          { icon: Eye, title: "Layer 3 — Human", desc: "Nothing happens without the producer.", items: ["AURA surfaces observations", "Producer reviews and decides", "Full accountability stays with producer"], border: "border-primary/20" },
        ].map(({ icon: Icon, title, desc, items, border }) => (
          <div key={title} className={`rounded-xl border-2 ${border} bg-card p-6 hover-lift relative overflow-hidden`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/20" />
            <Icon className="h-6 w-6 text-primary mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{desc}</p>
            <ul className="text-xs text-muted-foreground/80 space-y-1">{items.map(i => <li key={i}>• {i}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 15: Moat ─── */
function MoatSlide() {
  return (
    <div>
      <SlideHeader icon={Database} tag="The Real Moat" title="The compounding intelligence moat" subtitle="Every submission makes the system smarter and harder to replicate." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <h3 className="text-base font-semibold text-foreground mb-4">The loop that keeps compounding</h3>
          <div className="space-y-3">
            {[
              "Submission enters AURA. Data becomes structured.",
              "AURA evaluates coverage, exposures, and gaps.",
              "Producer reviews and makes decisions. Outcome captured.",
              "AURA learns what was chosen, corrected, what mattered.",
              "Every future submission benefits from that experience.",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <h4 className="text-sm font-semibold text-foreground mb-2">What becomes impossible to replicate</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Structured decision data from real submissions</li>
              <li>• Judgment calibrated from producer decisions</li>
              <li>• Benchmarks across industries, regions, carriers</li>
              <li>• Switching costs that grow every quarter</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-sm font-semibold text-foreground">Competitors can copy software. They cannot copy experience.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 16: Expansion ─── */
function WedgeSlide() {
  return (
    <div>
      <SlideHeader icon={TrendingUp} tag="Platform Expansion" title="Submission → Intelligence → Operating System → Industry Layer" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {[
          { phase: "Phase 1", title: "Submission Intelligence", items: ["ACORD cross-fill (7 forms)", "AI extraction", "Coverage gap detection", "Pulse + Command Center"], status: "Now — Live", active: true },
          { phase: "Phase 2", title: "Producer Intelligence", items: ["Coverage adequacy scoring", "Renewal intelligence", "Loss trend analysis", "Peer benchmarking"], status: "12–18 months", active: false },
          { phase: "Phase 3", title: "Agency OS", items: ["Full pipeline management", "Carrier workflow integration", "Producer performance tools"], status: "24–36 months", active: false },
          { phase: "Phase 4", title: "Industry Layer", items: ["Cross-agency benchmarks", "Risk intelligence API", "Carrier analytics licensing"], status: "36+ months", active: false },
        ].map((p) => (
          <div key={p.phase} className={`rounded-xl border ${p.active ? "border-primary/40 bg-primary/5" : "border-border bg-card"} p-5 hover-lift`}>
            <div className={`text-xs font-semibold uppercase tracking-widest mb-1 ${p.active ? "text-primary" : "text-muted-foreground"}`}>{p.phase}</div>
            <div className="text-xs text-muted-foreground/60 mb-3">{p.status}</div>
            <h3 className="text-sm font-bold text-foreground mb-3">{p.title}</h3>
            <ul className="text-xs text-muted-foreground space-y-1">{p.items.map(i => <li key={i}>• {i}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 17: Client Experience ─── */
function InsuredExperienceSlide() {
  return (
    <div>
      <SlideHeader icon={Smartphone} tag="Client Experience" title="Intelligence extends to the client relationship." subtitle="Input 1 integration: payments, documents, quotes, claims, AI assistant — all on phone, 24/7." />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4">
        {[
          { icon: Smartphone, heading: "Instant Access", desc: "ID cards, policies, documents anytime" },
          { icon: FolderOpen, heading: "Client Requests", desc: "Policy changes, new quotes, certificates" },
          { icon: CreditCard, heading: "Payments", desc: "ACH, cards, Venmo, Apple Pay — built in" },
          { icon: MessageCircle, heading: "Connected", desc: "Direct producer communication, no lost emails" },
          { icon: Bot, heading: "AI Assistant", desc: "AI drives navigation — never invents policy content" },
          { icon: FileText, heading: "Smart Intake", desc: "Auto-populate ACORD data from client responses" },
        ].map(({ icon: Icon, heading, desc }) => (
          <div key={heading} className="flex flex-col items-center text-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20"><Icon className="h-6 w-6 text-primary" strokeWidth={1.5} /></div>
            <h3 className="text-base font-bold text-foreground">{heading}</h3>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-6 border-t border-border/40 pt-4">
        <p className="text-sm font-semibold text-foreground">Easier for clients to work with their producer. Not around them.</p>
      </div>
    </div>
  );
}

/* ─── 18: Why We Win ─── */
function WhyWinsSlide() {
  return (
    <div>
      <SlideHeader icon={Zap} tag="Why AURA Wins" title="The founder advantage no one can replicate." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-4">
          {[
            { items: ["Built by an active commercial producer", "Tested on real accounts, real submissions"], detail: "AURA runs inside a live agency. Every feature is proven in real production." },
            { items: ["Distribution already exists", "The intelligence loop is live"], detail: "Carrier appointments via Associated from day 1. The moat is already building." },
          ].map((block, i) => (
            <div key={i} className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 hover-lift">
              <ul className="text-sm text-muted-foreground space-y-2">
                {block.items.map(item => <li key={item} className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span>{item}</li>)}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">{block.detail}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center">
          <div className="rounded-xl border-2 border-primary/20 bg-card p-6 hover-lift">
            <p className="text-base font-semibold text-foreground">
              Over time, AURA becomes part of how the producer thinks and works — because they simply cannot work without it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 19: Market (NEW) ─── */
function MarketSlide() {
  return (
    <div>
      <SlideHeader icon={Target} tag="Market Opportunity" title="$1.05 trillion in US P&C premiums." subtitle="Independent agents gaining share. AI adoption inflecting. AURA needs < 0.005% of the market to hit Yr 3 targets." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Addressable Market</p>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border/30 text-muted-foreground"><th className="text-left py-2">Segment</th><th className="text-right py-2">Size</th><th className="text-right py-2">AURA Yr 3</th></tr></thead>
            <tbody>
              {[
                { seg: "US Commercial Lines", size: "$510B+", target: "$15M+" },
                { seg: "Personal Lines", size: "$535B", target: "$4M+" },
                { seg: "Life Cross-Sell", size: "$200B+", target: "$1.6M+" },
                { seg: "Insurance Analytics", size: "$15.75B", target: "Future" },
              ].map((r) => (
                <tr key={r.seg} className="border-b border-border/10">
                  <td className="py-1.5 text-foreground">{r.seg}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{r.size}</td>
                  <td className="py-1.5 text-right font-semibold text-foreground">{r.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Why Now</p>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li>• PE roll-ups pushing experienced producers out — looking for ownership</li>
              <li>• 91% of insurers adopted AI by 2025; digital agencies grow 70% faster</li>
              <li>• E&S premiums surged 13.2% to $46.2B in H1 2025</li>
              <li>• "Real" organic growth only 2.7% — AI-native platforms will separate from the pack</li>
              <li>• Insurance analytics: $15.75B → $48B+ by 2033 (15% CAGR)</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <StatCard value="8.0%" label="YoY premium growth (2024)" />
        <StatCard value="~6pts" label="Market share shift to independents" />
        <StatCard value="$47M" label="Harper's AI-brokerage raise" />
      </div>
    </div>
  );
}

/* ─── 20: GTM ─── */
function GTMSlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Go-to-Market" title="The insider advantage." subtitle="Not being introduced to the industry. Built inside it." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 hover-lift">
          <h3 className="font-semibold text-foreground mb-3">Phase 1 — Foundation (Mo 1–6)</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Launch platform, sign Nick Aube, onboard 3–8 producers</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Establish 3–5 mortgage partnerships for PL pipeline</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Launch 3 vertical landing pages</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Positive cash flow by month 9–10</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <h3 className="font-semibold text-foreground mb-3">Phase 2 — Traction (Mo 7–12)</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Scale to 15–25 active producers</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> 1,000 personal lines policies in force</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Begin life cross-sell at 25% conversion</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> 5 verticals generating inbound leads</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard value="Real" label="Live inside an active agency" sub="Not a pilot. Not a test." />
        <StatCard value="Network" label="Distribution via real relationships" sub="Nick Aube's 50–60 producer candidates" />
        <StatCard value="Live" label="Intelligence layer already learning" sub="Every submission makes it stronger" />
      </div>
    </div>
  );
}

/* ─── 21: Projections (Updated from business plan) ─── */
function ProjectionsSlide() {
  const MAX_PX = 140;
  const years = [
    { label: "Year 1", total: "$2.0M", raw: 2.0, producers: "15–25", households: "1K", engines: "CL $1.2M · PL $0.48M · Life $0.19M" },
    { label: "Year 2", total: "$7.9M", raw: 7.9, producers: "40–70", households: "4K", engines: "CL $4.6M · PL $1.8M · Life $0.72M" },
    { label: "Year 3", total: "$18.6M", raw: 18.6, producers: "80–130", households: "10K", engines: "CL $10.3M · PL $4.0M · Life $1.6M" },
    { label: "Year 4", total: "$32.5M", raw: 32.5, producers: "150+", households: "18K", engines: "CL $16.6M · PL $7.2M · Life $3.2M" },
    { label: "Year 5", total: "$50.6M", raw: 50.6, producers: "200+", households: "28K", engines: "CL $24.2M · PL $11.2M · Life $4.9M" },
  ];
  const maxRaw = Math.max(...years.map(y => y.raw));
  return (
    <div>
      <SlideHeader icon={BarChart3} tag="Financial Projections" title="Revenue scales with every engine." subtitle="Seven engines from $2.0M Year 1 to $50.6M Year 5. Commercial + Personal Lines + Life + Vertical + Agency Bill + MGA." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Total Revenue ($M)</p>
          <div className="flex items-end justify-around gap-3" style={{ height: `${MAX_PX + 32}px` }}>
            {years.map((y) => {
              const h = Math.max(12, Math.round((y.raw / maxRaw) * MAX_PX));
              return (
                <div key={y.label} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-bold text-foreground tabular-nums">{y.total}</span>
                  <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${h}px` }} />
                  <span className="text-xs text-muted-foreground font-medium">{y.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Breakdown</p>
          <div className="space-y-2 flex-1">
            {years.map(y => (
              <div key={y.label} className="border-b border-border/20 pb-2 last:border-0">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{y.label}</span>
                  <span className="font-bold text-foreground">{y.total}</span>
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">{y.producers} producers · {y.households} HH</div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">{y.engines}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 22: P&L (NEW) ─── */
function PnLSlide() {
  return (
    <div>
      <SlideHeader icon={TrendingUp} tag="P&L Summary" title="EBITDA margin expands from 25.6% → 57.4%" subtitle="AI-driven servicing automation reduces cost as % of revenue every year. Renewals compound at higher margins." />
      <div className="rounded-xl border border-border bg-card p-5 mt-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground">
              <th className="text-left py-2 font-medium"></th>
              <th className="text-right py-2 font-medium">Year 1</th>
              <th className="text-right py-2 font-medium">Year 2</th>
              <th className="text-right py-2 font-medium">Year 3</th>
              <th className="text-right py-2 font-medium">Year 4</th>
              <th className="text-right py-2 font-medium">Year 5</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Total Revenue", vals: ["$2.0M", "$7.9M", "$18.6M", "$32.5M", "$50.6M"], bold: true },
              { label: "Gross Margin", vals: ["$1.2M", "$4.6M", "$11.8M", "$21.3M", "$34.4M"], bold: false },
              { label: "Gross Margin %", vals: ["57.5%", "58.8%", "63.8%", "65.5%", "67.9%"], bold: false },
              { label: "Total OpEx", vals: ["($0.6M)", "($1.4M)", "($2.5M)", "($3.8M)", "($5.3M)"], bold: false },
              { label: "EBITDA", vals: ["$0.5M", "$3.2M", "$9.3M", "$17.4M", "$29.1M"], bold: true, highlight: true },
              { label: "EBITDA Margin", vals: ["25.6%", "40.9%", "50.3%", "53.7%", "57.4%"], bold: false, highlight: true },
            ].map((row) => (
              <tr key={row.label} className={`border-b border-border/10 ${row.highlight ? "bg-primary/5" : ""}`}>
                <td className={`py-2 ${row.bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{row.label}</td>
                {row.vals.map((v, i) => (
                  <td key={i} className={`py-2 text-right ${row.bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard value="$29.1M" label="Year 5 EBITDA" sub="57.4% margin" />
        <StatCard value="2–4x" label="Revenue per employee vs. traditional" sub="AI-augmented staffing model" />
        <StatCard value="90%" label="Client retention rate" sub="91%+ with life cross-sell bundling" />
      </div>
    </div>
  );
}

/* ─── 23: Investor ROI (Updated) ─── */
function ROISlide() {
  const scenarios = [
    { name: "Conservative", multiple: "10x", ev: "$291M", equity: "$29.1M", returnX: "58x" },
    { name: "Base Case", multiple: "14x", ev: "$407M", equity: "$40.7M", returnX: "81x" },
    { name: "TWFG Comparable", multiple: "36.7x", ev: "$1.07B", equity: "$107M", returnX: "213x" },
  ];
  const dividends = [
    { label: "Year 1", ebitda: "$0.5M", div: "$26K", cum: "$26K" },
    { label: "Year 2", ebitda: "$3.2M", div: "$160K", cum: "$186K" },
    { label: "Year 3", ebitda: "$9.3M", div: "$467K", cum: "$653K" },
    { label: "Year 4", ebitda: "$17.4M", div: "$872K", cum: "$1.5M" },
    { label: "Year 5", ebitda: "$29.1M", div: "$1.5M", cum: "$2.9M" },
  ];
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="Investor Returns" title="$500K → 58x–213x return potential." subtitle="10% equity at $5M post-money. Plus annual dividend distributions." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        {scenarios.map((s) => (
          <div key={s.name} className={`rounded-xl border ${s.name === "Base Case" ? "border-2 border-primary/40 bg-primary/5" : "border-border bg-card"} p-5 text-center hover-lift`}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{s.name}</p>
            <p className="text-3xl font-extrabold text-foreground mt-2">{s.returnX}</p>
            <p className="text-xs text-muted-foreground mt-1">return on $500K</p>
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p>EV/EBITDA: {s.multiple}</p>
              <p>Enterprise Value: {s.ev}</p>
              <p>10% Equity: <strong className="text-foreground">{s.equity}</strong></p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Annual EBITDA Distributions (10% share)</p>
        <div className="flex gap-6 overflow-x-auto">
          {dividends.map(d => (
            <div key={d.label} className="text-center min-w-[80px]">
              <p className="text-xs font-medium text-foreground">{d.label}</p>
              <p className="text-xs text-muted-foreground">{d.ebitda} EBITDA</p>
              <p className="text-sm font-semibold text-foreground">{d.div}</p>
              <p className="text-[10px] text-primary">Cum: {d.cum}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 24: Cap Table (NEW) ─── */
function CapTableSlide() {
  return (
    <div>
      <SlideHeader icon={PieChart} tag="Ownership Structure" title="Clean cap table. Non-dilutive producer incentives." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Cap Table</p>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/30 text-xs text-muted-foreground"><th className="text-left py-2">Stakeholder</th><th className="text-right py-2">%</th><th className="text-left py-2 pl-4">Type</th></tr></thead>
            <tbody>
              {[
                { who: "Doug Wenz", pct: "40%", type: "Co-founder — strategy & operations" },
                { who: "Shane Thorsteinson", pct: "40%", type: "Co-founder — technology & platform" },
                { who: "Investor", pct: "10%", type: "$500K seed at $5M post-money" },
                { who: "Senior Advisor / Coach", pct: "5%", type: "Strategic advisor equity" },
                { who: "Associated Insurance", pct: "5%", type: "Carrier appointments, infrastructure" },
              ].map((r) => (
                <tr key={r.who} className="border-b border-border/10">
                  <td className="py-2 text-xs font-medium text-foreground">{r.who}</td>
                  <td className="py-2 text-xs text-right font-semibold text-foreground">{r.pct}</td>
                  <td className="py-2 text-xs text-muted-foreground pl-4">{r.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Phantom Equity (8–12% of value)</p>
            <p className="text-xs text-muted-foreground mb-2">Separate from actual ownership. Cash-payout mechanism tied to valuation — <strong className="text-foreground">not dilutive</strong> to shareholders.</p>
            <table className="w-full text-xs mt-3">
              <tbody>
                {[
                  { mech: "Actual Equity", who: "Founders, Investor", dilutive: "Yes" },
                  { mech: "Phantom Equity", who: "Producers", dilutive: "No" },
                  { mech: "Book Equity Account", who: "All Producers", dilutive: "No" },
                  { mech: "Profit Sharing", who: "All Employees", dilutive: "No" },
                ].map((r) => (
                  <tr key={r.mech} className="border-b border-border/10">
                    <td className="py-1.5 font-medium text-foreground">{r.mech}</td>
                    <td className="py-1.5 text-muted-foreground">{r.who}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{r.dilutive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground"><strong className="text-foreground">Investor rights:</strong> Board observer seat, quarterly reporting, standard protective provisions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 25: The Ask (Updated) ─── */
function TheAskSlide() {
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="The Ask" title="$500K for 10% of the AI brokerage insurance will run on." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center hover-lift">
          <p className="text-4xl font-extrabold text-foreground">$500K</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">Total Raise</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-center hover-lift">
          <p className="text-4xl font-extrabold text-foreground">10%</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">Equity</p>
          <p className="text-xs text-muted-foreground/70 mt-1">$5M post-money</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-center hover-lift">
          <p className="text-4xl font-extrabold text-foreground">58–213x</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">Return Range (5yr)</p>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Use of Funds</p>
        <div className="space-y-3">
          {[
            { pct: "35%", title: "Technology & Platform", desc: "AI development, integrations, infrastructure" },
            { pct: "20%", title: "Coach Acquisition & Onboarding", desc: "Signing Nick Aube, training programs, materials" },
            { pct: "20%", title: "Operations & Staffing", desc: "Service team, ops manager, E&O insurance" },
            { pct: "10%", title: "Marketing & Brand", desc: "Vertical landing pages, digital presence" },
            { pct: "5%", title: "Compliance & Legal", desc: "ABA structuring, 409A valuation, contracts" },
            { pct: "10%", title: "Working Capital Reserve", desc: "Cash buffer for first 6–9 months" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <span className="text-xl font-extrabold text-primary/80 w-12 shrink-0 text-right">{item.pct}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Platform live and processing real submissions</li>
          <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Carrier appointments and E&O in place via Associated</li>
          <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Coach partner (Nick Aube) signed — 50–60 producer candidates</li>
          <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Seven revenue engines from day one — not single-channel dependent</li>
        </ul>
      </div>
      <p className="mt-5 text-center text-lg font-bold text-foreground">Insurance runs on AURA.</p>
      <p className="mt-2 text-center text-xs text-muted-foreground/50">Confidential — AURA Risk Group</p>
    </div>
  );
}
