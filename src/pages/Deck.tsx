import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Brain, DollarSign, Users, Target, Rocket, BarChart3, Shield, Database, Eye, Layers, Replace, Zap, Heart, Smartphone, FolderOpen, MessageCircle } from "lucide-react";


const SLIDES = [
  { id: "title", label: "Title" },
  { id: "origin", label: "Origin" },
  { id: "problem", label: "Problem" },
  { id: "built-by", label: "Built By" },
  { id: "solution", label: "Solution" },
  { id: "how", label: "How It Works" },
  { id: "vision-layers", label: "Three Layers" },
  { id: "human-first", label: "Human First" },
  { id: "moat", label: "The Moat" },
  { id: "wedge", label: "The Wedge" },
  { id: "insured", label: "Insured Experience" },
  { id: "why-wins", label: "Why We Win" },
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
    <AskSlide />,
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
        AURA was not built to make insurance faster. It was built to make insurance right.
      </p>
      <p className="mt-3 text-base text-muted-foreground/70 max-w-xl italic">
        AURA is not insurance software. It is what insurance looks like when the people inside it finally build the technology themselves.
      </p>
      <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground/60">
        <span>Investment Deck</span>
        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
        <span>Confidential</span>
      </div>
    </div>
  );
}

/* ─── Slide 2: Origin / Founder Story ─── */
function OriginSlide() {
  return (
    <div>
      <SlideHeader icon={Heart} tag="The Origin" title="This did not start as a software idea" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <p className="text-sm text-muted-foreground leading-relaxed">
            I did not set out to build a technology company. I set out to survive in an industry that was slowly crushing the people inside it.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Every day, I was expected to advise business owners on how to protect everything they had built. Their employees. Their families. Their future. But most of my time was not spent advising. It was spent re-entering the same data over and over. Filling out forms. Chasing information. Fighting systems that were never designed for the people actually doing the work.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            And I realized something. The biggest risk in insurance was not the insured. It was the process.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you are forced to move fast just to keep up, things get missed. Coverage gaps. Incorrect exposures. Policies that do not reflect reality. Nobody intended to fail the insured. The system just made it inevitable.
            </p>
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 hover-lift">
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              "Insurance is not a product. It is a promise. A promise that when something goes wrong, someone will be there to help you recover."
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              AURA was not designed from the outside looking in. It was built from the inside out — by someone who carried the quota, won the trust, and felt what it was like to lose.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">The founding team</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div><span className="font-semibold text-foreground">Doug</span> — Active commercial producer. Lived the problem. Carries the quota.</div>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
              <div><span className="font-semibold text-foreground">Shane</span> — Engineer & co-founder. Builds the technology Doug needed but could not find.</div>
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
      <SlideHeader icon={Shield} tag="The Problem" title="Advisors are drowning. The insured pays the price." subtitle="The commercial insurance workflow was built for process — not for the people responsible for protecting clients." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <StatCard value="3–5 hrs" label="Per submission — manual entry" sub="Data re-keyed across 6+ forms every time" />
        <StatCard value="23%" label="Error rate on submissions" sub="Delays, re-work, missed coverage, lost business" />
        <StatCard value="$4.2B" label="Wasted on admin annually" sub="Industry-wide — none of it serves the client" />
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
        <p className="mt-4 text-sm font-medium text-foreground italic border-t border-border/40 pt-3">
          "The problem is not data entry. The problem is lost time, lost visibility, and lost opportunity — when the people responsible for protecting clients are too buried to actually protect them."
        </p>
      </div>
    </div>
  );
}

