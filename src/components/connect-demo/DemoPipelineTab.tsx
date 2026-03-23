import { useState, useEffect, useRef, useCallback } from "react";
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
  Building2, DollarSign, Users, Info, Plus, Phone, Mail, MapPin, Calendar, X, GripVertical,
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

type DemoLead = {
  id: string; name: string; contact: string; stage: string; value: number; source: string;
  lossReason?: string; renewalDate?: string;
  phone?: string; email?: string; location?: string; industry?: string; notes?: string;
};

const DEMO_LEADS: DemoLead[] = [
  { id: "1", name: "Greenfield Industries", contact: "Sarah Mitchell", stage: "prospect", value: 15000, source: "Referral", phone: "(555) 234-8901", email: "s.mitchell@greenfield.com", location: "Austin, TX", industry: "Agriculture", notes: "Looking for full commercial package" },
  { id: "2", name: "Apex Technologies", contact: "James Park", stage: "prospect", value: 22000, source: "Website", phone: "(555) 345-6789", email: "j.park@apextech.io", location: "San Jose, CA", industry: "Technology", notes: "Interested in cyber liability" },
  { id: "3", name: "Blue Ridge Capital", contact: "Jessica Torres", stage: "prospect", value: 11000, source: "LinkedIn", phone: "(555) 456-1234", email: "jtorres@blueridge.com", location: "Charlotte, NC", industry: "Financial Services" },
  { id: "4", name: "Coastal Development Co", contact: "Robert Nguyen", stage: "quoting", value: 35000, source: "Cold outreach", phone: "(555) 567-2345", email: "rnguyen@coastal-dev.com", location: "Miami, FL", industry: "Real Estate", notes: "Multi-property portfolio" },
  { id: "5", name: "Prime Advisors Group", contact: "David Kowalski", stage: "quoting", value: 18500, source: "Referral", phone: "(555) 678-3456", email: "d.kowalski@primeadv.com", location: "Chicago, IL", industry: "Consulting" },
  { id: "6", name: "TechVentures Inc", contact: "Marcus Chen", stage: "quoting", value: 14000, source: "Partner", phone: "(555) 789-4567", email: "m.chen@techventures.com", location: "Seattle, WA", industry: "Technology" },
  { id: "7", name: "Sunrise Properties", contact: "Linda Park", stage: "presenting", value: 27000, source: "Networking", phone: "(555) 890-5678", email: "linda@sunriseprop.com", location: "Phoenix, AZ", industry: "Real Estate" },
  { id: "8", name: "Westfield Manufacturing", contact: "Tom Bradley", stage: "presenting", value: 15000, source: "Referral", phone: "(555) 901-6789", email: "tbradley@westfield.com", location: "Detroit, MI", industry: "Manufacturing" },
  { id: "9", name: "Nova Health Systems", contact: "Priya Sharma", stage: "bound", value: 42000, source: "Referral", phone: "(555) 012-7890", email: "p.sharma@novahealth.com", location: "Denver, CO", industry: "Healthcare" },
  { id: "10", name: "Bright Future Foundation", contact: "Amanda Foster", stage: "bound", value: 8500, source: "Event", phone: "(555) 123-8901", email: "afoster@brightfuture.org", location: "Portland, OR", industry: "Non-Profit" },
  { id: "11", name: "Alpine Group", contact: "James Whitfield", stage: "bound", value: 31000, source: "Website", phone: "(555) 234-9012", email: "j.whitfield@alpine.com", location: "Salt Lake City, UT", industry: "Construction" },
  { id: "12", name: "Pacific Rim Trading", contact: "Kevin Tanaka", stage: "bound", value: 19500, source: "Cold outreach", phone: "(555) 345-0123", email: "ktanaka@pacrim.com", location: "Los Angeles, CA", industry: "Import/Export" },
  { id: "13", name: "Redwood Consulting", contact: "Elena Volkov", stage: "bound", value: 24000, source: "LinkedIn", phone: "(555) 456-1235", email: "evolkov@redwood.com", location: "San Francisco, CA", industry: "Consulting" },
  { id: "14", name: "Metro Solutions", contact: "Carlos Rivera", stage: "lost", value: 20000, source: "Referral", lossReason: "Went with competitor", phone: "(555) 567-2346", email: "c.rivera@metro.com", location: "Dallas, TX", industry: "IT Services" },
  { id: "15", name: "Harbor View LLC", contact: "Michelle Chang", stage: "lost", value: 16000, source: "Website", lossReason: "Budget constraints", phone: "(555) 678-3457", email: "mchang@harborview.com", location: "Boston, MA", industry: "Hospitality" },
  { id: "16", name: "Summit Partners", contact: "Andrew Blake", stage: "lost", value: 12000, source: "Partner", lossReason: "Timing not right", phone: "(555) 789-4568", email: "ablake@summit.com", location: "New York, NY", industry: "Finance" },
];

const COLUMN_LIMIT = 5;

/* ── Client Info Sheet ── */
function ClientInfoSheet({ lead, onClose, allStages, onMoveStage }: { lead: DemoLead; onClose: () => void; allStages: StageConfig[]; onMoveStage: (id: string, stage: string) => void }) {
  const stageLabel = allStages.find(s => s.key === lead.stage)?.label || lead.stage;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsl(0 0% 0% / 0.6)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl p-5 space-y-4 animate-scale-in" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 16%)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">{lead.name}</h3>
            <p className="text-xs mt-0.5" style={{ color: "hsl(240 5% 46%)" }}>{lead.contact}</p>
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

        <div className="flex items-center gap-3 pt-1" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>Value</span>
            <p className="text-sm font-semibold" style={{ color: "hsl(152 69% 45%)" }}>${lead.value.toLocaleString()}</p>
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

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

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
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
  }, []);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDragId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageKey);
  };

  const handleDragLeave = () => setDragOverStage(null);

  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain") || dragId;
    if (leadId) moveStage(leadId, stageKey);
    setDragId(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverStage(null);
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: "0ms" }}>
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
            <Building2 className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />
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
                {visibleLeads.map((lead, cardIdx) => (
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
                      </div>
                      <p className="text-[10px] truncate" style={{ color: "hsl(240 5% 46%)" }}>{lead.contact}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 50%)" }}>{lead.source}</Badge>
                        {lead.value > 0 && (
                          <p className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: "hsl(152 69% 45%)" }}>
                            <DollarSign className="h-2.5 w-2.5" /> {lead.value.toLocaleString()}
                          </p>
                        )}
                      </div>
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

      {/* Lost Section — drop target */}
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

    {/* Client Info overlay */}
    {selectedLead && (
      <ClientInfoSheet
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        allStages={allStages}
        onMoveStage={(id, stage) => { moveStage(id, stage); setSelectedLead(prev => prev ? { ...prev, stage } : null); }}
      />
    )}
    </TooltipProvider>
  );
}
