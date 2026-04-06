import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, ArrowLeft, Sun, Moon, Sparkles, Target, Brain,
  Rocket, CheckCircle, Palette, Zap, TrendingUp, Users, Globe,
  MapPin, Search, Briefcase, Check, Mail, Calendar, Network,
  MessageCircle, X,
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
  { id: "welcome", title: "Welcome", badge: null },
  { id: "info", title: "Your Info", badge: "REQ" as const },
  { id: "industry", title: "Industry", badge: "REQ" as const },
  { id: "states", title: "Territory", badge: "REQ" as const },
  { id: "theme", title: "Appearance", badge: null },
  { id: "tour", title: "Platform Tour", badge: null },
  { id: "plan", title: "Choose Plan", badge: "PRO" as const },
  { id: "ready", title: "All Set", badge: null },
];

export default function ConnectOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("aura-dark-mode");
    const isDark = stored ? stored === "true" : true;
    document.documentElement.classList.toggle("dark", isDark);
    return isDark ? "dark" : "light";
  });

  const [selectedVertical, setSelectedVertical] = useState("");
  const [selectedSubVerticals, setSelectedSubVerticals] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [verticalSearch, setVerticalSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Step 2 — Your Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");

  // Step 7 — Plan
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("free");

  // Industry request
  const [industryRequest, setIndustryRequest] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [showRequestInput, setShowRequestInput] = useState(false);

  // If already completed onboarding, redirect away
  useEffect(() => {
    if (!user?.id) return;
    const cached = localStorage.getItem(`aura_onboarding_completed_${user.id}`);
    if (cached === "true") {
      navigate("/connect", { replace: true });
      return;
    }
    supabase
      .from("profiles")
      .select("connect_vertical, specializations, states_of_operation, industry, onboarding_completed, full_name, agency_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.onboarding_completed) {
          localStorage.setItem(`aura_onboarding_completed_${user.id}`, "true");
          navigate("/connect", { replace: true });
          return;
        }
        if (data?.connect_vertical) setSelectedVertical(data.connect_vertical);
        if (data?.specializations) setSelectedSubVerticals(data.specializations);
        if (data?.states_of_operation) setSelectedStates(data.states_of_operation);
        if (data?.industry && !data?.connect_vertical) setSelectedVertical(data.industry);
        if (data?.full_name) {
          const parts = data.full_name.split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }
        if (data?.agency_name) setAgencyName(data.agency_name);
      });
  }, [user?.id]);

  const verticalConfig = useMemo(
    () => CONNECT_VERTICALS.find(v => v.id === selectedVertical),
    [selectedVertical]
  );

  const goNext = () => {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error("First name and last name are required.");
        return;
      }
    }
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

  const parseMonthlyTarget = (val: string): number | null => {
    const cleaned = val.replace(/[$,\s]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const handleComplete = async (plan?: "free" | "pro") => {
    const finalPlan = plan || selectedPlan;
    setSaving(true);
    try {
      if (user) {
        const parsedTarget = parseMonthlyTarget(monthlyTarget);
        const { error } = await supabase
          .from("profiles")
          .update({
            onboarding_completed: true,
            theme_preference: theme,
            connect_vertical: selectedVertical || null,
            industry: selectedVertical || null,
            specializations: selectedSubVerticals.length > 0 ? selectedSubVerticals : null,
            states_of_operation: selectedStates.length > 0 ? selectedStates : null,
            full_name: `${firstName} ${lastName}`.trim() || null,
            agency_name: agencyName || null,
            job_title: userRole || null,
            monthly_target: parsedTarget,
            onboarding_plan_selected: finalPlan,
          } as any)
          .eq("user_id", user.id);

        if (error) {
          console.error("Onboarding save error:", error);
          toast.error("Failed to save — please try again.");
          setSaving(false);
          return;
        }
        localStorage.setItem(`aura_onboarding_completed_${user.id}`, "true");
      }
      navigate("/connect", { replace: true });
    } catch (err) {
      console.error("Onboarding completion error:", err);
      toast.error("Something went wrong — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const progressWidth = `${((step + 1) / STEPS.length) * 100}%`;

  // Determine if current step is the plan step (no nav buttons)
  const isPlanStep = STEPS[step]?.id === "plan";
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* ── Left Sidebar ── */}
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r" style={{ background: "hsl(240 6% 10%)", borderColor: "hsl(240 5% 18%)" }}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white">AURA</span>
            <span className="text-[10px] text-[hsl(240_5%_60%)] tracking-widest uppercase">Setup Wizard</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-2">
          {STEPS.map((s, i) => {
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.id}>
                <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors"
                  style={isActive ? { background: "hsl(140 12% 42% / 0.08)" } : {}}
                >
                  {/* Dot */}
                  <div
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all"
                    style={
                      isDone
                        ? { background: "hsl(140 12% 42%)", color: "white" }
                        : isActive
                        ? { border: "2px solid hsl(140 12% 42%)", background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 65%)" }
                        : { border: "1.5px solid hsl(240 5% 28%)", color: "hsl(240 5% 46%)" }
                    }
                  >
                    {isDone ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  {/* Label */}
                  <span
                    className="text-[13px] font-medium flex-1"
                    style={{ color: isActive ? "white" : isDone ? "hsl(240 5% 60%)" : "hsl(240 5% 46%)" }}
                  >
                    {s.title}
                  </span>
                  {/* Badge */}
                  {s.badge === "REQ" && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(0 70% 55% / 0.15)", color: "hsl(0 70% 65%)" }}>
                      REQ
                    </span>
                  )}
                  {s.badge === "PRO" && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(38 92% 50% / 0.15)", color: "hsl(38 80% 60%)" }}>
                      PRO
                    </span>
                  )}
                </div>
                {/* Divider */}
                {i < STEPS.length - 1 && (
                  <div className="ml-[14px] w-px h-2" style={{ background: "hsl(240 5% 20%)" }} />
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Right Content ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Progress bar */}
        <div className="w-full h-1 bg-muted shrink-0">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: progressWidth, background: "hsl(140 12% 42%)" }}
          />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 md:py-12">
          <div
            key={step}
            className="max-w-2xl mx-auto"
            style={{ animation: "onb-fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards" }}
          >
            {step === 0 && <WelcomeStep />}
            {step === 1 && (
              <InfoStep
                firstName={firstName} setFirstName={setFirstName}
                lastName={lastName} setLastName={setLastName}
                agencyName={agencyName} setAgencyName={setAgencyName}
                userRole={userRole} setUserRole={setUserRole}
                monthlyTarget={monthlyTarget} setMonthlyTarget={setMonthlyTarget}
              />
            )}
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
              <StatesStep selectedStates={selectedStates} setSelectedStates={setSelectedStates} />
            )}
            {step === 4 && <ThemeStep theme={theme} onThemeChange={handleThemeChange} />}
            {step === 5 && <TourStep selectedVertical={selectedVertical} />}
            {step === 6 && (
              <PlanStep
                saving={saving}
                onSelect={(plan) => {
                  setSelectedPlan(plan);
                  if (plan === "pro") {
                    handleComplete("pro");
                  } else {
                    setStep(7);
                  }
                }}
              />
            )}
            {step === 7 && <ReadyStep firstName={firstName} saving={saving} onComplete={() => handleComplete("free")} />}
          </div>
        </div>

        {/* Nav row — hidden on plan and ready steps */}
        {!isPlanStep && !isLastStep && (
          <div className="shrink-0 p-4 md:p-6 flex items-center justify-between max-w-2xl mx-auto w-full border-t border-border">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={step === 0}
              className="gap-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <span className="text-xs text-muted-foreground">{step + 1} / {STEPS.length}</span>
            <Button
              onClick={goNext}
              className="gap-2 text-white border-0"
              style={{ background: "hsl(140 12% 42%)" }}
            >
              {step === 0 ? "Get Started" : "Continue"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes onb-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STEP COMPONENTS
   ═══════════════════════════════════════════ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{children}</p>;
}

/* ── Step 1: Welcome ── */
function WelcomeStep() {
  const features = [
    { icon: Target, name: "AI Lead Engine", desc: "Scans 70+ verified databases for targeted prospects", tier: "💲 PAID/LEAD" },
    { icon: TrendingUp, name: "Sales Pipeline", desc: "Track deals from first contact to bind with AI scoring", tier: "FREE" },
    { icon: Brain, name: "Clark AI Copilot", desc: "Ask Clark anything — 10 queries/day free", tier: "FREE" },
    { icon: Sparkles, name: "Create Studio", desc: "Generate branded flyers, social posts, and marketing materials", tier: "PRO" },
    { icon: Mail, name: "Email Intelligence", desc: "Sync your inbox, AI-summarize threads, draft replies", tier: "PRO" },
    { icon: Network, name: "Connect Network", desc: "Live network map, referrals, cadences, relationship signals", tier: "PRO" },
  ];

  return (
    <div className="space-y-6">
      <Eyebrow>Step 1 of 8</Eyebrow>
      <h1 className="text-3xl font-bold tracking-tight">Welcome to AURA Connect</h1>
      <p className="text-muted-foreground leading-relaxed max-w-lg">
        Your AI-powered business development platform. This setup takes 90 seconds — and at the end you'll see exactly what's free vs. what unlocks with Pro.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
        {features.map(({ icon: Icon, name, desc, tier }) => (
          <div key={name} className="p-4 rounded-xl bg-card border border-border space-y-2">
            <div className="flex items-center justify-between">
              <Icon className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={
                  tier === "FREE"
                    ? { background: "hsl(140 12% 42% / 0.12)", color: "hsl(140 12% 58%)" }
                    : { background: "hsl(38 92% 50% / 0.12)", color: "hsl(38 80% 55%)" }
                }
              >
                {tier}
              </span>
            </div>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 2: Your Info ── */
function InfoStep({
  firstName, setFirstName, lastName, setLastName,
  agencyName, setAgencyName, userRole, setUserRole,
  monthlyTarget, setMonthlyTarget,
}: {
  firstName: string; setFirstName: (v: string) => void;
  lastName: string; setLastName: (v: string) => void;
  agencyName: string; setAgencyName: (v: string) => void;
  userRole: string; setUserRole: (v: string) => void;
  monthlyTarget: string; setMonthlyTarget: (v: string) => void;
}) {
  return (
    <div className="space-y-6 max-w-md">
      <Eyebrow>Step 2 of 8 · Required</Eyebrow>
      <h2 className="text-2xl font-bold tracking-tight">Tell us about yourself</h2>
      <p className="text-sm text-muted-foreground">
        This personalizes your dashboard, Clark's coaching, and your lead targeting.
      </p>
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">First Name *</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Name *</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Agency / Company Name</label>
          <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Acme Insurance Group" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Role</label>
          <Input value={userRole} onChange={(e) => setUserRole(e.target.value)} placeholder="e.g. Producer, Agency Owner, Sales Director" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Monthly Revenue Target <span className="text-muted-foreground/60">(optional — helps Clark coach you)</span>
          </label>
          <Input value={monthlyTarget} onChange={(e) => setMonthlyTarget(e.target.value)} placeholder="e.g. $25,000" />
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Industry ── */
function IndustryStep({
  selectedVertical, setSelectedVertical,
  selectedSubVerticals, setSelectedSubVerticals,
  verticalSearch, setVerticalSearch,
  showRequestInput, setShowRequestInput,
  industryRequest, setIndustryRequest,
  requestSubmitted, onSubmitRequest,
}: {
  selectedVertical: string; setSelectedVertical: (v: string) => void;
  selectedSubVerticals: string[]; setSelectedSubVerticals: React.Dispatch<React.SetStateAction<string[]>>;
  verticalSearch: string; setVerticalSearch: (v: string) => void;
  showRequestInput: boolean; setShowRequestInput: (v: boolean) => void;
  industryRequest: string; setIndustryRequest: (v: string) => void;
  requestSubmitted: boolean; onSubmitRequest: () => void;
}) {
  const verticalConfig = CONNECT_VERTICALS.find(v => v.id === selectedVertical);
  const [industryExpanded, setIndustryExpanded] = useState(!selectedVertical);

  const filtered = CONNECT_VERTICALS.filter(
    (v) =>
      v.label.toLowerCase().includes(verticalSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(verticalSearch.toLowerCase())
  );

  const toggleSub = (id: string) =>
    setSelectedSubVerticals((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const handleSelectVertical = (id: string) => {
    setSelectedVertical(id);
    setVerticalSearch("");
    const config = CONNECT_VERTICALS.find(v => v.id === id);
    if (config) {
      setSelectedSubVerticals(config.subVerticals.slice(0, 2).map((sv) => sv.id));
    }
    setIndustryExpanded(false);
    setShowRequestInput(false);
  };

  return (
    <div className="space-y-5">
      <Eyebrow>Step 3 of 8 · Required</Eyebrow>
      <h2 className="text-2xl font-bold tracking-tight">Your Industry <span className="text-destructive">*</span></h2>
      <p className="text-sm text-muted-foreground">
        Select the vertical you operate in. This personalizes your leads, pipeline, and AI insights.
      </p>

      {/* Collapsed summary */}
      {selectedVertical && !industryExpanded ? (
        <button
          onClick={() => setIndustryExpanded(true)}
          className="w-full max-w-md p-3 rounded-xl border flex items-center justify-between text-left transition-all"
          style={{ borderColor: "hsl(140 12% 42%)", background: "hsl(140 12% 42% / 0.08)" }}
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
            <span className="text-sm font-medium">{verticalConfig?.label}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Change ›</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={verticalSearch}
              onChange={(e) => setVerticalSearch(e.target.value)}
              placeholder="Search verticals…"
              className="pl-9 h-10 bg-muted/30 border-border"
            />
          </div>

          {/* 2-column pill grid */}
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {filtered.map((v) => (
              <button
                key={v.id}
                onClick={() => handleSelectVertical(v.id)}
                className="p-3 rounded-xl border transition-all text-left"
                style={
                  selectedVertical === v.id
                    ? { borderColor: "hsl(140 12% 42%)", background: "hsl(140 12% 42% / 0.08)" }
                    : {}
                }
              >
                <div className="flex items-center gap-2">
                  {selectedVertical === v.id && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />}
                  <span className="text-[13px] font-medium">{v.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{v.description}</p>
              </button>
            ))}
          </div>

          {selectedVertical && (
            <button onClick={() => setIndustryExpanded(false)} className="text-xs font-medium hover:underline" style={{ color: "hsl(140 12% 58%)" }}>
              Done — continue to specializations ↓
            </button>
          )}
        </div>
      )}

      {/* Request another industry */}
      {!requestSubmitted ? (
        <div className="max-w-md space-y-2">
          {!showRequestInput ? (
            <button onClick={() => setShowRequestInput(true)} className="text-xs font-medium hover:underline" style={{ color: "hsl(140 12% 58%)" }}>
              Don't see your industry? Request it →
            </button>
          ) : (
            <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
              <p className="text-xs text-muted-foreground font-medium text-left">What industry are you in?</p>
              <Input value={industryRequest} onChange={(e) => setIndustryRequest(e.target.value)} placeholder="e.g. Marine Insurance, Cannabis, etc." className="h-9 bg-background border-border text-sm" />
              <Button onClick={onSubmitRequest} disabled={!industryRequest.trim()} size="sm" className="w-full text-white border-0" style={{ background: "hsl(140 12% 42%)" }}>
                Submit Request
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-md p-4 rounded-xl" style={{ border: "1px solid hsl(140 12% 42% / 0.3)", background: "hsl(140 12% 42% / 0.05)" }}>
          <CheckCircle className="h-5 w-5 mx-auto mb-2" style={{ color: "hsl(140 12% 58%)" }} />
          <p className="text-sm font-medium text-center">We hear you!</p>
          <p className="text-xs text-muted-foreground mt-1 text-center">We'll work to build your vertical ASAP and notify you via email once it's ready.</p>
        </div>
      )}

      {/* Sub-verticals — 3 columns */}
      {verticalConfig && verticalConfig.subVerticals.length > 0 && (
        <div className="text-left max-w-lg space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Specializations <span className="ml-2 text-foreground">{selectedSubVerticals.length}/{verticalConfig.subVerticals.length}</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5 max-h-52 overflow-y-auto">
            {verticalConfig.subVerticals.map((sv) => (
              <button
                key={sv.id}
                onClick={() => toggleSub(sv.id)}
                className="rounded-lg border p-2 text-[11px] font-medium transition-all text-left"
                style={
                  selectedSubVerticals.includes(sv.id)
                    ? { borderColor: "hsl(140 12% 42%)", background: "hsl(140 12% 42% / 0.1)", color: "var(--foreground)" }
                    : {}
                }
              >
                {sv.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">{selectedSubVerticals.length} selected — these focus your lead targeting</p>
        </div>
      )}
    </div>
  );
}

/* ── Step 4: Territory ── */
function StatesStep({ selectedStates, setSelectedStates }: {
  selectedStates: string[];
  setSelectedStates: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const toggleAll = () => {
    selectedStates.length === ALL_US_STATES.length ? setSelectedStates([]) : setSelectedStates([...ALL_US_STATES]);
  };
  const toggle = (st: string) =>
    setSelectedStates((prev) => prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]);

  return (
    <div className="space-y-5">
      <Eyebrow>Step 4 of 8 · Required</Eyebrow>
      <h2 className="text-2xl font-bold tracking-tight">Territory <span className="text-destructive">*</span></h2>
      <p className="text-sm text-muted-foreground max-w-md">Select the states where you do business. This sets your default lead targeting territory.</p>

      <div className="max-w-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{selectedStates.length} state{selectedStates.length !== 1 ? "s" : ""} selected</span>
          <button onClick={toggleAll} className="text-xs font-medium hover:underline" style={{ color: "hsl(140 12% 58%)" }}>
            {selectedStates.length === ALL_US_STATES.length ? "Deselect All" : "Select All 50"}
          </button>
        </div>
        <div className="grid grid-cols-10 gap-1.5">
          {ALL_US_STATES.map((st) => (
            <button
              key={st}
              onClick={() => toggle(st)}
              className="rounded-lg border px-1 py-1.5 text-[11px] font-medium transition-all"
              style={
                selectedStates.includes(st)
                  ? { borderColor: "hsl(140 12% 42%)", background: "hsl(140 12% 42% / 0.12)" }
                  : {}
              }
            >
              {st}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 5: Appearance ── */
function ThemeStep({ theme, onThemeChange }: { theme: string; onThemeChange: (dark: boolean) => void }) {
  return (
    <div className="space-y-6 max-w-md">
      <Eyebrow>Step 5 of 8</Eyebrow>
      <h2 className="text-2xl font-bold tracking-tight">Choose Your Look</h2>
      <p className="text-sm text-muted-foreground">Pick a theme. You can change this anytime in settings.</p>

      <div className="flex gap-4 pt-2">
        {/* Dark card */}
        <button
          onClick={() => onThemeChange(true)}
          className="flex-1 p-4 rounded-xl transition-all text-center"
          style={{
            border: theme === "dark" ? "2px solid hsl(140 12% 42%)" : "2px solid transparent",
            background: theme === "dark" ? "hsl(140 12% 42% / 0.05)" : "transparent",
            borderColor: theme === "dark" ? "hsl(140 12% 42%)" : "hsl(var(--border))",
          }}
        >
          <div className="w-full h-16 rounded-lg mb-3 flex items-center justify-center" style={{ background: "hsl(240 8% 8%)" }}>
            <div className="w-3/4 h-8 rounded" style={{ background: "hsl(240 6% 15%)" }} />
          </div>
          <Moon className="h-5 w-5 mx-auto mb-1 text-foreground" />
          <span className="text-sm font-medium block">Dark</span>
          <p className="text-[10px] text-muted-foreground mt-1">Easy on the eyes</p>
        </button>
        {/* Light card */}
        <button
          onClick={() => onThemeChange(false)}
          className="flex-1 p-4 rounded-xl transition-all text-center"
          style={{
            border: theme === "light" ? "2px solid hsl(140 12% 42%)" : "2px solid transparent",
            background: theme === "light" ? "hsl(140 12% 42% / 0.05)" : "transparent",
            borderColor: theme === "light" ? "hsl(140 12% 42%)" : "hsl(var(--border))",
          }}
        >
          <div className="w-full h-16 rounded-lg mb-3 flex items-center justify-center" style={{ background: "#f8f8f7" }}>
            <div className="w-3/4 h-8 rounded" style={{ background: "#e4e4e3" }} />
          </div>
          <Sun className="h-5 w-5 mx-auto mb-1 text-foreground" />
          <span className="text-sm font-medium block">Light</span>
          <p className="text-[10px] text-muted-foreground mt-1">Clean & bright</p>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/30 border border-border">
        <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
        Most AURA users prefer Dark Mode — reduces eye strain during long prospecting sessions.
      </div>
    </div>
  );
}

/* ── Step 6: Platform Tour ── */
function TourStep({ selectedVertical }: { selectedVertical: string }) {
  const verticalLabel = CONNECT_VERTICALS.find(v => v.id === selectedVertical)?.label || "contractors";

  const freeFeatures = [
    "AI Lead Engine (scans 70+ databases)",
    "Sales Pipeline & Deal Tracking",
    "Clark AI — 10 queries/day",
    "AURA Score & Lead Enrichment",
    "Network & Contact Management",
  ];

  const clarkMessages = [
    { role: "user", text: `What's the best way to approach a ${verticalLabel} prospect?` },
    { role: "assistant", text: `Great question! For ${verticalLabel}, I'd recommend leading with risk — mention industry-specific exposures they might not realize they have. Open with a question like "How are you currently handling [specific risk]?" to start a consultative conversation.` },
    { role: "assistant", text: "Want me to draft an outreach email for this vertical?" },
  ];

  return (
    <div className="space-y-6">
      <Eyebrow>Step 6 of 8 · Platform Tour</Eyebrow>
      <h2 className="text-2xl font-bold tracking-tight">Here's what's waiting inside</h2>
      <p className="text-sm text-muted-foreground">Before we talk pricing — a look at what you can use starting today, and a preview of Clark.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Free features */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Free with AURA</p>
          {freeFeatures.map((f) => (
            <div key={f} className="flex items-start gap-2">
              <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "hsl(140 12% 58%)" }} />
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>

        {/* Clark preview */}
        <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "hsl(240 8% 7%)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
            <span className="text-xs font-medium text-white/80">Clark Preview</span>
          </div>
          {clarkMessages.map((msg, i) => (
            <div
              key={i}
              className="rounded-lg px-3 py-2 text-[12px] leading-relaxed"
              style={
                msg.role === "user"
                  ? { background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 75%)", marginLeft: "auto", maxWidth: "85%", textAlign: "right" }
                  : { background: "hsl(240 6% 12%)", color: "hsl(240 5% 80%)", maxWidth: "90%" }
              }
            >
              {msg.text}
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg border text-sm" style={{ background: "hsl(140 12% 42% / 0.06)", borderColor: "hsl(140 12% 42% / 0.2)", color: "hsl(140 12% 65%)" }}>
        <strong>Coming next:</strong> See how Connect Pro unlocks unlimited Clark, email, Create Studio, and your full network.
      </div>
    </div>
  );
}

/* ── Step 7: Choose Plan ── */
function PlanStep({ saving, onSelect }: { saving: boolean; onSelect: (plan: "free" | "pro") => void }) {
  const freeFeatures = [
    { label: "Lead Engine (50 leads/mo)", included: true },
    { label: "Sales Pipeline", included: true },
    { label: "Clark AI (10 queries/day)", included: true },
    { label: "Network & Contacts", included: true },
    { label: "Email Intelligence", included: false },
    { label: "Create Studio", included: false },
    { label: "Calendar & Connect", included: false },
    { label: "Unlimited Clark", included: false },
  ];

  const proFeatures = [
    "Everything in Free",
    "Unlimited Lead Generation",
    "Unlimited Clark queries",
    "Email Intelligence & Sync",
    "Create Studio (AI graphics)",
    "Full Network Map",
    "Smart Calendar & Cadences",
    "Priority Support",
  ];

  return (
    <div className="space-y-6">
      <Eyebrow>Step 7 of 8 · Choose Your Plan</Eyebrow>
      <h2 className="text-2xl font-bold tracking-tight">Start free. Upgrade when you're ready.</h2>
      <p className="text-sm text-muted-foreground">No credit card required. Connect Pro unlocks the full platform — cancel anytime.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* FREE */}
        <div className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <p className="text-lg font-bold">FREE</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-sm text-muted-foreground">forever</span>
            </div>
          </div>
          <div className="space-y-2">
            {freeFeatures.map(({ label, included }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                {included ? (
                  <Check className="h-4 w-4 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
                <span className={included ? "" : "text-muted-foreground/50"}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PRO */}
        <div className="rounded-xl p-5 space-y-4 relative overflow-hidden" style={{ border: "1px solid hsl(140 12% 42%)" }}>
          {/* Ribbon */}
          <div
            className="absolute top-3 -right-8 px-8 py-0.5 text-[9px] font-bold text-white"
            style={{ background: "hsl(140 12% 42%)", transform: "rotate(35deg)", transformOrigin: "center" }}
          >
            RECOMMENDED
          </div>
          <div>
            <p className="text-lg font-bold">CONNECT PRO</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold">$99</span>
              <span className="text-sm text-muted-foreground">per month</span>
            </div>
          </div>
          <div className="space-y-2">
            {proFeatures.map((label) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button variant="ghost" className="h-11" onClick={() => onSelect("free")} disabled={saving}>
          Start with Free <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <Button
          className="h-11 text-white border-0"
          style={{ background: "hsl(140 12% 42%)" }}
          onClick={() => onSelect("pro")}
          disabled={saving}
        >
          {saving ? "Saving…" : "Start Pro — $99/mo"} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/* ── Step 8: All Set ── */
function ReadyStep({ firstName, saving, onComplete }: { firstName: string; saving: boolean; onComplete: () => void }) {
  const actions = [
    { icon: Target, label: "Generate Leads", desc: "Find your first prospects" },
    { icon: Brain, label: "Ask Clark", desc: "Get AI-powered strategy" },
    { icon: TrendingUp, label: "Build Pipeline", desc: "Track your deals" },
    { icon: Sparkles, label: "Create Content", desc: "Design branded materials" },
  ];

  return (
    <div className="space-y-6 text-center max-w-lg mx-auto">
      <Eyebrow>Step 8 of 8</Eyebrow>
      <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center mx-auto" style={{ background: "hsl(140 12% 42% / 0.15)", border: "2px solid hsl(140 12% 42%)" }}>
        <CheckCircle className="h-7 w-7" style={{ color: "hsl(140 12% 58%)" }} />
      </div>
      <h2 className="text-3xl font-bold tracking-tight">You're all set{firstName ? `, ${firstName}` : ""}!</h2>
      <p className="text-muted-foreground leading-relaxed">Your AURA Connect workspace is ready. Here's where to start:</p>

      <div className="grid grid-cols-2 gap-3 pt-2">
        {actions.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="p-4 rounded-xl bg-card border border-border text-center">
            <Icon className="h-5 w-5 mx-auto mb-1.5" style={{ color: "hsl(140 12% 58%)" }} />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-[10px] text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <Button
        onClick={onComplete}
        disabled={saving}
        className="w-full h-12 text-base text-white border-0 gap-2"
        style={{ background: "hsl(140 12% 42%)" }}
      >
        {saving ? "Saving…" : "Enter AURA Connect 🚀"}
      </Button>
    </div>
  );
}
