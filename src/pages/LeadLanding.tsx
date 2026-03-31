import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Building2, Home, Briefcase, TrendingUp, Target,
  Zap, Users, CheckCircle2, ArrowRight, Sparkles,
} from "lucide-react";

const INDUSTRY_CONFIG: Record<string, {
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  basePrice: number;
  highlights: string[];
  sources: string[];
}> = {
  insurance: {
    title: "Insurance Leads",
    subtitle: "Targeted commercial & personal lines prospects actively seeking coverage",
    icon: Shield,
    color: "hsl(140 12% 42%)",
    basePrice: 25,
    highlights: [
      "New business filings needing coverage",
      "OSHA-cited contractors needing new carriers",
      "License expirations triggering renewal windows",
      "EPA-certified firms requiring specialty coverage",
      "SBA loan recipients needing all insurance lines",
    ],
    sources: ["State Licensing Boards", "OSHA Enforcement", "Manufacturer Dealer Networks", "Utility Rebate Lists", "NATE Certifications", "Business Filings", "Permit Database", "BuildZoom", "EPA Databases", "SAM.gov", "SBA Loans", "SMACNA / PHCC", "PACE Programs", "Prevailing Wage Registries", "State WC Databases", "FMCSA/DOT", "Court Records & Liens", "Trade Associations", "Google Places", "UCC Filings", "Census CBP / BLS", "FEMA/NOAA Data", "NOAA Hail/Storm Reports", "NRCA Directory", "GAF/CertainTeed Certified", "Roofing WC 5551/5552", "Storm Restoration Permits", "CAT Event Filings", "Plumbing Licenses", "PHCC Directory", "Backflow Certifications", "UA Local Unions", "Medical Gas Certs", "Plumbing WC 5183", "Reddit Signals", "LinkedIn", "New Domain Monitoring"],
  },
  "real-estate": {
    title: "Real Estate Leads",
    subtitle: "Buyers, sellers, and investors actively searching for properties",
    icon: Home,
    color: "hsl(220 70% 50%)",
    basePrice: 100,
    highlights: [
      "Active property searchers in your market",
      "Pre-approved buyers ready to close",
      "Investors looking for rental properties",
      "Sellers preparing to list",
    ],
    sources: ["Property Records", "Permit Database", "Business Filings", "Court Records & Liens", "SAM.gov", "SBA Loans", "Google Places", "LinkedIn", "New Domain Monitoring"],
  },
  mortgage: {
    title: "Mortgage Leads",
    subtitle: "Pre-qualified borrowers and refinance candidates",
    icon: Building2,
    color: "hsl(260 60% 50%)",
    basePrice: 100,
    highlights: [
      "First-time homebuyers seeking pre-approval",
      "Refinance candidates with rate opportunities",
      "Investment property financing",
      "Commercial mortgage prospects",
    ],
    sources: ["Property Records", "Business Filings", "SBA Loans", "Permit Database", "Court Records & Liens", "Google Places", "LinkedIn", "UCC Filings"],
  },
  consulting: {
    title: "Consulting Leads",
    subtitle: "Businesses seeking professional advisory and consulting services",
    icon: Briefcase,
    color: "hsl(30 80% 50%)",
    basePrice: 15,
    highlights: [
      "Startups needing strategic guidance",
      "Companies scaling operations",
      "Businesses seeking technology consulting",
      "Organizations planning restructuring",
    ],
    sources: ["Business Filings", "SAM.gov", "SBA Loans", "LinkedIn", "Reddit Signals", "Google Places", "New Domain Monitoring", "Trade Associations"],
  },
  property: {
    title: "Property Management Leads",
    subtitle: "Property owners and investors seeking management solutions",
    icon: Building2,
    color: "hsl(180 50% 40%)",
    basePrice: 100,
    highlights: [
      "Multi-unit property owners",
      "New investment property purchases",
      "Landlords expanding portfolios",
      "Commercial property transitions",
    ],
    sources: ["Property Records", "Permit Database", "Business Filings", "Court Records & Liens", "UCC Filings", "Google Places", "LinkedIn"],
  },
  general: {
    title: "Business Leads",
    subtitle: "Cross-industry business leads for any professional service",
    icon: TrendingUp,
    color: "hsl(140 12% 42%)",
    basePrice: 15,
    highlights: [
      "Newly registered businesses",
      "Expanding companies hiring staff",
      "Businesses seeking professional services",
      "Companies with compliance needs",
    ],
    sources: ["Business Filings", "SAM.gov", "SBA Loans", "Permit Database", "Google Places", "LinkedIn", "Reddit Signals", "Trade Associations", "New Domain Monitoring"],
  },
};

