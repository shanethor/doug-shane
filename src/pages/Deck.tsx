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
  { id: "the-ask", label: "The Ask" },
  { id: "why-exists", label: "Why AURA Exists" },
];

export default function Deck() {
  const [current, setCurrent] = useState(0);

  const go = useCallback((dir: 1 | -1) => {
    setCurrent((c) => {
      const next = c + dir;
      if (next < 0 || next >= SLIDES.length) return c;
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
    <TheAskSlide />,
    <WhyExistsSlide />,
  ];

  return (
    <div className="deck-root fixed inset-0 flex flex-col" style={{ background: "var(--deck-bg)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--deck-divider)", background: "var(--deck-white)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight" style={{ color: "var(--deck-text)" }}>AURA</span>
          <span className="text-[11px] tracking-widest uppercase" style={{ color: "var(--deck-text-secondary)" }}>Risk Group</span>
        </div>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === current ? 24 : 6,
                height: 6,
                background: i === current ? "var(--deck-primary)" : "var(--deck-divider)",
              }}
            />
          ))}
        </div>
        <span className="text-xs font-medium tabular-nums" style={{ color: "var(--deck-text-secondary)" }}>{current + 1}/{SLIDES.length}</span>
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <div key={current} className="absolute inset-0 overflow-y-auto deck-fade-in">
          <div className="deck-slide w-full max-w-5xl mx-auto">
            {slideComponents[current]}
          </div>
        </div>

        {/* Nav arrows */}
        {current > 0 && (
          <button onClick={() => go(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all" style={{ background: "var(--deck-white)", border: "1px solid var(--deck-divider)", color: "var(--deck-text-secondary)" }}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {current < SLIDES.length - 1 && (
          <button onClick={() => go(1)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all" style={{ background: "var(--deck-white)", border: "1px solid var(--deck-divider)", color: "var(--deck-text-secondary)" }}>
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Shared Components ─── */

function SlideLabel({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4" strokeWidth={2} style={{ color: "var(--deck-secondary)" }} />
      <span className="deck-label">{text}</span>
    </div>
  );
}

function SlideHeader({ icon, tag, title, subtitle }: { icon: any; tag: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <SlideLabel icon={icon} text={tag} />
      <h2 className="deck-headline" style={{ marginTop: 12 }}>{title}</h2>
      {subtitle && <p className="deck-subheadline" style={{ marginTop: 16, maxWidth: 900 }}>{subtitle}</p>}
    </div>
  );
}

function DeckBox({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`deck-box ${className}`} style={style}>{children}</div>;
}

function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <DeckBox>
      <div className="deck-stat-value">{value}</div>
      <div className="deck-box-body" style={{ marginTop: 4 }}>{label}</div>
      {sub && <div className="deck-box-supporting" style={{ marginTop: 4 }}>{sub}</div>}
    </DeckBox>
  );
}

/* ─── Slide 1: Title ─── */
function TitleSlide() {
  return (
    <div className="flex flex-col items-center text-center" style={{ paddingTop: 40 }}>
      <h1 style={{ fontSize: 80, fontWeight: 800, color: "var(--deck-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>
        AURA
      </h1>
      <p style={{ fontSize: 24, fontWeight: 600, color: "var(--deck-text-secondary)", letterSpacing: "0.1em", marginTop: 8 }}>Risk Group</p>
      <h2 className="deck-headline" style={{ marginTop: 40, textAlign: "center" }}>
        The Intelligence Layer<br />Insurance Runs On
      </h2>
      <p className="deck-subheadline" style={{ marginTop: 24, maxWidth: 640 }}>
        AURA was built to help producers manage and close business the right way.
      </p>
      <p className="deck-supporting" style={{ marginTop: 12 }}>
        Built by producers. Not software companies.
      </p>
      <p className="deck-closing" style={{ marginTop: 48 }}>
        Insurance runs on AURA.
      </p>
      <div className="flex items-center gap-3" style={{ marginTop: 40, color: "var(--deck-text-secondary)", fontSize: 14 }}>
        <span>Investment Deck</span>
        <span className="h-1 w-1 rounded-full" style={{ background: "var(--deck-divider)" }} />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DeckBox>
          <p className="deck-box-body">
            I decided I was done wasting time re entering data, filling out forms, and working inside systems that were never built to support producers.
          </p>
          <p className="deck-box-body" style={{ marginTop: 16 }}>
            Producers are expected to advise clients on risk, but most of their time is spent managing the process instead of closing business. When that happens, the insured does not get the attention they deserve.
          </p>
          <p className="deck-box-headline" style={{ marginTop: 20 }}>
            The biggest risk is not the insured. It is the systems everything runs on.
          </p>
        </DeckBox>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <DeckBox>
            <p className="deck-box-headline">
              AURA is being built from inside the job, not outside of it.
            </p>
          </DeckBox>
          <DeckBox>
            <p className="deck-label" style={{ marginBottom: 16 }}>Founding Team</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="deck-box-body">
                <span className="deck-box-headline" style={{ display: "block" }}>Doug Wenz</span>
                Founder & Active Commercial Producer
              </div>
              <div className="deck-box-body">
                <span className="deck-box-headline" style={{ display: "block" }}>Shane Thorsteinson</span>
                Co Founder & Lead Engineer
              </div>
            </div>
          </DeckBox>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: 24 }}>
        <StatCard value="3–5 hours" label="Per submission" sub="The same data re entered across multiple forms every time" />
        <StatCard value="23%" label="Error rate on submissions" sub="Delays, rework, missed coverage, and lost business" />
        <StatCard value="$4.2 billion" label="Spent on admin every year" sub="Time that should be spent advising clients and closing business" />
      </div>
      <DeckBox className="mt-6">
        <p className="deck-box-headline" style={{ marginBottom: 12 }}>Agencies outsource just to keep up</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {["Submission preparation", "Exposure review", "Renewal prep", "Marketing prep", "COI review", "Coverage auditing"].map((item) => (
            <div key={item} className="flex items-center gap-2 deck-box-body">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "var(--deck-secondary)" }} />
              {item}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--deck-divider)", marginTop: 16, paddingTop: 16 }}>
          <p className="deck-box-headline">
            The problem is not the work. The problem is the systems producers are forced to work in.
          </p>
        </div>
      </DeckBox>
    </div>
  );
}

/* ─── Slide 4: Unfair Advantage ─── */
function BuiltBySlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Unfair Advantage" title="Built inside the industry. Not outside of it." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <DeckBox>
            <p className="deck-box-headline" style={{ marginBottom: 12, color: "var(--deck-text-secondary)" }}>How every other insurance tech is built</p>
            <ul className="deck-box-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-text-secondary)" }}>×</span> Built by technologists who studied the workflow</li>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-text-secondary)" }}>×</span> Designed from diagrams and interviews</li>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-text-secondary)" }}>×</span> Optimized for process efficiency</li>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-text-secondary)" }}>×</span> Never carried quota or owned the client relationship</li>
            </ul>
          </DeckBox>
          <DeckBox>
            <p className="deck-box-headline" style={{ marginBottom: 12, color: "var(--deck-primary)" }}>AURA</p>
            <ul className="deck-box-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Built by an active commercial producer</li>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Built from real production experience</li>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Optimized to help producers win business and protect clients</li>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Running inside a live agency with real accounts</li>
            </ul>
          </DeckBox>
        </div>
        <div className="flex flex-col justify-center">
          <DeckBox>
            <p className="deck-box-body">
              Most insurance technology is built to speed up the process.
            </p>
            <p className="deck-box-headline" style={{ marginTop: 16 }}>
              AURA was built to serve the producer and their insureds.
            </p>
          </DeckBox>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginTop: 24 }}>
        <StatCard value="75%+" label="Reduction in submission time" sub="From hours to minutes per account" />
        <StatCard value="Cross filled" label="ACORD forms and carrier supplementals instantly" sub="No duplicate entry across forms" />
        <StatCard value="Real data" label="Built on live agency submissions" sub="Not synthetic — not theoretical" />
        <StatCard value="AI Audit" label="Coverage gaps surfaced before submission" sub="Every submission reviewed for completeness" />
      </div>
      <StatCard value="Loss runs" label="Pulled and attached automatically" sub="No manual carrier follow up" />
      <p className="deck-closing" style={{ marginTop: 40 }}>
        AURA starts with submissions and becomes the system producers rely on to manage and place business.
      </p>
    </div>
  );
}

