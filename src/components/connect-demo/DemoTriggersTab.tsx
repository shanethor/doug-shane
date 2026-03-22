import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Zap, User, Building2, Clock, ArrowRight,
  FileText, Calendar, MapPin, TrendingUp,
  Mail, Phone, Send, X,
} from "lucide-react";
import { toast } from "sonner";

interface Trigger {
  type: string; title: string; description: string; person: string;
  company: string; date: string; urgency: "high" | "medium" | "low";
  suggested_action: string; email: string; phone: string;
}

const DUMMY_TRIGGERS: Trigger[] = [
  { type: "renewal", title: "Policy Renewal — 30 Days", description: "Commercial GL policy coming up for renewal. Premium at risk: $18,500.", person: "Sarah Mitchell", company: "Greenfield Industries", date: "Apr 15", urgency: "high", suggested_action: "Schedule a renewal review meeting this week.", email: "sarah@greenvalley.com", phone: "(512) 555-0142" },
  { type: "news", title: "Company Expansion Announced", description: "New office opening in Dallas — potential for additional coverage needs.", person: "Marcus Lee", company: "Summit Solutions", date: "Mar 19", urgency: "high", suggested_action: "Call Marcus to discuss expanded coverage for the new location.", email: "marcus@summit.com", phone: "(214) 555-0198" },
  { type: "filing", title: "SEC Filing Detected", description: "10-K annual report filed showing 22% revenue growth.", person: "Diana Cho", company: "Atlas Partners", date: "Mar 17", urgency: "medium", suggested_action: "Reach out about upgrading their D&O coverage.", email: "diana@atlaspartners.com", phone: "(415) 555-0167" },
  { type: "event", title: "Industry Conference Next Week", description: "Texas Insurance Summit — 3 of your prospects are attending.", person: "Multiple contacts", company: "Various", date: "Mar 28", urgency: "medium", suggested_action: "Book meetings with attendees before slots fill up.", email: "", phone: "" },
  { type: "permit", title: "Building Permit Filed", description: "New construction permit for a 12,000 sq ft warehouse.", person: "Tom Nguyen", company: "Pacific Logistics", date: "Mar 14", urgency: "medium", suggested_action: "Reach out about builders risk and commercial property coverage.", email: "tom@pacificlogistics.com", phone: "(713) 555-0134" },
  { type: "social", title: "LinkedIn Job Change", description: "Promoted to VP of Operations — new decision-making authority.", person: "James Whitfield", company: "Meridian Corp", date: "Mar 12", urgency: "low", suggested_action: "Send a congratulatory message and re-engage.", email: "james@meridian.com", phone: "(512) 555-0189" },
  { type: "renewal", title: "Workers Comp Expiring", description: "Workers compensation policy expires in 45 days. 12 employees covered.", person: "Rachel Kim", company: "Brightside Dental", date: "May 1", urgency: "medium", suggested_action: "Pull loss runs and start the remarketing process.", email: "rachel@brightside.com", phone: "(512) 555-0156" },
  { type: "news", title: "Acquisition Rumor", description: "Local news reports potential acquisition by a regional competitor.", person: "Alex Rivera", company: "Coastal Ventures", date: "Mar 20", urgency: "high", suggested_action: "Call Alex ASAP — coverage gaps often appear during M&A.", email: "alex@coastalventures.com", phone: "(310) 555-0178" },
];

const triggerIcon = (type: string) => {
  switch (type) {
    case "renewal": return <Calendar className="h-4 w-4 text-warning" />;
    case "news": return <TrendingUp className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />;
    case "filing": return <FileText className="h-4 w-4" style={{ color: "hsl(262 83% 58%)" }} />;
    case "event": return <Calendar className="h-4 w-4" style={{ color: "hsl(140 12% 58%)" }} />;
    case "permit": return <MapPin className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />;
    case "social": return <User className="h-4 w-4 text-blue-400" />;
    default: return <Zap className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} />;
  }
};

