import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRight, ArrowLeft, Sun, Moon, Sparkles, Target, Brain,
  Rocket, CheckCircle, Palette, Zap, TrendingUp, Users, Globe,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: "welcome", title: "Welcome to AURA" },
  { id: "theme", title: "Choose Your Look" },
  { id: "leads", title: "Your Lead Engine" },
  { id: "create", title: "Create Studio" },
  { id: "vision", title: "The Future of AURA" },
  { id: "ready", title: "You're All Set" },
];

export default function ConnectOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [animateIn, setAnimateIn] = useState(true);

  useEffect(() => {
    setAnimateIn(true);
    const t = setTimeout(() => setAnimateIn(false), 600);
    return () => clearTimeout(t);
  }, [step]);

  const goNext = () => step < STEPS.length - 1 && setStep(step + 1);
  const goBack = () => step > 0 && setStep(step - 1);

  const handleThemeChange = (isDark: boolean) => {
    const newTheme = isDark ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", newTheme);
  };

  const handleComplete = async () => {
    try {
      if (user) {
        await supabase
          .from("profiles")
          .update({
            onboarding_completed: true,
            theme_preference: theme,
          } as any)
          .eq("user_id", user.id);
      }
      navigate("/connect", { replace: true });
    } catch {
      navigate("/connect", { replace: true });
    }
  };

  const fadeClass = animateIn
    ? "opacity-0 translate-y-4"
    : "opacity-100 translate-y-0";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <div
          className="h-full bg-[hsl(140_12%_42%)] transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-[hsl(140_12%_42%)]" : i < step ? "w-3 bg-[hsl(140_12%_42%/0.5)]" : "w-3 bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div
          className={`w-full max-w-lg transition-all duration-500 ease-out ${fadeClass}`}
        >
          {step === 0 && <WelcomeStep />}
          {step === 1 && <ThemeStep theme={theme} onThemeChange={handleThemeChange} />}
          {step === 2 && <LeadEngineStep />}
          {step === 3 && <CreateStep />}
          {step === 4 && <VisionStep />}
          {step === 5 && <ReadyStep />}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 flex items-center justify-between max-w-lg mx-auto w-full">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 0}
          className="gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <span className="text-xs text-muted-foreground">
          {step + 1} / {STEPS.length}
        </span>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={goNext}
            className="gap-2 bg-[hsl(140_12%_42%)] hover:bg-[hsl(140_12%_48%)] text-white border-0"
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            className="gap-2 bg-[hsl(140_12%_42%)] hover:bg-[hsl(140_12%_48%)] text-white border-0"
          >
            Enter AURA <Rocket className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Step Components ── */

