import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Search, CheckCircle, MessageSquare, ArrowRight, Loader2, ExternalLink, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import omitLogo from "@/assets/omit-logo.png";

const STEPS = [
  {
    num: "01",
    icon: Upload,
    title: "Upload what you already have",
    desc: "Current declarations pages, prior policies, mortgage documents, property information, or anything else you have.",
  },
  {
    num: "02",
    icon: Search,
    title: "AURA pulls and pre-fills the details",
    desc: "We source and organize the information so you do not have to start from zero.",
  },
  {
    num: "03",
    icon: CheckCircle,
    title: "Confirm what we found",
    desc: "You review the information and make sure everything is accurate.",
  },
  {
    num: "04",
    icon: MessageSquare,
    title: "Talk with an AURA advisor",
    desc: "Once confirmed, your file goes directly to an AURA representative who will contact you to review options.",
  },
];

export default function OmitPage() {
  const [creatingIntake, setCreatingIntake] = useState(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const handleStartIntake = async () => {
    setCreatingIntake(true);
    try {
      const { data, error } = await supabase.functions.invoke("borrower-intake", {
        body: { slug: "omit" },
      });
      if (error || !data?.token) throw new Error(error?.message ?? "No token returned");
      window.location.href = `${window.location.origin}/intake/${data.token}`;
    } catch (e) {
      console.error("Failed to create intake link:", e);
      setCreatingIntake(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white dark:bg-black dark:text-white" data-theme="light" style={{ colorScheme: "dark" }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80 dark:bg-black/95 dark:supports-[backdrop-filter]:bg-black/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <img src={omitLogo} alt="OMiT" className="h-7 brightness-0 invert" />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-white">AURA</span>
            <span className="text-[10px] text-white/40 tracking-widest uppercase">Risk Group</span>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-24 text-center">
          <div className="space-y-5 text-lg md:text-xl leading-relaxed text-white/80 max-w-2xl mx-auto">
            <p className="text-white font-semibold text-xl md:text-2xl">
              For decades insurance marketing has looked the same.
            </p>
            <div className="space-y-1 text-white/50 text-base md:text-lg">
              <p>A gecko.</p>
              <p>A guy in khakis.</p>
              <p>And a dude who literally causes mayhem.</p>
            </div>
            <p className="text-white/30 font-bold uppercase tracking-widest text-sm">Boring.</p>
            <p className="text-white/70 text-base md:text-lg">
              So in OMiT fashion, we skipped the mascots and partnered with people who actually get insurance.
            </p>
            <p className="text-white/70 text-base md:text-lg">
              AURA Risk Group is now our official partner.
            </p>
            <p className="text-white/40 text-sm">Sorry Flo.</p>
          </div>

          <div className="mt-10 mb-3">
            <p className="text-white/30 text-xs font-bold uppercase tracking-[0.25em]">The game changed.</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold tracking-tight">
            Insurance runs on <span className="text-white">AURA</span>.
          </p>
        </div>
      </section>

      {/* ── Upload / Apply CTA ── */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-2xl px-6 py-14 md:py-20 text-center">
          <div className="mx-auto max-w-md">
            <FileUp className="mx-auto mb-4 h-10 w-10 text-white/60" />
            <h2 className="text-xl md:text-2xl font-bold mb-3">Upload Your Documents</h2>
            <p className="text-sm text-white/40 mb-8">
              Personal or business insurance. AURA will handle the rest.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="gap-2 rounded-none text-sm font-bold uppercase tracking-wider bg-white text-black hover:bg-white/90 px-8"
                onClick={handleStartIntake}
                disabled={creatingIntake}
              >
                {creatingIntake ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  <>Upload & Apply <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-none text-sm font-bold uppercase tracking-wider border-white/30 text-white hover:bg-white/10 hover:text-white px-8 bg-white/5"
                onClick={handleStartIntake}
                disabled={creatingIntake}
              >
                {creatingIntake ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  <>Apply Without Documents <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section ref={howItWorksRef} className="border-t border-white/10 bg-white/[0.02] dark:bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/30 mb-3">How It Works</p>
            <h2 className="text-xl md:text-2xl font-bold">Insurance Made Easy</h2>
          </div>

          <div className="space-y-4">
            {STEPS.map((step) => (
              <Card key={step.num} className="border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors rounded-none dark:border-white/10 dark:bg-white/[0.03]">
                <CardContent className="flex gap-5 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/20 text-white font-mono font-bold text-sm">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white md:text-base">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/50">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <img src={omitLogo} alt="OMiT" className="h-5 brightness-0 invert" />
            <span className="text-white/20">×</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-white">AURA</span>
              <span className="text-[9px] text-white/40 tracking-widest uppercase">Risk Group</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-none text-xs uppercase tracking-wider border-white/30 text-white bg-white/5 hover:bg-white/15 hover:text-white"
            onClick={() => window.open("https://www.omit.gg/", "_blank")}
          >
            Visit OMiT <ExternalLink className="h-3 w-3" />
          </Button>
          <p className="text-[10px] text-white/30 pt-2">
            Insurance runs on <span className="font-bold text-white/60">AURA</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