/* ─── Slide 6: How It Works ─── */
function HowSlide() {
  return (
    <div>
      <SlideHeader icon={Rocket} tag="How It Works" title="Three steps. One conversation." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: 24 }}>
        {[
          { step: "01", title: "Upload & Chat", desc: "Upload documents or talk to AURA. The intelligence engine extracts business data, coverage needs, and loss history automatically — the way a producer would." },
          { step: "02", title: "Intelligence Cross Fill", desc: "AURA completes ACORD forms, carrier supplementals, and submission documents instantly, flags coverage gaps, and surfaces what the producer needs to see before submission." },
          { step: "03", title: "Review & Submit", desc: "The producer reviews, makes corrections if needed, and sends a complete submission package. Nothing leaves without producer approval." },
        ].map((s) => (
          <DeckBox key={s.step}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--deck-divider)", marginBottom: 12 }}>{s.step}</div>
            <p className="deck-box-headline" style={{ marginBottom: 8 }}>{s.title}</p>
            <p className="deck-box-body">{s.desc}</p>
          </DeckBox>
        ))}
      </div>
      <p className="deck-closing" style={{ marginTop: 40 }}>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: 24 }}>
        {[
          { icon: Database, title: "Layer 1 — Data", desc: "Unifies and structures agency data into one view.", items: ["Policies, applications, loss runs, COIs", "Property, vehicle, and exposure data", "Year over year changes and history"], closing: "The data becomes structured and usable." },
          { icon: Brain, title: "Layer 2 — Thinking", desc: "AURA analyzes the data and surfaces what matters.", items: ["Detects missing coverages and gaps", "Flags inconsistent limits and exposures", "Compares the account against history and peers"], closing: "Pattern recognition at scale. Judgment stays human." },
          { icon: Eye, title: "Layer 3 — Human", desc: "Nothing happens automatically. Everything flows through the producer.", items: ["AURA surfaces observations and flags", "The producer reviews and decides", "Full accountability stays with the producer"], closing: "The producer remains the decision maker." },
        ].map((layer) => (
          <DeckBox key={layer.title}>
            <layer.icon className="h-5 w-5 mb-3" strokeWidth={2} style={{ color: "var(--deck-secondary)" }} />
            <p className="deck-box-headline" style={{ marginBottom: 8 }}>{layer.title}</p>
            <p className="deck-box-body" style={{ marginBottom: 12 }}>{layer.desc}</p>
            <ul className="deck-box-supporting" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {layer.items.map(item => <li key={item}>• {item}</li>)}
            </ul>
            <p className="deck-box-supporting" style={{ marginTop: 12, fontWeight: 500, color: "var(--deck-primary)" }}>{layer.closing}</p>
          </DeckBox>
        ))}
      </div>
    </div>
  );
}

