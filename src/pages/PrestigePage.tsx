import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ClipboardList, UserCheck, Phone, ExternalLink, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import dougHeadshot from "@/assets/doug-wenz-headshot.png";

const SLUG = "prestige";

const STEPS = [
  { num: "1", icon: Upload, title: "Upload your current insurance documents", desc: "Declarations pages, current policies, loss runs — anything relevant." },
  { num: "2", icon: ClipboardList, title: "We organize the information", desc: "We structure everything so your advisor can review the full picture." },
  { num: "3", icon: UserCheck, title: "Review with your advisor", desc: "Walk through it with a real person who understands your risk." },
];

export default function PrestigePage() {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("borrower-intake", { body: { slug: SLUG } });
      if (error || !data?.token) throw new Error("Failed to create intake link");
      window.location.href = `/intake/${data.token}`;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white" data-theme="dark">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-lg font-bold tracking-tight">
          Prestige Abatement & Construction
          <span className="text-yellow-400 ml-1">×</span>
          <span className="text-sm font-medium ml-1 opacity-80">AURA Risk Group</span>
        </span>
        <a href="https://prestigeabatementandconstruction.com" target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1">
          prestigeabatementandconstruction.com <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-12">
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
          Insurance review for <span className="text-yellow-400">Prestige</span> clients
        </h1>
        <p className="text-white/60 text-lg max-w-xl mx-auto">
          Environmental remediation work carries unique risks. Let us make sure your coverage keeps up.
        </p>
      </section>

      {/* Steps */}
      <section className="max-w-3xl mx-auto px-6 pb-12 grid gap-4 md:grid-cols-3">
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

      {/* CTA + Advisor */}
      <section className="max-w-md mx-auto px-6 pb-16">
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6 text-center space-y-4">
            <img src={dougHeadshot} alt="Doug Wenz" className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-yellow-400/40" />
            <div>
              <p className="font-semibold">Doug Wenz</p>
              <p className="text-xs text-white/50">Your Advisor at AURA Risk Group</p>
            </div>
            <Button onClick={handleStart} disabled={loading} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
              {loading ? "Creating link…" : "Start Your Review"}
            </Button>
            <a href="https://prestigeabatementandconstruction.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70">
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
