import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Brain, DollarSign, Users, Target, Rocket, BarChart3, Shield, Database, Eye, Layers, Replace } from "lucide-react";
import auraLogo from "@/assets/aura-logo.png";

const SLIDES = [
  { id: "title", label: "Title" },
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solution" },
  { id: "how", label: "How It Works" },
  { id: "vision-layers", label: "The Vision" },
  { id: "intelligence", label: "Intelligence Engine" },
  { id: "moat", label: "The Moat" },
  { id: "replaces", label: "What We Replace" },
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

  const slideComponents = [
    <TitleSlide />,
    <ProblemSlide />,
    <SolutionSlide />,
    <HowSlide />,
    <VisionLayersSlide />,
    <IntelligenceSlide />,
    <MoatSlide />,
    <ReplacesSlide />,
    <ModelSlide />,
    <GTMSlide />,
    <ProjectionsSlide />,
    <AskSlide />,
  ];

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
            {slideComponents[current]}
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

/* ─── Shared Components ─── */

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

/* ─── Slide 1: Title ─── */
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

/* ─── Slide 2: Problem (enhanced) ─── */
function ProblemSlide() {
  return (
    <div>
      <SlideHeader icon={Shield} tag="The Problem" title="Agencies are drowning in manual work" subtitle="The commercial insurance workflow is broken — agencies outsource critical work because humans can't review everything manually." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <StatCard value="3–5 hrs" label="Per submission — manual entry" sub="Data re-keyed across 6+ forms" />
        <StatCard value="23%" label="Error rate on submissions" sub="Delays, re-work, lost business" />
        <StatCard value="$4.2B" label="Wasted on admin annually" sub="Industry-wide inefficiency" />
      </div>
      <div className="mt-5 rounded-xl border border-border bg-card/50 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Work agencies outsource today because they have no choice:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {["Submission preparation", "Exposure review", "Renewal prep", "Marketing prep", "COI review", "Coverage auditing"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
              {item}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground/70 italic">None of this data is unified or usable — agencies have the data, but no way to structure it.</p>
      </div>
    </div>
  );
}

/* ─── Slide 3: Solution ─── */
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

/* ─── Slide 4: How It Works ─── */
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

/* ─── Slide 5: Vision — Three Layers ─── */
function VisionLayersSlide() {
  return (
    <div>
      <SlideHeader icon={Layers} tag="Long-Term Vision" title="Three layers of intelligence" subtitle="AURA is not a CRM. Not automation. It's an intelligence layer between raw insurance data and human judgment." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        <div className="rounded-xl border-2 border-primary/40 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/40" />
          <Database className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 1 — Data</h3>
          <p className="text-sm text-muted-foreground mb-3">Unify & structure all agency data into one canonical view.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• Policies, applications, loss runs, COIs</li>
            <li>• Property, vehicle, industry benchmarks</li>
            <li>• Year-over-year behavioral changes</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-primary/80">The data is the asset — not the software.</p>
        </div>

        <div className="rounded-xl border-2 border-primary/30 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
          <Brain className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 2 — Thinking</h3>
          <p className="text-sm text-muted-foreground mb-3">AI analyzes and surfaces observations — it doesn't sell.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• Detects missing coverages & gaps</li>
            <li>• Flags inconsistent limits & exposures</li>
            <li>• Compares account vs. peers vs. history</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-primary/80">Pattern recognition at scale.</p>
        </div>

        <div className="rounded-xl border-2 border-primary/20 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/30 to-primary/10" />
          <Eye className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 3 — Human</h3>
          <p className="text-sm text-muted-foreground mb-3">Nothing happens automatically. Everything flows through review.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• Observations, flags, suggested actions</li>
            <li>• Producer approves or dismisses</li>
            <li>• Full audit trail & accountability</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-primary/80">The human remains the decision maker.</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 6: Intelligence Engine ─── */
function IntelligenceSlide() {
  return (
    <div>
      <SlideHeader icon={Brain} tag="Intelligence Engine" title="20 observation types — day one" subtitle="The system compresses 3 hours of thinking into 3 minutes of review. The human still owns the decision." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-destructive/70" />Coverage Gaps
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• No umbrella policy detected</li>
            <li>• Property exists but no business interruption</li>
            <li>• Auto present but no hired/non-owned auto</li>
            <li>• Professional exposure without E&O</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500/70" />Limit Adequacy
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Property limit below replacement value</li>
            <li>• GL / umbrella limits below peer benchmark</li>
            <li>• Revenue growth without limit increase</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500/70" />Data Conflicts
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Payroll differs between policy & application</li>
            <li>• Revenue inconsistent across records</li>
            <li>• Employee / vehicle count mismatches</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary/70" />Submission Completeness
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Missing loss runs or supplemental apps</li>
            <li>• Missing exposure breakdown</li>
            <li>• Missing operations narrative</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 7: The Moat ─── */
function MoatSlide() {
  return (
    <div>
      <SlideHeader icon={Database} tag="The Real Moat" title="Proprietary intelligence that compounds" subtitle="Anyone can use AI models. The moat is structured insurance data + continuous feedback from real agency decisions." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <h3 className="text-base font-semibold text-foreground mb-4">The Feedback Loop</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "System generates observations with evidence" },
              { step: "2", text: "Human approves, dismisses, or edits" },
              { step: "3", text: "Decisions feed back into the model" },
              { step: "4", text: "Benchmarks, thresholds, and confidence improve" },
              { step: "5", text: "System gets smarter with every policy" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{item.step}</span>
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <h4 className="text-sm font-semibold text-foreground mb-2">What becomes proprietary</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Structured insurance data across accounts</li>
              <li>• Historical agency outcomes & patterns</li>
              <li>• Calibrated confidence from human approvals</li>
              <li>• Peer benchmarks by class of business</li>
            </ul>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 hover-lift">
            <p className="text-sm text-foreground font-medium leading-relaxed">
              "The goal is not automation. The goal is <span className="aura-gradient-text font-bold">compression of human effort</span>. 3 hours of thinking → 3 minutes of review."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 8: What We Replace ─── */
function ReplacesSlide() {
  return (
    <div>
      <SlideHeader icon={Replace} tag="Outsourcing Eliminated" title="Fewer humans, operating at a higher level" subtitle="Built correctly, AURA replaces outsourced roles — not by removing humans, but by letting fewer people do more." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
          <h3 className="text-sm font-semibold text-destructive mb-4">Outsourced roles eliminated</h3>
          <div className="space-y-2.5">
            {[
              "Virtual assistants",
              "Marketing assistants",
              "Coverage auditors",
              "Submission prep staff",
              "Data entry staff",
            ].map((role) => (
              <div key={role} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="text-destructive/60 text-lg leading-none">×</span>
                {role}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h3 className="text-sm font-semibold text-primary mb-4">What AURA does instead</h3>
          <div className="space-y-2.5">
            {[
              "Instant submission pack generation",
              "Automated coverage gap analysis",
              "Renewal prep with change detection",
              "Exposure review with peer benchmarks",
              "COI verification checklists",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="text-primary text-lg leading-none">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-muted-foreground italic">The system does the analysis. The human makes the decision.</p>
    </div>
  );
}

/* ─── Slide 9: Revenue Model ─── */
function ModelSlide() {
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="Revenue Model" title="Per-producer SaaS pricing" subtitle="Simple, predictable pricing per producer seat. We start at 30–50% of our long-term rate to drive adoption — then grow into full pricing as the platform delivers more value." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <div className="rounded-xl border-2 border-border bg-card p-6 hover-lift text-center">
          <div className="text-sm font-semibold text-muted-foreground mb-1">Launch Pricing</div>
          <div className="text-3xl font-bold text-foreground">$250–400</div>
          <div className="text-xs text-muted-foreground mt-1">per producer / month</div>
          <div className="text-xs text-muted-foreground/70 mt-2">30–50% of long-term rate — low friction adoption</div>
        </div>
        <div className="rounded-xl border-2 border-primary/30 bg-card p-6 hover-lift text-center ring-1 ring-primary/10">
          <div className="text-sm font-semibold text-primary mb-1">Year 2+ Pricing</div>
          <div className="text-3xl font-bold text-foreground">$500–700</div>
          <div className="text-xs text-muted-foreground mt-1">per producer / month</div>
          <div className="text-xs text-muted-foreground/70 mt-2">Full intelligence suite unlocked — proven ROI</div>
        </div>
        <div className="rounded-xl border-2 border-primary/50 bg-card p-6 hover-lift text-center ring-1 ring-primary/20">
          <div className="text-sm font-semibold text-primary mb-1">Long-Term Target</div>
          <div className="text-3xl font-bold text-foreground">$800+</div>
          <div className="text-xs text-muted-foreground mt-1">per producer / month</div>
          <div className="text-xs text-muted-foreground/70 mt-2">Full data layer, intelligence engine & integrations</div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-border bg-card/50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-foreground mb-1.5">Why per-producer pricing works</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Agencies understand per-seat models</li>
              <li>• Scales naturally with agency growth</li>
              <li>• No revenue-share complexity or audit friction</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1.5">Why start at 30–50%</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Minimal risk for early adopters</li>
              <li>• Proves value before full pricing</li>
              <li>• Long-term features justify the increase</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 10: GTM ─── */
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

/* ─── Slide 11: Projections ─── */
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
              ["Avg. per Producer", "$250–400/mo", "$500–800/mo"],
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

/* ─── Slide 12: The Ask ─── */
function AskSlide() {
  return (
    <div className="text-center">
      <SlideHeader icon={Target} tag="The Ask" title="$500,000 for 10% equity" subtitle="" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 mb-8">
        <StatCard value="$500K" label="Total raise" sub="For 10% equity" />
        <StatCard value="$100K" label="Minimum per investor" />
        <StatCard value="$5M" label="Pre-money valuation" />
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