/* ─── Slide 8: Human First ─── */
function HumanFirstSlide() {
  return (
    <div className="flex flex-col items-center text-center" style={{ maxWidth: 900, margin: "0 auto" }}>
      <SlideLabel icon={Heart} text="The Philosophy" />
      <h2 className="deck-headline" style={{ marginTop: 12, textAlign: "center" }}>
        Human first. Always.
      </h2>
      <p className="deck-subheadline" style={{ marginTop: 24 }}>
        The goal is not to replace the producer. The goal is to restore them.
      </p>
      <p className="deck-subheadline" style={{ marginTop: 16 }}>
        Technology should never replace judgment. It should remove friction.
      </p>
      <DeckBox className="w-full" style={{ marginTop: 40 }}>
        <p className="deck-box-headline" style={{ textAlign: "center" }}>
          AURA handles the busy work so the producer can do what matters most.
        </p>
        <div className="flex justify-center gap-8" style={{ marginTop: 16 }}>
          {["Think", "Advise", "Protect", "Build relationships"].map(w => (
            <span key={w} style={{ fontSize: 15, fontWeight: 600, color: "var(--deck-primary)" }}>{w}</span>
          ))}
        </div>
      </DeckBox>
      <p className="deck-supporting" style={{ marginTop: 24 }}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginTop: 24 }}>
        <DeckBox>
          <p className="deck-box-headline" style={{ marginBottom: 16 }}>The loop that keeps compounding</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { step: "1", text: "Submission enters AURA. Data becomes structured." },
              { step: "2", text: "AURA evaluates coverage, exposures, and gaps." },
              { step: "3", text: "Producer reviews and makes decisions. The outcome is captured." },
              { step: "4", text: "AURA learns what was chosen, what was corrected, and what mattered." },
              { step: "5", text: "Every future submission benefits from that experience." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center" style={{ background: "var(--deck-bg)", color: "var(--deck-primary)", fontSize: 13, fontWeight: 700 }}>{item.step}</span>
                <span className="deck-box-body">{item.text}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--deck-divider)", marginTop: 16, paddingTop: 16 }}>
            <p className="deck-box-supporting" style={{ textAlign: "center", fontWeight: 500, color: "var(--deck-primary)" }}>This repeats on every account. The more AURA is used, the more valuable it becomes.</p>
          </div>
        </DeckBox>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <DeckBox>
            <p className="deck-box-headline" style={{ marginBottom: 8 }}>What becomes difficult to replicate</p>
            <ul className="deck-box-supporting" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <li>• Structured insurance decision data built from real submissions</li>
              <li>• Judgment calibrated from producer decisions</li>
              <li>• Benchmarks across industries, regions, and carriers</li>
              <li>• Switching costs that grow over time</li>
            </ul>
          </DeckBox>
          <DeckBox>
            <p className="deck-box-headline" style={{ textAlign: "center" }}>
              Competitors can copy software. They cannot copy experience.
            </p>
            <p className="deck-box-supporting" style={{ textAlign: "center", marginTop: 8 }}>
              AURA is becoming the intelligence layer behind insurance decision making.
            </p>
          </DeckBox>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" style={{ marginTop: 24 }}>
        {[
          {
            phase: "Phase 1", title: "Submission Intelligence", status: "Now",
            items: ["Data ingestion and extraction", "ACORD cross fill", "Supplementals and carrier forms", "Gap detection", "Complete submission packages", "Loss run ingestion and analysis"],
          },
          {
            phase: "Phase 2", title: "Producer Intelligence", status: "12–18 mo",
            items: ["Coverage adequacy scoring", "Renewal intelligence", "Loss trend analysis", "Peer benchmarking", "Account level insights"],
          },
          {
            phase: "Phase 3", title: "Agency Operating System", status: "24–36 mo",
            items: ["Pipeline management", "Producer performance", "Carrier workflow", "Full agency data layer"],
          },
          {
            phase: "Phase 4", title: "Industry Intelligence Layer", status: "36+ mo",
            items: ["Cross agency benchmarks", "Carrier analytics", "Risk intelligence licensing", "Enterprise deployments"],
          },
        ].map((p) => (
          <DeckBox key={p.phase}>
            <p className="deck-label" style={{ marginBottom: 4 }}>{p.phase}</p>
            <p className="deck-box-supporting" style={{ marginBottom: 12 }}>{p.status}</p>
            <p className="deck-box-headline" style={{ marginBottom: 12 }}>{p.title}</p>
            <ul className="deck-box-supporting" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {p.items.map(item => <li key={item}>• {item}</li>)}
            </ul>
          </DeckBox>
        ))}
      </div>
      <p className="deck-closing" style={{ marginTop: 40 }}>
        Every submission makes AURA smarter. That is how AURA becomes the system producers run on.
      </p>
    </div>
  );
}

