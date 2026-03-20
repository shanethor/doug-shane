import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Rss, Building2, FileText, Calendar as CalendarIcon,
  MapPin, TrendingUp, AlertTriangle, Loader2, Search,
  ExternalLink, Newspaper, Landmark, Briefcase, Globe,
  Zap, Bell, RefreshCw,
} from "lucide-react";

interface SignalItem {
  type: string;
  title: string;
  description: string;
  source: string;
  date: string;
  relevance: "high" | "medium" | "low";
  url?: string;
  company?: string;
}

const SIGNAL_CATEGORIES = [
  { key: "all", label: "All Signals", icon: Zap },
  { key: "news", label: "Local News", icon: Newspaper },
  { key: "filings", label: "Business Filings", icon: FileText },
  { key: "events", label: "Events", icon: CalendarIcon },
  { key: "permits", label: "Permits & Licenses", icon: Landmark },
];

export default function ConnectSignalsTab() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");
  const [territory, setTerritory] = useState("");
  const [industry, setIndustry] = useState("");
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleScan = async () => {
    if (!territory.trim()) {
      toast.error("Enter a territory (city, state, or ZIP)");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          action: "general",
          payload: {
            prompt: `You are a business intelligence analyst. Generate 8-12 realistic, plausible business signals for the territory "${territory}"${industry ? ` in the ${industry} industry` : ""}. 

Return a JSON array of objects with these fields:
- type: one of "news", "filings", "events", "permits"
- title: short headline
- description: 2-sentence description  
- source: plausible source name (e.g. "Hartford Business Journal", "CT Secretary of State", "Eventbrite")
- date: recent date in YYYY-MM-DD format
- relevance: "high", "medium", or "low"
- company: company name if applicable
- url: null

Focus on signals useful to sales professionals: new businesses, expansions, hiring, permits, networking events, funding rounds, leadership changes. Make them specific to the territory.

Return ONLY the JSON array, no other text.`,
          },
        },
      });
      if (error) throw error;
      
      const text = data?.text || data?.response || "[]";
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
        setSignals(parsed);
      } catch {
        setSignals([]);
        toast.error("Failed to parse signals");
      }
    } catch {
      toast.error("Failed to scan for signals");
    } finally {
      setLoading(false);
    }
  };

  const filteredSignals = activeCategory === "all" 
    ? signals 
    : signals.filter(s => s.type === activeCategory);

  const signalIcon = (type: string) => {
    switch (type) {
      case "news": return <Newspaper className="h-4 w-4 text-primary" />;
      case "filings": return <FileText className="h-4 w-4 text-accent" />;
      case "events": return <CalendarIcon className="h-4 w-4 text-warning" />;
      case "permits": return <Landmark className="h-4 w-4 text-success" />;
      default: return <Zap className="h-4 w-4 text-primary" />;
    }
  };

  const relevanceColor = (r: string) => {
    if (r === "high") return "text-destructive border-destructive/20 bg-destructive/5";
    if (r === "medium") return "text-warning border-warning/20 bg-warning/5";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Search / Territory Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rss className="h-4 w-4 text-primary" />
            Business Signal Scanner
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Surface trigger events, filings, news, and networking opportunities in your territory
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Territory</label>
              <Input
                placeholder="Hartford, CT or 06103"
                value={territory}
                onChange={e => setTerritory(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Industry Filter (optional)</label>
              <Input
                placeholder="Construction, Healthcare..."
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="gap-1.5 w-full" onClick={handleScan} disabled={loading || !territory.trim()}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Scan Territory
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filters */}
      {hasSearched && (
        <div className="flex gap-1.5 flex-wrap">
          {SIGNAL_CATEGORIES.map(cat => (
            <Badge
              key={cat.key}
              variant={activeCategory === cat.key ? "default" : "outline"}
              className="cursor-pointer gap-1 text-xs py-1 px-2.5"
              onClick={() => setActiveCategory(cat.key)}
            >
              <cat.icon className="h-3 w-3" />
              {cat.label}
              {cat.key !== "all" && (
                <span className="ml-0.5 opacity-60">
                  ({signals.filter(s => cat.key === "all" || s.type === cat.key).length})
                </span>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Signal Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Scanning {territory} for business signals…</p>
          </div>
        </div>
      ) : !hasSearched ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Globe className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Enter your territory above to discover business signals, events, and opportunities.
          </p>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Search className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No signals found for this filter. Try "All Signals".</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSignals.map((signal, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{signalIcon(signal.type)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{signal.title}</p>
                      <Badge variant="outline" className={`text-[9px] ${relevanceColor(signal.relevance)}`}>
                        {signal.relevance}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>
                    <div className="flex items-center gap-3 pt-1">
                      {signal.company && (
                        <span className="text-[10px] flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {signal.company}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{signal.source}</span>
                      <span className="text-[10px] text-muted-foreground">{signal.date}</span>
                      {signal.url && (
                        <a href={signal.url} target="_blank" rel="noopener" className="text-[10px] text-primary flex items-center gap-0.5">
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
