import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

const AuraLogo = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="22" fill="white" />
    <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
    <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="white" />
  </svg>
);

type Step = "auth" | "subscribe" | "welcome";

export default function ConnectDemoAuth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#08080A" }}>
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex items-center justify-center">
            <AuraLogo size={56} />
          </div>
          <h1 className="text-2xl font-bold text-white">AURA Connect</h1>
          <p className="text-sm" style={{ color: "hsl(174 97% 40%)" }}>Your relationship intelligence suite</p>
        </div>

        {step === "auth" && (
          <div className="rounded-xl border p-6 space-y-6" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
            <div>
              <h2 className="text-lg font-semibold text-white">Create your account</h2>
              <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>Sign up to explore AURA Connect</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/80">Name</Label>
                <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Email</Label>
                <Input type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Password</Label>
                <Input type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <Button type="submit" className="w-full text-white font-semibold" style={{ background: "hsl(174 97% 22%)" }}>
                Sign Up <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        )}

        {step === "subscribe" && (
          <div className="rounded-xl border p-6 space-y-6" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
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
            <Button className="w-full text-white font-semibold" style={{ background: "hsl(174 97% 22%)" }} onClick={handleSubscribe}>
              Subscribe <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-center" style={{ color: "hsl(240 5% 46%)" }}>Demo mode — no payment required</p>
          </div>
        )}

        {step === "welcome" && (
          <div className="rounded-xl border p-8 text-center space-y-5" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
            <div className="mx-auto flex items-center justify-center">
              <AuraLogo size={64} />
            </div>
            <h2 className="text-2xl font-bold text-white">Welcome to AURA Connect</h2>
            <p style={{ color: "hsl(240 5% 46%)" }}>Your workspace is ready. Let's get started.</p>
            <Button size="lg" className="text-white font-semibold" style={{ background: "hsl(174 97% 22%)" }} onClick={handleEnter}>
              Enter AURA Connect <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