/* ─── Slide 11: Insured Experience ─── */
function InsuredExperienceSlide() {
  return (
    <div>
      <SlideHeader icon={Eye} tag="Extending Intelligence" title="AURA extends the intelligence layer into the client relationship." />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" style={{ marginTop: 24 }}>
        {[
          { icon: Smartphone, heading: "Instant Access", lines: ["View ID cards anytime", "Download policies and documents", "Request certificates instantly"] },
          { icon: FolderOpen, heading: "Client Requests", lines: ["Request policy changes", "Request new quotes", "Secure payment portal", "Everything flows directly to the producer"] },
          { icon: MessageCircle, heading: "Connected Experience", lines: ["Direct communication with the producer", "No lost emails. No broken handoffs", "Everything stays in one place"] },
          { icon: Bot, heading: "Intelligent Assistance", lines: ["Clients can interact with AURA to access information and start requests", "AURA supports the relationship. The producer stays in control"] },
        ].map(({ icon: Icon, heading, lines }) => (
          <DeckBox key={heading}>
            <Icon className="h-5 w-5 mb-3" strokeWidth={2} style={{ color: "var(--deck-secondary)" }} />
            <p className="deck-box-headline" style={{ marginBottom: 12 }}>{heading}</p>
            <ul className="deck-box-supporting" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {lines.map(line => <li key={line}>{line}</li>)}
            </ul>
          </DeckBox>
        ))}
      </div>
      <p className="deck-closing" style={{ marginTop: 40 }}>
        AURA makes it easier for clients to work with their producer. Not around them.
      </p>
    </div>
  );
}

