import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2, DollarSign, RefreshCw, Users, Info, CalendarDays, Plus,
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

type DemoLead = { id: string; name: string; contact: string; stage: string; value: number; source: string; lossReason?: string; renewalDate?: string; };

const DEMO_LEADS: DemoLead[] = [
  { id: "1", name: "Greenfield Industries", contact: "Sarah Mitchell", stage: "prospect", value: 15000, source: "Referral" },
  { id: "2", name: "Apex Technologies", contact: "James Park", stage: "prospect", value: 22000, source: "Website" },
  { id: "3", name: "Blue Ridge Capital", contact: "Jessica Torres", stage: "prospect", value: 11000, source: "LinkedIn" },
  { id: "4", name: "Coastal Development Co", contact: "Robert Nguyen", stage: "quoting", value: 35000, source: "Cold outreach" },
  { id: "5", name: "Prime Advisors Group", contact: "David Kowalski", stage: "quoting", value: 18500, source: "Referral" },
  { id: "6", name: "TechVentures Inc", contact: "Marcus Chen", stage: "quoting", value: 14000, source: "Partner" },
  { id: "7", name: "Sunrise Properties", contact: "Linda Park", stage: "presenting", value: 27000, source: "Networking" },
  { id: "8", name: "Westfield Manufacturing", contact: "Tom Bradley", stage: "presenting", value: 15000, source: "Referral" },
  { id: "9", name: "Nova Health Systems", contact: "Priya Sharma", stage: "bound", value: 42000, source: "Referral" },
  { id: "10", name: "Bright Future Foundation", contact: "Amanda Foster", stage: "bound", value: 8500, source: "Event" },
  { id: "11", name: "Alpine Group", contact: "James Whitfield", stage: "bound", value: 31000, source: "Website" },
  { id: "12", name: "Pacific Rim Trading", contact: "Kevin Tanaka", stage: "bound", value: 19500, source: "Cold outreach" },
  { id: "13", name: "Redwood Consulting", contact: "Elena Volkov", stage: "bound", value: 24000, source: "LinkedIn" },
  { id: "14", name: "Metro Solutions", contact: "Carlos Rivera", stage: "lost", value: 20000, source: "Referral", lossReason: "Went with competitor" },
  { id: "15", name: "Harbor View LLC", contact: "Michelle Chang", stage: "lost", value: 16000, source: "Website", lossReason: "Budget constraints" },
  { id: "16", name: "Summit Partners", contact: "Andrew Blake", stage: "lost", value: 12000, source: "Partner", lossReason: "Timing not right" },
];

const COLUMN_LIMIT = 5;

export default function DemoPipelineTab() {
  const demoIndustry = sessionStorage.getItem("connect-demo-industry") || "";
  const lower = demoIndustry.toLowerCase();
  const initialIndustry = lower.includes("real estate") ? "real_estate" : lower.includes("consult") ? "consulting" : lower.includes("insurance") ? "insurance" : "generic";

  const [industry, setIndustry] = useState(initialIndustry);
  const [leads, setLeads] = useState(DEMO_LEADS);
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

  const config = PIPELINE_CONFIGS[industry];
  const allStages = config.stages;
  const activeStages = allStages.filter(s => s.key !== "lost");
  const lostStageConfig = allStages.find(s => s.key === "lost");

  const lostLeads = leads.filter(l => l.stage === "lost");
  const activeLeads = leads.filter(l => l.stage !== "lost");

  const moveStage = (leadId: string, newStage: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4" style={{ animation: "smoothFadeSlide 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
            <Building2 className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} />
            {config.label} Pipeline
          </h3>
          <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>Demo pipeline with sample data</p>
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
          <Button size="sm" className="gap-1.5 h-8 text-xs" style={{ background: "hsl(174 97% 22%)" }}>
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
          return (
            <div key={stage.key} className="space-y-2" style={{ animation: `smoothFadeSlide 0.5s cubic-bezier(0.16,1,0.3,1) ${colIdx * 120}ms both` }}>
              <div className={`rounded-lg px-3 py-2 border ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{stage.label}</span>
                  <Badge variant="secondary" className="text-[9px] h-5">{stageLeads.length}</Badge>
                </div>
                {totalValue > 0 && <p className="text-[10px] mt-0.5 opacity-70">${totalValue.toLocaleString()}</p>}
              </div>
              <div className="space-y-2 min-h-[80px]">
                {visibleLeads.map((lead, cardIdx) => (
                  <Card key={lead.id} className="group" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animation: `smoothFadeSlide 0.4s cubic-bezier(0.16,1,0.3,1) ${colIdx * 120 + cardIdx * 60 + 200}ms both` }}>
                    <CardContent className="p-3 space-y-1.5">
                      <p className="text-xs font-medium text-white truncate">{lead.name}</p>
                      <p className="text-[10px] truncate" style={{ color: "hsl(240 5% 46%)" }}>{lead.contact}</p>
                      <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 50%)" }}>{lead.source}</Badge>
                      {lead.value > 0 && (
                        <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: "hsl(152 69% 45%)" }}>
                          <DollarSign className="h-2.5 w-2.5" /> {lead.value.toLocaleString()}
                        </p>
                      )}
                      <Select value={lead.stage} onValueChange={(v) => moveStage(lead.id, v)}>
                        <SelectTrigger className="h-6 text-[10px] mt-1" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allStages.map(s => (
                            <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
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
        <div className="rounded-lg border-2 border-dashed p-3" style={{ borderColor: "hsl(240 6% 18%)" }}>
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
                  Leads that went in another direction.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>Move leads here to mark as lost</p>
              {lostLeads.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" style={{ borderColor: "hsl(240 6% 18%)", color: "hsl(240 5% 70%)" }}>
                      <Users className="h-3 w-3" /> View All Lost ({lostLeads.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Lost Clients ({lostLeads.length})</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                      {lostLeads.map((lead) => (
                        <Card key={lead.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-2 px-3 flex items-center gap-2">
                            <span className="text-sm font-medium">{lead.name}</span>
                            {lead.lossReason && (
                              <span className="text-[10px] text-muted-foreground ml-auto">{lead.lossReason}</span>
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
    </TooltipProvider>
  );
}
