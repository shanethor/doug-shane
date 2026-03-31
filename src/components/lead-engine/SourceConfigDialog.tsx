import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings, Linkedin, Search, MessageSquare, FileText, Building2, CloudRain, Cloud, BarChart3, Car, ShieldAlert, Home, Landmark, HardHat, Receipt, TrendingUp } from "lucide-react";
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
