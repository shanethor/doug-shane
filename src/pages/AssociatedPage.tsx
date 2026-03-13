import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ClipboardList, UserCheck, Phone, Mail, ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import auraLogo from "@/assets/aura-logo.png";
import dougHeadshot from "@/assets/doug-wenz-headshot.png";
import associatedLogo from "@/assets/associated-logo.png";

const STEPS = [
  {
    num: "1",
    icon: Upload,
    title: "Upload your current insurance documents",
    desc: "Declarations pages, current policies, loss runs, endorsements, or anything else that helps us understand what you own.",
  },
  {
    num: "2",
    icon: ClipboardList,
    title: "We organize the information",
    desc: "We structure the details so your advisor can review the full picture without wasting your time.",
  },
  {
    num: "3",
    icon: UserCheck,
    title: "Review everything with your advisor",
    desc: "You walk through it with a real person who understands the risk.",
  },
];

export default function AssociatedPage() {
  const [creatingIntake, setCreatingIntake] = useState(false);

  const handleStartIntake = async () => {
    setCreatingIntake(true);
    try {
      const { data, error } = await supabase.functions.invoke("borrower-intake", {
        body: { slug: "associated" },
      });
      if (error || !data?.token) throw new Error(error?.message ?? "No token returned");
      window.location.href = `${window.location.origin}/intake/${data.token}`;
    } catch (e) {
      console.error("Failed to create intake link:", e);
      setCreatingIntake(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1D2430]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#1a2b4a]/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <img src={associatedLogo} alt="Associated Insurance Services" className="h-8" />
          <div className="flex items-center gap-2">
            <img src={auraLogo} alt="AURA Risk Group" className="h-6" />
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1a2b4a]/5 to-transparent">
        <div className="relative mx-auto max-w-2xl px-6 py-12 md:py-16 text-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl leading-snug text-[#1a2b4a]">
            Insurance Shouldn't Feel Like Doing Your Taxes
          </h1>
          <p className="mt-4 text-base text-[#1D2430]/70 max-w-lg mx-auto">
            At Associated, technology organizes the mess. Real people make the decisions.
          </p>
        </div>
      </section>

      {/* ── Advisor Block ── */}
      <section className="border-t border-[#1a2b4a]/10 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-14 md:py-18">
          <div className="mx-auto max-w-sm">
            <Card className="border-[#1a2b4a]/10 overflow-hidden shadow-lg shadow-[#1a2b4a]/5">
              <CardContent className="p-0">
                <div className="flex flex-col items-center p-8 text-center">
                  {/* Headshot */}
                  <div className="relative mb-5">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#1a2b4a]/20 to-[#00a8e8]/15 blur-sm" />
                    <img
                      src={dougHeadshot}
                      alt="Doug Wenz"
                      className="relative h-32 w-32 rounded-full object-cover shadow-lg"
                    />
                  </div>

                  <h2 className="text-xl font-bold text-[#1a2b4a]">Doug Wenz</h2>
                  <p className="mt-1 text-sm text-[#1D2430]/70">Vice President</p>
                  <p className="text-sm text-[#1D2430]/70">Associated Insurance Services</p>

                  <div className="mt-5 space-y-2 text-sm text-[#1D2430]/70">
                    <div className="flex items-center justify-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[#00a8e8]" />
                      <a href="tel:2039091659" className="hover:text-[#1a2b4a] transition-colors">203-909-1659</a>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[#00a8e8]" />
                      <a href="mailto:Dwenz@associatedct.com" className="hover:text-[#1a2b4a] transition-colors">Dwenz@associatedct.com</a>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="mt-7 w-full gap-2 rounded-full text-sm font-semibold bg-[#1a2b4a] hover:bg-[#1a2b4a]/90 text-white"
                    onClick={handleStartIntake}
                    disabled={creatingIntake}
                  >
                    {creatingIntake ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                    ) : (
                      <>Get Started <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-[#1a2b4a]/10 bg-[#F7F8FA]">
        <div className="mx-auto max-w-3xl px-6 py-14 md:py-18">
          <h2 className="text-center text-xl font-bold md:text-2xl mb-10 text-[#1a2b4a]">How It Works</h2>
          <div className="space-y-6">
            {STEPS.map((step) => (
              <Card key={step.num} className="border-[#1a2b4a]/10 bg-white transition-shadow hover:shadow-md">
                <CardContent className="flex gap-5 p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1a2b4a]/10 text-[#1a2b4a] font-bold text-lg">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-sm font-semibold md:text-base text-[#1a2b4a]">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#1D2430]/70">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1a2b4a]/10 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center space-y-4">
          <p className="text-sm font-bold text-[#1a2b4a]">Associated Insurance Services</p>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs border-[#1a2b4a]/20 hover:bg-[#1a2b4a]/5 hover:text-[#1a2b4a]"
              onClick={() => window.open("https://www.associatedct.com", "_blank")}
            >
              Visit Associated Insurance Services <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs border-[#1a2b4a]/20 hover:bg-[#1a2b4a]/5 hover:text-[#1a2b4a]"
              onClick={() => window.open("https://www.associatedct.com/contact", "_blank")}
            >
              Contact Associated <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-[10px] text-[#1D2430]/50 pt-2">
            Powered by <span className="font-semibold text-[#1a2b4a]">AURA</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