function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-[hsl(140_12%_42%/0.1)] border border-[hsl(140_12%_42%/0.2)] flex items-center justify-center mx-auto">
        <svg width={48} height={48} viewBox="0 0 100 100" fill="none">
          <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
          <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="currentColor" className="text-background" />
          <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
        </svg>
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Welcome to AURA Connect</h1>
        <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Your AI-powered relationship intelligence platform. Let's get you set up in under a minute.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-4">
        {[
          { icon: Target, label: "Targeted Leads" },
          { icon: Brain, label: "AI Intelligence" },
          { icon: Users, label: "Network Growth" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="p-3 rounded-xl bg-muted/50 border border-border text-center">
            <Icon className="h-5 w-5 mx-auto mb-1.5 text-[hsl(140_12%_58%)]" />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeStep({ theme, onThemeChange }: { theme: string; onThemeChange: (dark: boolean) => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto">
        <Palette className="h-7 w-7 text-[hsl(140_12%_58%)]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Choose Your Look</h2>
        <p className="text-sm text-muted-foreground">
          Pick a theme that feels right. You can change this anytime in settings.
        </p>
      </div>

      <div className="flex gap-4 justify-center pt-2">
        <button
          onClick={() => onThemeChange(true)}
          className={`w-36 p-4 rounded-xl border-2 transition-all text-center ${
            theme === "dark"
              ? "border-[hsl(140_12%_42%)] bg-[hsl(140_12%_42%/0.05)]"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <Moon className="h-8 w-8 mx-auto mb-2 text-foreground" />
          <span className="text-sm font-medium">Dark</span>
          <p className="text-[10px] text-muted-foreground mt-1">Easy on the eyes</p>
        </button>
        <button
          onClick={() => onThemeChange(false)}
          className={`w-36 p-4 rounded-xl border-2 transition-all text-center ${
            theme === "light"
              ? "border-[hsl(140_12%_42%)] bg-[hsl(140_12%_42%/0.05)]"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <Sun className="h-8 w-8 mx-auto mb-2 text-foreground" />
          <span className="text-sm font-medium">Light</span>
          <p className="text-[10px] text-muted-foreground mt-1">Clean & bright</p>
        </button>
      </div>

      {theme === "dark" && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle className="h-3.5 w-3.5 text-[hsl(140_12%_58%)]" />
          Most AURA users prefer dark mode
        </div>
      )}
    </div>
  );
}

function LeadEngineStep() {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto">
        <Target className="h-7 w-7 text-[hsl(140_12%_58%)]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Your AI Lead Engine</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          AURA scans 70+ verified databases to find leads tailored to your industry and geography.
        </p>
      </div>

      <div className="space-y-3 text-left max-w-sm mx-auto">
        {[
          { icon: Globe, title: "Multi-Source Intelligence", desc: "We aggregate data from DOT, FMCSA, state filings, business registrations, and more." },
          { icon: Zap, title: "Free Leads Every Month", desc: "Generate your first batch for free — see the quality before you buy." },
          { icon: TrendingUp, title: "Scored & Enriched", desc: "Every lead comes with contact info, business details, and an AI-generated opportunity score." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border">
            <Icon className="h-5 w-5 text-[hsl(140_12%_58%)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateStep() {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto relative">
        <Sparkles className="h-7 w-7 text-[hsl(140_12%_58%)]" />
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          BETA
        </span>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Create Studio</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Design branded marketing materials with AI. Currently in beta — more templates and AI image sourcing coming soon.
        </p>
      </div>

      <div className="space-y-3 text-left max-w-sm mx-auto">
        <div className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border">
          <Palette className="h-5 w-5 text-[hsl(140_12%_58%)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Branded Templates</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Flyers, social posts, email headers — all with your brand colors and logo.
            </p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-400 font-medium mb-1">Coming Soon</p>
          <ul className="text-[11px] text-muted-foreground space-y-1">
            <li>• Expanded template library across all verticals</li>
            <li>• AI-powered image sourcing and generation</li>
            <li>• One-click social media publishing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function VisionStep() {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto">
        <Rocket className="h-7 w-7 text-[hsl(140_12%_58%)]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">The Future of AURA</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          We're building the most intelligent business development platform in the industry.
        </p>
      </div>

      <div className="space-y-2.5 text-left max-w-sm mx-auto">
        {[
          { label: "AURA Agent", desc: "A fully autonomous AI sales agent that manages outreach, follow-ups, and nurturing on your behalf.", status: "Coming Q3 2026" },
          { label: "Deep Pipeline Analytics", desc: "Predictive insights on deal velocity, conversion probability, and optimal follow-up timing.", status: "In Development" },
          { label: "Carrier & Partner Marketplace", desc: "Direct connections to carriers, wholesalers, and strategic partners — powered by your network data.", status: "Planned" },
          { label: "Mobile App", desc: "Full AURA Connect experience on iOS and Android with push notifications and voice commands.", status: "Planned" },
        ].map(({ label, desc, status }) => (
          <div key={label} className="p-3 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">{label}</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(140_12%_42%/0.15)] text-[hsl(140_12%_58%)]">
                {status}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadyStep() {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-[hsl(140_12%_42%/0.1)] border border-[hsl(140_12%_42%/0.2)] flex items-center justify-center mx-auto">
        <CheckCircle className="h-10 w-10 text-[hsl(140_12%_58%)]" />
      </div>
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-3">You're All Set!</h2>
        <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Your AURA Connect workspace is ready. Start generating leads, building your pipeline, and growing your network.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 max-w-sm mx-auto">
        {[
          { icon: Target, label: "Generate Leads", desc: "Find prospects now" },
          { icon: Brain, label: "Ask Sage", desc: "Your AI advisor" },
          { icon: TrendingUp, label: "Track Pipeline", desc: "Manage your deals" },
          { icon: Sparkles, label: "Create Content", desc: "Market your brand" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="p-3 rounded-xl bg-muted/30 border border-border text-center">
            <Icon className="h-5 w-5 mx-auto mb-1.5 text-[hsl(140_12%_58%)]" />
            <p className="text-xs font-medium">{label}</p>
            <p className="text-[10px] text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