const urgencyColor = (u: string) => {
  if (u === "high") return "text-destructive border-destructive/30";
  if (u === "medium") return "text-warning border-warning/30";
  return "text-muted-foreground";
};

export default function DemoTriggersTab() {
  const [actionTrigger, setActionTrigger] = useState<Trigger | null>(null);
  const [actionType, setActionType] = useState<"meeting" | "email" | null>(null);
  const [emailBody, setEmailBody] = useState("");

  const openAction = (t: Trigger, type: "meeting" | "email") => {
    setActionTrigger(t);
    setActionType(type);
    if (type === "email") {
      setEmailBody(`Hi ${t.person.split(" ")[0]},\n\nI noticed ${t.description.toLowerCase()} I'd love to discuss how this impacts your coverage and explore some options.\n\nWould you have time for a quick call this week?\n\nBest regards`);
    }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
        <h2 className="text-sm font-semibold text-white">Territory Intelligence</h2>
        <Badge variant="outline" className="text-[10px]" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 60%)" }}>{DUMMY_TRIGGERS.length} signals</Badge>
      </div>

      {DUMMY_TRIGGERS.map((t, i) => (
        <Card key={i} className="overflow-hidden animate-fade-in" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animationDelay: `${i * 50}ms` }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2 shrink-0 mt-0.5" style={{ background: "hsl(240 6% 12%)" }}>
                {triggerIcon(t.type)}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <Badge variant="outline" className={`text-[9px] ${urgencyColor(t.urgency)}`}>{t.urgency}</Badge>
                </div>
                <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>{t.description}</p>
                <div className="flex items-center gap-3 text-[11px]" style={{ color: "hsl(240 5% 46%)" }}>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.person}</span>
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{t.company}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.date}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 p-2 rounded" style={{ background: "hsl(140 12% 42% / 0.06)", border: "1px solid hsl(140 12% 42% / 0.1)" }}>
                  <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
                  <span className="text-[11px] font-medium" style={{ color: "hsl(140 12% 58%)" }}>{t.suggested_action}</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => openAction(t, "meeting")}>
                    <Calendar className="h-3 w-3" /> Schedule Meeting
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => openAction(t, "email")}>
                    <Mail className="h-3 w-3" /> Send Email
                  </Button>
                  {t.phone && (
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => toast.info(`Calling ${t.person} at ${t.phone}`)}>
                      <Phone className="h-3 w-3" /> Call
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setActionTrigger(null); }}>
        <DialogContent style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          {actionTrigger && actionType === "meeting" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Schedule Meeting with {actionTrigger.person}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="p-3 rounded-lg" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
                  <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>Re: {actionTrigger.title}</p>
                  <p className="text-sm text-white mt-1">{actionTrigger.person} — {actionTrigger.company}</p>
                  {actionTrigger.email && <p className="text-xs mt-0.5" style={{ color: "hsl(140 12% 58%)" }}>{actionTrigger.email}</p>}
                </div>
                <Input placeholder="Meeting title" defaultValue={`Discuss: ${actionTrigger.title}`} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                  <Input type="time" defaultValue="10:00" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                </div>
                <Button className="w-full text-xs" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success(`Meeting scheduled with ${actionTrigger.person}`); setActionType(null); }}>
                  <Calendar className="h-3 w-3 mr-1.5" /> Schedule & Send Invite
                </Button>
              </div>
            </>
          )}
          {actionTrigger && actionType === "email" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Email {actionTrigger.person}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="To:" defaultValue={actionTrigger.email} readOnly className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <Input placeholder="Subject:" defaultValue={`Re: ${actionTrigger.title}`} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} className="w-full h-32 rounded-lg p-3 text-sm resize-none" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)", color: "white" }} />
                <Button className="w-full text-xs" style={{ background: "hsl(140 12% 42%)" }} onClick={() => { toast.success(`Email sent to ${actionTrigger.person}`); setActionType(null); }}>
                  <Send className="h-3 w-3 mr-1.5" /> Send Email
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
