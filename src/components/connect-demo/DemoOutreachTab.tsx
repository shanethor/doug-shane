import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  RotateCcw, Phone, Mail, MessageSquare, Linkedin,
  Calendar, Gift, Star, Clock, Check, AlertTriangle,
  ChevronDown, ChevronUp,
} from "lucide-react";

interface CadenceContact {
  id: string;
  name: string;
  company: string;
  tier: "S" | "A" | "B" | "C";
  cadenceDays: number;
  lastTouch: string;
  nextTouch: string;
  touchCount: number;
  overdue: boolean;
  lastTouchType: string;
}

const DUMMY_CONTACTS: CadenceContact[] = [
  { id: "1", name: "Doug Martinez", company: "Martinez & Associates", tier: "S", cadenceDays: 7, lastTouch: "3 days ago", nextTouch: "In 4 days", touchCount: 24, overdue: false, lastTouchType: "call" },
  { id: "2", name: "Sarah Mitchell", company: "Greenfield Industries", tier: "S", cadenceDays: 7, lastTouch: "10 days ago", nextTouch: "3 days overdue", touchCount: 18, overdue: true, lastTouchType: "email" },
  { id: "3", name: "James Whitfield", company: "Meridian Corp", tier: "A", cadenceDays: 14, lastTouch: "5 days ago", nextTouch: "In 9 days", touchCount: 12, overdue: false, lastTouchType: "linkedin" },
  { id: "4", name: "Priya Patel", company: "Patel Consulting", tier: "A", cadenceDays: 14, lastTouch: "18 days ago", nextTouch: "4 days overdue", touchCount: 9, overdue: true, lastTouchType: "meeting" },
  { id: "5", name: "Tom Nguyen", company: "Pacific Logistics", tier: "A", cadenceDays: 30, lastTouch: "12 days ago", nextTouch: "In 18 days", touchCount: 7, overdue: false, lastTouchType: "call" },
  { id: "6", name: "Rachel Kim", company: "Brightside Dental", tier: "B", cadenceDays: 30, lastTouch: "25 days ago", nextTouch: "In 5 days", touchCount: 5, overdue: false, lastTouchType: "email" },
  { id: "7", name: "Diana Cho", company: "Atlas Partners", tier: "B", cadenceDays: 30, lastTouch: "35 days ago", nextTouch: "5 days overdue", touchCount: 4, overdue: true, lastTouchType: "text" },
  { id: "8", name: "Alex Rivera", company: "Coastal Ventures", tier: "B", cadenceDays: 30, lastTouch: "15 days ago", nextTouch: "In 15 days", touchCount: 6, overdue: false, lastTouchType: "gift" },
  { id: "9", name: "Marcus Lee", company: "Summit Solutions", tier: "C", cadenceDays: 90, lastTouch: "45 days ago", nextTouch: "In 45 days", touchCount: 3, overdue: false, lastTouchType: "linkedin" },
  { id: "10", name: "Linda Chen", company: "Evergreen Wealth", tier: "C", cadenceDays: 90, lastTouch: "100 days ago", nextTouch: "10 days overdue", touchCount: 2, overdue: true, lastTouchType: "email" },
];

const TIER_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  S: { label: "S-Tier", color: "text-warning", desc: "Inner circle — weekly" },
  A: { label: "A-Tier", color: "text-success", desc: "Key partners — bi-weekly" },
  B: { label: "B-Tier", color: "text-primary", desc: "Growing — monthly" },
  C: { label: "C-Tier", color: "text-muted-foreground", desc: "Monitor — quarterly" },
};

const touchIcon = (type: string) => {
  switch (type) {
    case "call": return <Phone className="h-3.5 w-3.5" />;
    case "email": return <Mail className="h-3.5 w-3.5" />;
    case "text": return <MessageSquare className="h-3.5 w-3.5" />;
    case "linkedin": return <Linkedin className="h-3.5 w-3.5" />;
    case "meeting": return <Calendar className="h-3.5 w-3.5" />;
    case "gift": return <Gift className="h-3.5 w-3.5" />;
    default: return <Check className="h-3.5 w-3.5" />;
  }
};

export default function DemoOutreachTab() {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const overdue = DUMMY_CONTACTS.filter(c => c.overdue);
  const filtered = filter === "all"
    ? DUMMY_CONTACTS
    : filter === "overdue"
    ? overdue
    : DUMMY_CONTACTS.filter(c => c.tier === filter);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{DUMMY_CONTACTS.length}</p>
            <p className="text-[11px] text-muted-foreground">Active Contacts</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{overdue.length}</p>
            <p className="text-[11px] text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{DUMMY_CONTACTS.reduce((s, c) => s + c.touchCount, 0)}</p>
            <p className="text-[11px] text-muted-foreground">Total Touches</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "overdue", label: `Overdue (${overdue.length})` },
          { key: "S", label: "S-Tier" },
          { key: "A", label: "A-Tier" },
          { key: "B", label: "B-Tier" },
          { key: "C", label: "C-Tier" },
        ].map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Contact list */}
      <div className="space-y-2">
        {filtered.map(c => {
          const tier = TIER_CONFIG[c.tier];
          const isExpanded = expanded === c.id;
          return (
            <Card key={c.id} className={`overflow-hidden transition-colors ${c.overdue ? "border-destructive/30" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold shrink-0 ${
                    c.tier === "S" ? "bg-warning/10 text-warning" :
                    c.tier === "A" ? "bg-success/10 text-success" :
                    c.tier === "B" ? "bg-primary/10 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {c.tier}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.overdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{c.company}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${c.overdue ? "text-destructive" : "text-muted-foreground"}`}>{c.nextTouch}</p>
                    <p className="text-[10px] text-muted-foreground">Last: {c.lastTouch}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Every {c.cadenceDays} days</span>
                      <span>{c.touchCount} total touches</span>
                      <span className="flex items-center gap-1">Last: {touchIcon(c.lastTouchType)} {c.lastTouchType}</span>
                    </div>
                    <div className="flex gap-2">
                      {["call", "email", "text", "linkedin", "meeting"].map(type => (
                        <Button key={type} size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => {}}>
                          {touchIcon(type)} {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
