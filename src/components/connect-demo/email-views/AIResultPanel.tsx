import { Button } from "@/components/ui/button";
import { Copy, CheckCheck, Sparkles, X, Shield, Activity, Bell } from "lucide-react";
import { toast } from "sonner";
import type { useEmailAI } from "./useEmailAI";

type AI = ReturnType<typeof useEmailAI>;

export function AIResultPanel({ ai, onUseReply }: { ai: AI; onUseReply?: (text: string) => void }) {
  const hasContent = ai.summaryText || ai.replyText || ai.draftText;
  if (!hasContent) return null;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-2 animate-fade-in">
      {ai.summaryText && (
        <div className="rounded-lg p-3" style={{ background: "hsl(140 12% 42% / 0.06)", border: "1px solid hsl(140 12% 42% / 0.2)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(140 12% 58%)" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(140 12% 58%)" }}>AI Summary</span>
            </div>
            <button onClick={() => copyText(ai.summaryText!)} className="p-1 rounded hover:bg-white/10"><Copy className="h-3 w-3" style={{ color: "hsl(240 5% 50%)" }} /></button>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(240 5% 75%)" }}>{ai.summaryText}</p>
        </div>
      )}
      {ai.replyText && (
        <div className="rounded-lg p-3" style={{ background: "hsl(200 60% 50% / 0.06)", border: "1px solid hsl(200 60% 50% / 0.2)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(200 60% 60%)" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(200 60% 60%)" }}>AI Reply</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => copyText(ai.replyText!)} className="p-1 rounded hover:bg-white/10"><Copy className="h-3 w-3" style={{ color: "hsl(240 5% 50%)" }} /></button>
              {onUseReply && (
                <Button size="sm" variant="outline" className="text-[10px] h-5 px-1.5" style={{ borderColor: "hsl(200 60% 50% / 0.3)", color: "hsl(200 60% 60%)" }} onClick={() => onUseReply(ai.replyText!)}>
                  Use
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(240 5% 75%)" }}>{ai.replyText}</p>
        </div>
      )}
      {ai.draftText && (
        <div className="rounded-lg p-3" style={{ background: "hsl(262 83% 45% / 0.06)", border: "1px solid hsl(262 83% 45% / 0.2)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(262 83% 58%)" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(262 83% 58%)" }}>AI Draft</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => copyText(ai.draftText!)} className="p-1 rounded hover:bg-white/10"><Copy className="h-3 w-3" style={{ color: "hsl(240 5% 50%)" }} /></button>
              {onUseReply && (
                <Button size="sm" variant="outline" className="text-[10px] h-5 px-1.5" style={{ borderColor: "hsl(262 83% 45% / 0.3)", color: "hsl(262 83% 58%)" }} onClick={() => onUseReply(ai.draftText!)}>
                  Use
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(240 5% 75%)" }}>{ai.draftText}</p>
        </div>
      )}
      {ai.complianceText && (
        <div className="rounded-lg p-3" style={{ background: "hsl(45 80% 50% / 0.06)", border: "1px solid hsl(45 80% 50% / 0.2)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" style={{ color: "hsl(45 80% 60%)" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(45 80% 60%)" }}>Compliance Check</span>
            </div>
            <button onClick={() => copyText(ai.complianceText!)} className="p-1 rounded hover:bg-white/10"><Copy className="h-3 w-3" style={{ color: "hsl(240 5% 50%)" }} /></button>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(240 5% 75%)" }}>{ai.complianceText}</p>
        </div>
      )}
      {ai.sentimentText && (
        <div className="rounded-lg p-3" style={{ background: "hsl(300 50% 45% / 0.06)", border: "1px solid hsl(300 50% 45% / 0.2)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" style={{ color: "hsl(300 50% 60%)" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(300 50% 60%)" }}>Sentiment Analysis</span>
            </div>
            <button onClick={() => copyText(ai.sentimentText!)} className="p-1 rounded hover:bg-white/10"><Copy className="h-3 w-3" style={{ color: "hsl(240 5% 50%)" }} /></button>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(240 5% 75%)" }}>{ai.sentimentText}</p>
        </div>
      )}
      {ai.followUpText && (
        <div className="rounded-lg p-3" style={{ background: "hsl(170 50% 40% / 0.06)", border: "1px solid hsl(170 50% 40% / 0.2)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" style={{ color: "hsl(170 50% 55%)" }} />
              <span className="text-xs font-semibold" style={{ color: "hsl(170 50% 55%)" }}>Follow-Up Reminder</span>
            </div>
            <button onClick={() => copyText(ai.followUpText!)} className="p-1 rounded hover:bg-white/10"><Copy className="h-3 w-3" style={{ color: "hsl(240 5% 50%)" }} /></button>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(240 5% 75%)" }}>{ai.followUpText}</p>
        </div>
      )}
    </div>
  );
}