/* ─── Slide 4: Built By Production ─── */
function BuiltBySlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Unfair Advantage" title="Built inside the industry, not outside it" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <h3 className="text-sm font-semibold text-destructive mb-3">How every other insurance tech was built</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Technologists who studied the workflow</li>
              <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Built from diagrams and interviews</li>
              <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Optimized for process efficiency</li>
              <li className="flex items-start gap-2"><span className="text-destructive/60 mt-0.5">×</span> Never carried a quota or a client relationship</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
            <h3 className="text-sm font-semibold text-primary mb-3">How AURA was built</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Founder is an active commercial insurance advisor</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Built from deadlines, not diagrams</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Optimized for production velocity and protection quality</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Deployed inside a live agency — real data, day one</li>
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 hover-lift">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Most insurance technology asks: <span className="font-semibold text-foreground">"How do we make submissions easier to process?"</span>
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              AURA asks: <span className="font-semibold text-foreground">"How do I help the advisor win the account and protect the client properly — without drowning in busy work?"</span>
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              Those are not the same question. That difference changes everything.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">The principle that filters every feature</p>
            <p className="text-sm font-semibold text-foreground">
              "Would a top producing advisor voluntarily open this at 7am to win their day — or just tolerate it because they have to?"
            </p>
            <p className="text-xs text-muted-foreground mt-2">If they would not choose it, it does not belong in the product.</p>
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
      <SlideHeader icon={Brain} tag="The Solution" title="AURA — the intelligence layer between insurance data and human judgment" subtitle="Submission automation is the entry point. Intelligence is the platform." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {[
          { value: "75%+", label: "Reduction in submission time", sub: "Hours → minutes per account" },
          { value: "6 forms", label: "Cross-filled simultaneously", sub: "ACORD 125, 126, 127, 130, 131, 140" },
          { value: "Real data", label: "Trained on live agency submissions", sub: "Not synthetic — not theoretical" },
          { value: "AI Audit", label: "Coverage gaps surfaced before the underwriter", sub: "Every submission reviewed for completeness" },
        ].map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
      <div className="mt-4 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 text-center">
        <p className="text-sm font-semibold text-foreground">
          AURA is not a submission platform. AURA is the intelligence layer for insurance. Submission automation is where it starts.
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
          { step: "01", title: "Upload & Chat", desc: "Upload documents or simply talk to AURA. The intelligence engine extracts business data, coverage needs, and loss history automatically — the way an advisor would." },
          { step: "02", title: "Intelligence Cross-Fill", desc: "AURA fills all 6 ACORD forms simultaneously, infers missing values, flags coverage gaps, and surfaces observations the advisor needs to see before submission." },
          { step: "03", title: "Review & Submit", desc: "The advisor reviews, approves or corrects, then sends a complete submission package. Nothing leaves without human sign-off." },
        ].map((s) => (
          <div key={s.step} className="rounded-xl border border-border bg-card p-6 hover-lift">
            <div className="text-4xl font-bold text-primary/20 mb-3">{s.step}</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-sm text-muted-foreground italic">
        3 hours of thinking compressed into 3 minutes of review. The human still owns every decision.
      </p>
    </div>
  );
}

/* ─── Slide 7: Three Layers ─── */
function VisionLayersSlide() {
  return (
    <div>
      <SlideHeader icon={Layers} tag="Three Layers of Intelligence" title="Data. Thinking. Human." subtitle="AURA is not a CRM. Not automation software. It is the intelligence layer between raw insurance data and human judgment." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        <div className="rounded-xl border-2 border-primary/40 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/40" />
          <Database className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 1 — Data</h3>
          <p className="text-sm text-muted-foreground mb-3">Unify and structure all agency data into one canonical view.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• Policies, applications, loss runs, COIs</li>
            <li>• Property, vehicle, industry benchmarks</li>
            <li>• Year-over-year behavioral changes</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-primary/80">The data is the asset. Not the software.</p>
        </div>

        <div className="rounded-xl border-2 border-primary/30 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
          <Brain className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 2 — Thinking</h3>
          <p className="text-sm text-muted-foreground mb-3">AI analyzes, surfaces observations, and flags what matters.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• Detects missing coverages and gaps</li>
            <li>• Flags inconsistent limits and exposures</li>
            <li>• Compares account vs. peers vs. history</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-primary/80">Pattern recognition at scale. Judgment stays human.</p>
        </div>

        <div className="rounded-xl border-2 border-primary/20 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/30 to-primary/10" />
          <Eye className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 3 — Human</h3>
          <p className="text-sm text-muted-foreground mb-3">Nothing happens automatically. Everything flows through the advisor.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• Observations, flags, suggested actions</li>
            <li>• Producer approves or dismisses</li>
            <li>• Full audit trail and accountability</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-primary/80">The human is always the decision maker.</p>
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
        The goal is not to replace the advisor. The goal is to restore them.
      </p>
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        Technology should never remove judgment. It should remove friction.
      </p>
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 mb-6 w-full">
        <p className="text-base font-semibold text-foreground leading-relaxed">
          AURA handles the busy work so the human can do what matters most.
        </p>
        <div className="flex justify-center gap-8 mt-4">
          {["Think", "Advise", "Protect", "Build relationships"].map(w => (
            <span key={w} className="text-sm font-semibold text-primary">{w}</span>
          ))}
        </div>
      </div>
      <p className="text-base text-muted-foreground leading-relaxed">
        This is how the industry gets better. Not by replacing people. By elevating them.
      </p>
      <p className="mt-4 text-sm text-muted-foreground/70 italic">
        When advisors wake up and want to open AURA first — not because they have to, but because it helps them win — that is when the platform becomes inevitable.
      </p>
    </div>
  );
}

