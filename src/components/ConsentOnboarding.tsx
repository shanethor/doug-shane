import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Mail, Users, Target, ArrowRight, Loader2,
  Lock, CheckCircle, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { toast } from "sonner";

interface ConsentOnboardingProps {
  onComplete: () => void;
}

const LIFE_EVENT_TRIGGERS = [
  { id: "new_baby", label: "New Baby", emoji: "🍼" },
  { id: "marriage", label: "Marriage / Engagement", emoji: "💍" },
  { id: "home_purchase", label: "Home Purchase", emoji: "🏠" },
  { id: "job_change", label: "Job Change / Promotion", emoji: "💼" },
  { id: "retirement", label: "Retirement", emoji: "🏖️" },
  { id: "college_children", label: "College-Age Children", emoji: "🎓" },
  { id: "business_ownership", label: "Business Ownership", emoji: "🏢" },
];

export default function ConsentOnboarding({ onComplete }: ConsentOnboardingProps) {
  const [step, setStep] = useState(1);
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [connectingEmail, setConnectingEmail] = useState(false);
  const [socialUrls, setSocialUrls] = useState({ linkedin: "", facebook: "", instagram: "" });
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(["new_baby", "marriage", "home_purchase", "job_change"]);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [demoClientName, setDemoClientName] = useState("");

  // Step 1: Data Sharing Agreement
  async function acceptConsent() {
    setAccepting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert consent records
      await supabase.from("user_consent_records" as any).insert([
        {
          user_id: user.id,
          consent_type: "data_sharing_agreement",
          consent_version: "1.0",
          accepted: true,
          user_agent: navigator.userAgent,
        },
        {
          user_id: user.id,
          consent_type: "social_enrichment",
          consent_version: "1.0",
          accepted: true,
          user_agent: navigator.userAgent,
        },
      ] as any);

      setStep(2);
    } catch (err) {
      toast.error("Failed to save consent");
    } finally {
      setAccepting(false);
    }
  }

  // Step 2: Connect Email
  async function connectEmail(provider: "gmail" | "outlook") {
    setConnectingEmail(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "get_auth_url",
          provider,
          redirect_uri: `${window.location.origin}/email-callback`,
        }),
      });
      const data = await resp.json();
      if (data.url) {
        // Save consent for email access
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("user_consent_records" as any).insert({
            user_id: user.id,
            consent_type: "email_access",
            consent_version: "1.0",
            accepted: true,
            user_agent: navigator.userAgent,
          } as any);
        }
        sessionStorage.setItem("email_connect_return", window.location.pathname);
        sessionStorage.setItem("consent_onboard_step", "3");
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to start OAuth");
    } finally {
      setConnectingEmail(false);
    }
  }

  // Step 3: Social profiles
  async function saveSocialProfiles() {
    setStep(4);
  }

  // Step 4: Set ideal prospect
  async function saveProspectProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("prospect_profiles" as any).insert({
        name: "Default",
        producer_id: user.id,
        life_event_triggers: selectedTriggers,
        location_radius_miles: 50,
        exclude_existing_contacts: true,
        connection_depth: 2,
        is_default: true,
      } as any);
      setStep(5);
    } catch {
      toast.error("Failed to save profile");
    }
  }

  // Step 5: Try it
  async function generateDemo() {
    if (!demoClientName.trim()) { toast.error("Enter a client name"); return; }
    setGeneratingDemo(true);
    try {
      const headers = await getAuthHeaders();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-feeder-list`, {
        method: "POST",
        headers,
        body: JSON.stringify({ client_name: demoClientName }),
      });
      toast.success("Sample feeder list generated!");
      onComplete();
    } catch {
      toast.error("Generation failed");
    } finally {
      setGeneratingDemo(false);
    }
  }

  // Check if returning from OAuth
  useEffect(() => {
    const savedStep = sessionStorage.getItem("consent_onboard_step");
    if (savedStep) {
      setStep(parseInt(savedStep));
      sessionStorage.removeItem("consent_onboard_step");
    }
  }, []);

  const totalSteps = 5;
  const stepLabels = ["Agreement", "Email", "Social", "Prospect", "Try It"];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Progress */}
      <div className="flex items-center justify-center gap-1 mb-8">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              i + 1 <= step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {i + 1 < step ? <CheckCircle className="h-3 w-3" /> : <span className="w-3 text-center">{i + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < totalSteps - 1 && <div className={`w-6 h-0.5 mx-1 ${i + 1 < step ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Consent */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Data Intelligence Agreement</h2>
            </div>

            <p className="text-sm text-muted-foreground">
              AuRa Connect uses data you provide and connect to power intelligent features like the Feeder List Generator, Prospect Discovery, and Email Intelligence.
            </p>

            <div className="space-y-3 text-sm">
              {[
                { icon: "✓", title: "YOUR DATA IS NEVER SOLD", desc: "We do not sell, license, or share your data with third parties for their marketing or advertising purposes." },
                { icon: "✓", title: "DATA POWERS YOUR TOOLS", desc: "We use the data you provide exclusively to operate Connect Intelligence features within your account." },
                { icon: "✓", title: "THIRD-PARTY ENRICHMENT", desc: "We send limited data (names, email addresses, LinkedIn URLs) to trusted enrichment providers to build prospect profiles." },
                { icon: "✓", title: "EMAIL ACCESS IS READ-ONLY", desc: "We only read message headers (sender names and email addresses). We never read email body content." },
                { icon: "✓", title: "YOU CAN REVOKE ANYTIME", desc: "You can disconnect your email, delete discovered contacts, or close your account at any time." },
                { icon: "✓", title: "DATA IS ENCRYPTED", desc: "All data is encrypted in transit (TLS) and at rest. OAuth tokens are encrypted and never stored in plaintext." },
              ].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-green-500 shrink-0">{item.icon}</span>
                  <div>
                    <span className="font-semibold">{item.title}.</span>{" "}
                    <span className="text-muted-foreground">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={consent1} onCheckedChange={(v) => setConsent1(!!v)} className="mt-0.5" />
                <span className="text-sm">I acknowledge that AuRa will use data I provide and connect to power Connect Intelligence features. I understand my data will not be sold and I can revoke access at any time.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={consent2} onCheckedChange={(v) => setConsent2(!!v)} className="mt-0.5" />
                <span className="text-sm">I consent to AuRa sending limited contact data to third-party enrichment providers for the purpose of building prospect profiles within my account.</span>
              </label>
            </div>

            <Button className="w-full" disabled={!consent1 || !consent2 || accepting} onClick={acceptConsent}>
              {accepting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
              Accept & Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Email */}
      {step === 2 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Connect Your Email</h2>
            </div>
            <p className="text-sm text-muted-foreground">Connect your email to automatically discover new contacts and referral opportunities. We only read sender names and email addresses — never email content.</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="h-14 justify-start gap-3" onClick={() => connectEmail("gmail")} disabled={connectingEmail}>
                <div className="h-8 w-8 rounded bg-red-50 flex items-center justify-center text-red-500 text-lg font-bold">G</div>
                <div className="text-left"><p className="font-medium">Google</p><p className="text-xs text-muted-foreground">Gmail, Contacts, Calendar</p></div>
              </Button>
              <Button variant="outline" className="h-14 justify-start gap-3" onClick={() => connectEmail("outlook")} disabled={connectingEmail}>
                <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center text-blue-500 text-lg font-bold">M</div>
                <div className="text-left"><p className="font-medium">Microsoft</p><p className="text-xs text-muted-foreground">Outlook, Contacts, Calendar</p></div>
              </Button>
            </div>

            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(3)}>
              Skip for now — I'll connect later
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Social Profiles */}
      {step === 3 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Your Social Profiles</h2>
            </div>
            <p className="text-sm text-muted-foreground">Add your social profiles so we can cross-reference your network with clients.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">LinkedIn Profile URL</label>
                <Input placeholder="https://linkedin.com/in/yourname" value={socialUrls.linkedin} onChange={(e) => setSocialUrls(p => ({ ...p, linkedin: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Facebook Profile URL</label>
                <Input placeholder="https://facebook.com/yourname" value={socialUrls.facebook} onChange={(e) => setSocialUrls(p => ({ ...p, facebook: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Instagram Handle</label>
                <Input placeholder="@yourhandle" value={socialUrls.instagram} onChange={(e) => setSocialUrls(p => ({ ...p, instagram: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={saveSocialProfiles}>
                <ArrowRight className="h-4 w-4 mr-2" /> Continue
              </Button>
              <Button variant="ghost" onClick={() => setStep(4)}>Skip</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Ideal Prospect */}
      {step === 4 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Set Your Ideal Prospect</h2>
            </div>
            <p className="text-sm text-muted-foreground">Tell us what life events and industries matter most for your prospecting.</p>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Life Event Triggers (select all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {LIFE_EVENT_TRIGGERS.map(trigger => (
                  <Button
                    key={trigger.id}
                    variant={selectedTriggers.includes(trigger.id) ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedTriggers(prev => prev.includes(trigger.id) ? prev.filter(t => t !== trigger.id) : [...prev, trigger.id])}
                  >
                    {trigger.emoji} {trigger.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={saveProspectProfile}>
              <Sparkles className="h-4 w-4 mr-2" /> Save & Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Try It */}
      {step === 5 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Try It — Generate Your First Feeder List</h2>
            </div>
            <p className="text-sm text-muted-foreground">Pick one client and see the magic. Enter their name and we'll generate a referral list.</p>

            <Input
              placeholder="Enter a client name (e.g. Doug Wenz)"
              value={demoClientName}
              onChange={(e) => setDemoClientName(e.target.value)}
            />

            <div className="flex gap-2">
              <Button className="flex-1" onClick={generateDemo} disabled={generatingDemo}>
                {generatingDemo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Feeder List
              </Button>
              <Button variant="ghost" onClick={onComplete}>Skip & Finish</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
