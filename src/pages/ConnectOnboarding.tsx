import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, ArrowLeft, Sun, Moon, Sparkles, Target, Brain,
  Rocket, CheckCircle, Palette, Zap, TrendingUp, Users, Globe,
  MapPin, Search, Briefcase, Check,
} from "lucide-react";
import { toast } from "sonner";
import { CONNECT_VERTICALS } from "@/lib/connect-verticals";

const ALL_US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const STEPS = [
  { id: "welcome", title: "Welcome to AURA" },
  { id: "theme", title: "Choose Your Look" },
  { id: "industry", title: "Your Industry" },
  { id: "states", title: "States of Operation" },
  { id: "leads", title: "Your Lead Engine" },
  { id: "create", title: "Create Studio" },
  { id: "vision", title: "The Future of AURA" },
  { id: "ready", title: "You're All Set" },
];

export default function ConnectOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    // Ensure DOM matches default on mount
    const stored = localStorage.getItem("aura-dark-mode");
    const isDark = stored ? stored === "true" : true; // default dark
    document.documentElement.classList.toggle("dark", isDark);
    return isDark ? "dark" : "light";
  });
  
  const [selectedVertical, setSelectedVertical] = useState<string>("");
  const [selectedSubVerticals, setSelectedSubVerticals] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [verticalSearch, setVerticalSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("connect_vertical, specializations, states_of_operation, industry")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.connect_vertical) setSelectedVertical(data.connect_vertical);
        if (data?.specializations) setSelectedSubVerticals(data.specializations);
        if (data?.states_of_operation) setSelectedStates(data.states_of_operation);
        if (data?.industry && !data?.connect_vertical) setSelectedVertical(data.industry);
      });
  }, [user?.id]);


  const verticalConfig = useMemo(
    () => CONNECT_VERTICALS.find(v => v.id === selectedVertical),
    [selectedVertical]
  );

  const [industryRequest, setIndustryRequest] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [showRequestInput, setShowRequestInput] = useState(false);

  const goNext = () => {
    // Enforce required steps
    if (step === 2 && !selectedVertical && !requestSubmitted) {
      toast.error("Please select an industry or request one to continue.");
      return;
    }
    if (step === 3 && selectedStates.length === 0) {
      toast.error("Please select at least one state to continue.");
      return;
    }
    step < STEPS.length - 1 && setStep(step + 1);
  };
  const goBack = () => step > 0 && setStep(step - 1);

  const handleThemeChange = (isDark: boolean) => {
    const newTheme = isDark ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("aura-dark-mode", isDark ? "true" : "false");
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            onboarding_completed: true,
            theme_preference: theme,
            connect_vertical: selectedVertical || null,
            industry: selectedVertical || null,
            specializations: selectedSubVerticals.length > 0 ? selectedSubVerticals : null,
            states_of_operation: selectedStates.length > 0 ? selectedStates : null,
          })
          .eq("user_id", user.id);

        if (error) {
          console.error("Onboarding save error:", error);
          toast.error("Failed to save — please try again.");
          setSaving(false);
          return;
        }
      }
      navigate("/connect", { replace: true });
    } catch {
      navigate("/connect", { replace: true });
    } finally {
      setSaving(false);
    }
  };

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
          key={step}
          className="w-full max-w-lg animate-fade-in"
        >
          {step === 0 && <WelcomeStep />}
          {step === 1 && <ThemeStep theme={theme} onThemeChange={handleThemeChange} />}
          {step === 2 && (
            <IndustryStep
              selectedVertical={selectedVertical}
              setSelectedVertical={(v) => { setSelectedVertical(v); setShowRequestInput(false); setRequestSubmitted(false); }}
              selectedSubVerticals={selectedSubVerticals}
              setSelectedSubVerticals={setSelectedSubVerticals}
              verticalSearch={verticalSearch}
              setVerticalSearch={setVerticalSearch}
              showRequestInput={showRequestInput}
              setShowRequestInput={setShowRequestInput}
              industryRequest={industryRequest}
              setIndustryRequest={setIndustryRequest}
              requestSubmitted={requestSubmitted}
              onSubmitRequest={async () => {
                if (!industryRequest.trim()) return;
                try {
                  await supabase.from("industry_requests" as any).insert({
                    user_id: user?.id,
                    email: user?.email || "",
                    full_name: user?.user_metadata?.full_name || "",
                    requested_industry: industryRequest.trim(),
                  } as any);
                  setRequestSubmitted(true);
                  toast.success("Request submitted! We'll notify you when your vertical is ready.");
                } catch {
                  toast.error("Failed to submit request.");
                }
              }}
            />
          )}
          {step === 3 && (
            <StatesStep
              selectedStates={selectedStates}
              setSelectedStates={setSelectedStates}
            />
          )}
          {step === 4 && <LeadEngineStep />}
          {step === 5 && <CreateStep />}
          {step === 6 && <VisionStep />}
          {step === 7 && <ReadyStep />}
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
            disabled={saving}
            className="gap-2 bg-[hsl(140_12%_42%)] hover:bg-[hsl(140_12%_48%)] text-white border-0"
          >
            {saving ? "Saving…" : "Enter AURA"} <Rocket className="h-4 w-4" />
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

