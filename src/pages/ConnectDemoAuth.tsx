import { useState, useEffect, useRef, useMemo } from "react";
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
      // draw lines between nearby particles
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [industryOpen, setIndustryOpen] = useState(false);
  const industryRef = useRef<HTMLDivElement>(null);
  const [welcomeReady, setWelcomeReady] = useState(false);

  const [buildPhase, setBuildPhase] = useState(0); // 0=card, 1=logo, 2=title, 3=subtitle, 4=features, 5=button

  useEffect(() => {
    if (step === "welcome") {
      setWelcomeReady(false);
      setBuildPhase(0);
      const t0 = setTimeout(() => setWelcomeReady(true), 100);
      const t1 = setTimeout(() => setBuildPhase(1), 400);   // logo
      const t2 = setTimeout(() => setBuildPhase(2), 1000);  // title
      const t3 = setTimeout(() => setBuildPhase(3), 1600);  // subtitle
      const t4 = setTimeout(() => setBuildPhase(4), 2200);  // features
      const t5 = setTimeout(() => setBuildPhase(5), 3400);  // button
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

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password && industry) setStep("subscribe");
  };
  const handleSubscribe = () => setStep("welcome");
  const handleEnter = () => {
    sessionStorage.setItem("connect-demo-auth", "true");
    sessionStorage.setItem("connect-demo-name", name || email.split("@")[0]);
    sessionStorage.setItem("connect-demo-industry", industry);
    navigate("/connectdemo");
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden flex items-center justify-center p-4" style={{ background: "#08080A" }}>
      <Particles />

      {/* Radial glow behind content */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(600px,100vw)] h-[min(600px,100vh)] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, hsl(140 12% 42% / 0.08) 0%, transparent 70%)" }} />

      <div className="w-full max-w-md space-y-6 relative z-10">

        {step === "auth" && (
          <>
           <div className="rounded-xl border p-6 space-y-6 animate-scale-in" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
            <div className="text-center space-y-2">
              <div className="mx-auto flex items-center justify-center"><AuraLogo size={48} /></div>
              <h1 className="text-xl font-bold text-white">AuRa Connect</h1>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create your account</h2>
              <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>Sign up to explore AuRa Connect</p>
            </div>
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
          <p className="text-xs text-center font-medium" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
          </>
        )}

        {step === "subscribe" && (
          <>
          <div className="rounded-xl border p-6 space-y-6 animate-scale-in" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
            <div className="text-center space-y-2">
              <div className="mx-auto flex items-center justify-center"><AuraLogo size={48} /></div>
              <h1 className="text-xl font-bold text-white">AuRa Connect</h1>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white text-center">Choose your plan</h2>
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
          <p className="text-xs text-center font-medium mt-3" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
          </>
        )}

        {step === "welcome" && (
          <div className="space-y-6">
            <div
              className="rounded-xl border p-8 text-center transition-all duration-700 overflow-hidden"
              style={{
                background: "hsl(240 8% 7%)",
                borderColor: welcomeReady ? "hsl(140 12% 42% / 0.3)" : "hsl(240 6% 14%)",
                opacity: welcomeReady ? 1 : 0,
                transform: welcomeReady ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
                boxShadow: welcomeReady ? "0 0 60px hsl(140 12% 42% / 0.08)" : "none",
              }}
            >
              {/* Phase 1: Logo with glow ring */}
              <div
                className="relative mx-auto w-20 h-20 flex items-center justify-center mb-5 transition-all duration-700"
                style={{ opacity: buildPhase >= 1 ? 1 : 0, transform: buildPhase >= 1 ? "scale(1)" : "scale(0.5)" }}
              >
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "hsl(140 12% 42% / 0.15)", animationDuration: "2s" }} />
                <div className="absolute inset-1 rounded-full" style={{ background: "hsl(140 12% 42% / 0.1)" }} />
                <AuraLogo size={52} />
              </div>

              {/* Phase 2: Title */}
              <h2
                className="text-2xl font-bold text-white mb-2 transition-all"
                style={{ transitionDuration: "600ms", opacity: buildPhase >= 2 ? 1 : 0, transform: buildPhase >= 2 ? "translateY(0)" : "translateY(15px)" }}
              >
                Welcome to AuRa Connect
              </h2>

              {/* Phase 3: Subtitle */}
              <p
                className="mb-4 transition-all duration-500"
                style={{ color: "hsl(240 5% 46%)", opacity: buildPhase >= 3 ? 1 : 0, transform: buildPhase >= 3 ? "translateY(0)" : "translateY(10px)" }}
              >
                Your relationship intelligence suite
              </p>

              {/* Divider line draws in */}
              <div className="mx-auto mb-4 h-px transition-all duration-700" style={{
                background: "hsl(140 12% 42% / 0.3)",
                width: buildPhase >= 3 ? "80%" : "0%",
              }} />

              {/* Phase 4: Feature pills stagger in */}
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

              {/* Phase 5: Buttons */}
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
            <p className="text-xs text-center font-medium mt-3" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
          </div>
        )}
      </div>
    </div>
  );
}