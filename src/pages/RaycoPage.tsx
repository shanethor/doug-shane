import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ClipboardList, UserCheck, Phone, Mail, MapPin, Clock, ArrowRight, Loader2, ExternalLink, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import dougHeadshot from "@/assets/doug-wenz-headshot.png";
import PartnerQuickApply from "@/components/PartnerQuickApply";

const SERVICES = ["Polishing", "Deburring", "Tumbling", "Buffing"];
const INDUSTRIES = ["Aerospace", "Military", "Automotive", "Marine", "Firearm", "Energy", "Custom Work"];

const STEPS = [
  {
    num: "1",
    icon: Upload,
    title: "Upload your current insurance documents",
    desc: "Declarations pages, current policies, loss runs — anything that helps us understand your coverage.",
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

export default function RaycoPage() {
  const [creatingIntake, setCreatingIntake] = useState(false);

  const handleStartIntake = async () => {
    setCreatingIntake(true);
    try {
      const { data, error } = await supabase.functions.invoke("borrower-intake", {
        body: { slug: "rayco" },
      });
      if (error || !data?.token) throw new Error(error?.message ?? "No token returned");
      window.location.href = `${window.location.origin}/intake/${data.token}`;
    } catch (e) {
      console.error("Failed to create intake link:", e);
      setCreatingIntake(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1D2430]" data-theme="light">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#1B2A5C]/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-[#1B2A5C] flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-[#1B2A5C]">RAYCO INC</span>
                <p className="text-[9px] text-[#1D2430]/50 tracking-widest uppercase leading-none">Custom Metal Finishing</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-[#1D2430]">AURA</span>
            <span className="text-[10px] text-[#1D2430]/50 tracking-widest uppercase">Risk Group</span>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1B2A5C]/[0.06] to-transparent">
        <div className="relative mx-auto max-w-2xl px-6 py-12 md:py-16 text-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl leading-snug text-[#1B2A5C]">
            Precision Finishing Deserves Precision Coverage
          </h1>
          <p className="mt-4 text-base text-[#1D2430]/70 max-w-lg mx-auto">
            Rayco Inc. has trusted its craftsmanship since 1951. Now let AURA organize and protect the business behind it.
          </p>
        </div>
      </section>

      {/* ── About Rayco ── */}
      <section className="border-t border-[#1B2A5C]/10 bg-[#F7F8FA]">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-14">
          <h2 className="text-xl font-bold text-[#1B2A5C] mb-4 text-center">About Rayco Inc.</h2>
          <p className="text-sm leading-relaxed text-[#1D2430]/70 text-center max-w-2xl mx-auto">
            Rayco Inc. specializes in hand finishing, precision polishing and buffing of turbine blades, vanes, nozzle partitions and blisks. 
            Established in 1951, their people are the backbone of the business with over 100 years of combined employee experience. 
            You can trust Rayco for polishing and buffing of complex machined parts — they've built a reputation on craftsmanship across 
            aerospace, land-based turbines, marine, automotive, and beyond.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {SERVICES.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-[#1B2A5C]/10 px-3 py-1.5 text-xs font-medium text-[#1B2A5C]">
                <Wrench className="h-3 w-3" /> {s}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {INDUSTRIES.map((ind) => (
              <span key={ind} className="rounded-full border border-[#1B2A5C]/15 px-2.5 py-1 text-[10px] font-medium text-[#1D2430]/60">
                {ind}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick Apply ── */}
      <section className="border-t border-[#1B2A5C]/10 bg-white">
        <div className="mx-auto max-w-sm px-6 py-14">
          <PartnerQuickApply slug="rayco" variant="light" accentClass="bg-[#1B2A5C] hover:bg-[#1B2A5C]/90 text-white" />
        </div>
      </section>

      {/* ── Advisor Block ── */}
      <section className="border-t border-[#1B2A5C]/10 bg-[#F7F8FA]">
        <div className="mx-auto max-w-4xl px-6 py-14 md:py-18">
          <div className="mx-auto max-w-sm">
            <Card className="border-[#1B2A5C]/10 overflow-hidden shadow-lg shadow-[#1B2A5C]/5">
              <CardContent className="p-0">
                <div className="flex flex-col items-center p-8 text-center">
                  <div className="relative mb-5">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#1B2A5C]/20 to-[#3B5998]/15 blur-sm" />
                    <img
                      src={dougHeadshot}
                      alt="Doug Wenz"
                      className="relative h-32 w-32 rounded-full object-cover shadow-lg"
                    />
                  </div>

                  <h2 className="text-xl font-bold text-[#1B2A5C]">Doug Wenz</h2>
                  <p className="mt-1 text-sm text-[#1D2430]/70">Vice President</p>
                  <p className="text-sm text-[#1D2430]/70">AURA Risk Group</p>

                  <div className="mt-5 space-y-2 text-sm text-[#1D2430]/70">
                    <div className="flex items-center justify-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[#1B2A5C]" />
                      <a href="tel:2039091659" className="hover:text-[#1B2A5C] transition-colors">203-909-1659</a>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[#1B2A5C]" />
                      <a href="mailto:Dwenz@associatedct.com" className="hover:text-[#1B2A5C] transition-colors">Dwenz@associatedct.com</a>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="mt-7 w-full gap-2 rounded-full text-sm font-semibold bg-[#1B2A5C] hover:bg-[#1B2A5C]/90 text-white"
                    onClick={handleStartIntake}
                    disabled={creatingIntake}
                  >
                    {creatingIntake ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                    ) : (
                      <>Full Application <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                  <p className="mt-2 text-[10px] text-[#1D2430]/40">Upload documents for a faster, more complete review</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-[#1B2A5C]/10 bg-[#F7F8FA]">
        <div className="mx-auto max-w-3xl px-6 py-14 md:py-18">
          <h2 className="text-center text-xl font-bold md:text-2xl mb-10 text-[#1B2A5C]">How It Works</h2>
          <div className="space-y-6">
            {STEPS.map((step) => (
              <Card key={step.num} className="border-[#1B2A5C]/10 bg-white transition-shadow hover:shadow-md">
                <CardContent className="flex gap-5 p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1B2A5C]/10 text-[#1B2A5C] font-bold text-lg">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-sm font-semibold md:text-base text-[#1B2A5C]">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#1D2430]/70">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rayco Contact Info ── */}
      <section className="border-t border-[#1B2A5C]/10 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-14">
          <h2 className="text-center text-xl font-bold mb-8 text-[#1B2A5C]">Contact Rayco Inc.</h2>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B2A5C]/10 text-[#1B2A5C]">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#1B2A5C]">Hours</p>
              <p className="text-xs text-[#1D2430]/60">Monday–Friday</p>
              <p className="text-xs text-[#1D2430]/60">7am–3:30pm</p>
            </div>
            <div className="space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B2A5C]/10 text-[#1B2A5C]">
                <MapPin className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#1B2A5C]">Location</p>
              <p className="text-xs text-[#1D2430]/60">48 Atlantic St.</p>
              <p className="text-xs text-[#1D2430]/60">New Britain, CT 06053</p>
            </div>
            <div className="space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B2A5C]/10 text-[#1B2A5C]">
                <Phone className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#1B2A5C]">Phone & Email</p>
              <a href="tel:8603574693" className="text-xs text-[#1D2430]/60 hover:text-[#1B2A5C] block">(860) 357-4693</a>
              <a href="mailto:Rayco@RaycoIncCT.com" className="text-xs text-[#1D2430]/60 hover:text-[#1B2A5C] block">Rayco@RaycoIncCT.com</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1B2A5C]/10 bg-[#F7F8FA]">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center space-y-4">
          <p className="text-sm font-bold text-[#1B2A5C]">Rayco Inc.</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full text-xs border-[#1B2A5C]/20 hover:bg-[#1B2A5C]/5 hover:text-[#1B2A5C]"
            onClick={() => window.open("https://raycoincct.com", "_blank")}
          >
            Visit RaycoIncCT.com <ExternalLink className="h-3 w-3" />
          </Button>
          <p className="text-[10px] text-[#1D2430]/50 pt-2">
            Powered by <span className="font-semibold text-[#1B2A5C]">AURA</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
