import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Brain, DollarSign, Users, Target, Rocket, BarChart3, Shield } from "lucide-react";
import auraLogo from "@/assets/aura-logo.png";

const SLIDES = [
  { id: "title", label: "Title" },
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solution" },
  { id: "how", label: "How It Works" },
  { id: "model", label: "Revenue Model" },
  { id: "gtm", label: "Go-to-Market" },
  { id: "projections", label: "Projections" },
  { id: "ask", label: "The Ask" },
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

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/60 backdrop-blur-sm z-10">
        <img src={auraLogo} alt="AURA" className="h-6" />
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

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          key={current}
          className={`absolute inset-0 flex items-center justify-center p-6 md:p-12 ${animDir === "right" ? "animate-slide-in-right" : "animate-slide-in-left"}`}
        >
          <div className="w-full max-w-5xl">
            {current === 0 && <TitleSlide />}
            {current === 1 && <ProblemSlide />}
            {current === 2 && <SolutionSlide />}
            {current === 3 && <HowSlide />}
            {current === 4 && <ModelSlide />}
            {current === 5 && <GTMSlide />}
            {current === 6 && <ProjectionsSlide />}
            {current === 7 && <AskSlide />}
          </div>
        </div>

        {/* Nav arrows */}
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

/* ─── Individual Slides ─── */

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

function TitleSlide() {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-foreground leading-none mb-2">
        <span className="aura-gradient-text">AURA</span>
      </h1>
      <p className="text-2xl md:text-3xl font-semibold text-muted-foreground tracking-wide mb-8">Risk Group</p>
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
        AI-Powered Insurance<br />
        <span className="aura-gradient-text">Submission Platform</span>
      </h2>
      <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
        Reducing commercial insurance submission time by 75%+ while improving accuracy — trained by industry experts.
      </p>
      <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground/60">
        <span>Investment Deck</span>
        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
        <span>Confidential</span>
      </div>
    </div>
  );
}

function ProblemSlide() {
  return (
    <div>
      <SlideHeader icon={Shield} tag="The Problem" title="Commercial insurance submissions are broken" subtitle="Agencies spend hours manually filling repetitive forms, re-keying data, and chasing missing information." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <StatCard value="3–5 hrs" label="Average time per submission" sub="Manual data entry across 6+ ACORD forms" />
        <StatCard value="23%" label="Error rate on manual submissions" sub="Leading to delays, re-work, and lost business" />
        <StatCard value="$4.2B" label="Wasted annually on admin" sub="Industry-wide inefficiency in commercial lines" />
      </div>
    </div>
  );
}

