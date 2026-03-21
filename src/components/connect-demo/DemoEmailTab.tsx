import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail, MailOpen, RefreshCw, Search, Sparkles, Send, Paperclip, Reply,
  ArrowLeft, CheckCheck, Clock, X,
} from "lucide-react";

const DEMO_EMAILS = [
  { id: "1", from: "Sarah Mitchell", fromAddr: "sarah@greenvalley.com", subject: "Q3 Pipeline Review — numbers look great", snippet: "Hey, just wanted to touch base on our Q3 numbers. The pipeline is looking strong and I think we should schedule a review meeting...", time: "12 min ago", unread: true, tags: [] },
  { id: "2", from: "Marcus Chen", fromAddr: "marcus@techventures.io", subject: "Partnership proposal for West Coast expansion", snippet: "Following up on our conversation last week about expanding into the West Coast market. I've put together a preliminary proposal...", time: "34 min ago", unread: true, tags: ["renewal"] },
  { id: "3", from: "Jessica Torres", fromAddr: "jess@blueridgecap.com", subject: "Re: Client onboarding — docs received", snippet: "Thanks for sending over the documents. Everything looks good on our end. We'll have the account set up by end of day...", time: "1 hour ago", unread: true, tags: [] },
  { id: "4", from: "David Kowalski", fromAddr: "david.k@primeadvisors.net", subject: "Referral — new prospect in healthcare vertical", snippet: "I have a warm referral for you. Dr. Patel runs a growing dermatology practice in Austin and is looking for a new advisor...", time: "2 hours ago", unread: false, tags: [] },
  { id: "5", from: "Linda Park", fromAddr: "linda@sunriseproperties.com", subject: "Annual review meeting — Thursday works", snippet: "Thursday at 2pm works perfectly for me. I'll send a calendar invite with the Zoom link. Looking forward to reviewing...", time: "3 hours ago", unread: false, tags: [] },
  { id: "6", from: "Robert Nguyen", fromAddr: "rnguyen@coastaldev.co", subject: "Invoice #4892 — payment confirmation", snippet: "Just confirming that payment for invoice #4892 has been processed. You should see the funds in your account within 2-3 business days...", time: "4 hours ago", unread: false, tags: ["billing"] },
  { id: "7", from: "Amanda Foster", fromAddr: "amanda@brightfuture.org", subject: "Event sponsorship opportunity — Annual Gala", snippet: "We'd love to have your company as a sponsor for our Annual Gala on November 15th. There are several sponsorship tiers available...", time: "5 hours ago", unread: false, tags: [] },
  { id: "8", from: "James Whitfield", fromAddr: "james@alpinegroup.com", subject: "Re: Contract renewal discussion", snippet: "I've reviewed the updated terms and they look fair. Let's schedule a call to finalize the details before the end of the month...", time: "6 hours ago", unread: false, tags: ["renewal"] },
  { id: "9", from: "Priya Sharma", fromAddr: "priya@novahealth.com", subject: "Compliance documentation request", snippet: "As part of our annual compliance review, we need updated copies of your certifications and licensing documents...", time: "Yesterday", unread: false, tags: [] },
  { id: "10", from: "Tom Bradley", fromAddr: "tom.b@westfieldmfg.com", subject: "Quote request — commercial fleet expansion", snippet: "We're adding 12 vehicles to our fleet next quarter and need updated coverage. Can you send over a quote for the expanded fleet?", time: "Yesterday", unread: false, tags: [] },
];

export default function DemoEmailTab() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = DEMO_EMAILS.filter((e) => {
    if (filter === "unread" && !e.unread) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.subject.toLowerCase().includes(q) || e.from.toLowerCase().includes(q) || e.snippet.toLowerCase().includes(q);
    }
    return true;
  });

  const selected = DEMO_EMAILS.find((e) => e.id === selectedEmail);
  const unreadCount = DEMO_EMAILS.filter((e) => e.unread).length;

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setSelectedEmail(null)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to inbox
        </Button>
        <Card style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{selected.subject}</h2>
                <p className="text-sm mt-1" style={{ color: "hsl(240 5% 46%)" }}>
                  From: <span className="text-white">{selected.from}</span> &lt;{selected.fromAddr}&gt;
                </p>
                <p className="text-xs mt-0.5" style={{ color: "hsl(240 5% 36%)" }}>{selected.time}</p>
              </div>
            </div>
            <div className="border-t pt-4 text-sm leading-relaxed" style={{ borderColor: "hsl(240 6% 14%)", color: "hsl(240 5% 70%)" }}>
              <p>Hi there,</p>
              <br />
              <p>{selected.snippet}</p>
              <br />
              <p>We should schedule some time this week to discuss next steps. I've been looking at the numbers and I think there's a real opportunity here if we move quickly.</p>
              <br />
              <p>Let me know what works for your schedule.</p>
              <br />
              <p>Best regards,<br />{selected.from}</p>
            </div>
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "hsl(240 6% 14%)" }}>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Reply className="h-3 w-3" /> Reply</Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Sparkles className="h-3 w-3" /> AI Draft</Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Paperclip className="h-3 w-3" /> Attach</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5" style={{ color: "hsl(174 97% 40%)" }} />
          <h2 className="text-lg font-semibold text-white">Email</h2>
          <Badge className="text-[10px]" style={{ background: "hsl(174 97% 22%)", color: "white" }}>
            {unreadCount} new
          </Badge>
          <span className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>Last synced 3 minutes ago</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> Sync Mail
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <CheckCheck className="h-3 w-3" /> Mark all read
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" style={{ background: "hsl(174 97% 22%)" }}>
            <Sparkles className="h-3 w-3" /> Compose
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`text-xs px-3 py-1 rounded-md transition-colors ${filter === "all" ? "bg-white/10 text-white" : ""}`}
          style={filter !== "all" ? { color: "hsl(240 5% 46%)" } : {}}
        >All</button>
        <button
          onClick={() => setFilter("unread")}
          className={`text-xs px-3 py-1 rounded-md transition-colors ${filter === "unread" ? "bg-white/10 text-white" : ""}`}
          style={filter !== "unread" ? { color: "hsl(240 5% 46%)" } : {}}
        >Unread ({unreadCount})</button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
        <Input
          placeholder="Search emails by subject, sender, or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm h-9"
          style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }}
        />
      </div>

      {/* Email list */}
      <div className="space-y-1">
        {filtered.map((email) => (
          <button
            key={email.id}
            onClick={() => setSelectedEmail(email.id)}
            className="w-full text-left p-3 rounded-lg transition-colors hover:bg-white/5 flex items-start gap-3"
            style={{
              background: email.unread ? "hsl(174 97% 22% / 0.06)" : "transparent",
              borderBottom: "1px solid hsl(240 6% 12%)",
            }}
          >
            <div className="mt-1">
              {email.unread ? (
                <Mail className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} />
              ) : (
                <MailOpen className="h-4 w-4" style={{ color: "hsl(240 5% 36%)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm truncate ${email.unread ? "font-semibold text-white" : ""}`} style={!email.unread ? { color: "hsl(240 5% 70%)" } : {}}>
                  {email.from}: {email.subject}
                </span>
                <Badge variant="outline" className="text-[9px] shrink-0" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 50%)" }}>Email</Badge>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: "hsl(240 5% 46%)" }}>{email.snippet}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px]" style={{ color: "hsl(240 5% 36%)" }}>{email.time}</span>
                {email.tags.map(t => (
                  <Badge key={t} variant="outline" className="text-[9px] h-4" style={{ borderColor: "hsl(174 97% 22% / 0.3)", color: "hsl(174 97% 40%)" }}>{t}</Badge>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
