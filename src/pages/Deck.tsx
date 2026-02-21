import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Brain, DollarSign, Users, Target, Rocket, BarChart3, Shield, Database, Eye, Layers, Zap, Heart, Smartphone, FolderOpen, MessageCircle, Bot } from "lucide-react";

const SLIDES = [
  { id: "title", label: "Title" },
  { id: "origin", label: "Origin" },
  { id: "problem", label: "Problem" },
  { id: "built-by", label: "Unfair Advantage" },
  { id: "solution", label: "Solution" },
  { id: "how", label: "How It Works" },
  { id: "vision-layers", label: "Three Layers" },
  { id: "human-first", label: "Human First" },
  { id: "moat", label: "The Moat" },
  { id: "wedge", label: "Expansion" },
  { id: "insured", label: "Insured Experience" },
  { id: "why-wins", label: "Why We Win" },
  { id: "model", label: "Revenue Model" },
  { id: "gtm", label: "Go-to-Market" },
  { id: "projections", label: "Projections" },
  { id: "why-exists", label: "Why AURA Exists" },
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
    <VisionLayersSlide />,
    <HumanFirstSlide />,
    <MoatSlide />,
    <WedgeSlide />,
    <InsuredExperienceSlide />,
    <WhyWinsSlide />,
    <ModelSlide />,
    <GTMSlide />,
    <ProjectionsSlide />,
    <WhyExistsSlide />,
  ];

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Top bar */}
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

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          key={current}
          className={`absolute inset-0 overflow-y-auto p-6 md:p-12 ${animDir === "right" ? "animate-slide-in-right" : "animate-slide-in-left"}`}
        >
          <div className="w-full max-w-5xl mx-auto min-h-full flex items-center">
            <div className="w-full">
              {slideComponents[current]}
            </div>
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
        The Intelligence Layer<br />
        <span className="aura-gradient-text">Insurance Runs On</span>
      </h2>
      <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
        AURA was built to help producers manage and close business the right way.
      </p>
      <p className="mt-3 text-base text-muted-foreground/70 max-w-xl">
        Built by producers. Not software companies.
      </p>
      <p className="mt-6 text-lg font-semibold text-foreground">
        Insurance Runs on AURA.
      </p>
      <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground/60">
        <span>Investment Deck</span>
        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
        <span>Confidential</span>
      </div>
    </div>
  );
}

