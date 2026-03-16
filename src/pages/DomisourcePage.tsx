import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ClipboardList, UserCheck, MessageSquare, ArrowRight, Loader2, ExternalLink, Home, Shield, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STEPS = [
  {
    num: "1",
    icon: Upload,
    title: "Upload the documents you already have",
    desc: "Current declarations pages, prior policies, mortgage documents, property information, or anything else you've got.",
  },
  {
    num: "2",
    icon: ClipboardList,
    title: "Information is organized and reviewed",
    desc: "Technology handles the details so you don't have to start from scratch or fill out long forms.",
  },
  {
    num: "3",
    icon: UserCheck,
    title: "Insurance options are structured around your home",
    desc: "Coverage is matched to the property, the loan requirements, and the real risks involved.",
  },
  {
    num: "4",
    icon: MessageSquare,
    title: "Talk with an advisor",
    desc: "An experienced advisor guides the decisions. Technology organizes information — people still guide the choices.",
  },
];

const WHY_ITEMS = [
  { icon: FileText, text: "Faster insurance quotes" },
  { icon: Home, text: "Less paperwork during a move" },
  { icon: Shield, text: "Coverage that matches your home" },
  { icon: UserCheck, text: "Real people guide the decisions" },
];

export default function DomisourcePage() {
  const [creatingIntake, setCreatingIntake] = useState(false);

  const handleStartIntake = async () => {
    setCreatingIntake(true);
    try {
      const { data, error } = await supabase.functions.invoke("borrower-intake", {
        body: { slug: "domisource" },
      });
      if (error || !data?.token) throw new Error(error?.message ?? "No token returned");
      window.location.href = `${window.location.origin}/intake/${data.token}`;
    } catch (e) {
      console.error("Failed to create intake link:", e);
      setCreatingIntake(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] text-[#2D2D2D]" data-theme="light">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#F57C20]/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F57C20]">
              <Home className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#2D2D2D]">DomiSource</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#2D2D2D]/40 tracking-widest uppercase">Powered by</span>
            <span className="text-sm font-bold tracking-tight text-[#2D2D2D]/60">AURA</span>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F57C20]/5 to-transparent" />
        <div className="relative mx-auto max-w-2xl px-6 py-14 md:py-20 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F57C20]/10">
            <Home className="h-8 w-8 text-[#F57C20]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl leading-snug text-[#2D2D2D]">
            Insurance, the Way It Should Work<br className="hidden sm:block" />
            <span className="text-[#F57C20]"> When You Move</span>
          </h1>
          <p className="mt-5 text-base text-[#2D2D2D]/70 max-w-lg mx-auto leading-relaxed">
            Moving creates a lot of decisions. Utilities. Contractors. Internet. Insurance usually ends up at the bottom of the list until the closing date is next week.
          </p>
          <p className="mt-3 text-base font-medium text-[#2D2D2D]/80 max-w-lg mx-auto">
            DomiSource and AURA make insurance part of the organized home journey — not another last-minute task.
          </p>
          <Button
            size="lg"
            className="mt-8 gap-2 rounded-full px-10 text-sm font-semibold bg-[#F57C20] hover:bg-[#E06A10] text-white shadow-lg shadow-[#F57C20]/20"
            onClick={handleStartIntake}
            disabled={creatingIntake}
          >
            {creatingIntake ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
            ) : (
              <>Upload Documents <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
          <p className="mt-3 text-xs text-[#2D2D2D]/50">It takes about two minutes</p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-[#F57C20]/10 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-14 md:py-18">
          <h2 className="text-center text-xl font-bold md:text-2xl mb-3 text-[#2D2D2D]">How the Partnership Works</h2>
          <p className="text-center text-sm text-[#2D2D2D]/60 max-w-md mx-auto mb-10">
            DomiSource organizes everything that comes with moving. AURA structures the insurance so protection matches the property.
          </p>
          <div className="space-y-5">
            {STEPS.map((step) => (
              <Card key={step.num} className="border-[#F57C20]/10 bg-[#FFF8F0]/50 transition-shadow hover:shadow-md">
                <CardContent className="flex gap-5 p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F57C20]/10 text-[#F57C20] font-bold text-lg">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-sm font-semibold md:text-base text-[#2D2D2D]">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#2D2D2D]/60">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why It Works ── */}
      <section className="border-t border-[#F57C20]/10 bg-[#FFF8F0]">
        <div className="mx-auto max-w-3xl px-6 py-14 md:py-18">
          <h2 className="text-center text-xl font-bold md:text-2xl mb-3 text-[#2D2D2D]">Why DomiSource + AURA Work Together</h2>
          <p className="text-center text-sm text-[#2D2D2D]/60 max-w-lg mx-auto mb-10">
            DomiSource believes homes deserve a digital identity. AURA believes insurance should actually understand the home it protects.
          </p>
          <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
            {WHY_ITEMS.map((item, i) => (
              <Card key={i} className="border-[#F57C20]/10 bg-white">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F57C20]/10 text-[#F57C20]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-[#2D2D2D]">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-[#F57C20]/10 bg-white">
        <div className="mx-auto max-w-xl px-6 py-14 md:py-18 text-center">
          <h2 className="text-xl font-bold md:text-2xl text-[#2D2D2D]">Start Here</h2>
          <p className="mt-3 text-sm text-[#2D2D2D]/60 max-w-md mx-auto">
            Upload the documents you already have and we'll take it from there. No long forms. No starting from scratch.
          </p>
          <Button
            size="lg"
            className="mt-8 w-full gap-2 rounded-full text-sm font-semibold sm:w-auto sm:px-12 bg-[#F57C20] hover:bg-[#E06A10] text-white shadow-lg shadow-[#F57C20]/20"
            onClick={handleStartIntake}
            disabled={creatingIntake}
          >
            {creatingIntake ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
            ) : (
              <>Upload Documents <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#F57C20]/10 bg-[#FFF8F0]">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F57C20]">
              <Home className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-bold text-[#2D2D2D]">DomiSource</span>
            <span className="text-xs text-[#2D2D2D]/40">+</span>
            <span className="text-sm font-bold text-[#2D2D2D]/60">AURA</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full text-xs border-[#F57C20]/20 hover:bg-[#F57C20]/5 hover:text-[#F57C20]"
            onClick={() => window.open("https://domisource.com", "_blank")}
          >
            Visit DomiSource <ExternalLink className="h-3 w-3" />
          </Button>
          <p className="text-[10px] text-[#2D2D2D]/40 pt-2">
            Powered by <span className="font-semibold text-[#2D2D2D]/70">AURA Risk Group</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
