import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Zap, Shield, BarChart3, Mail, Users, Sparkles as SparklesIcon, Search } from "lucide-react";

const AuraLogo = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
    <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
    <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
  </svg>
);

/* ── Floating particles ── */
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    resize();
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.4 + 0.1,
      });
    }
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = c.width;
        if (p.x > c.width) p.x = 0;
        if (p.y < 0) p.y = c.height;
        if (p.y > c.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(138, 154, 140, ${p.a})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(138, 154, 140, ${0.06 * (1 - d / 120)})`;
            ctx.stroke();
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

/* ── Node burst transition canvas ── */
function NodeBurstTransition({ phase, onDone }: { phase: "collapse" | "expand"; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(0);
  const nodesRef = useRef<{ x: number; y: number; tx: number; ty: number; sx: number; sy: number; r: number; delay: number }[]>([]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    c.width = c.offsetWidth * 2;
    c.height = c.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = c.offsetWidth;
    const h = c.offsetHeight;
    const cx = w / 2;
    const cy = h / 2;

    const COUNT = 24;
    const nodes: typeof nodesRef.current = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = (Math.PI * 2 * i) / COUNT + (Math.random() - 0.5) * 0.3;
      const dist = 40 + Math.random() * 100;
      const edgeX = cx + Math.cos(angle) * dist;
      const edgeY = cy + Math.sin(angle) * dist;
      if (phase === "collapse") {
        nodes.push({ sx: edgeX, sy: edgeY, tx: cx, ty: cy, x: edgeX, y: edgeY, r: 3 + Math.random() * 3, delay: Math.random() * 0.3 });
      } else {
        nodes.push({ sx: cx, sy: cy, tx: edgeX, ty: edgeY, x: cx, y: cy, r: 3 + Math.random() * 3, delay: Math.random() * 0.3 });
      }
    }
    nodesRef.current = nodes;
    startRef.current = performance.now();

    const DURATION = 800;
    let raf: number;

    function draw(now: number) {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        const np = Math.max(0, Math.min(1, (progress - n.delay) / (1 - n.delay)));
        const ease = np < 0.5 ? 2 * np * np : 1 - Math.pow(-2 * np + 2, 2) / 2;
        n.x = n.sx + (n.tx - n.sx) * ease;
        n.y = n.sy + (n.ty - n.sy) * ease;

        const alpha = phase === "collapse" ? 0.3 + 0.7 * (1 - np) : 0.3 + 0.7 * np;
        const scale = phase === "collapse" ? 1 - np * 0.5 : 0.5 + np * 0.5;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * scale, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(140, 12%, 50%, ${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * scale + 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(140, 12%, 50%, ${alpha * 0.15})`;
        ctx.fill();
      }

      // Draw lines between close nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 80) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `hsla(140, 12%, 50%, ${0.2 * (1 - d / 80)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      if (progress < 1) {
        raf = requestAnimationFrame(draw);
      } else {
        onDone();
      }
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase, onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