function SolutionSlide() {
  return (
    <div>
      <SlideHeader icon={Brain} tag="Our Solution" title="AURA — AI that thinks like an underwriter" subtitle="Our AI agent extracts, infers, and cross-fills data across all ACORD forms simultaneously. Trained by producers and underwriters." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {[
          { value: "75%+", label: "Reduction in submission time", sub: "Hours → minutes" },
          { value: "6 forms", label: "Cross-filled simultaneously", sub: "ACORD 125, 126, 127, 130, 131, 140" },
          { value: "AI Audit", label: "Consistency checks built-in", sub: "Catches gaps before the underwriter does" },
          { value: "Expert-trained", label: "Industry-specific models", sub: "Not generic AI — trained on real submissions" },
        ].map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
    </div>
  );
}

function HowSlide() {
  return (
    <div>
      <SlideHeader icon={Rocket} tag="How It Works" title="Three steps. One conversation." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {[
          { step: "01", title: "Upload & Chat", desc: "Upload documents or simply talk to AURA. Our AI extracts business data, coverage needs, and loss history automatically." },
          { step: "02", title: "AI Cross-Fill", desc: "AURA fills all 6 ACORD forms simultaneously, inferring missing values and flagging gaps for the producer to review." },
          { step: "03", title: "Review & Submit", desc: "One-click package download with all forms, audit trail, and email-ready submission to carriers." },
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

function ModelSlide() {
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="Revenue Model" title="Growing share of every policy" subtitle="We take a percentage of each contract — starting small, growing as we prove value. The agency keeps more, and we grow together." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <div className="rounded-xl border-2 border-border bg-card p-6 hover-lift text-center">
          <div className="text-sm font-semibold text-muted-foreground mb-1">Year 1</div>
          <div className="text-4xl font-bold text-foreground">7.5%</div>
          <div className="text-xs text-muted-foreground mt-2">Low friction adoption — agencies keep 92.5%</div>
        </div>
        <div className="rounded-xl border-2 border-primary/30 bg-card p-6 hover-lift text-center ring-1 ring-primary/10">
          <div className="text-sm font-semibold text-primary mb-1">Year 2</div>
          <div className="text-4xl font-bold text-foreground">12.5%</div>
          <div className="text-xs text-muted-foreground mt-2">Proven value unlocks greater share</div>
        </div>
        <div className="rounded-xl border-2 border-primary/50 bg-card p-6 hover-lift text-center ring-1 ring-primary/20">
          <div className="text-sm font-semibold text-primary mb-1">Year 3</div>
          <div className="text-4xl font-bold text-foreground">20%</div>
          <div className="text-xs text-muted-foreground mt-2">Efficiency gains offset the increase for agencies</div>
        </div>
      </div>
      <p className="mt-5 text-sm text-muted-foreground text-center italic">Revenue grows from renewals + new policies — compounding year over year.</p>
    </div>
  );
}

function GTMSlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Go-to-Market" title="Leveraging an insider advantage" subtitle="We're pivoting off Doug's active role at his agency to build our initial book of business — real clients, real policies, day one." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <h3 className="font-semibold text-foreground mb-2">Phase 1 — Prove (Months 1–6)</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Deploy AURA within Doug's agency</li>
            <li>Target 25 commercial policies</li>
            <li>Refine AI models on real submissions</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <h3 className="font-semibold text-foreground mb-2">Phase 2 — Expand (Months 7–18)</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Onboard partner agencies in network</li>
            <li>Reach 100 policies / $5M in premiums</li>
            <li>Build referral-based growth engine</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProjectionsSlide() {
  return (
    <div>
      <SlideHeader icon={BarChart3} tag="Financial Projections" title="Path to profitability" />
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Metric</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-semibold">18 Months</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-semibold">36 Months</th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            {[
              ["Policies", "100", "250+"],
              ["Total Premiums", "$5,000,000", "$12,500,000"],
              ["Platform Revenue", "$625,000", "$1,875,000"],
              ["COGS", "~$300,000", "~$600,000"],
              ["Gross Margin", "~$325,000 (52%)", "~$1,275,000 (68%)"],
              ["Our Rev Share", "7.5–12.5%", "20%"],
            ].map(([metric, y1, y2]) => (
              <tr key={metric} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium">{metric}</td>
                <td className="py-3 px-4 text-right tabular-nums">{y1}</td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold">{y2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Primary COGS increase at 36 months: high-quality service staff to support producers at scale.</p>
    </div>
  );
}

function AskSlide() {
  return (
    <div className="text-center">
      <SlideHeader icon={Target} tag="The Ask" title="$250,000 for 10% equity" subtitle="" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 mb-8">
        <StatCard value="$250K" label="Total raise" sub="For 10% equity" />
        <StatCard value="$75K" label="Minimum per investor" />
        <StatCard value="$2.5M" label="Pre-money valuation" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 max-w-2xl mx-auto">
        <h3 className="font-semibold text-foreground mb-3">Use of Funds</h3>
        <div className="grid grid-cols-2 gap-3 text-sm text-left">
          {[
            ["AI & Product Development", "40%"],
            ["Go-to-Market & Sales", "25%"],
            ["Operations & Compliance", "20%"],
            ["Working Capital", "15%"],
          ].map(([use, pct]) => (
            <div key={use} className="flex justify-between items-center py-1.5 border-b border-border/30">
              <span className="text-muted-foreground">{use}</span>
              <span className="font-semibold text-foreground">{pct}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <img src={auraLogo} alt="AURA" className="h-8 mx-auto opacity-60" />
        <p className="text-xs text-muted-foreground/50 mt-2">Confidential — AURA Risk Group</p>
      </div>
    </div>
  );
}
