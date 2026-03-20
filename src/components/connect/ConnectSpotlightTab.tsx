import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import SpotlightFlyerWizard from "./SpotlightFlyerWizard";

export default function ConnectSpotlightTab() {
  const [showWizard, setShowWizard] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("spotlight-flyer", {
        body: { action: "list" },
      });
      if (!error && data?.flyers) setHistory(data.flyers);
    } catch { /* silent */ }
  };

  useEffect(() => { loadHistory(); }, []);

  if (showWizard) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <SpotlightFlyerWizard onClose={() => { setShowWizard(false); loadHistory(); }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-warning" />
            AURA Spotlight — Marketing Flyer Generator
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Turn your events and ideas into on-brand flyers and social posts with AI. Up to 20/month.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full gap-2" onClick={() => setShowWizard(true)}>
            <Sparkles className="h-4 w-4" />
            Create New Flyer
          </Button>

          {history.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Your Flyers</p>
                <div className="space-y-2">
                  {history.map((f: any) => (
                    <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      {f.result_image_url ? (
                        <img src={f.result_image_url} alt={f.title} className="w-12 h-12 rounded object-cover border shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.title || "Untitled"}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">{f.type}</Badge>
                          <Badge
                            variant={f.status === "ready" ? "default" : f.status === "error" ? "destructive" : "secondary"}
                            className="text-[9px]"
                          >
                            {f.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(f.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {f.result_image_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] shrink-0"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = f.result_image_url;
                            link.download = `${f.title || "flyer"}.png`;
                            link.click();
                          }}
                        >
                          Download
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
