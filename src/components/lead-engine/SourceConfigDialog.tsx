import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings, Linkedin, Search, MessageSquare, FileText, Building2, CloudRain, Cloud, BarChart3, Car, ShieldAlert, Home, Landmark, HardHat, Receipt, TrendingUp, Database, MapPin, ShoppingBag, Globe, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUpsertSourceConfig, type LeadSourceConfig } from "@/hooks/useLeadEngine";

const SOURCE_META: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}> = {
  LinkedIn: {
    icon: Linkedin, color: "text-blue-600", bg: "bg-blue-500/10",
    fields: [
      { key: "keywords", label: "Monitoring Keywords", placeholder: "insurance quote, new business, looking for coverage", type: "textarea" },
      { key: "industries", label: "Target Industries", placeholder: "Construction, Restaurants, Manufacturing" },
      { key: "states", label: "Target States", placeholder: "CT, NY, NJ, MA" },
    ],
  },
  Reddit: {
    icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-500/10",
    fields: [
      { key: "subreddits", label: "Subreddits to Monitor", placeholder: "r/smallbusiness, r/entrepreneur, r/insurance" },
      { key: "keywords", label: "Keywords", placeholder: "need insurance, looking for coverage, new LLC", type: "textarea" },
    ],
  },
  "Business Filings": {
    icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10",
    fields: [
      { key: "states", label: "States to Monitor", placeholder: "CT, NY, NJ" },
      { key: "entity_types", label: "Entity Types", placeholder: "LLC, Corp, LP" },
      { key: "permit_types", label: "Permit Types", placeholder: "Construction, Liquor, Food Service" },
    ],
  },
  "Permit Database": {
    icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10",
    fields: [
      { key: "states", label: "States", placeholder: "CT, NY" },
      { key: "permit_types", label: "Permit Types", placeholder: "Construction, Liquor" },
    ],
  },
  "FEMA Flood Zones": {
    icon: CloudRain, color: "text-blue-500", bg: "bg-blue-500/10",
    fields: [
      { key: "states", label: "Target States", placeholder: "FL, LA, TX, NJ" },
      { key: "flood_zones", label: "Flood Zones to Target", placeholder: "A, AE, VE (high-risk zones)" },
    ],
  },
  "NOAA Storm Events": {
    icon: Cloud, color: "text-slate-500", bg: "bg-slate-500/10",
    fields: [
      { key: "states", label: "States to Monitor", placeholder: "TX, CO, KS, FL, OK" },
      { key: "event_types", label: "Event Types", placeholder: "Hail, Wind, Tornado, Flood" },
      { key: "min_damage", label: "Min Property Damage ($)", placeholder: "1000" },
    ],
  },
  "Census / ACS Data": {
    icon: BarChart3, color: "text-indigo-500", bg: "bg-indigo-500/10",
    fields: [
      { key: "states", label: "States", placeholder: "CT, NY, FL, TX, CA" },
      { key: "focus", label: "Focus Areas", placeholder: "Owner-occupied, High home value, Auto gap" },
    ],
  },
  "NHTSA Vehicles": {
    icon: Car, color: "text-red-500", bg: "bg-red-500/10",
    fields: [
      { key: "focus", label: "Focus", placeholder: "Recalls, VIN decode, Crash stats" },
      { key: "vehicle_types", label: "Vehicle Types", placeholder: "Passenger, Truck, Motorcycle" },
    ],
  },
  "OpenFEMA NFIP": {
    icon: ShieldAlert, color: "text-cyan-500", bg: "bg-cyan-500/10",
    fields: [
      { key: "states", label: "States", placeholder: "FL, LA, TX, NJ, NY" },
      { key: "focus", label: "Focus", placeholder: "High claims + low policies, Disaster declarations" },
    ],
  },
  "HUD Housing Data": {
    icon: Home, color: "text-violet-500", bg: "bg-violet-500/10",
    fields: [
      { key: "states", label: "States", placeholder: "FL, TX, CA, NY" },
      { key: "data_types", label: "Data Types", placeholder: "Vacancy, Fair Market Rents, LIHTC" },
    ],
  },
  "Property Records": {
    icon: Landmark, color: "text-teal-500", bg: "bg-teal-500/10",
    fields: [
      { key: "states", label: "States", placeholder: "FL, TX, CA, IL, NY" },
      { key: "property_types", label: "Property Types", placeholder: "Residential, Commercial, Multi-family" },
      { key: "min_value", label: "Min Property Value ($)", placeholder: "200000" },
    ],
  },
  "Building Permits": {
    icon: HardHat, color: "text-yellow-600", bg: "bg-yellow-500/10",
    fields: [
      { key: "states", label: "States / Cities", placeholder: "Chicago, NYC, LA, Seattle, Denver" },
      { key: "permit_types", label: "Permit Types", placeholder: "Roof, New Construction, Renovation" },
    ],
  },
  "Tax Delinquency": {
    icon: Receipt, color: "text-rose-500", bg: "bg-rose-500/10",
    fields: [
      { key: "states", label: "States / Counties", placeholder: "Cook County IL, NYC, FL" },
      { key: "min_amount", label: "Min Delinquent Amount ($)", placeholder: "5000" },
    ],
  },
  "Google Trends": {
    icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10",
    fields: [
      { key: "keywords", label: "Keywords to Monitor", placeholder: "insurance went up, hail damage, need insurance", type: "textarea" },
      { key: "states", label: "Target States", placeholder: "FL, TX, CA" },
    ],
  },
  "ATTOM Data": {
    icon: Database, color: "text-purple-600", bg: "bg-purple-500/10",
    fields: [
      { key: "api_key", label: "ATTOM API Key", placeholder: "Enter ATTOM API key" },
      { key: "states", label: "Target States", placeholder: "FL, TX, CA, IL, NY" },
      { key: "property_types", label: "Property Types", placeholder: "SFR, Condo, Multi-family" },
    ],
  },
  "RentCast": {
    icon: Home, color: "text-orange-600", bg: "bg-orange-500/10",
    fields: [
      { key: "api_key", label: "RentCast API Key", placeholder: "Enter RentCast API key" },
      { key: "states", label: "Target States", placeholder: "FL, TX, CA" },
      { key: "min_value", label: "Min Property Value ($)", placeholder: "200000" },
    ],
  },
  "Regrid Parcels": {
    icon: MapPin, color: "text-lime-600", bg: "bg-lime-500/10",
    fields: [
      { key: "api_key", label: "Regrid API Key", placeholder: "Enter Regrid API key" },
      { key: "states", label: "Target States", placeholder: "FL, TX, CA, AZ" },
    ],
  },
  "BatchData": {
    icon: Database, color: "text-sky-600", bg: "bg-sky-500/10",
    fields: [
      { key: "api_key", label: "BatchData API Key", placeholder: "Enter BatchData API key" },
      { key: "states", label: "Target States", placeholder: "All 50 states" },
      { key: "data_types", label: "Data Types", placeholder: "Property details, Skip tracing, Ownership" },
    ],
  },
  "PropStream": {
    icon: ShoppingBag, color: "text-pink-600", bg: "bg-pink-500/10",
    fields: [
      { key: "states", label: "Target States", placeholder: "All 50 states — 160M+ properties" },
      { key: "list_types", label: "List Types", placeholder: "Recent sales, Pre-foreclosure, Absentee owners" },
    ],
  },
  "FL Citizens Non-Renewal": {
    icon: AlertTriangle, color: "text-red-600", bg: "bg-red-500/10",
    fields: [
      { key: "counties", label: "FL Counties", placeholder: "Miami-Dade, Broward, Palm Beach, Hillsborough" },
      { key: "policy_types", label: "Policy Types", placeholder: "Homeowners, Wind-only" },
    ],
  },
  "State Socrata Portals": {
    icon: Globe, color: "text-blue-700", bg: "bg-blue-600/10",
    fields: [
      { key: "states", label: "States (Socrata)", placeholder: "IL, WA, CO, DC, OR" },
      { key: "dataset_ids", label: "Dataset IDs (optional)", placeholder: "ww2d-vylh, 5mzw-sjtu" },
    ],
  },
  "County ArcGIS": {
    icon: MapPin, color: "text-emerald-700", bg: "bg-emerald-600/10",
    fields: [
      { key: "states", label: "States", placeholder: "FL, OH, MN, AZ, NC" },
      { key: "counties", label: "Counties", placeholder: "Miami-Dade, Franklin, Hennepin, Maricopa" },
    ],
  },
  "CT Property Transfers": {
    icon: Landmark, color: "text-emerald-600", bg: "bg-emerald-500/10",
    fields: [
      { key: "min_sale_amount", label: "Min Sale Amount ($)", placeholder: "100000" },
      { key: "towns", label: "CT Towns (optional)", placeholder: "Hartford, Fairfield, New Haven" },
    ],
  },
  "NYC ACRIS": {
    icon: Building2, color: "text-blue-700", bg: "bg-blue-600/10",
    fields: [
      { key: "boroughs", label: "Boroughs", placeholder: "Manhattan, Brooklyn, Queens, Bronx, Staten Island" },
      { key: "doc_types", label: "Document Types", placeholder: "DEED, MTGE (Mortgage)" },
    ],
  },
  "MassGIS Parcels": {
    icon: MapPin, color: "text-violet-600", bg: "bg-violet-500/10",
    fields: [
      { key: "towns", label: "MA Towns", placeholder: "BOSTON, CAMBRIDGE, WORCESTER" },
      { key: "use_codes", label: "Use Codes", placeholder: "1010 (SFR), 1020 (Condo), 1040 (Two-Family)" },
      { key: "min_value", label: "Min Total Value ($)", placeholder: "300000" },
    ],
  },
  "NJ MOD-IV / Sales": {
    icon: FileText, color: "text-orange-700", bg: "bg-orange-600/10",
    fields: [
      { key: "counties", label: "NJ Counties", placeholder: "Bergen, Essex, Hudson, Morris, Monmouth" },
      { key: "property_class", label: "Property Class", placeholder: "2 (Residential), 3A (Farm), 4A (Commercial)" },
    ],
  },
  "RI Coastal (FEMA)": {
    icon: CloudRain, color: "text-cyan-600", bg: "bg-cyan-500/10",
    fields: [
      { key: "flood_zones", label: "Flood Zones", placeholder: "A, AE, VE (coastal high hazard)" },
      { key: "towns", label: "RI Towns", placeholder: "Newport, Westerly, Narragansett, Providence" },
    ],
  },
  ZoomInfo: {
    icon: Search, color: "text-primary", bg: "bg-primary/10",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Enter ZoomInfo API key" },
      { key: "enrichment_fields", label: "Enrichment Fields", placeholder: "phone, email, revenue, employee_count" },
    ],
  },
  "CRM Integration": {
    icon: Building2, color: "text-accent", bg: "bg-accent/10",
    fields: [
      { key: "crm_type", label: "CRM Platform", placeholder: "Applied Epic, Salesforce, HubSpot" },
      { key: "api_key", label: "API Key / Connection String", placeholder: "Enter API key" },
      { key: "sync_direction", label: "Sync Direction", placeholder: "bidirectional, import-only, export-only" },
    ],
  },
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourceName: string;
  existingConfig?: LeadSourceConfig | null;
};

export function SourceConfigDialog({ open, onOpenChange, sourceName, existingConfig }: Props) {
  const meta = SOURCE_META[sourceName] || { icon: Settings, color: "text-primary", bg: "bg-primary/10", fields: [] };
  const upsert = useUpsertSourceConfig();
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingConfig) {
      setIsActive(existingConfig.is_active);
      setSettings((existingConfig.settings || {}) as Record<string, string>);
    } else {
      setIsActive(false);
      setSettings({});
    }
  }, [existingConfig, sourceName]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ source: sourceName, is_active: isActive, settings });
      toast.success(`${sourceName} configuration saved`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to save configuration");
    }
  };

  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg ${meta.bg} flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${meta.color}`} />
            </div>
            Configure {sourceName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Enable real-time monitoring</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {meta.fields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  value={settings[f.key] || ""}
                  onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={2}
                />
              ) : (
                <Input
                  value={settings[f.key] || ""}
                  onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}

          {existingConfig?.last_sync_at && (
            <div className="text-xs text-muted-foreground">
              Last synced: {new Date(existingConfig.last_sync_at).toLocaleString()}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
