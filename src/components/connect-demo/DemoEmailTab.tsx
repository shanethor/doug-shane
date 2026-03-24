import { useState, useCallback, useEffect } from "react";
import { Mail, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEmailEngine, getEmailLayout, setEmailLayout, type EmailLayout } from "./email-views/useEmailEngine";
import { useEmailAI } from "./email-views/useEmailAI";
import EmailLayoutSwitcher from "./email-views/EmailLayoutSwitcher";
import EmailViewGmail from "./email-views/EmailViewGmail";
import EmailViewOutlook from "./email-views/EmailViewOutlook";
import EmailViewAura from "./email-views/EmailViewAura";

export default function DemoEmailTab() {
  const engine = useEmailEngine();
  const ai = useEmailAI();
  const [layout, setLayoutState] = useState<EmailLayout>(getEmailLayout);

  // Reset AI state when thread changes
  useEffect(() => { ai.reset(); }, [engine.selectedThread?.id]);

  const handleLayoutChange = useCallback((l: EmailLayout) => {
    setLayoutState(l);
    setEmailLayout(l);
  }, []);

  return (
    <div>
      <style>{`
        @keyframes emailSlideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .email-header { animation: emailSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .email-body { animation: emailSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
      `}</style>

      {/* Header with layout switcher */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3 email-header">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
          <h2 className="text-lg font-semibold text-white">Email</h2>
          <Badge className="text-xs" style={{ background: "hsl(140 12% 42%)", color: "white" }}>{engine.unreadCount} new</Badge>
          <span className="text-sm hidden sm:inline" style={{ color: "hsl(240 5% 46%)" }}>Synced 3 min ago</span>
        </div>
        <div className="flex items-center gap-2">
          <EmailLayoutSwitcher current={layout} onChange={handleLayoutChange} />
          <Button variant="outline" size="sm" className="text-xs h-7" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }} onClick={engine.markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Render active layout */}
      <div className="email-body">
        {layout === "gmail" && <EmailViewGmail engine={engine} ai={ai} />}
        {layout === "outlook" && <EmailViewOutlook engine={engine} ai={ai} />}
        {layout === "aura" && <EmailViewAura engine={engine} ai={ai} />}
      </div>
    </div>
  );
}