/* ─── Slide 12: Why We Win ─── */
function WhyWinsSlide() {
  return (
    <div>
      <SlideHeader icon={Zap} tag="Why AURA Wins" title="The founder advantage no one can replicate." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <DeckBox>
            <ul className="deck-box-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Built by an active commercial producer</li>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Tested on real accounts where mistakes actually matter</li>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Distribution exists because the relationships already exist</li>
              <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> The intelligence loop is already live</li>
            </ul>
          </DeckBox>
          <DeckBox>
            <p className="deck-box-headline" style={{ marginBottom: 8 }}>The GTM advantage</p>
            <p className="deck-box-body">
              Most companies build and then look for adoption. AURA starts with adoption and improves from there.
            </p>
          </DeckBox>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <DeckBox>
            <p className="deck-box-headline" style={{ marginBottom: 12 }}>Compounding intelligence advantage</p>
            <p className="deck-box-body" style={{ marginBottom: 12 }}>Every submission leaves something behind:</p>
            <ul className="deck-box-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full mt-2 shrink-0" style={{ background: "var(--deck-primary)" }} />What markets responded</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full mt-2 shrink-0" style={{ background: "var(--deck-primary)" }} />What was corrected</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full mt-2 shrink-0" style={{ background: "var(--deck-primary)" }} />What won and what did not</li>
            </ul>
            <p className="deck-box-body" style={{ marginTop: 12 }}>That experience stays inside AURA. The next account starts smarter than the last one.</p>
          </DeckBox>
          <DeckBox>
            <p className="deck-box-headline">
              Over time, AURA becomes part of how the producer thinks and works because they simply cannot work without it.
            </p>
          </DeckBox>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 13: Revenue Model ─── */
function ModelSlide() {
  const tiers = [
    { heading: "Core Deployment", price: "$7,500–12,000/mo", tag: "per agency", features: ["Producer workflow intelligence", "Submission ingestion and automation", "Coverage intelligence layer", "Production visibility"], highlight: false },
    { heading: "Full Agency Deployment", price: "$12,000–25,000/mo", tag: "per agency", features: ["All core intelligence", "Agency wide deployment", "Operational intelligence", "Producer performance tracking"], highlight: true },
    { heading: "Enterprise Deployment", price: "$25,000+/mo", tag: "per organization", features: ["Full platform deployment", "Custom integrations", "Advanced intelligence layer", "Enterprise support"], highlight: false },
  ];
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="Revenue Model" title="AURA is not another broken insurance system. It becomes the system your agency runs on." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: 24 }}>
        {tiers.map((t) => (
          <DeckBox key={t.heading} style={t.highlight ? { border: "2px solid var(--deck-primary)" } : undefined}>
            <p className="deck-label" style={{ marginBottom: 4, color: t.highlight ? "var(--deck-primary)" : undefined }}>{t.heading}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--deck-text)", marginTop: 4 }}>{t.price}</p>
            <p className="deck-box-supporting" style={{ marginBottom: 16 }}>{t.tag}</p>
            <ul className="deck-box-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {t.features.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <span style={{ color: t.highlight ? "var(--deck-primary)" : "var(--deck-text-secondary)" }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </DeckBox>
        ))}
      </div>
      {/* Revenue Share */}
      <DeckBox className="mt-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="shrink-0 md:w-56">
            <p className="deck-label" style={{ marginBottom: 4, color: "var(--deck-primary)" }}>Alternative Model — Revenue Share</p>
            <p className="deck-box-body" style={{ marginTop: 8 }}>AURA grows when producers produce more.</p>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            {[
              { label: "Year 1", pct: "3–5%", note: "Of new business influenced by AURA" },
              { label: "Year 2", pct: "5–7%", note: "As intelligence compounds" },
              { label: "Year 3+", pct: "7–10%", note: "As AURA becomes embedded in production" },
            ].map(r => (
              <div key={r.label} className="text-center" style={{ borderRadius: 12, border: "1px solid var(--deck-divider)", padding: 16 }}>
                <p className="deck-box-supporting">{r.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--deck-text)", marginTop: 4 }}>{r.pct}</p>
                <p className="deck-box-supporting" style={{ marginTop: 4, fontSize: 12 }}>{r.note}</p>
              </div>
            ))}
          </div>
        </div>
      </DeckBox>
      <p className="deck-box-supporting" style={{ textAlign: "center", marginTop: 12 }}>Revenue share applies only in select cases where AURA participates as part of the operating structure.</p>
      <p className="deck-closing" style={{ marginTop: 24 }}>Insurance runs on AURA.</p>
    </div>
  );
}

