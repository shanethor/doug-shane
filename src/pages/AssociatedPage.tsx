import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ClipboardList, UserCheck, Phone, Mail, ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import auraLogo from "@/assets/aura-logo.png";
import dougHeadshot from "@/assets/doug-wenz-headshot.png";

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
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <span className="text-sm font-bold tracking-tight">Associated Insurance Services</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="text-[10px] tracking-wide">Powered by</span>
            <img src={auraLogo} alt="AURA" className="h-5" />
          </div>
        </div>
      </header>

      {/* ── Hero / Editorial ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-2xl px-6 py-16 md:py-24 text-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl leading-snug">
            Insurance should not feel like a call center.
          </h1>
          <div className="mx-auto mt-8 max-w-xl space-y-5 text-sm leading-relaxed text-muted-foreground md:text-base md:leading-relaxed">
            <p>
              Unfortunately a lot of the industry has gone that direction. You call, get bounced around, and when someone finally answers they have no idea who you are. Your account gets handled like a ticket instead of a relationship.
            </p>
            <p className="font-medium text-foreground">
              That is not how we do it here.
            </p>
            <p>
              At Associated, when you call you get a real person. Someone who can actually help. Someone who understands what you own and how it should be protected.
            </p>
            <p>
              Technology helps us move faster behind the scenes. The relationship stays human.
            </p>
          </div>
        </div>
      </section>

      {/* ── Advisor Block ── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-14 md:py-18">
          <div className="mx-auto max-w-sm">
            <Card className="border-border/60 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col items-center p-8 text-center">
                  {/* Headshot */}
                  <div className="relative mb-5">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/25 to-accent/15 blur-sm" />
                    <img
                      src={dougHeadshot}
                      alt="Doug Wenz"
                      className="relative h-32 w-32 rounded-full object-cover shadow-lg"
                    />
                  </div>

                  <h2 className="text-xl font-bold">Doug Wenz</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Vice President</p>
                  <p className="text-sm text-muted-foreground">Associated Insurance Services</p>

                  <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <a href="tel:2039091659" className="hover:text-foreground transition-colors">203-909-1659</a>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <a href="mailto:Dwenz@associatedct.com" className="hover:text-foreground transition-colors">Dwenz@associatedct.com</a>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="mt-7 w-full gap-2 rounded-full text-sm font-semibold"
                    onClick={handleStartIntake}
                    disabled={creatingIntake}
                  >
                    {creatingIntake ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                    ) : (
                      <>Apply for Insurance <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-6 py-14 md:py-18">
          <h2 className="text-center text-xl font-bold md:text-2xl mb-10">How It Works</h2>
          <div className="space-y-6">
            {STEPS.map((step) => (
              <Card key={step.num} className="border-border/60 bg-background transition-shadow hover:shadow-md">
                <CardContent className="flex gap-5 p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-sm font-semibold md:text-base">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center space-y-4">
          <p className="text-sm font-bold">Associated Insurance Services</p>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs"
              onClick={() => window.open("https://www.associatedct.com", "_blank")}
            >
              Visit Associated Insurance Services <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs"
              onClick={() => window.open("https://www.associatedct.com/contact", "_blank")}
            >
              Contact Associated <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground pt-2">
            Powered by <span className="font-semibold text-foreground">AURA</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
