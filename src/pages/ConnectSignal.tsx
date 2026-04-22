import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserVertical } from "@/hooks/useUserVertical";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThumbsDown, ThumbsUp, RefreshCw, Bell, ExternalLink, Loader2, Sparkles, Image as ImageIcon, Plus, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";

type SignalItem = {
  id: string;
  title: string;
  summary: string;
  source_name: string | null;
  source_url: string | null;
  image_url: string | null;
  ai_image: boolean;
  topics: string[];
  signal_type: string | null;
  importance_score: number;
  published_at: string | null;
  user_score?: number;
  why?: string;
};

type Prefs = {
  digest_enabled: boolean;
  digest_time: string;
  digest_timezone: string;
  custom_topics: string[];
};

const HEADER_QUOTE = "Professionals waste 2-3 valuable hours each day scrolling. Useful information exists, but social media is designed to keep us away from our jobs and families. Signal aims to fix that.";
const DEFAULT_VISIBLE = 10;

export default function ConnectSignal() {
  const { user } = useAuth();
  const { config } = useUserVertical();
  const industryLabel = config?.label || "Insurance";
  const industryId = (config as any)?.id || "insurance";

  const [items, setItems] = useState<SignalItem[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [genImageId, setGenImageId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);
  const [newTopic, setNewTopic] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({
    digest_enabled: false,
    digest_time: "08:00",
    digest_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    custom_topics: [],
  });

  const loadItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // v2: use signal-rank for personalized scoring + "why" reasons
      const { data: ranked, error: rankErr } = await supabase.functions.invoke("signal-rank", {
        body: { industry: industryId, topN: 60 },
      });
      const { data: fb } = await supabase
        .from("signal_feedback")
        .select("signal_item_id, reaction")
        .eq("user_id", user.id);

      const fbMap: Record<string, string> = {};
      (fb || []).forEach((f: any) => { fbMap[f.signal_item_id] = f.reaction; });
      setFeedback(fbMap);

      if (!rankErr && ranked?.items) {
        setItems(ranked.items as SignalItem[]);
      } else {
        // Fallback: direct table query
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: rows } = await supabase
          .from("signal_items")
          .select("*")
          .eq("industry", industryId)
          .gte("created_at", since)
          .order("importance_score", { ascending: false })
          .limit(40);
        const hidden = new Set(Object.entries(fbMap).filter(([, r]) => r === "not_interested").map(([id]) => id));
        setItems((rows || []).filter((r: any) => !hidden.has(r.id)) as SignalItem[]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, industryId]);

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("signal_preferences").select("*").eq("user_id", user.id).maybeSingle();
    if (data) {
      setPrefs({
        digest_enabled: (data as any).digest_enabled,
        digest_time: ((data as any).digest_time || "08:00").slice(0, 5),
        digest_timezone: (data as any).digest_timezone,
        custom_topics: (data as any).custom_topics || [],
      });
    }
  }, [user]);

  useEffect(() => { loadItems(); loadPrefs(); }, [loadItems, loadPrefs]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      // v2: trigger global ingest for this industry, then re-rank
      const { error } = await supabase.functions.invoke("signal-ingest", {
        body: { industries: [industryId] },
      });
      if (error) throw error;
      await loadItems();
      toast.success("Signal feed refreshed");
    } catch (e: any) {
      toast.error(e.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const react = async (item: SignalItem, reaction: "great_info" | "not_interested") => {
    if (!user) return;
    setFeedback(prev => ({ ...prev, [item.id]: reaction }));
    if (reaction === "not_interested") {
      setItems(prev => prev.filter(i => i.id !== item.id));
    }
    await supabase.from("signal_feedback").upsert({
      user_id: user.id,
      signal_item_id: item.id,
      reaction,
      topics_snapshot: item.topics,
      source_snapshot: item.source_name,
    }, { onConflict: "user_id,signal_item_id,reaction" });
    toast.success(reaction === "great_info" ? "Got it — more like this" : "Hidden — fewer like this");
  };

  const generateImage = async (item: SignalItem) => {
    setGenImageId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke("signal-image", {
        body: { signalItemId: item.id, prompt: item.title },
      });
      if (error) throw error;
      if (data?.image_url) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, image_url: data.image_url, ai_image: true } : i));
      }
    } catch (e: any) {
      toast.error("Image generation failed");
    } finally {
      setGenImageId(null);
    }
  };

  const savePrefs = async (next: Prefs) => {
    if (!user) return;
    setPrefs(next);
    await supabase.from("signal_preferences").upsert({
      user_id: user.id,
      digest_enabled: next.digest_enabled,
      digest_time: next.digest_time,
      digest_timezone: next.digest_timezone,
      custom_topics: next.custom_topics,
    } as any, { onConflict: "user_id" });
  };

  const addTopic = async () => {
    const t = newTopic.trim().toLowerCase();
    if (!t) return;
    if (prefs.custom_topics.includes(t)) { setNewTopic(""); return; }
    const next = { ...prefs, custom_topics: [...prefs.custom_topics, t] };
    setNewTopic("");
    await savePrefs(next);
    toast.success(`Following "${t}"`);
    loadItems();
  };

  const removeTopic = async (t: string) => {
    const next = { ...prefs, custom_topics: prefs.custom_topics.filter(x => x !== t) };
    await savePrefs(next);
    loadItems();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Signal</h1>
          <Badge variant="secondary" className="ml-2">{industryLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground italic max-w-3xl">"{HEADER_QUOTE}"</p>
      </div>

      {/* Digest scheduler */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Bell className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Daily digest email</p>
              <p className="text-xs text-muted-foreground">Get your top Signals delivered to your inbox each morning.</p>
            </div>
            <Switch
              checked={prefs.digest_enabled}
              onCheckedChange={(v) => savePrefs({ ...prefs, digest_enabled: v })}
            />
          </div>
          {prefs.digest_enabled && (
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">Time</Label>
                <Input
                  type="time"
                  value={prefs.digest_time}
                  onChange={(e) => setPrefs({ ...prefs, digest_time: e.target.value })}
                  onBlur={() => savePrefs(prefs)}
                  className="w-28"
                />
              </div>
              <span className="text-xs text-muted-foreground pb-2">{prefs.digest_timezone}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Custom subjects */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Your subjects</p>
          <span className="text-xs text-muted-foreground">— add topics you want to follow beyond {industryLabel}.</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {prefs.custom_topics.length === 0 && (
            <span className="text-xs text-muted-foreground">No extra subjects yet. Try “cyber liability”, “AI regulation”, “mortgage rates”…</span>
          )}
          {prefs.custom_topics.map(t => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1">
              {t}
              <button onClick={() => removeTopic(t)} className="hover:bg-background/50 rounded-sm p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a subject (e.g. cyber liability)"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
            className="flex-1"
          />
          <Button size="sm" onClick={addTopic} disabled={!newTopic.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {Math.min(visibleCount, items.length)} of {items.length} signals
        </p>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No signals yet for {industryLabel}.</p>
          <Button onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Fetch your first batch
          </Button>
        </Card>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.slice(0, visibleCount).map(item => (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-muted">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateImage(item)}
                      disabled={genImageId === item.id}
                    >
                      {genImageId === item.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4 mr-2" />
                      )}
                      Generate cover
                    </Button>
                  </div>
                )}
                {item.ai_image && (
                  <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">AI</Badge>
                )}
                <Badge className="absolute top-2 left-2 text-[10px]" variant="outline">
                  {item.signal_type || "news"} · {item.importance_score}
                </Badge>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                <h3 className="font-semibold leading-tight line-clamp-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">{item.summary}</p>
                {item.why && (
                  <p className="text-[11px] text-primary/80 italic">✦ {item.why}</p>
                )}
                {item.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.topics.slice(0, 4).map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">{item.source_name}</span>
                    {item.source_url && (
                      <a href={item.source_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={feedback[item.id] === "great_info" ? "default" : "ghost"}
                      className="h-8 px-2"
                      onClick={() => react(item, "great_info")}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => react(item, "not_interested")}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        {visibleCount < items.length && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setVisibleCount(c => c + 10)}
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              Show 10 more ({items.length - visibleCount} remaining)
            </Button>
          </div>
        )}
        </>
      )}
    </div>
  );
}