/* ─── Slide 14: GTM ─── */
function GTMSlide() {
  return (
    <div>
      <SlideHeader icon={Users} tag="Go-to-Market" title="The insider advantage" subtitle="AURA is not being introduced to the industry. It is being built inside it." />
      <p className="deck-supporting" style={{ marginBottom: 24 }}>
        This starts inside Doug's active commercial book of business. Real producers. Real accounts. Real submissions.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DeckBox>
          <p className="deck-box-headline" style={{ marginBottom: 12 }}>Phase 1 — Prove (Months 1–6)</p>
          <ul className="deck-box-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Deploy AURA across all new business submissions</li>
            <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Train the intelligence on real producer decisions</li>
            <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Capture time returned to the producer</li>
            <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Identify coverage gaps and missed opportunities</li>
            <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Prove this improves how producers operate in the real world</li>
          </ul>
        </DeckBox>
        <DeckBox>
          <p className="deck-box-headline" style={{ marginBottom: 12 }}>Phase 2 — Expand (Months 7–18)</p>
          <ul className="deck-box-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Introduce AURA to partner agencies already in our network</li>
            <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Expand across multiple producers and multiple agencies</li>
            <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Each submission strengthens the intelligence layer</li>
            <li className="flex items-start gap-2"><span style={{ color: "var(--deck-primary)" }}>✓</span> Growth happens because producers see the advantage</li>
          </ul>
        </DeckBox>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: 24 }}>
        <StatCard value="Real" label="Live inside an active agency from day one" sub="Not a pilot. Not a test." />
        <StatCard value="Network" label="Distribution already exists" sub="Built through real relationships in the industry" />
        <StatCard value="Live" label="The intelligence layer is already learning" sub="Every submission makes it stronger" />
      </div>
      <p className="deck-closing" style={{ marginTop: 40 }}>
        AURA did not enter the insurance industry. It was built inside it.
      </p>
    </div>
  );
}

