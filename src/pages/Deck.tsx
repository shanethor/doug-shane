import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Brain, DollarSign, Users, Target, Rocket, BarChart3, Shield, Database, Eye, Layers, Zap, Heart, Smartphone, FolderOpen, MessageCircle, Bot, Activity, LayoutDashboard, CreditCard, FileText, ArrowRight, Repeat } from "lucide-react";

const SLIDES = [
  { id: "title", label: "Title" },
  { id: "origin", label: "Origin" },
  { id: "problem", label: "Problem" },
  { id: "built-by", label: "Unfair Advantage" },
  { id: "solution", label: "Solution" },
  { id: "how", label: "How It Works" },
  { id: "pulse", label: "Pulse" },
  { id: "command", label: "Command Center" },
  { id: "business-model", label: "Business Model" },
  { id: "growth-engine", label: "Growth Engine" },
  { id: "architecture", label: "Architecture" },
  { id: "moat", label: "The Moat" },
  { id: "wedge", label: "Expansion" },
  { id: "insured", label: "Extending Intelligence" },
  { id: "why-wins", label: "Why We Win" },
  { id: "model", label: "Revenue Model" },
  { id: "gtm", label: "Go-to-Market" },
  { id: "projections", label: "Projections" },
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
    <PulseSlide />,
    <CommandCenterSlide />,
    <BusinessModelSlide />,
    <GrowthEngineSlide />,
    <ArchitectureSlide />,
    <MoatSlide />,
    <WedgeSlide />,
    <InsuredExperienceSlide />,
    <WhyWinsSlide />,
    <ModelSlide />,
    <GTMSlide />,
    <ProjectionsSlide />,
    <TheAskSlide />,
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
        The operating system behind every transaction.
      </p>
      <p className="mt-3 text-base text-muted-foreground/70 max-w-xl">
        Built by producers. Not software companies.
      </p>
      <p className="mt-6 text-lg font-semibold text-foreground">
        Insurance runs on AURA.
      </p>
      <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground/60">
        <span>Confidential Investment Deck · AURA Risk Group · 2026</span>
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
            I decided I was done wasting time re-entering data, filling out forms, and working inside systems that were never built to support producers.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Producers are expected to advise clients on risk, but most of their time is spent managing process instead of closing business. When that happens, the insured doesn't get the attention they deserve.
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
                <br />Co-Founder & Lead Engineer
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
      <SlideHeader icon={Shield} tag="The Problem" title="Producers lose 60% of their week to admin. Clients lose their advocate." subtitle="The average commercial producer spends more time on paperwork than on the clients they're supposed to protect." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <StatCard value="3–5 hours" label="Per submission" sub="Same data re-entered across multiple forms, carriers, and systems" />
        <StatCard value="23%" label="Submission error rate" sub="Delays, E&O exposure, and lost accounts from preventable mistakes" />
        <StatCard value="$4.2B" label="Spent on admin annually" sub="Industry-wide cost of process that producers never signed up for" />
      </div>
      <div className="mt-5 rounded-xl border border-border bg-card/50 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Work that gets outsourced because the tools can't keep up:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {["Submission preparation", "Exposure review", "Renewal prep", "Marketing prep", "COI management", "Coverage auditing"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
              {item}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-foreground border-t border-border/40 pt-3">
          Every hour spent on admin is an hour not spent advising clients, closing deals, or growing the book.
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
            <h3 className="text-sm font-semibold text-destructive mb-3">How every other insurtech is built</h3>
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

/* ─── Slide 5: Solution (Updated) ─── */
function SolutionSlide() {
  return (
    <div>
      <SlideHeader icon={Brain} tag="The Solution" title="AURA is the intelligence layer between the producer and the insurance data they rely on." subtitle="Submission automation is the entry point. Intelligence is the platform." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <StatCard value="75%+" label="Reduction in submission time" sub="From hours to minutes per account" />
        <StatCard value="Cross-Fill" label="ACORD forms & supplementals" sub="No duplicate entry across forms or carriers" />
        <StatCard value="Real Data" label="Live agency submissions" sub="Not synthetic — built from real production" />
        <StatCard value="AI Audit" label="Coverage gap detection" sub="Every submission reviewed for completeness" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <StatCard value="Real-Time" label="Activity intelligence" sub="Notifications, aging alerts & loss run tracking" />
        <StatCard value="Dashboard" label="Producer analytics" sub="MTD/YTD metrics, hit ratio, pipeline velocity" />
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
          { step: "02", title: "Intelligence Cross-Fill", desc: "AURA completes ACORD forms, carrier supplementals, and submission documents instantly, flags coverage gaps, and surfaces what the producer needs to see before submission." },
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

/* ─── Slide 7: Pulse — NEW ─── */
function PulseSlide() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-primary/10"><Activity className="h-4 w-4 text-primary" /></div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Live Feature</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
          Pulse — Real-Time Intelligence<br />
          <span className="aura-gradient-text">for Every Producer</span>
        </h2>
        <p className="mt-3 text-lg text-muted-foreground max-w-3xl">
          Pulse is the activity feed that keeps producers ahead of every account — automatically.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: FileText, title: "Loss Run Tracking", desc: "Instantly notifies when a carrier sends loss runs. No follow-up needed. Status updates from requested → received → processed automatically." },
          { icon: Activity, title: "Aging Alerts", desc: "Flags leads untouched for 48+ hours. Producers never lose track of a deal in the pipeline. Every account stays visible." },
          { icon: Database, title: "Document Processing", desc: "Alerts in real-time when a document is uploaded, extracted, and mapped to ACORD fields. Know exactly when data is ready." },
          { icon: MessageCircle, title: "Email Intelligence", desc: "Incoming emails from carriers and clients are auto-tagged and surfaced in Pulse. The right context appears at the right moment." },
          { icon: Target, title: "Activity Counter", desc: "Live badge count of pending actions across the platform. Producers see what needs attention without digging through notifications." },
          { icon: Eye, title: "Background Job Visibility", desc: "Every AI extraction, form fill, and package build is tracked. Producers have full transparency into what AURA is doing on their behalf." },
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

/* ─── Slide 8: Command Center — NEW ─── */
function CommandCenterSlide() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-primary/10"><LayoutDashboard className="h-4 w-4 text-primary" /></div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Live Feature</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
          Command Center
        </h2>
        <p className="mt-3 text-lg text-muted-foreground max-w-3xl">
          Producer Performance Dashboard — Every number a producer needs to know, always current.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 hover-lift text-center">
          <p className="text-4xl font-extrabold text-foreground">$63,047</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">MTD New Business</p>
          <p className="text-xs text-muted-foreground/70 mt-1">vs. $83,333 monthly target (75.7%)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 hover-lift text-center">
          <p className="text-4xl font-extrabold text-foreground">88.8%</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">Goal Attainment</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Revenue tracking vs. monthly targets</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">What producers see at a glance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            "MTD and YTD new business tracking vs. targets",
            "Revenue tracking with goal attainment %",
            "Pipeline stage distribution and velocity",
            "Individual and team producer comparison",
            "Policies sold, hit ratio, and policies per client",
            "Year-over-year performance trends",
            "Multi-producer view for agency principals",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 9: Business Model — NEW ─── */
function BusinessModelSlide() {
  return (
    <div>
      <SlideHeader icon={CreditCard} tag="Business Model" title="AURA is building the AI brokerage." subtitle="Producers join AURA, write business under our paper, and keep more of what they earn — because the platform makes them better." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-xl border border-border bg-card p-6 hover-lift">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">How Producers Join & Earn</p>
          <div className="space-y-4">
            {[
              { step: "1", title: "Producer joins AURA", desc: "Credentialed under AURA's carrier appointments and E&O umbrella. No agency setup cost." },
              { step: "2", title: "Platform provided", desc: "Full access: ACORD workspace, Pulse, Command Center, AI Tools. Embedded coaching and sales simulations." },
              { step: "3", title: "Extraction — day one", desc: "Write business, share override. Producer keeps 80–85% of gross commission. AURA retains 15–20% as the producing agency." },
              { step: "4", title: "Book compounds over time", desc: "Renewal retention builds passive income for the producer and recurring revenue for AURA." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{item.step}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 hover-lift">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Why Producers Stay</p>
            <p className="text-sm text-muted-foreground mb-4">The moat compounds both ways:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> <strong className="text-foreground">Data:</strong> Every submission enriches the intelligence layer</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> <strong className="text-foreground">Retention:</strong> Producers who grow with AURA don't leave</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> <strong className="text-foreground">Revenue:</strong> Renewals create compounding passive income</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 10: Growth Engine — NEW ─── */
function GrowthEngineSlide() {
  return (
    <div>
      <SlideHeader icon={Repeat} tag="Growth Engine" title="The producer flywheel." subtitle="Each producer we add makes the next one easier to recruit. Each submission makes the platform stronger." />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
        {[
          { step: "01", title: "Recruit", desc: "Producers join for better tools, more carrier access, and higher effective splits." },
          { step: "02", title: "Equip", desc: "Every producer gets the full platform: AI forms, Pulse, Command Center, sales coaching, and simulations on day one." },
          { step: "03", title: "Perform", desc: "Producers close more business faster. Submission time drops. Coverage gaps caught. Hit ratio and book size tracked." },
          { step: "04", title: "Retain", desc: "Switching costs grow as the platform learns their book. Coaches, tools, and splits make leaving economically irrational." },
          { step: "05", title: "Compound", desc: "Renewals generate passive revenue. Producers recruit peers. Intelligence grows. AURA earns from every deal, every year." },
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
          <span className="font-semibold text-foreground">Today:</span> Doug + Shane building proof. <span className="font-semibold text-foreground">Year 2:</span> 20 producers writing business on the platform. <span className="font-semibold text-foreground">Year 5:</span> 500 producers, $15M ARR, data no carrier can ignore.
        </p>
      </div>
    </div>
  );
}

/* ─── Slide 9: Intelligence Architecture (merged Three Layers + Human First) ─── */
function ArchitectureSlide() {
  return (
    <div>
      <SlideHeader icon={Layers} tag="Intelligence Architecture" title="Data. Thinking. Human." subtitle="AURA is not a CRM or submission tool. It is the intelligence layer between insurance data and the producer." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        <div className="rounded-xl border-2 border-primary/40 bg-card p-6 hover-lift relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/40" />
          <Database className="h-6 w-6 text-primary mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">Layer 1 — Data</h3>
          <p className="text-sm text-muted-foreground mb-3">Unifies and structures agency data into one view.</p>
          <ul className="text-xs text-muted-foreground/80 space-y-1">
            <li>• Policies, applications, loss runs, COIs</li>
            <li>• Property, vehicle, and exposure data</li>
            <li>• Year-over-year changes and history</li>
          </ul>
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
            <li>• The producer remains the decision maker</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 10: The Moat ─── */
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
              { step: "3", text: "Producer reviews and makes decisions. Outcome captured." },
              { step: "4", text: "AURA learns what was chosen, corrected, and what mattered." },
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
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 11: Platform Expansion (Updated) ─── */
function WedgeSlide() {
  return (
    <div>
      <SlideHeader icon={TrendingUp} tag="Platform Expansion" title="Submission is the entry point. Intelligence is the platform." />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {[
          {
            phase: "Phase 1",
            title: "Submission Intelligence",
            items: ["ACORD cross-fill (7 forms live)", "AI document extraction", "Coverage gap detection", "Pulse real-time activity feed", "Command Center analytics", "Loss run ingestion & tracking"],
            status: "Now — Live",
          },
          {
            phase: "Phase 2",
            title: "Producer Intelligence",
            items: ["Coverage adequacy scoring", "Renewal intelligence engine", "Loss trend analysis", "Peer benchmarking", "Account-level insight layers"],
            status: "12–18 months",
          },
          {
            phase: "Phase 3",
            title: "Agency Operating System",
            items: ["Full pipeline management", "Producer performance tools", "Carrier workflow integration", "Full agency data layer"],
            status: "24–36 months",
          },
          {
            phase: "Phase 4",
            title: "Industry Intelligence Layer",
            items: ["Cross-agency benchmarks", "Carrier analytics licensing", "Risk intelligence API", "Enterprise deployments"],
            status: "36+ months",
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
          Every submission makes AURA smarter. Every improvement helps producers write more business.
        </p>
      </div>
    </div>
  );
}

/* ─── Slide 12: Extending Intelligence (Updated) ─── */
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
        {[
          {
            icon: Smartphone,
            heading: "Instant Access",
            lines: ["ID cards, policies, and documents available anytime", "Download on demand", "No calls to the agency"],
          },
          {
            icon: FolderOpen,
            heading: "Client Requests",
            lines: ["Request policy changes, new quotes, and certificates", "Everything flows directly to the producer instantly"],
          },
          {
            icon: CreditCard,
            heading: "Secure Payment Portal",
            lines: ["Built-in payment flow", "No third-party portals, no friction"],
          },
          {
            icon: MessageCircle,
            heading: "Connected Experience",
            lines: ["Direct producer communication", "No lost emails. No broken handoffs", "Everything in one place"],
          },
          {
            icon: Bot,
            heading: "Intelligent Assistance",
            lines: ["Clients interact with AURA to access information and start requests", "Without bypassing the producer"],
          },
          {
            icon: FileText,
            heading: "Intake Intelligence",
            lines: ["Smart intake forms that auto-populate ACORD data from client responses", "The process starts itself"],
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

/* ─── Slide 13: Why We Win (Updated) ─── */
function WhyWinsSlide() {
  return (
    <div>
      <SlideHeader icon={Zap} tag="Why AURA Wins" title="The founder advantage no one can replicate." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 hover-lift">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Built by an active commercial producer</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Tested on real accounts</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              AURA runs inside a live agency. Every feature is proven in real production before it ships. Real clients, real submissions, real mistakes that actually matter. Not a demo environment.
            </p>
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 hover-lift">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Distribution already exists</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> The intelligence loop is live</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              The relationships are already there. AURA is not entering the industry — it was built inside it. Every submission already leaves something behind. The moat is already building.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="rounded-xl border-2 border-primary/20 bg-card p-6 hover-lift">
            <p className="text-base font-semibold text-foreground leading-relaxed">
              Over time, AURA becomes part of how the producer thinks and works — because they simply cannot work without it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 14: Revenue Model ─── */
function ModelSlide() {
  const tiers = [
    {
      heading: "Core Deployment",
      price: "$7,500–12,000/mo",
      tag: "per agency",
      features: ["Producer workflow intelligence", "Submission ingestion & automation", "Coverage intelligence layer"],
      highlight: false,
    },
    {
      heading: "Full Agency",
      price: "$12,000–25,000/mo",
      tag: "per agency",
      features: ["All core intelligence", "Agency-wide deployment", "Operational intelligence"],
      highlight: true,
    },
    {
      heading: "Enterprise",
      price: "$25,000+/mo",
      tag: "per organization",
      features: ["Full platform deployment", "Custom integrations", "Advanced intelligence layer", "Enterprise support & SLA", "Pulse & Command Center"],
      highlight: false,
    },
  ];
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="Revenue Model" title="AURA becomes the system your agency runs on." />
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
      {/* Revenue Share */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="shrink-0 md:w-56">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-0.5">Alternative — Revenue Share</p>
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
    </div>
  );
}

/* ─── Slide 15: GTM ─── */
function GTMSlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Go-to-Market" title="The insider advantage." subtitle="AURA is not being introduced to the industry. It is being built inside it." />
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
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Introduce AURA to partner agencies already in the network</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Expand across multiple producers and agencies</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Each submission strengthens the intelligence layer</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Growth happens because producers see the advantage</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard value="Real" label="Live inside an active agency from day one" sub="Not a pilot. Not a test." />
        <StatCard value="Network" label="Distribution exists through real relationships" sub="Built through real relationships in the industry" />
        <StatCard value="Live" label="The intelligence layer is already learning" sub="Every submission makes it stronger" />
      </div>
    </div>
  );
}

/* ─── Slide 18: Projections (Updated — Producer-Based) ─── */
function ProjectionsSlide() {
  const MAX_PX = 140;
  const years = [
    { label: "Year 1", producers: 3,   revenue: "$0.1M", raw: 0.1 },
    { label: "Year 2", producers: 20,  revenue: "$0.4M", raw: 0.4 },
    { label: "Year 3", producers: 75,  revenue: "$1.8M", raw: 1.8 },
    { label: "Year 4", producers: 200, revenue: "$5.5M", raw: 5.5 },
    { label: "Year 5", producers: 500, revenue: "$15M",  raw: 15 },
  ];
  const maxRaw = Math.max(...years.map(y => y.raw));
  return (
    <div>
      <SlideHeader icon={BarChart3} tag="Financial Projections" title="Revenue scales with every producer we add." subtitle="Conservative model anchored to Doug's live numbers. Avg producer: $500K annual premium, 10% commission, 20% AURA override = $10K/producer/yr at ramp." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        {/* Bar chart */}
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">ARR ($M)</p>
          <div className="flex items-end justify-around gap-3" style={{ height: `${MAX_PX + 32}px` }}>
            {years.map((y) => {
              const barH = Math.max(8, Math.round((y.raw / maxRaw) * MAX_PX));
              return (
                <div key={y.label} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-foreground tabular-nums">{y.revenue}</span>
                  <div
                    className="w-full rounded-t-md bg-primary/80"
                    style={{ height: `${barH}px` }}
                  />
                  <span className="text-xs text-muted-foreground font-medium">{y.label}</span>
                  <span className="text-[10px] text-muted-foreground/60">({y.producers})</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/80" /> Brokerage Override</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/40" /> SaaS Licensing</span>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2 italic">ARR = override + SaaS. Renewals compound but not separately modeled here.</p>
        </div>
        {/* Growth milestones */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Growth Milestones</p>
          </div>
          <div className="mt-4 pt-4 border-t border-border/30 space-y-1">
            {years.map(y => (
              <div key={y.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{y.label} — {y.producers} producers</span>
                <span className="font-semibold text-foreground">{y.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 17: The Ask (Updated) ─── */
function TheAskSlide() {
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="The Ask" title="Building the intelligence layer that insurance runs on." />

      {/* Raise Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center hover-lift">
          <p className="text-4xl font-extrabold text-foreground">$500K</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">Total raise</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Seed round — focused and lean</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-center hover-lift">
          <p className="text-4xl font-extrabold text-foreground">10%</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">Equity offered</p>
          <p className="text-xs text-muted-foreground/70 mt-1">$5M pre-money valuation</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-center hover-lift">
          <p className="text-4xl font-extrabold text-foreground">$250K</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">Min. per investor</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Max 2 investors at this stage</p>
        </div>
      </div>

      {/* Use of Funds */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Use of Funds</p>
        <div className="space-y-4">
          {[
            { pct: "50%", title: "Product & AI Development", desc: "Harden the extraction engine, expand ACORD coverage, build out Pulse and Command Center intelligence." },
            { pct: "30%", title: "Deployment & Partner Expansion", desc: "Onboard 10 pilot agencies, build real-world production footprint, establish revenue." },
            { pct: "20%", title: "Core Team & Operations", desc: "Engineering, infrastructure, and execution as adoption scales." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <span className="text-2xl font-extrabold text-primary/80 w-16 shrink-0 text-right">{item.pct}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Now */}
      <div className="mt-6 rounded-xl border-2 border-primary/20 bg-primary/5 p-6 space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-widest">Why Now</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          AURA is already live inside a commercial agency. Submissions are being processed. The intelligence layer is learning.
        </p>
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          We are raising to scale what is already working — not to find product-market fit.
        </p>
      </div>

      <p className="mt-5 text-center text-lg font-bold text-foreground">Insurance runs on AURA.</p>
      <p className="mt-2 text-center text-xs text-muted-foreground/50">Confidential — AURA Risk Group</p>
    </div>
  );
}