/* ─── Slide 9: The Moat (Compounding Intelligence) ─── */
function MoatSlide() {
  return (
    <div>
      <SlideHeader icon={Database} tag="The Real Moat" title="The compounding intelligence moat" subtitle="Every submission processed through AURA permanently strengthens the system in a way competitors cannot replicate." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <h3 className="text-base font-semibold text-foreground mb-4">The loop that never stops compounding</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "Submission enters AURA — data becomes structured" },
              { step: "2", text: "Intelligence evaluates coverage, exposures, and gaps" },
              { step: "3", text: "Advisor reviews and refines — outcome is captured" },
              { step: "4", text: "System learns: what was chosen, what was corrected, what mattered" },
              { step: "5", text: "Next submission benefits from every decision before it" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{item.step}</span>
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary text-center">This loop repeats on every policy. The more AURA is used, the more valuable it becomes.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <h4 className="text-sm font-semibold text-foreground mb-2">What becomes impossible to replicate</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Structured insurance decision data — real outcomes, real situations</li>
              <li>• Calibrated judgment built from human approvals and corrections</li>
              <li>• Peer benchmarks by class of business, region, and carrier</li>
              <li>• Switching costs that increase with every policy processed</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <h4 className="text-sm font-semibold text-foreground mb-2">Why competitors cannot shortcut this</h4>
            <p className="text-xs text-muted-foreground">
              Competitors can copy software. They cannot copy accumulated intelligence built on real decisions made in real situations. This is not synthetic data. This is experience.
            </p>
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground text-center">
              AURA is building the collective memory layer of insurance decision making.
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1 italic">Powered by real-world agency deployment — already happening.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 10: The Wedge & Expansion ─── */
function WedgeSlide() {
  return (
    <div>
      <SlideHeader icon={TrendingUp} tag="Platform Expansion" title="Submission is the entry point. Intelligence is the platform." subtitle="Investors need to see the path from first product to dominant infrastructure — so here it is." />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {[
          {
            phase: "Phase 1",
            title: "Submission Intelligence",
            items: ["Ingestion & extraction", "ACORD cross-fill", "Gap detection", "Submission packages"],
            status: "Now",
          },
          {
            phase: "Phase 2",
            title: "Advisor Augmentation",
            items: ["Coverage adequacy scoring", "Renewal intelligence", "Peer benchmarking", "Loss analysis"],
            status: "12–18 mo",
          },
          {
            phase: "Phase 3",
            title: "Agency Operating System",
            items: ["Full agency data layer", "Producer performance", "Carrier workflow", "Pipeline intelligence"],
            status: "24–36 mo",
          },
          {
            phase: "Phase 4",
            title: "Industry Intelligence Layer",
            items: ["Cross-agency benchmarks", "Carrier analytics", "Risk intelligence licensing", "Enterprise deployments"],
            status: "36–54 mo",
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
        <p className="text-sm font-semibold text-foreground">
          Why AURA becomes the operating system of insurance:
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Every submission creates structured data → every record improves intelligence → every improvement increases producer output → every output increase increases AURA penetration.
        </p>
        <p className="text-xs font-semibold text-primary mt-2">This is what turns AURA from a tool into a platform.</p>
      </div>
    </div>
  );
}

/* ─── Slide 11: Insured Experience ─── */
function InsuredExperienceSlide() {
  return (
    <div className="flex flex-col items-center">
      {/* Title */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-primary/10"><Eye className="h-4 w-4 text-primary" /></div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Platform Expansion</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
          Extending Intelligence to the<br />
          <span className="aura-gradient-text">Insured Experience</span>
        </h2>
        <p className="mt-3 text-lg text-muted-foreground">
          AURA connects the advisor and the insured through a modern digital experience
        </p>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full mb-12">
        {[
          {
            icon: Smartphone,
            heading: "Instant Access",
            lines: ["View ID cards anytime", "Download policies and documents", "Access insurance without waiting"],
          },
          {
            icon: FolderOpen,
            heading: "Full Visibility",
            lines: ["See coverage in one place", "Access certificates quickly", "Stay connected to protection"],
          },
          {
            icon: MessageCircle,
            heading: "Connected Experience",
            lines: ["Request service easily", "Communicate with advisor", "Modern client experience layer"],
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

      {/* Bottom statement */}
      <div className="text-center border-t border-border/40 pt-8 w-full max-w-2xl">
        <p className="text-lg font-bold text-foreground mb-2">
          AURA becomes the experience layer across the entire insurance relationship
        </p>
        <p className="text-sm text-muted-foreground/70">
          Advisor. Agency. Insured. Connected through intelligence.
        </p>
      </div>
    </div>
  );
}

/* ─── Slide 12: Why We Win ─── */
function WhyWinsSlide() {
  return (
    <div>
      <SlideHeader icon={Zap} tag="Why This Wins" title="Why AURA wins specifically" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 hover-lift">
            <h3 className="text-sm font-semibold text-foreground mb-3">The founder advantage no one can replicate</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Founder carried a commercial book of business — not a diagram</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Product tested on real accounts with real consequences</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Distribution access through active agency relationships</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Intelligence loop already started — not theoretical</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <h3 className="text-sm font-semibold text-foreground mb-2">The GTM no one else has</h3>
            <p className="text-sm text-muted-foreground">
              Most startups spend 12–18 months trying to get distribution. AURA starts with distribution. Real accounts. Real policies. A live feedback loop from day one.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 hover-lift">
            <h3 className="text-sm font-semibold text-foreground mb-3">Intelligence advantages that compound</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />Structured insurance decision data accumulates with every policy</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />Benchmarks and confidence calibrated by real human judgment</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />Switching costs increase over time — not decrease</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-primary/20 bg-card p-5 hover-lift">
            <p className="text-base font-semibold text-foreground leading-relaxed">
              "Every major insurance platform was built by technologists trying to understand insurance. AURA was built by someone inside the industry who understood the pain first."
            </p>
            <p className="text-xs text-muted-foreground mt-3 italic">That difference is not a feature. It is the entire moat.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 12: Revenue Model ─── */
function ModelSlide() {
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="Revenue Model" title="Priced on economic value. Not seats." subtitle="A top commercial producer generates $300K–$1M per year. AURA increases output by 20%+. Charging $800/mo is massively underpriced." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        <div className="rounded-xl border-2 border-primary/40 bg-card p-5 hover-lift">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Option A — Per Producer</div>
          <div className="space-y-2">
            {[
              { label: "Entry", price: "$1,500–3,000/mo", note: "Per producer — priced on leverage" },
              { label: "Enterprise", price: "$5,000–25,000/mo", note: "Per agency depending on size" },
            ].map((t) => (
              <div key={t.label} className="border-b border-border/30 pb-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-foreground">{t.label}</span>
                  <span className="text-base font-bold text-foreground ml-2">{t.price}</span>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{t.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground/60 italic">Investors want to see enterprise pricing power. Not commodity pricing.</p>
        </div>

        <div className="rounded-xl border-2 border-border bg-card p-5 hover-lift">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Option B — Revenue Share</div>
          <div className="space-y-2">
            {[
              { year: "Year 1", price: "3–5%", note: "Of new business revenue influenced by AURA" },
              { year: "Year 2", price: "5–7%", note: "Proven value unlocks greater share" },
              { year: "Year 3+", price: "7–10%", note: "Full intelligence suite — compounding renewals" },
            ].map((t) => (
              <div key={t.year} className="border-b border-border/30 pb-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-foreground">{t.year}</span>
                  <span className="text-base font-bold text-foreground ml-2">{t.price}</span>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{t.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground/60 italic">Aligns revenue with agency success — scales with value delivered</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Expansion Revenue Streams</div>
          <ul className="text-sm text-muted-foreground space-y-2">
            {["Carrier analytics access", "Risk intelligence licensing", "Cross-agency benchmarking", "Enterprise workflow licensing", "Data infrastructure fees"].map(item => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground/60 italic">These are Layer 4 revenue streams. Not in projections yet.</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground text-center">
        The real math: if AURA adds $60K–$200K per producer annually, pricing at $18K–$36K/yr is a 3–5x ROI minimum.
      </p>
    </div>
  );
}

/* ─── Slide 13: GTM ─── */
function GTMSlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Go-to-Market" title="The insider advantage" subtitle="AURA is deploying inside a live agency environment. Most startups spend 18 months trying to get where AURA starts." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 hover-lift">
          <h3 className="font-semibold text-foreground mb-3">Phase 1 — Prove (Months 1–6)</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Deploy inside Doug's active agency — real accounts</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Target 25 commercial policies processed</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Refine intelligence on live submission data</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Document time savings and coverage gap catches</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <h3 className="font-semibold text-foreground mb-3">Phase 2 — Expand (Months 7–18)</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Onboard 3–5 partner agencies from existing network</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Reach 100 policies — $5M in premiums processed</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Intelligence loop compounds with each new agency</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Build referral flywheel through producer results</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard value="Real" label="Agency deployment — day one" sub="Not a pilot. Not a test. Active accounts." />
        <StatCard value="Network" label="Distribution access built-in" sub="Doug's existing agency relationships" />
        <StatCard value="Live" label="Intelligence loop already started" sub="Every policy makes the system stronger" />
      </div>
    </div>
  );
}

/* ─── Slide 14: Projections ─── */
function ProjectionsSlide() {
  return (
    <div>
      <SlideHeader icon={BarChart3} tag="Financial Projections" title="Conservative floor. Platform ceiling." subtitle="These numbers reflect SaaS core revenue only. Expansion streams are not included." />
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 px-3 text-muted-foreground font-semibold">Metric</th>
              <th className="text-right py-2.5 px-3 text-muted-foreground font-semibold">18 Mo</th>
              <th className="text-right py-2.5 px-3 text-muted-foreground font-semibold">36 Mo</th>
              <th className="text-right py-2.5 px-3 text-muted-foreground font-semibold">54 Mo</th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            {[
              ["Policies Processed", "100", "250+", "500+"],
              ["Total Premiums", "$5M", "$12.5M", "$25M"],
              ["Core Platform Revenue", "$625K", "$1.875M", "$4M+"],
              ["COGS", "~$300K", "~$600K", "~$1.2M"],
              ["Gross Margin", "$325K (52%)", "$1.275M (68%)", "$2.8M+ (70%)"],
              ["Per Producer", "$1,500–3,000/mo", "$2,000–4,000/mo", "$3,000+/mo"],
            ].map(([metric, y1, y2, y3]) => (
              <tr key={metric} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-3 font-medium">{metric}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{y1}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{y2}</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-semibold">{y3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Not in these numbers</p>
          <p className="text-xs text-muted-foreground">Carrier analytics, risk intelligence licensing, enterprise deployments, cross-agency benchmarking — Layer 4 expansion revenue that materializes as the data moat compounds.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">What drives margin expansion</p>
          <p className="text-xs text-muted-foreground">Intelligence improves with scale. Marginal cost per additional policy decreases. Renewal revenue compounds. Switching costs increase. This is a platform flywheel.</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 15: The Ask ─── */
function AskSlide() {
  return (
    <div>
      <SlideHeader icon={Target} tag="The Ask" title="Building the intelligence layer that insurance runs on" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 mb-6">
        <StatCard value="$1.5M" label="Total raise" sub="10M pre-money valuation" />
        <StatCard value="10M" label="Pre-money valuation" sub="Reflects real deployment + platform potential" />
        <StatCard value="$100K" label="Minimum per investor" sub="5 investors maximum" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-3">Use of Funds</h3>
          <div className="space-y-2 text-sm">
            {[
              ["Product & AI Development", "50%", "Accelerate intelligence engine, carrier workflows, data infrastructure"],
              ["Deployment & Partner Expansion", "30%", "Onboard initial agency partners, expand real-world data footprint"],
              ["Core Team & Operations", "20%", "Support growth while maintaining product velocity and execution focus"],
            ].map(([use, pct, desc]) => (
              <div key={use} className="pb-2 border-b border-border/30">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{use}</span>
                  <span className="font-bold text-foreground">{pct}</span>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Why now</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AURA is already being built and deployed inside a live agency environment. This is not theoretical. This raise accelerates what is already in motion.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Every submission processed makes AURA smarter. Every policy strengthens the data advantage. Every agency increases the scale of the platform.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-sm font-semibold text-foreground italic">
              "We are not raising to build an idea. We are raising to scale what is already working."
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 text-center mb-4">
        <h3 className="text-base font-bold text-foreground mb-2">Why AURA exists</h3>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Insurance is built on trust. Trust that when something goes wrong, protection will be there. But the people responsible for that trust were given systems that made their job harder. AURA gives them the time, visibility, and intelligence to do it right. This is not just about efficiency. This is about restoring confidence in the system.
        </p>
        <p className="text-sm font-bold text-primary mt-3">AURA was built by the industry to rebuild the industry.</p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 opacity-60">
          <span className="text-lg font-bold tracking-tight text-foreground">AURA</span>
          <span className="text-[11px] text-muted-foreground tracking-widest uppercase">Risk Group</span>
        </div>
        <p className="text-xs text-muted-foreground/50 mt-2">Confidential — AURA Risk Group</p>
      </div>
    </div>
  );
}