/* ─── Slide 15: Projections ─── */
function ProjectionsSlide() {
  const MAX_PX = 140;
  const years = [
    { label: "Year 1", revenue: "1.2M", raw: 1.2, agencies: 10 },
    { label: "Year 2", revenue: "5.7M", raw: 5.7, agencies: 40 },
    { label: "Year 3", revenue: "21.6M", raw: 21.6, agencies: 120 },
    { label: "Year 4", revenue: "64.8M", raw: 64.8, agencies: 300 },
    { label: "Year 5", revenue: "144M", raw: 144, agencies: 600 },
  ];
  const maxRaw = Math.max(...years.map(y => y.raw));
  return (
    <div>
      <SlideHeader icon={BarChart3} tag="Financial Projections" title="Revenue expansion as AURA becomes the intelligence layer." subtitle="AURA starts as a tool and becomes the system insurance runs on." />
      <p className="deck-supporting" style={{ marginBottom: 24 }}>Producer wedge first. Platform scale next. Structured insurance intelligence compounds with every agency onboarded.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="md:col-span-2 deck-box">
          <div className="flex items-end justify-around gap-3" style={{ height: `${MAX_PX + 32}px` }}>
            {years.map((y) => {
              const barH = Math.max(8, Math.round((y.raw / maxRaw) * MAX_PX));
              return (
                <div key={y.label} className="flex flex-col items-center gap-2 flex-1">
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--deck-text)" }}>${y.revenue}</span>
                  <div className="w-full rounded-t-md" style={{ height: `${barH}px`, background: "var(--deck-primary)" }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--deck-text-secondary)" }}>{y.label}</span>
                </div>
              );
            })}
          </div>
          <p className="deck-box-supporting" style={{ textAlign: "center", marginTop: 16 }}>Core platform subscription revenue only. Expansion streams excluded.</p>
        </div>
        {/* Explanation */}
        <DeckBox className="flex flex-col justify-between">
          <div>
            <p className="deck-label" style={{ color: "var(--deck-primary)", marginBottom: 12 }}>Growth driven by agency adoption</p>
            <ul className="deck-box-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Start with core producer workflow wedge", "Expand to full agency deployment", "Increase revenue per agency over time", "Compounding growth through network expansion"].map(b => (
                <li key={b} className="flex items-start gap-2">
                  <span style={{ color: "var(--deck-primary)" }}>→</span>{b}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ borderTop: "1px solid var(--deck-divider)", marginTop: 16, paddingTop: 16 }}>
            {years.map(y => (
              <div key={y.label} className="flex justify-between" style={{ fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "var(--deck-text-secondary)" }}>{y.label} — {y.agencies} agencies</span>
                <span style={{ fontWeight: 600, color: "var(--deck-text)" }}>${y.revenue}</span>
              </div>
            ))}
          </div>
        </DeckBox>
      </div>

      {/* Commission Generated */}
      <DeckBox className="mt-6">
        <p className="deck-label" style={{ color: "var(--deck-primary)", marginBottom: 16 }}>Conservative estimate of additional client commission generated</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center" style={{ borderRadius: 12, border: "1px solid var(--deck-divider)", padding: 24 }}>
            <p className="deck-box-supporting" style={{ textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Small Agency — $7,500/mo</p>
            <p className="deck-stat-value">$250,000</p>
            <p className="deck-box-body" style={{ marginTop: 4 }}>additional revenue per agency / year</p>
          </div>
          <div className="text-center" style={{ borderRadius: 12, border: "1px solid var(--deck-divider)", padding: 24 }}>
            <p className="deck-box-supporting" style={{ textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Large Agency — $25,000/mo</p>
            <p className="deck-stat-value">$1,000,000</p>
            <p className="deck-box-body" style={{ marginTop: 4 }}>additional revenue per agency / year</p>
          </div>
        </div>
        <p className="deck-box-supporting" style={{ textAlign: "center", marginTop: 16 }}>
          AURA doesn't just save time — it helps producers close more business. The platform pays for itself through the additional commission it generates.
        </p>
      </DeckBox>

      <p className="deck-closing" style={{ marginTop: 40 }}>Pricing aligned with economic value created, not software access.</p>
      <p className="deck-box-supporting" style={{ textAlign: "center", marginTop: 8 }}>Average agency subscription ranges from $7,500 to $25,000 per month depending on size and deployment.</p>
    </div>
  );
}

/* ─── Slide 16: The Ask ─── */
function TheAskSlide() {
  return (
    <div>
      <SlideHeader icon={DollarSign} tag="The Ask" title="Building the intelligence layer that insurance runs on." />

      {/* Raise Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: 24 }}>
        <DeckBox className="text-center" style={{ border: "2px solid var(--deck-primary)" }}>
          <p className="deck-stat-value">$2.5M</p>
          <p className="deck-box-body" style={{ marginTop: 4 }}>Total raise</p>
        </DeckBox>
        <DeckBox className="text-center">
          <p className="deck-stat-value">Up to 10%</p>
          <p className="deck-box-body" style={{ marginTop: 4 }}>Minority equity offered</p>
        </DeckBox>
        <DeckBox className="text-center">
          <p className="deck-stat-value">$250K</p>
          <p className="deck-box-body" style={{ marginTop: 4 }}>Minimum per investor</p>
          <p className="deck-box-supporting" style={{ marginTop: 4 }}>Maximum 10 investors</p>
        </DeckBox>
      </div>

      {/* Use of Funds */}
      <DeckBox className="mt-6">
        <p className="deck-label" style={{ color: "var(--deck-primary)", marginBottom: 16 }}>Use of Funds</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { pct: "50%", title: "Product and AI Development", desc: "Continue building the intelligence engine, producer workflows, and data infrastructure." },
            { pct: "30%", title: "Deployment and Partner Expansion", desc: "Deploy AURA across initial agencies and expand real world production footprint." },
            { pct: "20%", title: "Core Team and Operations", desc: "Support engineering, infrastructure, and execution as adoption scales." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <span style={{ fontSize: 24, fontWeight: 700, color: "var(--deck-primary)", width: 64, flexShrink: 0, textAlign: "right" }}>{item.pct}</span>
              <div>
                <p className="deck-box-headline">{item.title}</p>
                <p className="deck-box-body">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DeckBox>

      {/* Why AURA */}
      <DeckBox className="mt-6">
        <p className="deck-label" style={{ color: "var(--deck-primary)", marginBottom: 12 }}>Why AURA</p>
        <p className="deck-box-body" style={{ marginBottom: 12 }}>
          AURA is already live inside a commercial agency environment. Submissions are being processed and the intelligence layer is already learning.
        </p>
        <p className="deck-box-body" style={{ marginBottom: 12 }}>
          Mergers and acquisitions changed who the industry works for. Producers were forced to operate inside broken systems, and the independence that defined this business started to disappear.
        </p>
        <p className="deck-box-headline">
          We are raising to scale what is needed to give autonomy back to the professionals that built the industry.
        </p>
      </DeckBox>

      <p className="deck-closing" style={{ marginTop: 60 }}>Insurance runs on AURA.</p>
      <p className="deck-box-supporting" style={{ textAlign: "center", marginTop: 8 }}>Confidential — AURA Risk Group</p>
    </div>
  );
}

/* ─── Slide 17: Why AURA Exists ─── */
function WhyExistsSlide() {
  return (
    <div className="flex flex-col items-center text-center" style={{ maxWidth: 900, margin: "0 auto" }}>
      <SlideLabel icon={Target} text="Why AURA Exists" />
      <h2 className="deck-headline" style={{ marginTop: 12, textAlign: "center" }}>
        Insurance did not lose its expertise. It lost its independence.
      </h2>
      <p className="deck-subheadline" style={{ marginTop: 24 }}>
        Mergers and acquisitions scaled the business, but they buried the people who made it work.
      </p>
      <p className="deck-subheadline" style={{ marginTop: 16 }}>
        Producers were pushed into systems that slowed them down. Clients were left with less guidance and more process.
      </p>
      <p className="deck-subheadline" style={{ marginTop: 16 }}>
        The relationship became secondary to the machine.
      </p>
      <DeckBox className="w-full" style={{ marginTop: 40 }}>
        <p className="deck-box-headline" style={{ textAlign: "center" }}>
          AURA exists to change that.
        </p>
        <p className="deck-box-body" style={{ textAlign: "center", marginTop: 12 }}>
          It puts control back where it belongs. It gives producers their leverage back. It makes the system work for the people again.
        </p>
      </DeckBox>
      <p className="deck-closing" style={{ marginTop: 60 }}>Insurance runs on AURA.</p>
      <div className="flex items-center justify-center gap-2" style={{ marginTop: 40, opacity: 0.6 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--deck-text)" }}>AURA</span>
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--deck-text-secondary)" }}>Risk Group</span>
      </div>
      <p className="deck-box-supporting" style={{ marginTop: 8 }}>Confidential — AURA Risk Group</p>
    </div>
  );
}
