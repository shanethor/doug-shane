import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Building2, DollarSign, Users, Info, Plus, Phone, Mail, MapPin, Calendar, X, GripVertical, Trophy, Sparkles, Home, Briefcase, Shield,
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

const DEMO_LEADS: DemoLead[] = [
  { id: "1", name: "Greenfield Industries", contact: "Sarah Mitchell", stage: "prospect", value: 15000, source: "Referral", phone: "(555) 234-8901", email: "s.mitchell@greenfield.com", location: "Austin, TX", industry: "Agriculture", notes: "Looking for full commercial package", extraInfo: { current_carrier: "Hartford", renewal_date: "2025-09-15", current_premium: "$12,400", company_size: "50-100", buyer_seller: "Buyer", price_range: "$500K-$1M", pain_point: "Manual processes", budget_range: "$50K-$100K" } },
  { id: "2", name: "Apex Technologies", contact: "James Park", stage: "prospect", value: 22000, source: "Website", phone: "(555) 345-6789", email: "j.park@apextech.io", location: "San Jose, CA", industry: "Technology", notes: "Interested in cyber liability", extraInfo: { current_carrier: "Chubb", renewal_date: "2025-11-01", current_premium: "$18,200", company_size: "200+", pain_point: "Scaling challenges", budget_range: "$100K+", decision_horizon: "Q3 2025" } },
  { id: "3", name: "Blue Ridge Capital", contact: "Jessica Torres", stage: "prospect", value: 11000, source: "LinkedIn", phone: "(555) 456-1234", email: "jtorres@blueridge.com", location: "Charlotte, NC", industry: "Financial Services", extraInfo: { current_carrier: "Travelers", renewal_date: "2025-08-01", current_premium: "$9,500", company_size: "10-50", contact_role: "CFO", price_range: "$1M-$2M" } },
  { id: "4", name: "Coastal Development Co", contact: "Robert Nguyen", stage: "quoting", value: 35000, source: "Cold outreach", phone: "(555) 567-2345", email: "rnguyen@coastal-dev.com", location: "Miami, FL", industry: "Real Estate", notes: "Multi-property portfolio", extraInfo: { property_type_info: "Commercial", buyer_seller: "Seller", price_range: "$2M-$5M", current_carrier: "Liberty Mutual", renewal_date: "2025-07-15" } },
  { id: "5", name: "Prime Advisors Group", contact: "David Kowalski", stage: "quoting", value: 18500, source: "Referral", phone: "(555) 678-3456", email: "d.kowalski@primeadv.com", location: "Chicago, IL", industry: "Consulting", extraInfo: { pain_point: "Client retention", budget_range: "$25K-$50K", decision_horizon: "60 days", company_size: "10-50" } },
  { id: "6", name: "TechVentures Inc", contact: "Marcus Chen", stage: "quoting", value: 14000, source: "Partner", phone: "(555) 789-4567", email: "m.chen@techventures.com", location: "Seattle, WA", industry: "Technology", extraInfo: { current_carrier: "AIG", renewal_date: "2025-10-01", current_premium: "$11,800", company_size: "100-200" } },
  { id: "7", name: "Sunrise Properties", contact: "Linda Park", stage: "presenting", value: 27000, source: "Networking", phone: "(555) 890-5678", email: "linda@sunriseprop.com", location: "Phoenix, AZ", industry: "Real Estate", extraInfo: { property_type_info: "Residential", buyer_seller: "Buyer", price_range: "$800K-$1.2M" } },
  { id: "8", name: "Westfield Manufacturing", contact: "Tom Bradley", stage: "presenting", value: 15000, source: "Referral", phone: "(555) 901-6789", email: "tbradley@westfield.com", location: "Detroit, MI", industry: "Manufacturing", extraInfo: { current_carrier: "Zurich", renewal_date: "2025-12-01", current_premium: "$14,000", company_size: "200+", contact_role: "VP Operations" } },
  { id: "9", name: "Nova Health Systems", contact: "Priya Sharma", stage: "bound", value: 42000, source: "Referral", phone: "(555) 012-7890", email: "p.sharma@novahealth.com", location: "Denver, CO", industry: "Healthcare", wonDetails: { annual_premium: "42000", commission_pct: "12", est_commission: "5040", line_of_business: "Commercial P&C", close_date: "2025-03-01", deal_value: "42000" } },
  { id: "10", name: "Bright Future Foundation", contact: "Amanda Foster", stage: "bound", value: 8500, source: "Event", phone: "(555) 123-8901", email: "afoster@brightfuture.org", location: "Portland, OR", industry: "Non-Profit", wonDetails: { deal_value: "8500", close_date: "2025-02-15" } },
  { id: "11", name: "Alpine Group", contact: "James Whitfield", stage: "bound", value: 31000, source: "Website", phone: "(555) 234-9012", email: "j.whitfield@alpine.com", location: "Salt Lake City, UT", industry: "Construction", wonDetails: { deal_value: "31000", annual_premium: "31000", commission_pct: "15", est_commission: "4650", close_date: "2025-01-20" } },
  { id: "12", name: "Pacific Rim Trading", contact: "Kevin Tanaka", stage: "bound", value: 19500, source: "Cold outreach", phone: "(555) 345-0123", email: "ktanaka@pacrim.com", location: "Los Angeles, CA", industry: "Import/Export", wonDetails: { deal_value: "19500", close_date: "2025-02-28" } },
  { id: "13", name: "Redwood Consulting", contact: "Elena Volkov", stage: "bound", value: 24000, source: "LinkedIn", phone: "(555) 456-1235", email: "evolkov@redwood.com", location: "San Francisco, CA", industry: "Consulting", wonDetails: { engagement_type: "Retainer", monthly_fee: "4000", term_months: "6", contract_value: "24000", close_date: "2025-03-10" } },
  { id: "14", name: "Metro Solutions", contact: "Carlos Rivera", stage: "lost", value: 20000, source: "Referral", lossReason: "Went with competitor", phone: "(555) 567-2346", email: "c.rivera@metro.com", location: "Dallas, TX", industry: "IT Services" },
  { id: "15", name: "Harbor View LLC", contact: "Michelle Chang", stage: "lost", value: 16000, source: "Website", lossReason: "Budget constraints", phone: "(555) 678-3457", email: "mchang@harborview.com", location: "Boston, MA", industry: "Hospitality" },
  { id: "16", name: "Summit Partners", contact: "Andrew Blake", stage: "lost", value: 12000, source: "Partner", lossReason: "Timing not right", phone: "(555) 789-4568", email: "ablake@summit.com", location: "New York, NY", industry: "Finance" },
];

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
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>{getValueLabel(industry)}</span>
            <p className="text-lg font-bold" style={{ color: "hsl(152 69% 45%)" }}>${primaryVal.toLocaleString()}</p>
            {industry === "insurance" && computed.est_commission && (
              <p className="text-[10px]" style={{ color: "hsl(140 12% 58%)" }}>Commission: ${Number(computed.est_commission).toLocaleString()}</p>
            )}
            {industry === "real_estate" && computed.your_commission && (
              <p className="text-[10px]" style={{ color: "hsl(140 12% 58%)" }}>Your Commission: ${Number(computed.your_commission).toLocaleString()}</p>
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
  const [leads, setLeads] = useState<DemoLead[]>(() => {
    const stored = sessionStorage.getItem("connect-demo-leads");
    if (stored) { try { return JSON.parse(stored); } catch {} }
    return DEMO_LEADS;
  });
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});
  const [selectedLead, setSelectedLead] = useState<DemoLead | null>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const [pendingWonLead, setPendingWonLead] = useState<DemoLead | null>(null);
  const [celebration, setCelebration] = useState<{ amount: number; label: string } | null>(null);

  useEffect(() => {
    sessionStorage.setItem("connect-demo-leads", JSON.stringify(leads));
  }, [leads]);

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
    const celLabel = industry === "insurance" ? "Added to book of business" : industry === "real_estate" ? "Commission earned" : industry === "consulting" ? "Engagement secured" : "Added to production";
    setCelebration({ amount: finalValue, label: celLabel });
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
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="h-8 w-[160px] text-xs" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PIPELINE_CONFIGS).map(([key, cfg]) => (
                <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                {totalValue > 0 && <p className="text-[10px] mt-0.5 opacity-70">${totalValue.toLocaleString()}</p>}
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
