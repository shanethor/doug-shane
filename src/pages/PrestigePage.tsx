import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, ClipboardList, UserCheck, Phone, ExternalLink, Loader2, ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import dougHeadshot from "@/assets/doug-wenz-headshot.png";
import { toast } from "sonner";

const SLUG = "prestige";

const STEPS = [
  { num: "1", icon: Upload, title: "Upload your current insurance documents", desc: "Declarations pages, current policies, loss runs — anything relevant." },
  { num: "2", icon: ClipboardList, title: "We organize the information", desc: "We structure everything so your advisor can review the full picture." },
  { num: "3", icon: UserCheck, title: "Review with your advisor", desc: "Walk through it with a real person who understands your risk." },
];

export default function PrestigePage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", coverage: "" });

  const handleStart = async () => {
    if (!form.firstName || !form.email) {
      toast.error("Please enter at least your first name and email.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("borrower-intake", { body: { slug: SLUG } });
      if (error || !data?.token) throw new Error("Failed to create intake link");
      window.location.href = `/intake/${data.token}`;
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white" data-theme="dark">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4 max-w-5xl mx-auto">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-base font-bold tracking-tight">
            Prestige Abatement & Construction
            <span className="text-yellow-400 mx-1">×</span>
            <span className="text-sm font-medium opacity-80">AURA Risk Group</span>
          </div>
          <a href="https://prestigeabatementandconstruction.com" target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 hover:text-white/80 inline-flex items-center gap-1 mt-1 sm:mt-0">
            Visit Prestige <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-6 pt-14 pb-10">
        <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4">
          Insurance review for <span className="text-yellow-400">Prestige</span> clients
        </h1>
        <p className="text-white/60 text-base max-w-xl mx-auto">
          Environmental remediation work carries unique risks. Let us make sure your coverage keeps up.
        </p>
      </section>

      {/* Trust + Speed section */}
      <section className="max-w-3xl mx-auto px-6 pb-10">
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-sm text-white/70">
                Prestige trusts AURA Risk Group to handle their clients' insurance needs because we specialize in
                high-risk industries like abatement, remediation, and construction. We understand the exposures your
                work creates — and we build coverage around them.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-sm text-white/70">
                Our intake process takes <span className="text-white font-semibold">5 minutes or less</span>. We use
                smart document processing to gather and organize your information instantly — no back-and-forth emails,
                no paperwork delays.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-sm text-white/70">
                All data is encrypted and handled securely. Your information is only shared with your assigned advisor.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Steps */}
      <section className="max-w-3xl mx-auto px-6 pb-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <Card key={s.num} className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-5">
              <s.icon className="w-6 h-6 text-yellow-400 mb-3" />
              <p className="font-semibold text-sm mb-1">{s.title}</p>
              <p className="text-xs text-white/50">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Quick Info + CTA */}
      <section className="max-w-md mx-auto px-6 pb-16">
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6 space-y-5">
            <div className="text-center">
              <img src={dougHeadshot} alt="Doug Wenz" className="w-14 h-14 rounded-full mx-auto object-cover border-2 border-yellow-400/40 mb-2" />
              <p className="font-semibold text-sm">Doug Wenz</p>
              <p className="text-xs text-white/50">Your Advisor at AURA Risk Group</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-white/60 mb-1 block">First Name *</Label>
                <Input value={form.firstName} onChange={update("firstName")} placeholder="John" className="bg-white/10 border-white/15 text-white placeholder:text-white/30 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-white/60 mb-1 block">Last Name</Label>
                <Input value={form.lastName} onChange={update("lastName")} placeholder="Doe" className="bg-white/10 border-white/15 text-white placeholder:text-white/30 h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-white/60 mb-1 block">Email *</Label>
              <Input type="email" value={form.email} onChange={update("email")} placeholder="john@example.com" className="bg-white/10 border-white/15 text-white placeholder:text-white/30 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-white/60 mb-1 block">Phone</Label>
              <Input type="tel" value={form.phone} onChange={update("phone")} placeholder="(555) 555-5555" className="bg-white/10 border-white/15 text-white placeholder:text-white/30 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-white/60 mb-1 block">Coverage Needed</Label>
              <Textarea value={form.coverage} onChange={update("coverage")} placeholder="GL, Workers Comp, Auto, etc." rows={2} className="bg-white/10 border-white/15 text-white placeholder:text-white/30 text-sm min-h-0" />
            </div>

            <Button onClick={handleStart} disabled={loading} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
              {loading ? "Creating link…" : "Start Your Review"}
            </Button>
            <a href="https://prestigeabatementandconstruction.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 w-full justify-center">
              <Phone className="w-3 h-3" /> Contact Prestige directly
            </a>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/30">
        © {new Date().getFullYear()} AURA Risk Group — Partner referral page
      </footer>
    </div>
  );
}
