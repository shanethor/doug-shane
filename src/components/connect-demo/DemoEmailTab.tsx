import { useState, useCallback, useEffect } from "react";
import { Mail, CheckCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEmailEngine, getEmailLayout, setEmailLayout, type EmailLayout } from "./email-views/useEmailEngine";
import { useEmailAI } from "./email-views/useEmailAI";
import EmailLayoutSwitcher from "./email-views/EmailLayoutSwitcher";
import EmailViewGmail from "./email-views/EmailViewGmail";
import EmailViewOutlook from "./email-views/EmailViewOutlook";
import EmailViewAura from "./email-views/EmailViewAura";
import { useRealEmailData } from "@/hooks/useRealData";
import { ConnectEmptyState } from "./ConnectEmptyState";

export default function DemoEmailTab() {
  const { hasEmail, emails, loading: realLoading } = useRealEmailData();
  const engine = useEmailEngine(hasEmail === true ? emails : undefined);
  const ai = useEmailAI();
  const [layout, setLayoutState] = useState<EmailLayout>(getEmailLayout);

  useEffect(() => { ai.reset(); }, [engine.selectedThread?.id]);

  const handleLayoutChange = useCallback((l: EmailLayout) => {
    setLayoutState(l);
    setEmailLayout(l);
  }, []);

  // Show loading while checking real data
  if (realLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(140 12% 58%)" }} />
      </div>
    );
  }

  // No email connected — show empty state
  if (hasEmail === false) {
    return <ConnectEmptyState type="email" />;
  }

  // Email connected but no emails synced yet
  if (hasEmail === true && emails.length === 0 && engine.filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Mail className="h-12 w-12 mb-4" style={{ color: "hsl(140 12% 42%)" }} />
        <h3 className="text-lg font-semibold text-white/90 mb-2">Email Connected</h3>
        <p className="text-sm text-white/40 max-w-md">Your email account is linked but no messages have been synced yet. Emails will appear here after the next sync cycle.</p>
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
    </div>
  );
}