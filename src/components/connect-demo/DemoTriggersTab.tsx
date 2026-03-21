import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap, User, Building2, Clock, ArrowRight,
  FileText, Calendar, MapPin, TrendingUp,
} from "lucide-react";

interface Trigger {
  type: string;
  title: string;
  description: string;
  person: string;
  company: string;
  date: string;
  urgency: "high" | "medium" | "low";
  suggested_action: string;
}

const DUMMY_TRIGGERS: Trigger[] = [
  { type: "renewal", title: "Policy Renewal — 30 Days", description: "Commercial GL policy coming up for renewal. Premium at risk: $18,500.", person: "Sarah Mitchell", company: "Greenfield Industries", date: "Apr 15", urgency: "high", suggested_action: "Schedule a renewal review meeting this week." },
  { type: "news", title: "Company Expansion Announced", description: "New office opening in Dallas — potential for additional coverage needs.", person: "Marcus Lee", company: "Summit Solutions", date: "Mar 19", urgency: "high", suggested_action: "Call Marcus to discuss expanded coverage for the new location." },
  { type: "filing", title: "SEC Filing Detected", description: "10-K annual report filed showing 22% revenue growth.", person: "Diana Cho", company: "Atlas Partners", date: "Mar 17", urgency: "medium", suggested_action: "Reach out about upgrading their D&O coverage." },
  { type: "event", title: "Industry Conference Next Week", description: "Texas Insurance Summit — 3 of your prospects are attending.", person: "Multiple contacts", company: "Various", date: "Mar 28", urgency: "medium", suggested_action: "Book meetings with attendees before slots fill up." },
  { type: "permit", title: "Building Permit Filed", description: "New construction permit for a 12,000 sq ft warehouse.", person: "Tom Nguyen", company: "Pacific Logistics", date: "Mar 14", urgency: "medium", suggested_action: "Reach out about builders risk and commercial property coverage." },
  { type: "social", title: "LinkedIn Job Change", description: "Promoted to VP of Operations — new decision-making authority.", person: "James Whitfield", company: "Meridian Corp", date: "Mar 12", urgency: "low", suggested_action: "Send a congratulatory message and re-engage." },
  { type: "renewal", title: "Workers Comp Expiring", description: "Workers compensation policy expires in 45 days. 12 employees covered.", person: "Rachel Kim", company: "Brightside Dental", date: "May 1", urgency: "medium", suggested_action: "Pull loss runs and start the remarketing process." },
  { type: "news", title: "Acquisition Rumor", description: "Local news reports potential acquisition by a regional competitor.", person: "Alex Rivera", company: "Coastal Ventures", date: "Mar 20", urgency: "high", suggested_action: "Call Alex ASAP — coverage gaps often appear during M&A." },
];

const triggerIcon = (type: string) => {
  switch (type) {
    case "renewal": return <Calendar className="h-4 w-4 text-warning" />;
    case "news": return <TrendingUp className="h-4 w-4 text-primary" />;
    case "filing": return <FileText className="h-4 w-4 text-accent" />;
    case "event": return <Calendar className="h-4 w-4 text-primary" />;
    case "permit": return <MapPin className="h-4 w-4 text-success" />;
    case "social": return <User className="h-4 w-4 text-blue-400" />;
    default: return <Zap className="h-4 w-4 text-muted-foreground" />;
  }
};

const urgencyColor = (u: string) => {
  if (u === "high") return "text-destructive border-destructive/30";
  if (u === "medium") return "text-warning border-warning/30";
  return "text-muted-foreground";
};

export default function DemoTriggersTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">Territory Intelligence</h2>
        <Badge variant="outline" className="text-[10px]">{DUMMY_TRIGGERS.length} signals</Badge>
      </div>

      {DUMMY_TRIGGERS.map((t, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-muted/50 p-2 shrink-0 mt-0.5">
                {triggerIcon(t.type)}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <Badge variant="outline" className={`text-[9px] ${urgencyColor(t.urgency)}`}>
                    {t.urgency}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.person}</span>
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{t.company}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.date}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 p-2 rounded bg-primary/5 border border-primary/10">
                  <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-[11px] text-primary font-medium">{t.suggested_action}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
