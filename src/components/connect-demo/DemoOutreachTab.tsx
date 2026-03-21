import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Phone, Mail, MessageSquare, Linkedin,
  Calendar, Gift, Check, AlertTriangle,
  ChevronDown, ChevronUp, Send, X, Copy,
} from "lucide-react";
import { toast } from "sonner";

interface CadenceContact {
  id: string; name: string; company: string; tier: "S" | "A" | "B" | "C";
  cadenceDays: number; lastTouch: string; nextTouch: string; touchCount: number;
  overdue: boolean; lastTouchType: string; phone: string; email: string;
}

const DUMMY_CONTACTS: CadenceContact[] = [
  { id: "1", name: "Doug Martinez", company: "Martinez & Associates", tier: "S", cadenceDays: 7, lastTouch: "3 days ago", nextTouch: "In 4 days", touchCount: 24, overdue: false, lastTouchType: "call", phone: "(512) 555-0101", email: "doug@martinezassoc.com" },
  { id: "2", name: "Sarah Mitchell", company: "Greenfield Industries", tier: "S", cadenceDays: 7, lastTouch: "10 days ago", nextTouch: "3 days overdue", touchCount: 18, overdue: true, lastTouchType: "email", phone: "(512) 555-0142", email: "sarah@greenvalley.com" },
  { id: "3", name: "James Whitfield", company: "Meridian Corp", tier: "A", cadenceDays: 14, lastTouch: "5 days ago", nextTouch: "In 9 days", touchCount: 12, overdue: false, lastTouchType: "linkedin", phone: "(512) 555-0189", email: "james@meridian.com" },
  { id: "4", name: "Priya Patel", company: "Patel Consulting", tier: "A", cadenceDays: 14, lastTouch: "18 days ago", nextTouch: "4 days overdue", touchCount: 9, overdue: true, lastTouchType: "meeting", phone: "(512) 555-0145", email: "priya@patelconsulting.com" },
  { id: "5", name: "Tom Nguyen", company: "Pacific Logistics", tier: "A", cadenceDays: 30, lastTouch: "12 days ago", nextTouch: "In 18 days", touchCount: 7, overdue: false, lastTouchType: "call", phone: "(713) 555-0134", email: "tom@pacificlogistics.com" },
  { id: "6", name: "Rachel Kim", company: "Brightside Dental", tier: "B", cadenceDays: 30, lastTouch: "25 days ago", nextTouch: "In 5 days", touchCount: 5, overdue: false, lastTouchType: "email", phone: "(512) 555-0156", email: "rachel@brightside.com" },
  { id: "7", name: "Diana Cho", company: "Atlas Partners", tier: "B", cadenceDays: 30, lastTouch: "35 days ago", nextTouch: "5 days overdue", touchCount: 4, overdue: true, lastTouchType: "text", phone: "(415) 555-0167", email: "diana@atlaspartners.com" },
  { id: "8", name: "Alex Rivera", company: "Coastal Ventures", tier: "B", cadenceDays: 30, lastTouch: "15 days ago", nextTouch: "In 15 days", touchCount: 6, overdue: false, lastTouchType: "gift", phone: "(310) 555-0178", email: "alex@coastalventures.com" },
  { id: "9", name: "Marcus Lee", company: "Summit Solutions", tier: "C", cadenceDays: 90, lastTouch: "45 days ago", nextTouch: "In 45 days", touchCount: 3, overdue: false, lastTouchType: "linkedin", phone: "(214) 555-0198", email: "marcus@summit.com" },
  { id: "10", name: "Linda Chen", company: "Evergreen Wealth", tier: "C", cadenceDays: 90, lastTouch: "100 days ago", nextTouch: "10 days overdue", touchCount: 2, overdue: true, lastTouchType: "email", phone: "(512) 555-0123", email: "linda@evergreenwealth.com" },
];

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
  const [actionDialog, setActionDialog] = useState<{ contact: CadenceContact; type: string } | null>(null);
  const [emailBody, setEmailBody] = useState("");
  const [textMsg, setTextMsg] = useState("");

  const overdue = DUMMY_CONTACTS.filter(c => c.overdue);
  const filtered = filter === "all" ? DUMMY_CONTACTS : filter === "overdue" ? overdue : DUMMY_CONTACTS.filter(c => c.tier === filter);

  const handleAction = (contact: CadenceContact, type: string) => {
    if (type === "call") {
      setActionDialog({ contact, type: "call" });
    } else if (type === "email") {
      setEmailBody(`Hi ${contact.name.split(" ")[0]},\n\nJust checking in — wanted to make sure everything is going well on your end.\n\nLet me know if there's anything I can help with.\n\nBest regards`);
      setActionDialog({ contact, type: "email" });
    } else if (type === "text") {
      setTextMsg(`Hey ${contact.name.split(" ")[0]}, just checking in! Let me know if you need anything.`);
      setActionDialog({ contact, type: "text" });
    } else if (type === "linkedin") {
      toast.success(`Opening LinkedIn profile for ${contact.name}`);
    } else if (type === "meeting") {
      setActionDialog({ contact, type: "meeting" });
    } else {
      toast.success(`${type} touch logged for ${contact.name}`);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        {[
          { val: DUMMY_CONTACTS.length, label: "Active Contacts", color: "text-white" },
          { val: overdue.length, label: "Overdue", color: "text-destructive" },
          { val: DUMMY_CONTACTS.reduce((s, c) => s + c.touchCount, 0), label: "Total Touches", color: "" },
        ].map((s, i) => (
          <Card key={i} className="flex-1 min-w-[140px] animate-fade-in" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animationDelay: `${i * 100}ms` }}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`} style={!s.color ? { color: "hsl(174 97% 40%)" } : {}}>{s.val}</p>
              <p className="text-[11px]" style={{ color: "hsl(240 5% 46%)" }}>{s.label}</p>
            </CardContent>
          </Card>
        ))}
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
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} className="text-xs h-7" onClick={() => setFilter(f.key)}
            style={filter === f.key ? { background: "hsl(174 97% 22%)" } : {}}>
            {f.label}
          </Button>
        ))}
      </div>

      {/* Contact list */}
      <div className="space-y-2">
        {filtered.map((c, idx) => {
          const isExpanded = expanded === c.id;
          return (
            <Card key={c.id} className={`overflow-hidden transition-colors animate-fade-in ${c.overdue ? "border-destructive/30" : ""}`}
              style={{ background: "hsl(240 8% 9%)", borderColor: c.overdue ? undefined : "hsl(240 6% 14%)", animationDelay: `${idx * 40}ms` }}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold shrink-0 ${
                    c.tier === "S" ? "bg-warning/10 text-warning" :
                    c.tier === "A" ? "bg-success/10 text-success" :
                    c.tier === "B" ? "" : ""
                  }`} style={
                    c.tier === "B" ? { background: "hsl(174 97% 22% / 0.1)", color: "hsl(174 97% 40%)" } :
                    c.tier === "C" ? { background: "hsl(240 5% 15%)", color: "hsl(240 5% 46%)" } : {}
                  }>{c.tier}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate text-white">{c.name}</p>
                      {c.overdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    </div>
                    <p className="text-[11px] truncate" style={{ color: "hsl(240 5% 46%)" }}>{c.company}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${c.overdue ? "text-destructive" : ""}`} style={!c.overdue ? { color: "hsl(240 5% 46%)" } : {}}>{c.nextTouch}</p>
                    <p className="text-[10px]" style={{ color: "hsl(240 5% 36%)" }}>Last: {c.lastTouch}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} />}
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 space-y-3 animate-fade-in" style={{ borderTop: "1px solid hsl(240 6% 14%)" }}>
                    <div className="flex items-center gap-4 text-xs" style={{ color: "hsl(240 5% 46%)" }}>
                      <span>Every {c.cadenceDays} days</span>
                      <span>{c.touchCount} total touches</span>
                      <span className="flex items-center gap-1">Last: {touchIcon(c.lastTouchType)} {c.lastTouchType}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {["call", "email", "text", "linkedin", "meeting"].map(type => (
                        <Button key={type} size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleAction(c, type)}>
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

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)" }}>
          {actionDialog?.type === "call" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Call {actionDialog.contact.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 text-center py-4">
                <Phone className="h-12 w-12 mx-auto" style={{ color: "hsl(174 97% 40%)" }} />
                <p className="text-2xl font-bold text-white">{actionDialog.contact.phone}</p>
                <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>{actionDialog.contact.company}</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { navigator.clipboard.writeText(actionDialog.contact.phone); toast.success("Number copied!"); }}>
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                  <Button size="sm" className="text-xs gap-1" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Calling ${actionDialog.contact.name}...`); setActionDialog(null); }}>
                    <Phone className="h-3 w-3" /> Call Now
                  </Button>
                </div>
              </div>
            </>
          )}
          {actionDialog?.type === "email" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Email {actionDialog.contact.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input defaultValue={actionDialog.contact.email} readOnly className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <Input placeholder="Subject:" defaultValue={`Checking in — ${actionDialog.contact.company}`} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} className="w-full h-32 rounded-lg p-3 text-sm resize-none" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)", color: "white" }} />
                <Button className="w-full text-xs" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Email sent to ${actionDialog.contact.name}`); setActionDialog(null); }}>
                  <Send className="h-3 w-3 mr-1.5" /> Send
                </Button>
              </div>
            </>
          )}
          {actionDialog?.type === "text" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Text {actionDialog.contact.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-white">{actionDialog.contact.phone}</p>
                <textarea value={textMsg} onChange={(e) => setTextMsg(e.target.value)} className="w-full h-24 rounded-lg p-3 text-sm resize-none" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)", color: "white" }} />
                <Button className="w-full text-xs" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Text sent to ${actionDialog.contact.name}`); setActionDialog(null); }}>
                  <MessageSquare className="h-3 w-3 mr-1.5" /> Send Text
                </Button>
              </div>
            </>
          )}
          {actionDialog?.type === "meeting" && (
            <>
              <DialogHeader><DialogTitle className="text-white">Schedule Meeting with {actionDialog.contact.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Meeting title" defaultValue={`Check-in with ${actionDialog.contact.name}`} className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                  <Input type="time" defaultValue="10:00" className="text-sm" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
                </div>
                <Button className="w-full text-xs" style={{ background: "hsl(174 97% 22%)" }} onClick={() => { toast.success(`Meeting scheduled with ${actionDialog.contact.name}`); setActionDialog(null); }}>
                  <Calendar className="h-3 w-3 mr-1.5" /> Schedule
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
