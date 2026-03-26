import { useState, useEffect, useRef, useCallback } from "react";
import { useRealPipelineData } from "@/hooks/useRealData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  Building2, DollarSign, Users, Info, Plus, Phone, Mail, MapPin, Calendar, X, GripVertical, Trophy, Sparkles, Home, Briefcase, Shield, Star, Check,
} from "lucide-react";

interface StageConfig { key: string; label: string; color: string; }

const PIPELINE_CONFIGS: Record<string, { label: string; stages: StageConfig[] }> = {
  insurance: { label: "Insurance", stages: [
    { key: "prospect", label: "Prospect", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { key: "quoting", label: "Quoting", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { key: "presenting", label: "Presenting", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    { key: "bound", label: "Bound", color: "bg-green-500/10 text-green-600 border-green-500/20" },
    { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  ]},
  real_estate: { label: "Real Estate", stages: [
    { key: "prospect", label: "Lead", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { key: "quoting", label: "Showing", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { key: "presenting", label: "Under Contract", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    { key: "bound", label: "Closed", color: "bg-green-500/10 text-green-600 border-green-500/20" },
    { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  ]},
  consulting: { label: "Consulting", stages: [
    { key: "prospect", label: "Prospect", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { key: "quoting", label: "Proposal", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { key: "presenting", label: "Engagement", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    { key: "bound", label: "Delivered", color: "bg-green-500/10 text-green-600 border-green-500/20" },
    { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  ]},
  generic: { label: "General Business", stages: [
    { key: "prospect", label: "Lead", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { key: "quoting", label: "Qualified", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { key: "presenting", label: "Negotiation", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    { key: "bound", label: "Won", color: "bg-green-500/10 text-green-600 border-green-500/20" },
    { key: "lost", label: "Lost", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  ]},
};

/* ── Business-type-aware field configs ── */
type FieldDef = { key: string; label: string; type: "text" | "number" | "date" | "select" | "percent"; options?: string[]; hint?: string; computed?: boolean };

const BUSINESS_TYPE_ICON: Record<string, typeof Building2> = {
  generic: Briefcase,
  insurance: Shield,
  consulting: Users,
  real_estate: Home,
};

const WON_FIELDS_BY_TYPE: Record<string, FieldDef[]> = {
  generic: [
    { key: "deal_value", label: "Deal Value", type: "number" },
    { key: "acv", label: "ACV (Annual)", type: "number", hint: "Annual contract value if multi-year" },
    { key: "close_date", label: "Close Date", type: "date" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  insurance: [
    { key: "annual_premium", label: "Annual Premium", type: "number" },
    { key: "commission_pct", label: "Commission %", type: "percent", hint: "Typical P&C commission is 10–20% of premium" },
    { key: "est_commission", label: "Est. Commission (Yr 1)", type: "number", computed: true },
    { key: "line_of_business", label: "Line of Business", type: "select", options: ["Commercial P&C", "Benefits", "Personal Lines", "Life", "Workers Comp", "E&O"] },
    { key: "close_date", label: "Effective Date", type: "date" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  consulting: [
    { key: "engagement_type", label: "Engagement Type", type: "select", options: ["Retainer", "Project", "Hourly"] },
    { key: "monthly_fee", label: "Monthly Fee", type: "number", hint: "For retainer engagements" },
    { key: "term_months", label: "Term (months)", type: "number", hint: "Initial engagement term" },
    { key: "project_fee", label: "Project Fee", type: "number", hint: "For project-based engagements" },
    { key: "hourly_rate", label: "Hourly Rate", type: "number" },
    { key: "expected_hours", label: "Expected Hours", type: "number" },
    { key: "contract_value", label: "Contract Value", type: "number", computed: true },
    { key: "close_date", label: "Start Date", type: "date" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  real_estate: [
    { key: "property_type", label: "Property Type", type: "select", options: ["Residential", "Commercial", "Land", "Multi-Family"] },
    { key: "address", label: "Property Address", type: "text" },
    { key: "sale_price", label: "Expected Sale Price", type: "number" },
    { key: "total_commission_pct", label: "Total Commission %", type: "percent", hint: "Typical 5.0–6.0% of sale price" },
    { key: "your_side_pct", label: "Your Side %", type: "percent", hint: "Typically 2.5–3.0%" },
    { key: "gross_commission", label: "Gross Commission", type: "number", computed: true },
    { key: "your_commission", label: "Your Commission", type: "number", computed: true },
    { key: "close_date", label: "Closing Date", type: "date" },
    { key: "notes", label: "Notes", type: "text" },
  ],
};

const LEAD_INFO_FIELDS: Record<string, { key: string; label: string }[]> = {
  generic: [
    { key: "company_size", label: "Company Size" },
    { key: "industry", label: "Industry" },
    { key: "contact_role", label: "Primary Contact Role" },
  ],
  insurance: [
    { key: "current_carrier", label: "Current Carrier" },
    { key: "renewal_date", label: "Renewal Date" },
    { key: "current_premium", label: "Current Premium Est." },
  ],
  consulting: [
    { key: "pain_point", label: "Current Pain Point" },
    { key: "budget_range", label: "Budget Range" },
    { key: "decision_horizon", label: "Decision Horizon" },
  ],
  real_estate: [
    { key: "buyer_seller", label: "Buyer / Seller" },
    { key: "property_type_info", label: "Property Type" },
    { key: "price_range", label: "Price Range" },
  ],
};

function computeWonFields(type: string, form: Record<string, string>): Record<string, string> {
  const updated = { ...form };
  if (type === "insurance") {
    const premium = Number(form.annual_premium) || 0;
    const pct = Number(form.commission_pct) || 15;
    updated.est_commission = String(Math.round(premium * pct / 100));
  } else if (type === "consulting") {
    const eng = form.engagement_type || "Retainer";
    if (eng === "Retainer") {
      updated.contract_value = String((Number(form.monthly_fee) || 0) * (Number(form.term_months) || 1));
    } else if (eng === "Hourly") {
      updated.contract_value = String((Number(form.hourly_rate) || 0) * (Number(form.expected_hours) || 0));
    } else {
      updated.contract_value = form.project_fee || "0";
    }
  } else if (type === "real_estate") {
    const price = Number(form.sale_price) || 0;
    const totalPct = Number(form.total_commission_pct) || 5.5;
    const yourPct = Number(form.your_side_pct) || 2.75;
    updated.gross_commission = String(Math.round(price * totalPct / 100));
    updated.your_commission = String(Math.round(price * yourPct / 100));
  }
  return updated;
}

function getPrimaryValue(type: string, form?: Record<string, string>, fallback?: number): number {
  if (!form) return fallback || 0;
  if (type === "insurance") return Number(form.annual_premium) || fallback || 0;
  if (type === "consulting") return Number(form.contract_value) || fallback || 0;
  if (type === "real_estate") return Number(form.sale_price) || fallback || 0;
  return Number(form.deal_value) || fallback || 0;
}

function getSecondaryValue(type: string, form?: Record<string, string>): string | null {
  if (!form) return null;
  if (type === "insurance" && form.est_commission) return `Comm: $${Number(form.est_commission).toLocaleString()}`;
  if (type === "real_estate" && form.your_commission) return `Your: $${Number(form.your_commission).toLocaleString()}`;
  if (type === "consulting" && form.engagement_type) return form.engagement_type;
  return null;
}

function getValueLabel(type: string): string {
  if (type === "insurance") return "Premium";
  if (type === "real_estate") return "Sale Price";
  if (type === "consulting") return "Contract";
  return "Value";
}

function shouldShowField(type: string, fieldKey: string, form: Record<string, string>): boolean {
  if (type !== "consulting") return true;
  const eng = form.engagement_type || "Retainer";
  if (eng === "Retainer" && (fieldKey === "project_fee" || fieldKey === "hourly_rate" || fieldKey === "expected_hours")) return false;
  if (eng === "Project" && (fieldKey === "monthly_fee" || fieldKey === "term_months" || fieldKey === "hourly_rate" || fieldKey === "expected_hours")) return false;
  if (eng === "Hourly" && (fieldKey === "monthly_fee" || fieldKey === "term_months" || fieldKey === "project_fee")) return false;
  return true;
}

type DemoLead = {
  id: string; name: string; contact: string; stage: string; value: number; source: string;
  lossReason?: string; renewalDate?: string;
  phone?: string; email?: string; location?: string; industry?: string; notes?: string;
  wonDetails?: Record<string, string>;
  extraInfo?: Record<string, string>;
};

const DEMO_LEADS_BY_TYPE: Record<string, DemoLead[]> = {
  generic: [
    { id: "g1", name: "Pinnacle Solutions", contact: "Rachel Kim", stage: "prospect", value: 48000, source: "Referral", phone: "(555) 111-2233", email: "r.kim@pinnacle.com", location: "Austin, TX", industry: "SaaS", notes: "Enterprise license deal", extraInfo: { company_size: "200+", contact_role: "VP Sales" } },
    { id: "g2", name: "Meridian Supply Co", contact: "Tom Hayes", stage: "prospect", value: 22000, source: "Website", phone: "(555) 222-3344", email: "t.hayes@meridian.com", location: "Denver, CO", industry: "Wholesale", extraInfo: { company_size: "50-100", contact_role: "Owner" } },
    { id: "g3", name: "Vertex Marketing", contact: "Alicia Grant", stage: "prospect", value: 15000, source: "LinkedIn", phone: "(555) 333-4455", email: "a.grant@vertex.io", location: "NYC, NY", industry: "Marketing", extraInfo: { company_size: "10-50", contact_role: "CMO" } },
    { id: "g4", name: "CloudBridge IT", contact: "Derek Olsen", stage: "quoting", value: 65000, source: "Partner", phone: "(555) 444-5566", email: "d.olsen@cloudbridge.com", location: "Seattle, WA", industry: "IT Services", notes: "3-year managed services contract", extraInfo: { company_size: "100-200", contact_role: "CTO" } },
    { id: "g5", name: "GreenLeaf Organics", contact: "Maria Santos", stage: "quoting", value: 18000, source: "Trade Show", phone: "(555) 555-6677", email: "m.santos@greenleaf.co", location: "Portland, OR", industry: "Food & Bev", extraInfo: { company_size: "10-50", contact_role: "Founder" } },
    { id: "g6", name: "Atlas Freight", contact: "Jim Barker", stage: "presenting", value: 34000, source: "Cold outreach", phone: "(555) 666-7788", email: "j.barker@atlasfreight.com", location: "Dallas, TX", industry: "Logistics", extraInfo: { company_size: "200+", contact_role: "Operations Dir" } },
    { id: "g7", name: "NovaTech Labs", contact: "Susan Choi", stage: "presenting", value: 27500, source: "Referral", phone: "(555) 777-8899", email: "s.choi@novatech.io", location: "San Jose, CA", industry: "Biotech", extraInfo: { company_size: "50-100", contact_role: "CEO" } },
    { id: "g8", name: "Ironclad Security", contact: "Mark Phillips", stage: "bound", value: 55000, source: "Partner", phone: "(555) 888-9900", email: "m.phillips@ironclad.com", location: "Chicago, IL", industry: "Cybersecurity", wonDetails: { deal_value: "55000", acv: "55000", close_date: "2025-02-10" } },
    { id: "g9", name: "Brightwave Media", contact: "Laura Tran", stage: "bound", value: 19000, source: "Website", phone: "(555) 999-0011", email: "l.tran@brightwave.com", location: "LA, CA", industry: "Media", wonDetails: { deal_value: "19000", close_date: "2025-03-05" } },
    { id: "g10", name: "Cascade Corp", contact: "Brian Walsh", stage: "lost", value: 30000, source: "Referral", lossReason: "Chose in-house solution", phone: "(555) 000-1122", email: "b.walsh@cascade.com", location: "Boston, MA", industry: "Manufacturing" },
  ],
  insurance: [
    { id: "i1", name: "Downtown Deli Group", contact: "Angela Rossi", stage: "prospect", value: 8500, source: "Referral", phone: "(555) 201-1001", email: "a.rossi@downtowndeli.com", location: "Philadelphia, PA", industry: "Restaurant", notes: "BOP + Workers Comp", extraInfo: { current_carrier: "Hartford", renewal_date: "2025-09-15", current_premium: "$7,200" } },
    { id: "i2", name: "Summit Contractors LLC", contact: "Ray Briggs", stage: "prospect", value: 24000, source: "Website", phone: "(555) 201-2002", email: "r.briggs@summitllc.com", location: "Denver, CO", industry: "Construction", notes: "GL + Commercial Auto fleet", extraInfo: { current_carrier: "Zurich", renewal_date: "2025-11-01", current_premium: "$21,000" } },
    { id: "i3", name: "Lakeside Medical Group", contact: "Dr. Anita Patel", stage: "prospect", value: 18000, source: "LinkedIn", phone: "(555) 201-3003", email: "a.patel@lakesidemed.com", location: "Minneapolis, MN", industry: "Healthcare", extraInfo: { current_carrier: "CNA", renewal_date: "2025-08-01", current_premium: "$15,800" } },
    { id: "i4", name: "Pacific Auto Body", contact: "Tony Vasquez", stage: "quoting", value: 12000, source: "Cold outreach", phone: "(555) 201-4004", email: "t.vasquez@pacificauto.com", location: "San Diego, CA", industry: "Auto Services", notes: "Garage keepers + GL", extraInfo: { current_carrier: "Progressive Commercial", renewal_date: "2025-07-15", current_premium: "$10,400" } },
    { id: "i5", name: "Precision Manufacturing", contact: "Karen Liu", stage: "quoting", value: 45000, source: "Referral", phone: "(555) 201-5005", email: "k.liu@precisionmfg.com", location: "Detroit, MI", industry: "Manufacturing", notes: "Large WC account", extraInfo: { current_carrier: "Liberty Mutual", renewal_date: "2025-10-01", current_premium: "$42,000" } },
    { id: "i6", name: "Harbor Point Marina", contact: "Steve Langley", stage: "presenting", value: 16500, source: "Networking", phone: "(555) 201-6006", email: "s.langley@harborpoint.com", location: "Annapolis, MD", industry: "Marine", extraInfo: { current_carrier: "Markel", renewal_date: "2025-12-01", current_premium: "$14,200" } },
    { id: "i7", name: "Metro Fitness Centers", contact: "Jennifer Walsh", stage: "presenting", value: 22000, source: "Partner", phone: "(555) 201-7007", email: "j.walsh@metrofitness.com", location: "Atlanta, GA", industry: "Fitness", extraInfo: { current_carrier: "Employers", renewal_date: "2025-06-15", current_premium: "$19,500" } },
    { id: "i8", name: "Valley Farms Cooperative", contact: "Dale Henderson", stage: "bound", value: 32000, source: "Referral", phone: "(555) 201-8008", email: "d.henderson@valleyfarms.org", location: "Fresno, CA", industry: "Agriculture", wonDetails: { annual_premium: "32000", commission_pct: "15", est_commission: "4800", line_of_business: "Commercial P&C", close_date: "2025-02-20" } },
    { id: "i9", name: "Brightside Daycare", contact: "Lisa Monroe", stage: "bound", value: 6800, source: "Website", phone: "(555) 201-9009", email: "l.monroe@brightside.com", location: "Charlotte, NC", industry: "Childcare", wonDetails: { annual_premium: "6800", commission_pct: "12", est_commission: "816", line_of_business: "Commercial P&C", close_date: "2025-03-01" } },
    { id: "i10", name: "Eastside Plumbing", contact: "Frank Torres", stage: "lost", value: 9500, source: "Cold outreach", lossReason: "Price — stayed with current carrier", phone: "(555) 201-0010", email: "f.torres@eastsideplumb.com", location: "Phoenix, AZ", industry: "Trades" },
    { id: "i11", name: "Crestview Apartments", contact: "Diane Park", stage: "lost", value: 28000, source: "Referral", lossReason: "Went with a larger brokerage", phone: "(555) 201-0011", email: "d.park@crestview.com", location: "Houston, TX", industry: "Real Estate" },
  ],
  consulting: [
    { id: "c1", name: "Orion Retail Group", contact: "Natasha Bell", stage: "prospect", value: 36000, source: "Referral", phone: "(555) 301-1001", email: "n.bell@orionretail.com", location: "NYC, NY", industry: "Retail", notes: "Digital transformation project", extraInfo: { pain_point: "Legacy POS systems", budget_range: "$50K-$100K", decision_horizon: "Q2 2025" } },
    { id: "c2", name: "Helix Biotech", contact: "Dr. Alan Reeves", stage: "prospect", value: 72000, source: "Conference", phone: "(555) 301-2002", email: "a.reeves@helixbio.com", location: "Boston, MA", industry: "Biotech", notes: "Regulatory compliance audit", extraInfo: { pain_point: "FDA compliance gaps", budget_range: "$100K+", decision_horizon: "30 days" } },
    { id: "c3", name: "UrbanEdge Properties", contact: "Samantha Cole", stage: "prospect", value: 24000, source: "LinkedIn", phone: "(555) 301-3003", email: "s.cole@urbanedge.com", location: "Chicago, IL", industry: "Real Estate Dev", extraInfo: { pain_point: "Project management", budget_range: "$25K-$50K", decision_horizon: "60 days" } },
    { id: "c4", name: "Catalyst Financial", contact: "Marcus Webb", stage: "quoting", value: 48000, source: "Partner", phone: "(555) 301-4004", email: "m.webb@catalystfin.com", location: "Charlotte, NC", industry: "Financial Services", notes: "6-month strategy retainer", extraInfo: { pain_point: "Growth strategy", budget_range: "$50K-$100K", decision_horizon: "45 days" } },
    { id: "c5", name: "Solaris Energy", contact: "Priya Mehta", stage: "quoting", value: 90000, source: "Referral", phone: "(555) 301-5005", email: "p.mehta@solaris.com", location: "Austin, TX", industry: "Energy", notes: "Operational efficiency project", extraInfo: { pain_point: "Scaling operations", budget_range: "$100K+", decision_horizon: "Q3 2025" } },
    { id: "c6", name: "Riverdale School District", contact: "Janet O'Brien", stage: "presenting", value: 30000, source: "RFP", phone: "(555) 301-6006", email: "j.obrien@riverdalek12.org", location: "Portland, OR", industry: "Education", extraInfo: { pain_point: "Budget optimization", budget_range: "$25K-$50K", decision_horizon: "Board approval Q2" } },
    { id: "c7", name: "TrueNorth Logistics", contact: "Kevin Sharp", stage: "bound", value: 60000, source: "Referral", phone: "(555) 301-7007", email: "k.sharp@truenorth.com", location: "Memphis, TN", industry: "Logistics", wonDetails: { engagement_type: "Retainer", monthly_fee: "10000", term_months: "6", contract_value: "60000", close_date: "2025-01-15" } },
    { id: "c8", name: "Apex Health Partners", contact: "Dr. Ronda James", stage: "bound", value: 45000, source: "Conference", phone: "(555) 301-8008", email: "r.james@apexhp.com", location: "Denver, CO", industry: "Healthcare", wonDetails: { engagement_type: "Project", project_fee: "45000", contract_value: "45000", close_date: "2025-02-28" } },
    { id: "c9", name: "FreshStart Marketing", contact: "Leo Grant", stage: "lost", value: 18000, source: "LinkedIn", lossReason: "Budget cut — project postponed", phone: "(555) 301-9009", email: "l.grant@freshstart.io", location: "LA, CA", industry: "Marketing" },
  ],
  real_estate: [
    { id: "r1", name: "742 Oakwood Drive", contact: "Michael & Sarah Chen", stage: "prospect", value: 485000, source: "Open House", phone: "(555) 401-1001", email: "chen.family@email.com", location: "Scottsdale, AZ", industry: "Residential", notes: "First-time buyers, pre-approved $500K", extraInfo: { buyer_seller: "Buyer", property_type_info: "Single Family", price_range: "$450K-$525K" } },
    { id: "r2", name: "1200 Commerce Blvd – Unit 4B", contact: "Westgate Holdings LLC", stage: "prospect", value: 1250000, source: "Referral", phone: "(555) 401-2002", email: "acquisitions@westgate.com", location: "Tampa, FL", industry: "Commercial", notes: "Office condo acquisition", extraInfo: { buyer_seller: "Buyer", property_type_info: "Commercial", price_range: "$1M-$1.5M" } },
    { id: "r3", name: "89 Maple Lane", contact: "Dorothy Freeman", stage: "prospect", value: 340000, source: "Yard Sign", phone: "(555) 401-3003", email: "d.freeman@email.com", location: "Raleigh, NC", industry: "Residential", notes: "Downsizing — listing her home", extraInfo: { buyer_seller: "Seller", property_type_info: "Single Family", price_range: "$320K-$360K" } },
    { id: "r4", name: "The Pines at Lakewood – Lot 12", contact: "Evergreen Builders Inc", stage: "quoting", value: 175000, source: "Builder Network", phone: "(555) 401-4004", email: "info@evergreenbuilders.com", location: "Boise, ID", industry: "Land", notes: "Vacant lot for new build", extraInfo: { buyer_seller: "Buyer", property_type_info: "Land", price_range: "$150K-$200K" } },
    { id: "r5", name: "3310 Harbor View Condos #7", contact: "James & Tina Moretti", stage: "quoting", value: 620000, source: "Website Lead", phone: "(555) 401-5005", email: "moretti.jt@email.com", location: "San Diego, CA", industry: "Residential", notes: "Relocating from NJ", extraInfo: { buyer_seller: "Buyer", property_type_info: "Condo", price_range: "$575K-$650K" } },
    { id: "r6", name: "1455 Industrial Pkwy", contact: "Titan Warehousing", stage: "presenting", value: 2800000, source: "Commercial MLS", phone: "(555) 401-6006", email: "deals@titanwh.com", location: "Memphis, TN", industry: "Commercial", notes: "Distribution center, cash buyer", extraInfo: { buyer_seller: "Buyer", property_type_info: "Industrial", price_range: "$2.5M-$3M" } },
    { id: "r7", name: "220 Sunset Ridge", contact: "Patricia Holloway", stage: "presenting", value: 890000, source: "Referral", phone: "(555) 401-7007", email: "p.holloway@email.com", location: "Austin, TX", industry: "Residential", notes: "Luxury listing", extraInfo: { buyer_seller: "Seller", property_type_info: "Single Family", price_range: "$850K-$925K" } },
    { id: "r8", name: "505 Birch Street Duplex", contact: "Robert & Amy Tran", stage: "bound", value: 415000, source: "Open House", phone: "(555) 401-8008", email: "tran.ra@email.com", location: "Portland, OR", industry: "Multi-Family", wonDetails: { property_type: "Multi-Family", address: "505 Birch Street", sale_price: "415000", total_commission_pct: "5.5", your_side_pct: "2.75", gross_commission: "22825", your_commission: "11413", close_date: "2025-02-14" } },
    { id: "r9", name: "1800 Vine Street Retail", contact: "Cornerstone Capital", stage: "bound", value: 1650000, source: "Referral", phone: "(555) 401-9009", email: "invest@cornerstone.com", location: "Nashville, TN", industry: "Commercial", wonDetails: { property_type: "Commercial", address: "1800 Vine Street", sale_price: "1650000", total_commission_pct: "4.0", your_side_pct: "2.0", gross_commission: "66000", your_commission: "33000", close_date: "2025-03-10" } },
    { id: "r10", name: "67 Elm Court", contact: "Steven Pace", stage: "lost", value: 295000, source: "Website Lead", lossReason: "Buyer backed out after inspection", phone: "(555) 401-0010", email: "s.pace@email.com", location: "Boise, ID", industry: "Residential" },
    { id: "r11", name: "400 River Road Parcel", contact: "GreenField Dev Group", stage: "lost", value: 550000, source: "Cold outreach", lossReason: "Zoning issue — deal fell through", phone: "(555) 401-0011", email: "info@greenfielddev.com", location: "Jacksonville, FL", industry: "Land" },
  ],
};

const COLUMN_LIMIT = 5;

/* ── Won Celebration Overlay ── */
function WonCelebration({ amount, label, onDone }: { amount: number; label: string; onDone: () => void }) {
  const [countUp, setCountUp] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const duration = 1800;
    const steps = 40;
    const increment = amount / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCountUp(Math.min(Math.round(increment * step), amount));
      if (step >= steps) clearInterval(interval);
    }, duration / steps);

    const timeout = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 3200);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [amount, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-400 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ background: "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(8px)" }}
    >
      <div className="text-center space-y-4 animate-scale-in">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "hsl(140 12% 42% / 0.15)" }} />
          <div className="absolute inset-2 rounded-full animate-pulse" style={{ background: "hsl(140 12% 42% / 0.1)", border: "2px solid hsl(140 12% 42% / 0.4)" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="h-10 w-10" style={{ color: "hsl(45 93% 58%)", filter: "drop-shadow(0 0 12px hsl(45 93% 58% / 0.6))" }} />
          </div>
        </div>
        <div>
          <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "hsl(45 93% 58%)" }} />
            Deal Won!
            <Sparkles className="h-5 w-5" style={{ color: "hsl(45 93% 58%)" }} />
          </p>
          <p className="text-4xl font-black mt-2 tabular-nums" style={{ color: "hsl(140 12% 58%)", textShadow: "0 0 30px hsl(140 12% 42% / 0.5)" }}>
            ${countUp.toLocaleString()}
          </p>
          <p className="text-xs mt-2" style={{ color: "hsl(240 5% 50%)" }}>{label}</p>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + Math.random() * 4, height: 4 + Math.random() * 4,
              background: i % 2 === 0 ? "hsl(45 93% 58%)" : "hsl(140 12% 58%)",
              left: `${20 + Math.random() * 60}%`, top: `${20 + Math.random() * 60}%`,
              animation: `wonParticle ${1.5 + Math.random()}s ease-out ${Math.random() * 0.5}s both`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Won Details Dialog ── */
function WonDetailsDialog({
  lead, industry, onSave, onCancel,
}: {
  lead: DemoLead; industry: string; onSave: (details: Record<string, string>, finalValue: number) => void; onCancel: () => void;
}) {
  const fields = WON_FIELDS_BY_TYPE[industry] || WON_FIELDS_BY_TYPE.generic;
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach(f => {
      if (f.key === "deal_value" || f.key === "annual_premium" || f.key === "sale_price") {
        init[f.key] = String(lead.value);
      } else if (f.key === "commission_pct") {
        init[f.key] = "15";
      } else if (f.key === "total_commission_pct") {
        init[f.key] = "5.5";
      } else if (f.key === "your_side_pct") {
        init[f.key] = "2.75";
      } else if (f.key === "engagement_type") {
        init[f.key] = "Retainer";
      } else {
        init[f.key] = "";
      }
    });
    return init;
  });

  const computed = computeWonFields(industry, form);
  const primaryVal = getPrimaryValue(industry, computed, lead.value);

  const handleChange = (key: string, val: string) => {
    setForm(p => ({ ...p, [key]: val }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsl(0 0% 0% / 0.65)" }} onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-xl p-5 space-y-4 animate-scale-in"
        style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(140 12% 42% / 0.3)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(140 12% 42% / 0.15)" }}>
            <Trophy className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Close Deal — {lead.name}</h3>
            <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>
              {industry === "insurance" ? "Enter premium & commission details" : industry === "real_estate" ? "Enter property & commission details" : industry === "consulting" ? "Enter engagement details" : "Enter sale details to finalize"}
            </p>
          </div>
          <Badge className="text-[9px] h-5 shrink-0" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)", border: "1px solid hsl(140 12% 42% / 0.25)" }}>
            {PIPELINE_CONFIGS[industry]?.label}
          </Badge>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {fields.filter(f => shouldShowField(industry, f.key, form)).map(field => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5" style={{ color: "hsl(240 5% 70%)" }}>
                {field.label}
                {field.computed && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "hsl(240 6% 14%)", color: "hsl(240 5% 50%)" }}>auto</span>}
              </Label>
              {field.type === "select" ? (
                <Select value={form[field.key] || ""} onValueChange={v => handleChange(field.key, v)}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 16%)", color: "white" }}>
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.type === "number" || field.type === "percent" ? "number" : field.type === "date" ? "date" : "text"}
                  value={field.computed ? computed[field.key] || "" : form[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="h-9 text-xs"
                  style={{ background: field.computed ? "hsl(240 6% 12%)" : "hsl(240 8% 7%)", borderColor: "hsl(240 6% 16%)", color: field.computed ? "hsl(152 69% 45%)" : "white" }}
                  placeholder={field.label}
                  readOnly={field.computed}
                  step={field.type === "percent" ? "0.5" : undefined}
                />
              )}
              {field.hint && <p className="text-[10px]" style={{ color: "hsl(240 5% 40%)" }}>{field.hint}</p>}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
          <div>
            {(industry === "insurance" || industry === "real_estate") ? (
              <>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>Commission</span>
                <p className="text-lg font-bold" style={{ color: "hsl(152 69% 45%)" }}>
                  ${(industry === "insurance"
                    ? Number(computed.est_commission || 0)
                    : Number(computed.your_commission || 0)
                  ).toLocaleString()}
                </p>
                <p className="text-[10px]" style={{ color: "hsl(240 5% 50%)" }}>{getValueLabel(industry)}: ${primaryVal.toLocaleString()}</p>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>{getValueLabel(industry)}</span>
                <p className="text-lg font-bold" style={{ color: "hsl(152 69% 45%)" }}>${primaryVal.toLocaleString()}</p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="text-xs h-8" style={{ borderColor: "hsl(240 6% 18%)", color: "hsl(240 5% 70%)" }}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSave(computed, primaryVal)} className="text-xs h-8 gap-1.5" style={{ background: "hsl(140 12% 42%)" }}>
              <Trophy className="h-3.5 w-3.5" /> Close Deal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Client Info Sheet ── */
function ClientInfoSheet({ lead, industry, onClose, allStages, onMoveStage }: { lead: DemoLead; industry: string; onClose: () => void; allStages: StageConfig[]; onMoveStage: (id: string, stage: string) => void }) {
  const TypeIcon = BUSINESS_TYPE_ICON[industry] || Building2;
  const infoFields = LEAD_INFO_FIELDS[industry] || LEAD_INFO_FIELDS.generic;
  const secondaryVal = getSecondaryValue(industry, lead.wonDetails);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsl(0 0% 0% / 0.6)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl p-5 space-y-4 animate-scale-in" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 16%)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(140 12% 42% / 0.1)" }}>
              <TypeIcon className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{lead.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: "hsl(240 5% 46%)" }}>{lead.contact}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5"><X className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {lead.phone && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 70%)" }}>
              <Phone className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 58%)" }} /> {lead.phone}
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-xs truncate" style={{ color: "hsl(240 5% 70%)" }}>
              <Mail className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 58%)" }} /> <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.location && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 70%)" }}>
              <MapPin className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 58%)" }} /> {lead.location}
            </div>
          )}
          {lead.industry && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 70%)" }}>
              <Building2 className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 58%)" }} /> {lead.industry}
            </div>
          )}
        </div>

        {/* Business-type-specific lead info */}
        <div className="pt-1 space-y-2" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(140 12% 58%)" }}>
              {PIPELINE_CONFIGS[industry]?.label} Details
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {infoFields.map(f => {
              const val = lead.extraInfo?.[f.key] || "—";
              return (
                <div key={f.key} className="text-xs">
                  <span style={{ color: "hsl(240 5% 46%)" }}>{f.label}</span>
                  <p className="mt-0.5" style={{ color: "hsl(240 5% 80%)" }}>{val}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>{getValueLabel(industry)}</span>
            <p className="text-sm font-semibold" style={{ color: "hsl(152 69% 45%)" }}>${lead.value.toLocaleString()}</p>
            {secondaryVal && <p className="text-[10px]" style={{ color: "hsl(140 12% 58%)" }}>{secondaryVal}</p>}
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>Stage</span>
            <Select value={lead.stage} onValueChange={v => onMoveStage(lead.id, v)}>
              <SelectTrigger className="h-7 text-xs mt-0.5" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allStages.map(s => <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>Source</span>
            <p className="text-xs text-white mt-1">{lead.source}</p>
          </div>
        </div>

        {lead.notes && (
          <div className="pt-1" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>Notes</span>
            <p className="text-xs mt-1" style={{ color: "hsl(240 5% 70%)" }}>{lead.notes}</p>
          </div>
        )}

        {lead.wonDetails && (
          <div className="pt-1 space-y-1" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(140 12% 58%)" }}>Sale Details</span>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(lead.wonDetails).filter(([, v]) => v).map(([k, v]) => {
                const isMoney = ["annual_premium", "deal_value", "sale_price", "est_commission", "gross_commission", "your_commission", "contract_value", "monthly_fee", "project_fee"].includes(k);
                return (
                  <div key={k} className="text-xs" style={{ color: "hsl(240 5% 70%)" }}>
                    <span className="capitalize" style={{ color: "hsl(240 5% 46%)" }}>{k.replace(/_/g, " ")}: </span>
                    {isMoney ? `$${Number(v).toLocaleString()}` : k.includes("pct") ? `${v}%` : v}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lead.lossReason && (
          <div className="pt-1" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
            <span className="text-[10px] uppercase tracking-wider text-red-400">Loss Reason</span>
            <p className="text-xs mt-1" style={{ color: "hsl(240 5% 70%)" }}>{lead.lossReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemoPipelineTab() {
  const demoIndustry = sessionStorage.getItem("connect-demo-industry") || "";
  const lower = demoIndustry.toLowerCase();
  const initialIndustry = lower.includes("real estate") ? "real_estate" : lower.includes("consult") ? "consulting" : lower.includes("insurance") ? "insurance" : "generic";

  const [industry, setIndustry] = useState(initialIndustry);
  const [defaultIndustry, setDefaultIndustry] = useState(() => sessionStorage.getItem("connect-demo-default-pipeline") || initialIndustry);

  // Per-industry leads stored separately
  const [leadsByType, setLeadsByType] = useState<Record<string, DemoLead[]>>(() => {
    const stored = sessionStorage.getItem("connect-demo-leads-by-type");
    if (stored) { try { return JSON.parse(stored); } catch {} }
    return { ...DEMO_LEADS_BY_TYPE };
  });

  const leads = leadsByType[industry] || DEMO_LEADS_BY_TYPE[industry] || DEMO_LEADS_BY_TYPE.generic;
  const setLeads = useCallback((updater: DemoLead[] | ((prev: DemoLead[]) => DemoLead[])) => {
    setLeadsByType(prev => {
      const current = prev[industry] || DEMO_LEADS_BY_TYPE[industry] || [];
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [industry]: next };
    });
  }, [industry]);

  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});
  const [selectedLead, setSelectedLead] = useState<DemoLead | null>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const [pendingWonLead, setPendingWonLead] = useState<DemoLead | null>(null);
  const [celebration, setCelebration] = useState<{ amount: number; label: string } | null>(null);

  useEffect(() => {
    sessionStorage.setItem("connect-demo-leads-by-type", JSON.stringify(leadsByType));
  }, [leadsByType]);

  const handleSetDefault = () => {
    setDefaultIndustry(industry);
    sessionStorage.setItem("connect-demo-default-pipeline", industry);
  };

  const config = PIPELINE_CONFIGS[industry];
  const allStages = config.stages;
  const activeStages = allStages.filter(s => s.key !== "lost");
  const lostStageConfig = allStages.find(s => s.key === "lost");

  const lostLeads = leads.filter(l => l.stage === "lost");
  const activeLeads = leads.filter(l => l.stage !== "lost");

  const moveStage = useCallback((leadId: string, newStage: string) => {
    if (newStage === "bound") {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.stage !== "bound") {
        setPendingWonLead(lead);
        return;
      }
    }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
  }, [leads]);

  const handleWonSave = useCallback((details: Record<string, string>, finalValue: number) => {
    if (!pendingWonLead) return;
    setLeads(prev => prev.map(l =>
      l.id === pendingWonLead.id
        ? { ...l, stage: "bound", value: finalValue, wonDetails: details }
        : l
    ));
    setPendingWonLead(null);
    // For commission-based industries, show commission as the celebration amount
    let celAmount = finalValue;
    let celLabel = "Added to production";
    if (industry === "insurance") {
      celAmount = Number(details.est_commission) || Math.round(finalValue * 0.15);
      celLabel = "Commission Earned";
    } else if (industry === "real_estate") {
      celAmount = Number(details.your_commission) || Math.round(finalValue * 0.0275);
      celLabel = "Commission Earned";
    } else if (industry === "consulting") {
      celLabel = "Engagement Secured";
    }
    setCelebration({ amount: celAmount, label: celLabel });
  }, [pendingWonLead, industry]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDragId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
  };
  const handleDragOver = (e: React.DragEvent, stageKey: string) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStage(stageKey); };
  const handleDragLeave = () => setDragOverStage(null);
  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain") || dragId;
    if (leadId) moveStage(leadId, stageKey);
    setDragId(null); setDragOverStage(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverStage(null); };

  const TypeIcon = BUSINESS_TYPE_ICON[industry] || Building2;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: "0ms" }}>
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
            <TypeIcon className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
            {config.label} Pipeline
          </h3>
          <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>Drag leads between stages · Click to view details</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="h-8 w-[160px] text-xs" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PIPELINE_CONFIGS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      {cfg.label}
                      {key === defaultIndustry && <Star className="h-3 w-3 fill-current" style={{ color: "hsl(45 93% 58%)" }} />}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {industry !== defaultIndustry ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSetDefault} className="gap-1 h-8 text-xs px-2" style={{ borderColor: "hsl(240 6% 18%)", color: "hsl(240 5% 70%)" }}>
                  <Star className="h-3 w-3" /> Set Default
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">New leads from other areas will use this pipeline type</TooltipContent>
            </Tooltip>
          ) : (
            <Badge className="text-[9px] h-6 gap-1" style={{ background: "hsl(45 93% 58% / 0.12)", color: "hsl(45 93% 58%)", border: "1px solid hsl(45 93% 58% / 0.25)" }}>
              <Check className="h-3 w-3" /> Default
            </Badge>
          )}
          <Button size="sm" className="gap-1.5 h-8 text-xs" style={{ background: "hsl(140 12% 42%)" }}>
            <Plus className="h-3.5 w-3.5" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(0, 1fr))` }}>
        {activeStages.map((stage, colIdx) => {
          const stageLeads = activeLeads.filter(l => l.stage === stage.key);
          const totalValue = stageLeads.reduce((sum, l) => sum + l.value, 0);
          const expanded = expandedColumns[stage.key];
          const visibleLeads = expanded ? stageLeads : stageLeads.slice(0, COLUMN_LIMIT);
          const isOver = dragOverStage === stage.key;
          return (
            <div
              key={stage.key}
              className="space-y-2 animate-fade-in rounded-lg transition-colors duration-150"
              style={{
                animationDelay: `${colIdx * 100}ms`,
                ...(isOver ? { background: "hsl(140 12% 42% / 0.06)", outline: "1.5px dashed hsl(140 12% 42% / 0.4)", outlineOffset: "-1px", borderRadius: "0.5rem" } : {}),
              }}
              onDragOver={e => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, stage.key)}
            >
              <div className={`rounded-lg px-3 py-2 border ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{stage.label}</span>
                  <Badge className="text-[9px] h-5" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)", border: "1px solid hsl(140 12% 42% / 0.25)" }}>{stageLeads.length}</Badge>
                </div>
                {totalValue > 0 && (
                  <>
                    <p className="text-[10px] mt-0.5 opacity-70">${totalValue.toLocaleString()}</p>
                    {stage.key === "bound" && (industry === "insurance" || industry === "real_estate") && (() => {
                      const totalComm = stageLeads.reduce((sum, l) => {
                        if (!l.wonDetails) return sum;
                        if (industry === "insurance") return sum + (Number(l.wonDetails.est_commission) || 0);
                        if (industry === "real_estate") return sum + (Number(l.wonDetails.your_commission) || 0);
                        return sum;
                      }, 0);
                      return totalComm > 0 ? <p className="text-[9px] mt-0.5" style={{ color: "hsl(140 12% 58%)" }}>Commission: ${totalComm.toLocaleString()}</p> : null;
                    })()}
                  </>
                )}
              </div>
              <div className="space-y-2 min-h-[80px]">
                {visibleLeads.map((lead, cardIdx) => {
                  const secondary = getSecondaryValue(industry, lead.wonDetails);
                  return (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={e => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedLead(lead)}
                      className={`group animate-fade-in cursor-grab active:cursor-grabbing transition-all duration-150 ${dragId === lead.id ? "opacity-40 scale-95" : "hover:scale-[1.02]"}`}
                      style={{
                        background: "hsl(240 8% 9%)",
                        borderColor: dragId === lead.id ? "hsl(140 12% 42% / 0.5)" : "hsl(240 6% 14%)",
                        animationDelay: `${colIdx * 100 + cardIdx * 60 + 150}ms`,
                      }}
                    >
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: "hsl(240 5% 46%)" }} />
                          <p className="text-xs font-medium text-white truncate flex-1">{lead.name}</p>
                          {lead.wonDetails && <Trophy className="h-3 w-3 shrink-0" style={{ color: "hsl(45 93% 58%)" }} />}
                        </div>
                        <p className="text-[10px] truncate" style={{ color: "hsl(240 5% 46%)" }}>{lead.contact}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 50%)" }}>{lead.source}</Badge>
                          {lead.value > 0 && (
                            <div className="text-right">
                              <p className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: "hsl(152 69% 45%)" }}>
                                <DollarSign className="h-2.5 w-2.5" /> {lead.value.toLocaleString()}
                              </p>
                              {secondary && <p className="text-[8px]" style={{ color: "hsl(140 12% 50%)" }}>{secondary}</p>}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {stageLeads.length > COLUMN_LIMIT && (
                  <button
                    onClick={() => setExpandedColumns(prev => ({ ...prev, [stage.key]: !prev[stage.key] }))}
                    className="w-full text-center text-xs py-2 transition-colors hover:text-white"
                    style={{ color: "hsl(240 5% 46%)" }}
                  >
                    {expanded ? "Show less" : `Show all ${stageLeads.length} leads`}
                  </button>
                )}
              </div>
              {stageLeads.length === 0 && <p className="text-xs text-center py-6" style={{ color: "hsl(240 5% 46%)" }}>No leads</p>}
            </div>
          );
        })}
      </div>

      {/* Lost Section */}
      {lostStageConfig && (
        <div
          className="rounded-lg border-2 border-dashed p-3 transition-colors duration-150"
          style={{ borderColor: dragOverStage === "lost" ? "hsl(0 60% 50% / 0.5)" : "hsl(240 6% 18%)", background: dragOverStage === "lost" ? "hsl(0 60% 50% / 0.05)" : "transparent" }}
          onDragOver={e => handleDragOver(e, "lost")}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, "lost")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${lostStageConfig.color}`}>
                {lostStageConfig.label}
              </Badge>
              <span className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>{lostLeads.length}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 cursor-help" style={{ color: "hsl(240 5% 30%)" }} />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  Drag leads here to mark as lost.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>Drop leads here to mark as lost</p>
              {lostLeads.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" style={{ borderColor: "hsl(240 6% 18%)", color: "hsl(240 5% 70%)" }}>
                      <Users className="h-3 w-3" /> View All Lost ({lostLeads.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 16%)" }}>
                    <DialogHeader>
                      <DialogTitle className="text-white">Lost Clients ({lostLeads.length})</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                      {lostLeads.map((lead) => (
                        <Card key={lead.id} className="cursor-pointer transition-colors" style={{ background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 14%)" }} onClick={() => setSelectedLead(lead)}>
                          <CardContent className="p-2 px-3 flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{lead.name}</span>
                            {lead.lossReason && (
                              <span className="text-[10px] ml-auto" style={{ color: "hsl(240 5% 46%)" }}>{lead.lossReason}</span>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {pendingWonLead && (
      <WonDetailsDialog
        lead={pendingWonLead}
        industry={industry}
        onSave={handleWonSave}
        onCancel={() => setPendingWonLead(null)}
      />
    )}

    {celebration && (
      <WonCelebration amount={celebration.amount} label={celebration.label} onDone={() => setCelebration(null)} />
    )}

    {selectedLead && !pendingWonLead && (
      <ClientInfoSheet
        lead={selectedLead}
        industry={industry}
        onClose={() => setSelectedLead(null)}
        allStages={allStages}
        onMoveStage={(id, stage) => { moveStage(id, stage); setSelectedLead(prev => prev ? { ...prev, stage } : null); }}
      />
    )}
    </TooltipProvider>
  );
}
