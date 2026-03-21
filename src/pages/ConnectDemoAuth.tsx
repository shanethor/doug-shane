import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Zap, Shield, BarChart3, Mail, Users, Sparkles as SparklesIcon } from "lucide-react";

const AuraLogo = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="22" fill="white" />
    <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
    <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="white" />
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
        ctx.fillStyle = `rgba(0, 168, 142, ${p.a})`;
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
            ctx.strokeStyle = `rgba(0, 168, 142, ${0.06 * (1 - d / 120)})`;
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
  { icon: BarChart3, label: "AI Pipeline", delay: "0.3s" },
  { icon: Mail, label: "Email & Calendar", delay: "0.5s" },
  { icon: Users, label: "Network Intelligence", delay: "0.7s" },
  { icon: Shield, label: "Spotlight Marketing", delay: "0.9s" },
  { icon: Zap, label: "AI Assistant", delay: "1.1s" },
];

type Step = "auth" | "subscribe" | "welcome";

export default function ConnectDemoAuth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [welcomeReady, setWelcomeReady] = useState(false);

  useEffect(() => {
    if (step === "welcome") {
      const t = setTimeout(() => setWelcomeReady(true), 100);
      return () => clearTimeout(t);
    }
    setWelcomeReady(false);
  }, [step]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) setStep("subscribe");
  };
  const handleSubscribe = () => setStep("welcome");
  const handleEnter = () => {
    sessionStorage.setItem("connect-demo-auth", "true");
    sessionStorage.setItem("connect-demo-name", name || email.split("@")[0]);
    navigate("/connectdemo");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "#08080A" }}>
      <Particles />

      {/* Radial glow behind content */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, hsl(174 97% 22% / 0.08) 0%, transparent 70%)" }} />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-2 animate-fade-in">
          <div className="mx-auto flex items-center justify-center">
            <AuraLogo size={56} />
          </div>
          <h1 className="text-2xl font-bold text-white">AURA Connect</h1>
          <p className="text-sm" style={{ color: "hsl(174 97% 40%)" }}>Your relationship intelligence suite</p>
        </div>

        {step === "auth" && (
          <div className="rounded-xl border p-6 space-y-6 animate-scale-in" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
            <div>
              <h2 className="text-lg font-semibold text-white">Create your account</h2>
              <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>Sign up to explore AURA Connect</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/80">Name</Label>
                <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(174,97%,22%)] transition-colors" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Email</Label>
                <Input type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(174,97%,22%)] transition-colors" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Password</Label>
                <Input type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(174,97%,22%)] transition-colors" />
              </div>
              <Button type="submit" className="w-full text-white font-semibold hover:brightness-110 transition-all" style={{ background: "hsl(174 97% 22%)" }}>
                Sign Up <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        )}

        {step === "subscribe" && (
          <div className="rounded-xl border p-6 space-y-6 animate-scale-in" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
            <div>
              <h2 className="text-lg font-semibold text-white">Choose your plan</h2>
              <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>Start with AURA Connect</p>
            </div>
            <div className="rounded-lg border-2 p-4 space-y-3" style={{ borderColor: "hsl(174 97% 22%)", background: "hsl(174 97% 22% / 0.05)" }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">AURA Connect Pro</span>
                <span className="text-lg font-bold" style={{ color: "hsl(174 97% 40%)" }}>$250/mo</span>
              </div>
              <ul className="text-sm space-y-1" style={{ color: "hsl(240 5% 46%)" }}>
                <li>✓ AI-Powered Pipeline</li>
                <li>✓ Email & Calendar Integration</li>
                <li>✓ Spotlight Marketing Tools</li>
                <li>✓ AI Assistant</li>
              </ul>
            </div>
            <Button className="w-full text-white font-semibold hover:brightness-110 transition-all" style={{ background: "hsl(174 97% 22%)" }} onClick={handleSubscribe}>
              Subscribe <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-center" style={{ color: "hsl(240 5% 46%)" }}>Demo mode — no payment required</p>
          </div>
        )}

        {step === "welcome" && (
          <div className="space-y-6">
            {/* Welcome card */}
            <div
              className="rounded-xl border p-8 text-center space-y-5 transition-all duration-700"
              style={{
                background: "hsl(240 8% 7%)",
                borderColor: "hsl(240 6% 14%)",
                opacity: welcomeReady ? 1 : 0,
                transform: welcomeReady ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
              }}
            >
              {/* Pulsing glow ring */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "hsl(174 97% 22% / 0.15)", animationDuration: "2s" }} />
                <div className="absolute inset-1 rounded-full" style={{ background: "hsl(174 97% 22% / 0.1)" }} />
                <AuraLogo size={52} />
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome to AURA Connect</h2>
              <p style={{ color: "hsl(240 5% 46%)" }}>Your workspace is ready. Let's get started.</p>

              {/* Feature pills with staggered fade */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {FEATURES.map((f, i) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500"
                    style={{
                      background: "hsl(174 97% 22% / 0.1)",
                      color: "hsl(174 97% 40%)",
                      border: "1px solid hsl(174 97% 22% / 0.2)",
                      opacity: welcomeReady ? 1 : 0,
                      transform: welcomeReady ? "translateY(0)" : "translateY(12px)",
                      transitionDelay: f.delay,
                    }}
                  >
                    <f.icon className="h-3 w-3" />
                    {f.label}
                  </span>
                ))}
              </div>

              <Button
                size="lg"
                className="text-white font-semibold hover:brightness-110 transition-all mt-2"
                style={{
                  background: "hsl(174 97% 22%)",
                  opacity: welcomeReady ? 1 : 0,
                  transform: welcomeReady ? "translateY(0)" : "translateY(10px)",
                  transitionDelay: "1.3s",
                  transitionDuration: "500ms",
                }}
                onClick={handleEnter}
              >
                Enter AURA Connect <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}