export default function LeadLanding() {
  const { industry } = useParams<{ industry: string }>();
  const navigate = useNavigate();
  const config = INDUSTRY_CONFIG[industry || ""] || INDUSTRY_CONFIG.general;
  const Icon = config.icon;

  return (
    <div className="min-h-screen" style={{ background: "hsl(240 6% 6%)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          background: `radial-gradient(ellipse at 50% 0%, ${config.color}, transparent 70%)`,
        }} />
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
            style={{ background: `${config.color}20`, border: `1px solid ${config.color}40` }}>
            <Icon className="h-4 w-4" style={{ color: config.color }} />
            <span className="text-xs font-semibold" style={{ color: config.color }}>AURA Lead Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            {config.title}
          </h1>
          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8" style={{ color: "hsl(240 5% 60%)" }}>
            {config.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link to="/request-access">
              <Button size="lg" className="gap-2 text-base px-8" style={{ background: config.color }}>
                <Sparkles className="h-5 w-5" /> Get Started Free
              </Button>
            </Link>
            <Link to="/connectdemo">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8"
                style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }}>
                Try Demo
              </Button>
            </Link>
          </div>

          <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>
            Starting at <span className="font-bold text-white">${config.basePrice}/lead</span> • Enriched with full contact profiles
          </p>
        </div>
      </div>

      {/* What you get */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          What makes our {config.title.toLowerCase()} different
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {config.highlights.map((h, i) => (
            <Card key={i} className="border-none" style={{ background: "hsl(240 6% 10%)" }}>
              <CardContent className="p-5 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: config.color }} />
                <p className="text-sm text-white">{h}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sources */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-white text-center mb-6">
          Sourced from {config.sources.length}+ verified data providers
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {config.sources.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs px-3 py-1.5"
              style={{ background: "hsl(240 6% 14%)", color: "hsl(240 5% 65%)" }}>
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* AI Gameplan teaser */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="border-none overflow-hidden" style={{ background: "hsl(240 6% 10%)" }}>
          <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl shrink-0"
              style={{ background: "hsl(140 12% 42% / 0.15)" }}>
              <Target className="h-8 w-8" style={{ color: "hsl(140 12% 55%)" }} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-bold text-white mb-1">Sage Gameplan™ Included</h3>
              <p className="text-sm" style={{ color: "hsl(240 5% 55%)" }}>
                Every purchased lead comes with an AI-powered outreach-to-close gameplan from Sage, 
                our intelligent assistant. Get personalized email scripts, call frameworks, and 
                follow-up sequences tailored to each lead's unique situation.
              </p>
            </div>
            <Link to="/request-access" className="shrink-0">
              <Button className="gap-1.5" style={{ background: "hsl(140 12% 42%)" }}>
                Start Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Studio promo */}
      <div className="max-w-4xl mx-auto px-4 py-12 pb-20">
        <Card className="border-none overflow-hidden" style={{
          background: "linear-gradient(135deg, hsl(260 40% 12%), hsl(280 30% 10%))",
          border: "1px solid hsl(260 40% 25%)",
        }}>
          <CardContent className="p-8 text-center">
            <Badge className="mb-4 text-xs" style={{ background: "hsl(260 60% 50%)" }}>AURA Studio</Badge>
            <h3 className="text-xl font-bold text-white mb-2">
              Let AI Agents Handle Lead Outreach For You
            </h3>
            <p className="text-sm max-w-lg mx-auto mb-6" style={{ color: "hsl(260 20% 65%)" }}>
              Our team builds custom AI agents to manage outreach to your leads — you only need to 
              focus on closing the hottest targets. Studio members also get <span className="font-bold text-white">3× the free leads</span> and 
              a <span className="font-bold text-white">60% discount</span> on all purchased leads.
            </p>
            <Link to="/studiodemo">
              <Button size="lg" className="gap-2" style={{ background: "hsl(260 60% 50%)" }}>
                <Zap className="h-5 w-5" /> Learn About AURA Studio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
