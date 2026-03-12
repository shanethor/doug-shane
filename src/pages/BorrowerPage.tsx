import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Shield, Phone, Mail, MapPin, ExternalLink, CheckCircle, ArrowRight, Sparkles, Search, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import auraLogo from "@/assets/aura-logo.png";
import joshHeadshot from "@/assets/josh-chernes-headshot.png";

/* ─── Borrower Config ─── */
interface BorrowerConfig {
  slug: string;
  name: string;
  title: string;
  company: string;
  headshot: string;
  applyUrl: string;
  phone: string;
  office?: string;
  address: string;
  email: string;
  bio: string;
  coverageLines: string[];
}

const BORROWERS: Record<string, BorrowerConfig> = {
  "josh-chernes": {
    slug: "josh-chernes",
    name: "Joshua Chernes",
    title: "Loan Officer",
    company: "CrossCountry Mortgage",
    headshot: joshHeadshot,
    applyUrl: "https://crosscountrymortgage.com/fairfield-ct-5813/joshua-chernes/",
    phone: "203.814.8230",
    office: "203.401.8280",
    address: "46 Miller St., #1, Fairfield, CT 06824",
    email: "Joshua.Chernes@ccm.com",
    bio: "Buying a home already comes with enough paperwork. Through Josh's partnership with AURA Risk Group, you can upload the documents you already have instead of starting from scratch. Whether you only need homeowners insurance or want to bundle other personal coverage, AURA helps keep the process simple.",
    coverageLines: ["Home", "Auto", "Umbrella", "Flood", "Renters", "etc."],
  },
};

/* ─── Steps Data ─── */
const STEPS = [
  { icon: Upload, title: "Upload what you already have", desc: "Current declarations pages, prior policies, mortgage documents, property information, or other notes." },
  { icon: Search, title: "AURA pulls and pre-fills the details", desc: "We source and organize the information so you do not have to start from zero." },
  { icon: CheckCircle, title: "Confirm what we found", desc: "You review the information and make sure everything is accurate." },
  { icon: MessageSquare, title: "Talk with an AURA advisor", desc: "Once confirmed, your file goes directly to an AURA representative who will contact you to review options." },
];

export default function BorrowerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [creatingIntake, setCreatingIntake] = useState(false);
  const config = slug ? BORROWERS[slug] : undefined;

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Partner page not found.</p>
      </div>
    );
  }

  const handleStartIntake = async () => {
    setCreatingIntake(true);
    try {
      const { data, error } = await supabase.functions.invoke("borrower-intake", {
        body: { slug: config.slug },
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
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <img src={auraLogo} alt="AURA Risk Group" className="h-7" />
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground">Secure Borrower Intake</span>
          </div>
        </div>
      </header>

      {/* ── Hero / Josh Section ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 md:py-16">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12">
            {/* Headshot */}
            <div className="shrink-0">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 blur-sm" />
                <img
                  src={config.headshot}
                  alt={config.name}
                  className="relative h-44 w-44 rounded-2xl object-cover shadow-lg md:h-52 md:w-52"
                />
              </div>
            </div>
            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{config.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{config.title} · {config.company}</p>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:mx-0">
                {config.bio}
              </p>
              <Button
                size="lg"
                className="mt-6 gap-2 rounded-full px-8 text-sm font-semibold"
                onClick={() => window.open(config.applyUrl, "_blank")}
              >
                Apply for Your Mortgage <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── How AURA Works ── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-14 md:py-18">
          <div className="text-center">
            <Badge variant="outline" className="mb-3 text-xs">How It Works</Badge>
            <h2 className="text-xl font-bold md:text-2xl">Insurance Made Easy</h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <Card key={i} className="border-border/60 bg-background transition-shadow hover:shadow-md">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Start Insurance Intake ── */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-14 md:py-18">
          <div className="mx-auto max-w-md text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h2 className="text-xl font-bold md:text-2xl">Start Your Insurance Intake</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload any documents you already have and we'll handle the rest. Coverage available for:
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {config.coverageLines.map(line => (
                <Badge key={line} variant="secondary" className="text-xs">{line}</Badge>
              ))}
            </div>
            <Button
              size="lg"
              className="mt-7 w-full gap-2 rounded-full text-sm font-semibold sm:w-auto sm:px-10"
              onClick={handleStartIntake}
              disabled={creatingIntake}
            >
              {creatingIntake ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : <>Apply for Insurance <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Lender Contact ── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="mx-auto max-w-sm">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your Loan Officer</p>
            <Card className="border-border/60">
              <CardContent className="space-y-3 p-5 text-center">
                <p className="text-base font-bold">{config.name}</p>
                <p className="text-sm text-muted-foreground">{config.company}</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="h-3.5 w-3.5" /> Mobile {config.phone}
                  </div>
                  {config.office && (
                    <div className="flex items-center justify-center gap-2">
                      <Phone className="h-3.5 w-3.5" /> Office {config.office}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> {config.address}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="h-3.5 w-3.5" /> {config.email}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full gap-2 rounded-full text-xs"
                  onClick={() => window.open(config.applyUrl, "_blank")}
                >
                  Apply with Josh today <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8 text-center">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">Insurance Runs On <span className="font-bold text-foreground">AURA</span></p>
      </footer>
    </div>
  );
}