/* ─── Slide 2: Origin ─── */
function OriginSlide() {
  return (
    <div>
      <SlideHeader icon={Heart} tag="The Origin" title="This did not start as a software idea." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <p className="text-sm text-muted-foreground leading-relaxed">
            I decided I was done wasting time re entering data, filling out forms, and working inside systems that were never built to support producers.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Producers are expected to advise clients on risk, but most of their time is spent managing the process instead of closing business. When that happens, the insured does not get the attention they deserve.
          </p>
          <p className="text-sm font-semibold text-foreground leading-relaxed mt-4">
            The biggest risk is not the insured. It is the systems everything runs on.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 hover-lift">
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              AURA is being built from inside the job, not outside of it.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Founding Team</p>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Doug Wenz</span>
                <br />Founder & Active Commercial Producer
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Shane Thorsteinson</span>
                <br />Co Founder & Lead Engineer
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 3: Problem ─── */
function ProblemSlide() {
  return (
    <div>
      <SlideHeader icon={Shield} tag="The Problem" title="Producers are buried in process. Clients pay the price." subtitle="Commercial insurance workflows were built around process — not the people responsible for protecting clients." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <StatCard value="3–5 hours" label="Per submission" sub="The same data re entered across multiple forms every time" />
        <StatCard value="23%" label="Error rate on submissions" sub="Delays, rework, missed coverage, and lost business" />
        <StatCard value="$4.2 billion" label="Spent on admin every year" sub="Time that should be spent advising clients and closing business" />
      </div>
      <div className="mt-5 rounded-xl border border-border bg-card/50 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Agencies outsource just to keep up:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {["Submission preparation", "Exposure review", "Renewal prep", "Marketing prep", "COI review", "Coverage auditing"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
              {item}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-foreground italic border-t border-border/40 pt-3">
          The problem is not the work. The problem is the systems producers are forced to work in.
        </p>
      </div>
    </div>
  );
}

/* ─── Slide 4: Unfair Advantage ─── */
function BuiltBySlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Unfair Advantage" title="Built inside the industry. Not outside of it." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <h3 className="text-sm font-semibold text-destructive mb-3">How every other insurance tech is built</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Built by technologists who studied the workflow</li>
              <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Designed from diagrams and interviews</li>
              <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Optimized for process efficiency</li>
              <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Never carried quota or owned the client relationship</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
            <h3 className="text-sm font-semibold text-primary mb-3">AURA</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Built by an active commercial producer</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Built from real production experience</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Optimized to help producers win business and protect clients</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Running inside a live agency with real accounts</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col justify-center space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 hover-lift">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Most insurance technology is built to speed up the process.
            </p>
            <p className="text-base font-semibold text-foreground leading-relaxed mt-4">
              AURA was built to serve the producer and their insureds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 5: Solution ─── */
function SolutionSlide() {
  return (
    <div>
      <SlideHeader icon={Brain} tag="The Solution" title="AURA is the intelligence layer between the producer and the insurance data they rely on." subtitle="Submission automation is the entry point. Intelligence is the platform." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <StatCard value="75%+" label="Reduction in submission time" sub="From hours to minutes per account" />
        <StatCard value="Cross filled" label="ACORD forms and carrier supplementals instantly" sub="No duplicate entry across forms" />
        <StatCard value="Real data" label="Built on live agency submissions" sub="Not synthetic — not theoretical" />
        <StatCard value="AI Audit" label="Coverage gaps surfaced before submission" sub="Every submission reviewed for completeness" />
      </div>
      <div className="mt-2">
        <StatCard value="Loss runs" label="Pulled and attached automatically" sub="No manual carrier follow up" />
      </div>
      <div className="mt-4 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 text-center">
        <p className="text-sm font-semibold text-foreground">
          AURA starts with submissions and becomes the system producers rely on to manage and place business.
        </p>
      </div>
    </div>
  );
}

/* ─── Slide 6: How It Works ─── */
function HowSlide() {
  return (
    <div>
      <SlideHeader icon={Rocket} tag="How It Works" title="Three steps. One conversation." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {[
          { step: "01", title: "Upload & Chat", desc: "Upload documents or talk to AURA. The intelligence engine extracts business data, coverage needs, and loss history automatically — the way a producer would." },
          { step: "02", title: "Intelligence Cross Fill", desc: "AURA completes ACORD forms, carrier supplementals, and submission documents instantly, flags coverage gaps, and surfaces what the producer needs to see before submission." },
          { step: "03", title: "Review & Submit", desc: "The producer reviews, makes corrections if needed, and sends a complete submission package. Nothing leaves without producer approval." },
        ].map((s) => (
          <div key={s.step} className="rounded-xl border border-border bg-card p-6 hover-lift">
            <div className="text-4xl font-bold text-primary/20 mb-3">{s.step}</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-sm text-muted-foreground italic">
        Hours of work compressed into minutes. The producer stays in control.
      </p>
    </div>
  );
}

/* ─── Slide 7: Three Layers ─── */
function VisionLayersSlide() {
  return (
    <div>
      <SlideHeader icon={Layers} tag="Three Layers of Intelligence" title="Data. Thinking. Human." subtitle="AURA is not a CRM or submission tool. It is the intelligence layer between insurance data and the producer." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        <div className="rounded-xl border-2 border-primary/40 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/40" />
          <Database className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 1 — Data</h3>
          <p className="text-sm text-muted-foreground mb-3">Unifies and structures agency data into one view.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• Policies, applications, loss runs, COIs</li>
            <li>• Property, vehicle, and exposure data</li>
            <li>• Year over year changes and history</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-primary/80">The data becomes structured and usable.</p>
        </div>

        <div className="rounded-xl border-2 border-primary/30 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
          <Brain className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 2 — Thinking</h3>
          <p className="text-sm text-muted-foreground mb-3">AURA analyzes the data and surfaces what matters.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• Detects missing coverages and gaps</li>
            <li>• Flags inconsistent limits and exposures</li>
            <li>• Compares the account against history and peers</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-primary/80">Pattern recognition at scale. Judgment stays human.</p>
        </div>

        <div className="rounded-xl border-2 border-primary/20 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/30 to-primary/10" />
          <Eye className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 3 — Human</h3>
          <p className="text-sm text-muted-foreground mb-3">Nothing happens automatically. Everything flows through the producer.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• AURA surfaces observations and flags</li>
            <li>• The producer reviews and decides</li>
            <li>• Full accountability stays with the producer</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-primary/80">The producer remains the decision maker.</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 8: Human First ─── */
function HumanFirstSlide() {
  return (
    <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 rounded-md bg-primary/10"><Heart className="h-4 w-4 text-primary" /></div>
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">The Philosophy</span>
      </div>
      <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
        Human first.<br /><span className="aura-gradient-text">Always.</span>
      </h2>
      <p className="text-lg text-muted-foreground leading-relaxed mb-6">
        The goal is not to replace the producer. The goal is to restore them.
      </p>
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        Technology should never replace judgment. It should remove friction.
      </p>
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 mb-6 w-full">
        <p className="text-base font-semibold text-foreground leading-relaxed">
          AURA handles the busy work so the producer can do what matters most.
        </p>
        <div className="flex justify-center gap-8 mt-4">
          {["Think", "Advise", "Protect", "Build relationships"].map(w => (
            <span key={w} className="text-sm font-semibold text-primary">{w}</span>
          ))}
        </div>
      </div>
      <p className="text-base text-muted-foreground leading-relaxed">
        The industry doesn't get better through mergers and acquisitions. It gets better by giving autonomy back to the people who built it.
      </p>
    </div>
  );
}

/* ─── Slide 9: The Moat ─── */
function MoatSlide() {
  return (
    <div>
      <SlideHeader icon={Database} tag="The Real Moat" title="The compounding intelligence moat" subtitle="Every submission processed through AURA makes the system smarter and harder to replicate." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <h3 className="text-base font-semibold text-foreground mb-4">The loop that keeps compounding</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "Submission enters AURA. Data becomes structured." },
              { step: "2", text: "AURA evaluates coverage, exposures, and gaps." },
              { step: "3", text: "Producer reviews and makes decisions. The outcome is captured." },
              { step: "4", text: "AURA learns what was chosen, what was corrected, and what mattered." },
              { step: "5", text: "Every future submission benefits from that experience." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{item.step}</span>
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary text-center">This repeats on every account. The more AURA is used, the more valuable it becomes.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <h4 className="text-sm font-semibold text-foreground mb-2">What becomes difficult to replicate</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Structured insurance decision data built from real submissions</li>
              <li>• Judgment calibrated from producer decisions</li>
              <li>• Benchmarks across industries, regions, and carriers</li>
              <li>• Switching costs that grow over time</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground text-center">
              Competitors can copy software. They cannot copy experience.
            </p>
            <p className="text-xs text-muted-foreground text-center mt-2 italic">
              AURA is becoming the intelligence layer behind insurance decision making.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 10: Platform Expansion ─── */
function WedgeSlide() {
  return (
    <div>
      <SlideHeader icon={TrendingUp} tag="Platform Expansion" title="Submission is the entry point. Intelligence is the platform." />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {[
          {
            phase: "Phase 1",
            title: "Submission Intelligence",
            items: ["Data ingestion and extraction", "ACORD cross fill", "Supplementals and carrier forms", "Gap detection", "Complete submission packages", "Loss run ingestion and analysis"],
            status: "Now",
          },
          {
            phase: "Phase 2",
            title: "Producer Intelligence",
            items: ["Coverage adequacy scoring", "Renewal intelligence", "Loss trend analysis", "Peer benchmarking", "Account level insights"],
            status: "12–18 mo",
          },
          {
            phase: "Phase 3",
            title: "Agency Operating System",
            items: ["Pipeline management", "Producer performance", "Carrier workflow", "Full agency data layer"],
            status: "24–36 mo",
          },
          {
            phase: "Phase 4",
            title: "Industry Intelligence Layer",
            items: ["Cross agency benchmarks", "Carrier analytics", "Risk intelligence licensing", "Enterprise deployments"],
            status: "36+ mo",
          },
        ].map((p, i) => (
          <div key={p.phase} className={`rounded-xl border ${i === 0 ? "border-primary/40 bg-primary/5" : "border-border bg-card"} p-5 hover-lift`}>
            <div className={`text-xs font-semibold uppercase tracking-widest mb-1 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{p.phase}</div>
            <div className="text-xs text-muted-foreground/60 mb-3">{p.status}</div>
            <h3 className="text-sm font-bold text-foreground mb-3">{p.title}</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              {p.items.map(item => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-border bg-card/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Every submission makes AURA smarter.<br />
          Every improvement helps producers write more business.<br />
          That is how AURA becomes the system producers run on.
        </p>
      </div>
    </div>
  );
}

/* ─── Slide 11: Insured Experience ─── */
function InsuredExperienceSlide() {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-primary/10"><Eye className="h-4 w-4 text-primary" /></div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Extending Intelligence</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
          AURA extends the intelligence layer into the<br />
          <span className="aura-gradient-text">client relationship.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full mb-12">
        {[
          {
            icon: Smartphone,
            heading: "Instant Access",
            lines: ["View ID cards anytime", "Download policies and documents", "Request certificates instantly"],
          },
          {
            icon: FolderOpen,
            heading: "Client Requests",
            lines: ["Request policy changes", "Request new quotes", "Secure payment portal", "Everything flows directly to the producer"],
          },
          {
            icon: MessageCircle,
            heading: "Connected Experience",
            lines: ["Direct communication with the producer", "No lost emails. No broken handoffs", "Everything stays in one place"],
          },
          {
            icon: Bot,
            heading: "Intelligent Assistance",
            lines: ["Clients can interact with AURA to access information and start requests", "AURA supports the relationship. The producer stays in control"],
          },
        ].map(({ icon: Icon, heading, lines }) => (
          <div key={heading} className="flex flex-col items-center text-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-foreground">{heading}</h3>
            <ul className="space-y-2">
              {lines.map(line => (
                <li key={line} className="text-sm text-muted-foreground">{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="text-center border-t border-border/40 pt-8 w-full max-w-2xl">
        <p className="text-lg font-bold text-foreground mb-2">
          AURA makes it easier for clients to work with their producer. Not around them.
        </p>
      </div>
    </div>
  );
}

/* ─── Slide 12: Why We Win ─── */
function WhyWinsSlide() {
  return (
    <div>
      <SlideHeader icon={Zap} tag="Why AURA Wins" title="The founder advantage no one can replicate." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 hover-lift">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Built by an active commercial producer</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Tested on real accounts where mistakes actually matter</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Distribution exists because the relationships already exist</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> The intelligence loop is already live</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <h3 className="text-sm font-semibold text-foreground mb-2">The GTM advantage</h3>
            <p className="text-sm text-muted-foreground">
              Most companies build and then look for adoption. AURA starts with adoption and improves from there.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <h3 className="text-sm font-semibold text-foreground mb-3">Compounding intelligence advantage</h3>
            <p className="text-sm text-muted-foreground mb-3">Every submission leaves something behind:</p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />What markets responded</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />What was corrected</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />What won and what did not</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">That experience stays inside AURA. The next account starts smarter than the last one.</p>
          </div>
          <div className="rounded-xl border-2 border-primary/20 bg-card p-5 hover-lift">
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              Over time, AURA becomes part of how the producer thinks and works because they simply cannot work without it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 13: Revenue Model ─── */
function ModelSlide() {
  const tiers = [
    {
      heading: "Core Deployment",
      price: "$7,500–12,000/mo",
      tag: "per agency",
      features: ["Producer workflow intelligence", "Submission ingestion and automation", "Coverage intelligence layer", "Production visibility"],
      highlight: false,
    },
    {
      heading: "Full Agency Deployment",
      price: "$12,000–25,000/mo",
      tag: "per agency",
      features: ["All core intelligence", "Agency wide deployment", "Operational intelligence", "Producer performance tracking"],
      highlight: true,
    },
    {
      heading: "Enterprise Deployment",
      price: "$25,000+/mo",
      tag: "per organization",
      features: ["Full platform deployment", "Custom integrations", "Advanced intelligence layer", "Enterprise support"],
      highlight: false,
    },
  ];
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="Revenue Model" title="AURA is not another broken insurance system. It becomes the system your agency runs on." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        {tiers.map((t) => (
          <div key={t.heading} className={`rounded-xl p-5 hover-lift flex flex-col ${t.highlight ? "border-2 border-primary/50 bg-primary/5" : "border border-border bg-card"}`}>
            <div className={`text-xs font-semibold uppercase tracking-widest mb-1 ${t.highlight ? "text-primary" : "text-muted-foreground"}`}>{t.heading}</div>
            <div className="text-xl font-bold text-foreground mt-1">{t.price}</div>
            <div className="text-xs text-muted-foreground mb-3">{t.tag}</div>
            <ul className="text-sm text-muted-foreground space-y-1.5 flex-1">
              {t.features.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 ${t.highlight ? "text-primary" : "text-muted-foreground/60"}`}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {/* Revenue Share Option */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="shrink-0 md:w-56">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-0.5">Alternative Model — Revenue Share</p>
            <p className="text-sm text-muted-foreground mt-1">AURA grows when producers produce more.</p>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[
              { label: "Year 1", pct: "3–5%", note: "Of new business influenced by AURA" },
              { label: "Year 2", pct: "5–7%", note: "As intelligence compounds" },
              { label: "Year 3+", pct: "7–10%", note: "As AURA becomes embedded in production" },
            ].map(r => (
              <div key={r.label} className="text-center rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">{r.label}</div>
                <div className="text-lg font-bold text-foreground">{r.pct}</div>
                <div className="text-[10px] text-muted-foreground/70 mt-1">{r.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-xs text-muted-foreground/60 italic">Revenue share applies only in select cases where AURA participates as part of the operating structure.</p>
        <p className="text-sm font-bold text-foreground mt-2">Insurance runs on AURA.</p>
      </div>
    </div>
  );
}

/* ─── Slide 14: GTM ─── */
function GTMSlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Go-to-Market" title="The insider advantage" subtitle="AURA is not being introduced to the industry. It is being built inside it." />
      <p className="text-sm text-muted-foreground mb-4">
        This starts inside Doug's active commercial book of business. Real producers. Real accounts. Real submissions.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 hover-lift">
          <h3 className="font-semibold text-foreground mb-3">Phase 1 — Prove (Months 1–6)</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Deploy AURA across all new business submissions</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Train the intelligence on real producer decisions</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Capture time returned to the producer</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Identify coverage gaps and missed opportunities</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Prove this improves how producers operate in the real world</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <h3 className="font-semibold text-foreground mb-3">Phase 2 — Expand (Months 7–18)</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Introduce AURA to partner agencies already in our network</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Expand across multiple producers and multiple agencies</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Each submission strengthens the intelligence layer</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Growth happens because producers see the advantage</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard value="Real" label="Live inside an active agency from day one" sub="Not a pilot. Not a test." />
        <StatCard value="Network" label="Distribution already exists" sub="Built through real relationships in the industry" />
        <StatCard value="Live" label="The intelligence layer is already learning" sub="Every submission makes it stronger" />
      </div>
      <p className="mt-4 text-center text-sm font-semibold text-foreground">
        AURA did not enter the insurance industry. It was built inside it.
      </p>
    </div>
  );
}

/* ─── Slide 15: Projections ─── */
function ProjectionsSlide() {
  const MAX_PX = 140;
  const years = [
    { label: "Year 1", revenue: "1.2M",  raw: 1.2,   agencies: 10 },
    { label: "Year 2", revenue: "5.7M",  raw: 5.7,   agencies: 40 },
    { label: "Year 3", revenue: "21.6M", raw: 21.6,  agencies: 120 },
    { label: "Year 4", revenue: "64.8M", raw: 64.8,  agencies: 300 },
    { label: "Year 5", revenue: "144M",  raw: 144,   agencies: 600 },
  ];
  const maxRaw = Math.max(...years.map(y => y.raw));
  return (
    <div>
      <SlideHeader icon={BarChart3} tag="Financial Projections" title="Revenue expansion as AURA becomes the intelligence layer." subtitle="AURA starts as a tool and becomes the system insurance runs on." />
      <p className="text-sm text-muted-foreground mb-4">Producer wedge first. Platform scale next. Structured insurance intelligence compounds with every agency onboarded.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        {/* Bar chart */}
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-end justify-around gap-3" style={{ height: `${MAX_PX + 32}px` }}>
            {years.map((y) => {
              const barH = Math.max(8, Math.round((y.raw / maxRaw) * MAX_PX));
              return (
                <div key={y.label} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-foreground tabular-nums">${y.revenue}</span>
                  <div
                    className="w-full rounded-t-md bg-primary/80"
                    style={{ height: `${barH}px` }}
                  />
                  <span className="text-xs text-muted-foreground font-medium">{y.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3 italic">Core platform subscription revenue only. Expansion streams excluded.</p>
        </div>
        {/* Explanation box */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Growth driven by agency adoption</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              {[
                "Start with core producer workflow wedge",
                "Expand to full agency deployment",
                "Increase revenue per agency over time",
                "Compounding growth through network expansion",
              ].map(b => (
                <li key={b} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">→</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 pt-4 border-t border-border/30 space-y-1">
            {years.map(y => (
              <div key={y.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{y.label} — {y.agencies} agencies</span>
                <span className="font-semibold text-foreground">${y.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Revenue / Commission Generated */}
      <div className="mt-5 rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Conservative estimate of additional client commission generated</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Small Agency — $7,500/mo</p>
            <p className="text-3xl font-extrabold text-foreground">$250,000</p>
            <p className="text-sm text-muted-foreground mt-1">additional revenue per agency / year</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Large Agency — $25,000/mo</p>
            <p className="text-3xl font-extrabold text-foreground">$1,000,000</p>
            <p className="text-sm text-muted-foreground mt-1">additional revenue per agency / year</p>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4 italic">
          AURA doesn't just save time — it helps producers close more business. The platform pays for itself through the additional commission it generates.
        </p>
      </div>

      <div className="mt-4 text-center space-y-1">
        <p className="text-sm font-bold text-foreground">Pricing aligned with economic value created, not software access.</p>
        <p className="text-xs text-muted-foreground">Average agency subscription ranges from $7,500 to $25,000 per month depending on size and deployment.</p>
      </div>
    </div>
  );
}

/* ─── Slide 16: Why AURA Exists ─── */
function WhyExistsSlide() {
  return (
    <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 rounded-md bg-primary/10"><Target className="h-4 w-4 text-primary" /></div>
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Why AURA Exists</span>
      </div>
      <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight mb-6">
        Insurance did not lose its expertise.<br />
        <span className="aura-gradient-text">It lost its independence.</span>
      </h2>
      <p className="text-lg text-muted-foreground leading-relaxed mb-4">
        Mergers and acquisitions scaled the business, but they buried the people who made it work.
      </p>
      <p className="text-lg text-muted-foreground leading-relaxed mb-4">
        Producers were pushed into systems that slowed them down. Clients were left with less guidance and more process.
      </p>
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        The relationship became secondary to the machine.
      </p>
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 mb-6 w-full">
        <p className="text-lg font-semibold text-foreground leading-relaxed mb-3">
          AURA exists to change that.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          It puts control back where it belongs. It gives producers their leverage back. It makes the system work for the people again.
        </p>
      </div>
      <p className="text-2xl font-bold text-foreground mt-4">Insurance runs on AURA.</p>
      <div className="mt-10 flex items-center justify-center gap-2 opacity-60">
        <span className="text-lg font-bold tracking-tight text-foreground">AURA</span>
        <span className="text-[11px] text-muted-foreground tracking-widest uppercase">Risk Group</span>
      </div>
      <p className="text-xs text-muted-foreground/50 mt-2">Confidential — AURA Risk Group</p>
    </div>
  );
}