/* ── Orbiting nodes around tagline ── */
function TaglineNodes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf: number;
    const dpr = 2;

    function resize() {
      const rect = c.getBoundingClientRect();
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const NODE_COUNT = 8;
    const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
      angle: (Math.PI * 2 * i) / NODE_COUNT,
      speed: 0.003 + Math.random() * 0.004,
      radiusX: 80 + Math.random() * 60,
      radiusY: 14 + Math.random() * 10,
      r: 2 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    }));

    function draw() {
      const rect = c.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      for (const n of nodes) {
        n.angle += n.speed;
        const x = cx + Math.cos(n.angle + n.phase) * n.radiusX;
        const y = cy + Math.sin(n.angle + n.phase) * n.radiusY;

        ctx.beginPath();
        ctx.arc(x, y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(140, 12%, 55%, 0.6)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, n.r + 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(140, 12%, 55%, 0.1)`;
        ctx.fill();
      }

      // Connect nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        const ax = cx + Math.cos(nodes[i].angle + nodes[i].phase) * nodes[i].radiusX;
        const ay = cy + Math.sin(nodes[i].angle + nodes[i].phase) * nodes[i].radiusY;
        for (let j = i + 1; j < nodes.length; j++) {
          const bx = cx + Math.cos(nodes[j].angle + nodes[j].phase) * nodes[j].radiusX;
          const by = cy + Math.sin(nodes[j].angle + nodes[j].phase) * nodes[j].radiusY;
          const d = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `hsla(140, 12%, 55%, ${0.12 * (1 - d / 100)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    }
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

const FEATURES = [
  { icon: Users, label: "Network Intelligence", delay: "0.3s" },
  { icon: BarChart3, label: "Pipeline", delay: "0.5s" },
  { icon: Mail, label: "Email & Calendar", delay: "0.7s" },
  { icon: SparklesIcon, label: "Create", delay: "0.9s" },
  { icon: Zap, label: "Sage", delay: "1.1s" },
];
const INDUSTRIES = [
  "Accounting", "Advertising & Marketing", "Agriculture", "Architecture", "Automotive",
  "Banking & Finance", "Biotechnology", "Cannabis", "Commercial Real Estate", "Construction",
  "Consulting", "Cybersecurity", "Dental", "E-Commerce", "Education", "Energy & Utilities",
  "Engineering", "Entertainment", "Environmental Services", "Event Planning", "Fashion & Apparel",
  "Film & Media", "Financial Planning", "Fitness & Wellness", "Food & Beverage", "Franchise",
  "Government", "Healthcare", "Hospitality & Hotels", "Human Resources", "Import / Export",
  "Information Technology", "Insurance", "Interior Design", "Investment Management", "Law / Legal",
  "Logistics & Supply Chain", "Manufacturing", "Medical Devices", "Mining", "Mortgage & Lending",
  "Music", "Nonprofit", "Oil & Gas", "Pharmaceuticals", "Photography", "Private Equity",
  "Professional Services", "Property Management", "Publishing", "Real Estate",
  "Recruiting & Staffing", "Renewable Energy", "Residential Real Estate", "Restaurant",
  "Retail", "SaaS / Software", "Security Services", "Social Media", "Sports & Recreation",
  "Telecommunications", "Transportation", "Travel & Tourism", "Venture Capital",
  "Veterinary", "Video Production", "Warehousing", "Wealth Management", "Wholesale", "Other",
];
type Step = "auth" | "subscribe" | "welcome";

export default function ConnectDemoAuth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("auth");
  const [pendingStep, setPendingStep] = useState<Step | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [transPhase, setTransPhase] = useState<"collapse" | "expand">("collapse");
  const [cardVisible, setCardVisible] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [industryOpen, setIndustryOpen] = useState(false);
  const industryRef = useRef<HTMLDivElement>(null);
  const [welcomeReady, setWelcomeReady] = useState(false);
  const [buildPhase, setBuildPhase] = useState(0);

  useEffect(() => {
    if (step === "welcome") {
      setWelcomeReady(false);
      setBuildPhase(0);
      const t0 = setTimeout(() => setWelcomeReady(true), 100);
      const t1 = setTimeout(() => setBuildPhase(1), 400);
      const t2 = setTimeout(() => setBuildPhase(2), 1000);
      const t3 = setTimeout(() => setBuildPhase(3), 1600);
      const t4 = setTimeout(() => setBuildPhase(4), 2200);
      const t5 = setTimeout(() => setBuildPhase(5), 3400);
      return () => [t0, t1, t2, t3, t4, t5].forEach(clearTimeout);
    }
    setWelcomeReady(false);
    setBuildPhase(0);
  }, [step]);

  const filteredIndustries = useMemo(() => {
    if (!industry.trim()) return INDUSTRIES.slice(0, 8);
    const q = industry.toLowerCase();
    return INDUSTRIES.filter(i => i.toLowerCase().includes(q)).slice(0, 8);
  }, [industry]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (industryRef.current && !industryRef.current.contains(e.target as Node)) setIndustryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Transition logic: collapse old card → swap step → expand new card
  const goToStep = useCallback((next: Step) => {
    setPendingStep(next);
    setTransitioning(true);
    setTransPhase("collapse");
    setCardVisible(false); // shrink card away
  }, []);

  const handleBurstDone = useCallback(() => {
    if (transPhase === "collapse" && pendingStep) {
      setStep(pendingStep);
      setPendingStep(null);
      setTransPhase("expand");
      // Card stays hidden briefly, then shows as nodes expand outward
      setTimeout(() => setCardVisible(true), 100);
    } else {
      setTransitioning(false);
    }
  }, [transPhase, pendingStep]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password && industry) goToStep("subscribe");
  };
  const handleSubscribe = () => goToStep("welcome");
  const handleEnter = () => {
    sessionStorage.setItem("connect-demo-auth", "true");
    sessionStorage.setItem("connect-demo-name", name || email.split("@")[0]);
    sessionStorage.setItem("connect-demo-industry", industry);
    navigate("/connectdemo");
  };

  /* ── shared header (logo only for pages 2+3) ── */
  const renderHeader = (showTagline = false) => (
    <div className="text-center space-y-3">
      <div className="mx-auto flex items-center justify-center"><AuraLogo size={48} /></div>
      <h1 className="text-xl font-bold text-white">AuRa Connect</h1>
      {showTagline && (
        <>
          <p className="text-sm font-medium" style={{ color: "hsl(140 12% 58%)" }}>
            You already know the right people. You just don't know how to get there.
          </p>
          <div className="relative py-4" style={{ minHeight: 56 }}>
            <TaglineNodes />
            <p className="text-sm font-semibold italic sage-shimmer relative z-10">
              Let us show you the way in.
            </p>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden flex items-center justify-center p-4" style={{ background: "#08080A" }}>
      <Particles />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(600px,100vw)] h-[min(600px,100vh)] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, hsl(140 12% 42% / 0.08) 0%, transparent 70%)" }} />

      <div className="w-full max-w-md relative z-10">
        {/* Node burst overlay during transitions */}
        {transitioning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="w-[400px] h-[400px]">
              <NodeBurstTransition phase={transPhase} onDone={handleBurstDone} />
            </div>
          </div>
        )}

        <div className="space-y-6">
          {step === "auth" && (
            <>
              <div
                className="rounded-xl border p-6 space-y-6"
                style={{
                  background: "hsl(240 8% 7%)",
                  borderColor: "hsl(240 6% 14%)",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                  opacity: cardVisible ? 1 : 0,
                  transform: cardVisible ? "scale(1)" : "scale(0.7)",
                }}
              >
                {renderHeader(true)}
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Name</Label>
                    <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(140,12%,42%)] transition-colors" />
                  </div>
                  <div className="space-y-2 relative" ref={industryRef}>
                    <Label className="text-white/80">Industry</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                      <Input
                        placeholder="Search your industry…"
                        value={industry}
                        onChange={e => { setIndustry(e.target.value); setIndustryOpen(true); }}
                        onFocus={() => setIndustryOpen(true)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(140,12%,42%)] transition-colors pl-9"
                      />
                    </div>
                    {industryOpen && filteredIndustries.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 rounded-lg border overflow-hidden max-h-48 overflow-y-auto"
                        style={{ background: "hsl(240 8% 10%)", borderColor: "hsl(240 6% 18%)" }}>
                        {filteredIndustries.map(ind => (
                          <button
                            key={ind}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white transition-colors"
                            style={{ background: industry === ind ? "hsl(140 12% 42% / 0.15)" : "transparent" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "hsl(140 12% 42% / 0.1)")}
                            onMouseLeave={e => (e.currentTarget.style.background = industry === ind ? "hsl(140 12% 42% / 0.15)" : "transparent")}
                            onClick={() => { setIndustry(ind); setIndustryOpen(false); }}
                          >
                            {ind}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Email</Label>
                    <Input type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(140,12%,42%)] transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Password</Label>
                    <Input type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(140,12%,42%)] transition-colors" />
                  </div>
                  <Button type="submit" className="w-full text-white font-semibold hover:brightness-110 transition-all" style={{ background: "hsl(140 12% 42%)" }}>
                    Sign Up <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>
              <p className="text-xl text-center font-semibold mt-10" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
            </>
          )}

          {step === "subscribe" && (
            <>
              <div
                className="rounded-xl border p-6 space-y-6"
                style={{
                  background: "hsl(240 8% 7%)",
                  borderColor: "hsl(240 6% 14%)",
                  transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
                  opacity: cardVisible ? 1 : 0,
                  transform: cardVisible ? "scale(1)" : "scale(0.7)",
                }}
              >
                {renderHeader()}
                <div>
                  <h2 className="text-lg font-semibold text-center" style={{ color: "hsl(240 5% 56%)" }}>Choose your plan</h2>
                </div>
                <div className="rounded-lg border-2 p-4 space-y-3" style={{ borderColor: "hsl(140 12% 42%)", background: "hsl(140 12% 42% / 0.05)" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">AuRa Connect Pro</span>
                    <span className="text-lg font-bold" style={{ color: "hsl(140 12% 58%)" }}>$250/mo</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-white">✓ Smart Pipeline</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>Know who to call next and why.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">✓ Network Intelligence</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>See the path in through your network.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">✓ Email + Calendar</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>All relationships in one place. Work and personal.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">✓ Create</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>Content and materials that represent you right.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">✓ Sage</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>Rewrite, research, and guide your next move.</p>
                    </div>
                  </div>
                </div>
                <Button className="w-full text-white font-semibold hover:brightness-110 transition-all" style={{ background: "hsl(140 12% 42%)" }} onClick={handleSubscribe}>
                  Subscribe <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-center" style={{ color: "hsl(240 5% 46%)" }}>Demo mode — no payment required</p>
              </div>
              <p className="text-xl text-center font-semibold mt-10" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
            </>
          )}

          {step === "welcome" && (
            <div className="space-y-6">
              <div
                className="rounded-xl border p-8 text-center overflow-hidden"
                style={{
                  background: "hsl(240 8% 7%)",
                  borderColor: welcomeReady ? "hsl(140 12% 42% / 0.3)" : "hsl(240 6% 14%)",
                  transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1), border-color 0.7s ease, box-shadow 0.7s ease",
                  opacity: cardVisible && welcomeReady ? 1 : 0,
                  transform: cardVisible && welcomeReady ? "translateY(0) scale(1)" : "translateY(30px) scale(0.7)",
                  boxShadow: welcomeReady ? "0 0 60px hsl(140 12% 42% / 0.08)" : "none",
                }}
              >
                <div
                  className="relative mx-auto w-20 h-20 flex items-center justify-center mb-5 transition-all duration-700"
                  style={{ opacity: buildPhase >= 1 ? 1 : 0, transform: buildPhase >= 1 ? "scale(1)" : "scale(0.5)" }}
                >
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "hsl(140 12% 42% / 0.15)", animationDuration: "2s" }} />
                  <div className="absolute inset-1 rounded-full" style={{ background: "hsl(140 12% 42% / 0.1)" }} />
                  <AuraLogo size={52} />
                </div>

                <h2
                  className="text-2xl font-bold text-white mb-2 transition-all"
                  style={{ transitionDuration: "600ms", opacity: buildPhase >= 2 ? 1 : 0, transform: buildPhase >= 2 ? "translateY(0)" : "translateY(15px)" }}
                >
                  Welcome to AuRa Connect
                </h2>
                <p className="text-sm font-medium mb-1" style={{ color: "hsl(140 12% 58%)", transitionDuration: "600ms", opacity: buildPhase >= 2 ? 1 : 0 }}>
                  You already know the right people. You just don't know how to get there.
                </p>
                <div className="relative py-2 mb-3">
                  <TaglineNodes />
                  <p className="text-sm font-semibold italic sage-shimmer relative z-10">
                    Let us show you the way in.
                  </p>
                </div>

                <p
                  className="mb-4 transition-all duration-500"
                  style={{ color: "hsl(140 12% 42%)", opacity: buildPhase >= 3 ? 1 : 0, transform: buildPhase >= 3 ? "translateY(0)" : "translateY(10px)" }}
                >
                  Your relationship intelligence suite
                </p>

                <div className="mx-auto mb-4 h-px transition-all duration-700" style={{
                  background: "hsl(140 12% 42% / 0.3)",
                  width: buildPhase >= 3 ? "80%" : "0%",
                }} />

                <div className="flex flex-wrap justify-center gap-2 pt-1 mb-5">
                  {FEATURES.map((f, i) => (
                    <span
                      key={f.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500"
                      style={{
                        background: "hsl(140 12% 42% / 0.1)",
                        color: "hsl(140 12% 58%)",
                        border: "1px solid hsl(140 12% 42% / 0.2)",
                        opacity: buildPhase >= 4 ? 1 : 0,
                        transform: buildPhase >= 4 ? "translateY(0) scale(1)" : "translateY(12px) scale(0.9)",
                        transitionDelay: `${i * 200}ms`,
                      }}
                    >
                      <f.icon className="h-3 w-3" />
                      {f.label}
                    </span>
                  ))}
                </div>

                <div className="space-y-3" style={{
                  opacity: buildPhase >= 5 ? 1 : 0,
                  transform: buildPhase >= 5 ? "translateY(0) scale(1)" : "translateY(10px) scale(0.95)",
                  transitionDuration: "500ms",
                  transitionProperty: "opacity, transform",
                  pointerEvents: buildPhase >= 5 ? "auto" : "none",
                }}>
                  <Button
                    size="lg"
                    className="w-full text-white font-semibold hover:brightness-110 transition-all"
                    style={{ background: "hsl(140 12% 42%)" }}
                    onClick={handleEnter}
                  >
                    Enter AuRa Connect <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <button
                    className="w-full py-2.5 rounded-lg text-xs font-medium transition-all border"
                    style={{
                      background: "hsl(140 12% 42% / 0.08)",
                      borderColor: "hsl(140 12% 42% / 0.15)",
                      color: "hsl(140 12% 58% / 0.6)",
                      cursor: "default",
                    }}
                    disabled
                  >
                    Connect all accounts · coming soon
                  </button>
                </div>
              </div>
              <p className="text-xl text-center font-semibold mt-10" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