function IndustryStep({
  selectedVertical,
  setSelectedVertical,
  selectedSubVerticals,
  setSelectedSubVerticals,
  verticalSearch,
  setVerticalSearch,
  showRequestInput,
  setShowRequestInput,
  industryRequest,
  setIndustryRequest,
  requestSubmitted,
  onSubmitRequest,
}: {
  selectedVertical: string;
  setSelectedVertical: (v: string) => void;
  selectedSubVerticals: string[];
  setSelectedSubVerticals: React.Dispatch<React.SetStateAction<string[]>>;
  verticalSearch: string;
  setVerticalSearch: (v: string) => void;
  showRequestInput: boolean;
  setShowRequestInput: (v: boolean) => void;
  industryRequest: string;
  setIndustryRequest: (v: string) => void;
  requestSubmitted: boolean;
  onSubmitRequest: () => void;
}) {
  const verticalConfig = CONNECT_VERTICALS.find(v => v.id === selectedVertical);

  const filtered = CONNECT_VERTICALS.filter(
    (v) =>
      v.label.toLowerCase().includes(verticalSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(verticalSearch.toLowerCase())
  );

  const toggleSub = (id: string) =>
    setSelectedSubVerticals((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  return (
    <div className="text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto">
        <Briefcase className="h-7 w-7 text-[hsl(140_12%_58%)]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Your Industry <span className="text-red-400">*</span></h2>
        <p className="text-sm text-muted-foreground">
          Select the vertical you operate in. This personalizes your leads, pipeline, and AI insights.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={verticalSearch}
          onChange={(e) => setVerticalSearch(e.target.value)}
          placeholder="Search verticals…"
          className="pl-9 h-10 bg-muted/30 border-border"
        />
      </div>

      {/* Vertical list */}
      <div className="max-h-48 overflow-y-auto space-y-1.5 text-left max-w-sm mx-auto pr-1">
        {filtered.map((v) => (
          <button
            key={v.id}
            onClick={() => {
              setSelectedVertical(v.id);
              setVerticalSearch("");
              setSelectedSubVerticals(v.subVerticals.slice(0, 2).map((sv) => sv.id));
            }}
            className={`w-full p-3 rounded-xl border transition-all text-left ${
              selectedVertical === v.id
                ? "border-[hsl(140_12%_42%)] bg-[hsl(140_12%_42%/0.08)]"
                : "border-border hover:border-muted-foreground/30 bg-muted/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {selectedVertical === v.id && (
                <Check className="h-4 w-4 text-[hsl(140_12%_58%)] shrink-0" />
              )}
              <span className="text-sm font-medium">{v.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 pl-6">{v.description}</p>
          </button>
        ))}
      </div>

      {/* Request another industry */}
      {!requestSubmitted ? (
        <div className="max-w-sm mx-auto space-y-2">
          {!showRequestInput ? (
            <button
              onClick={() => setShowRequestInput(true)}
              className="text-xs text-[hsl(140_12%_58%)] hover:underline font-medium"
            >
              Don't see your industry? Request it →
            </button>
          ) : (
            <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
              <p className="text-xs text-muted-foreground font-medium text-left">What industry are you in?</p>
              <Input
                value={industryRequest}
                onChange={(e) => setIndustryRequest(e.target.value)}
                placeholder="e.g. Marine Insurance, Cannabis, etc."
                className="h-9 bg-background border-border text-sm"
              />
              <Button
                onClick={onSubmitRequest}
                disabled={!industryRequest.trim()}
                size="sm"
                className="w-full bg-[hsl(140_12%_42%)] hover:bg-[hsl(140_12%_48%)] text-white border-0"
              >
                Submit Request
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-sm mx-auto p-4 rounded-xl border border-[hsl(140_12%_42%/0.3)] bg-[hsl(140_12%_42%/0.05)]">
          <CheckCircle className="h-5 w-5 text-[hsl(140_12%_58%)] mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">We hear you!</p>
          <p className="text-xs text-muted-foreground mt-1">
            We'll work to build your vertical ASAP and notify you via email once it's ready.
          </p>
        </div>
      )}

      {/* Sub-verticals */}
      {verticalConfig && verticalConfig.subVerticals.length > 0 && (
        <div className="text-left max-w-sm mx-auto space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Specializations</p>
          <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
            {verticalConfig.subVerticals.map((sv) => (
              <button
                key={sv.id}
                onClick={() => toggleSub(sv.id)}
                className={`rounded-lg border p-2 text-[11px] font-medium transition-all text-left ${
                  selectedSubVerticals.includes(sv.id)
                    ? "border-[hsl(140_12%_42%)] bg-[hsl(140_12%_42%/0.1)] text-foreground"
                    : "border-border text-muted-foreground hover:border-muted-foreground/30"
                }`}
              >
                {sv.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {selectedSubVerticals.length} selected
          </p>
        </div>
      )}
    </div>
  );
}

function StatesStep({
  selectedStates,
  setSelectedStates,
}: {
  selectedStates: string[];
  setSelectedStates: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const ALL = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
    "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
    "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
    "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  ];

  const toggleAll = () => {
    if (selectedStates.length === ALL.length) {
      setSelectedStates([]);
    } else {
      setSelectedStates([...ALL]);
    }
  };

  const toggle = (st: string) =>
    setSelectedStates((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );

  return (
    <div className="text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto">
        <MapPin className="h-7 w-7 text-[hsl(140_12%_58%)]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">States of Operation <span className="text-red-400">*</span></h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Select the states where you do business. This sets your default lead targeting territory.
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedStates.length} state{selectedStates.length !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={toggleAll}
            className="text-xs font-medium text-[hsl(140_12%_58%)] hover:underline"
          >
            {selectedStates.length === ALL.length ? "Deselect All" : "Select All 50 States"}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto p-1">
          {ALL.map((st) => (
            <button
              key={st}
              onClick={() => toggle(st)}
              className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all ${
                selectedStates.includes(st)
                  ? "border-[hsl(140_12%_42%)] bg-[hsl(140_12%_42%/0.12)] text-foreground"
                  : "border-border text-muted-foreground hover:border-muted-foreground/30"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>
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
          { label: "AURA Agent", desc: "A fully autonomous AI sales agent that manages outreach, follow-ups, and nurturing on your behalf.", status: "Live Beta" },
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
