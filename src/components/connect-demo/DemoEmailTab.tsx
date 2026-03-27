import { useState, useCallback, useEffect } from "react";
import { Mail, CheckCheck, Loader2, PenSquare, X, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useEmailEngine, getEmailLayout, setEmailLayout, type EmailLayout } from "./email-views/useEmailEngine";
import { useEmailAI } from "./email-views/useEmailAI";
import EmailLayoutSwitcher from "./email-views/EmailLayoutSwitcher";
import EmailViewGmail from "./email-views/EmailViewGmail";
import EmailViewOutlook from "./email-views/EmailViewOutlook";
import EmailViewAura from "./email-views/EmailViewAura";
import { useRealEmailData } from "@/hooks/useRealData";
import { ConnectEmptyState } from "./ConnectEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";

export default function DemoEmailTab() {
  const { user } = useAuth();
  const { hasEmail, emails, loading: realLoading } = useRealEmailData();
  const engine = useEmailEngine(hasEmail === true ? emails : undefined);
  const ai = useEmailAI();
  const [layout, setLayoutState] = useState<EmailLayout>(getEmailLayout);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { ai.reset(); }, [engine.selectedThread?.id]);

  const handleLayoutChange = useCallback((l: EmailLayout) => {
    setLayoutState(l);
    setEmailLayout(l);
  }, []);

  const handleSendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      toast.error("To and Subject are required");
      return;
    }
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compose-email`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          body: composeBody.trim(),
        }),
      });
      if (resp.ok) {
        toast.success("Email sent successfully");
        setComposeOpen(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
      } else {
        // Save as draft in email_drafts table
        if (user) {
          await supabase.from("email_drafts").insert({
            user_id: user.id,
            to_addresses: [composeTo.trim()],
            subject: composeSubject.trim(),
            body_html: composeBody.trim(),
            status: "draft",
          });
          toast.success("Saved as draft — send integration pending");
          setComposeOpen(false);
          setComposeTo("");
          setComposeSubject("");
          setComposeBody("");
        } else {
          toast.error("Failed to send email");
        }
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  if (realLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(140 12% 58%)" }} />
      </div>
    );
  }

  if (hasEmail === false) {
    return <ConnectEmptyState type="email" />;
  }

  if (hasEmail === true && emails.length === 0 && engine.filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Mail className="h-12 w-12 mb-4" style={{ color: "hsl(140 12% 42%)" }} />
        <h3 className="text-lg font-semibold text-white/90 mb-2">Email Connected</h3>
        <p className="text-sm text-white/40 max-w-md">Your email account is linked but no messages have been synced yet. Emails will appear here after the next sync cycle.</p>
        <Button className="mt-4 gap-2" style={{ background: "hsl(140 12% 42%)" }} onClick={() => setComposeOpen(true)}>
          <PenSquare className="h-4 w-4" /> Compose Email
        </Button>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes emailSlideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .email-header { animation: emailSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .email-body { animation: emailSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
      `}</style>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-3 email-header">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
          <h2 className="text-lg font-semibold text-white">Email</h2>
          <Badge className="text-xs" style={{ background: "hsl(140 12% 42%)", color: "white" }}>{engine.unreadCount} new</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 text-xs h-7" style={{ background: "hsl(140 12% 42%)", color: "white" }} onClick={() => setComposeOpen(true)}>
            <PenSquare className="h-3.5 w-3.5" /> Compose
          </Button>
          <EmailLayoutSwitcher current={layout} onChange={handleLayoutChange} />
          <Button variant="outline" size="sm" className="text-xs h-7" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={engine.markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="email-body">
        {layout === "gmail" && <EmailViewGmail engine={engine} ai={ai} />}
        {layout === "outlook" && <EmailViewOutlook engine={engine} ai={ai} />}
        {layout === "aura" && <EmailViewAura engine={engine} ai={ai} />}
      </div>

      {/* Compose Email Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg" style={{ background: "hsl(240 8% 9%)", border: "1px solid hsl(240 6% 14%)" }}>
          <DialogHeader>
            <DialogTitle className="text-white">New Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Input value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="To: email@example.com"
                className="text-sm" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            </div>
            <div>
              <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Subject"
                className="text-sm" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            </div>
            <div>
              <Textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Write your message…"
                rows={8} className="text-sm resize-none" style={{ background: "hsl(240 8% 7%)", borderColor: "hsl(240 6% 14%)", color: "white" }} />
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setComposeOpen(false)} style={{ color: "hsl(240 5% 55%)" }}>
              <X className="h-4 w-4 mr-1" /> Discard
            </Button>
            <Button size="sm" onClick={handleSendEmail} disabled={sending || !composeTo.trim()}
              style={{ background: "hsl(140 12% 42%)", color: "white" }}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}