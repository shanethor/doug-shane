import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Heart, Plus, Loader2, AlertTriangle, Check,
  ThermometerSun, TrendingDown, TrendingUp, Minus,
} from "lucide-react";

interface HealthCheck {
  id: string;
  contact_name: string;
  contact_company: string | null;
  health_score: number;
  notes: string | null;
  checked_at: string;
}

const SCORE_CONFIG: Record<number, { label: string; color: string; icon: any; bg: string }> = {
  1: { label: "Cold", color: "text-destructive", icon: TrendingDown, bg: "bg-destructive/10" },
  2: { label: "Cooling", color: "text-orange-500", icon: TrendingDown, bg: "bg-orange-500/10" },
  3: { label: "Neutral", color: "text-warning", icon: Minus, bg: "bg-warning/10" },
  4: { label: "Warm", color: "text-primary", icon: TrendingUp, bg: "bg-primary/10" },
  5: { label: "Strong", color: "text-success", icon: TrendingUp, bg: "bg-success/10" },
};

export default function ConnectHealthTab() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [contactName, setContactName] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [score, setScore] = useState(3);
  const [notes, setNotes] = useState("");
  const [posting, setPosting] = useState(false);

  const loadChecks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get the latest check per contact
      const { data, error } = await supabase
        .from("relationship_health_checks")
        .select("*")
        .eq("user_id", user.id)
        .order("checked_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Deduplicate - show latest per contact
      const seen = new Set<string>();
      const unique = (data || []).filter(c => {
        const key = c.contact_name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setChecks(unique);
    } catch {
      toast.error("Failed to load health checks");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadChecks(); }, [loadChecks]);

  const handleSubmit = async () => {
    if (!contactName.trim() || !user) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("relationship_health_checks").insert({
        user_id: user.id,
        contact_name: contactName.trim(),
        contact_company: contactCompany.trim() || null,
        health_score: score,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success("Health check saved!");
      setContactName("");
      setContactCompany("");
      setScore(3);
      setNotes("");
      setShowForm(false);
      loadChecks();
    } catch {
      toast.error("Failed to save health check");
    } finally {
      setPosting(false);
    }
  };

  // Stats
  const avgScore = checks.length > 0 ? (checks.reduce((s, c) => s + c.health_score, 0) / checks.length).toFixed(1) : "—";
  const coldCount = checks.filter(c => c.health_score <= 2).length;
  const strongCount = checks.filter(c => c.health_score >= 4).length;

  const daysAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <ThermometerSun className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{avgScore}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Avg Health</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-success" />
          <p className="text-2xl font-bold">{strongCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Strong</p>
        </Card>
        <Card className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
          <p className="text-2xl font-bold">{coldCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Needs Attention</p>
        </Card>
      </div>

      {coldCount > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm">
            <span className="font-semibold">{coldCount} relationship{coldCount > 1 ? "s" : ""}</span> {coldCount > 1 ? "are" : "is"} cooling off — consider reaching out this week.
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" />
          Quick Health Check
        </Button>
        <p className="text-xs text-muted-foreground">Rate your top relationships — 30 seconds</p>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contact Name</label>
                <Input placeholder="Sarah Johnson" value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company (optional)</label>
                <Input placeholder="Smith & Associates" value={contactCompany} onChange={e => setContactCompany(e.target.value)} />
              </div>
            </div>

            {/* Score Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Relationship Health</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => {
                  const config = SCORE_CONFIG[s];
                  return (
                    <Button
                      key={s}
                      variant={score === s ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 gap-1 ${score === s ? "" : "text-muted-foreground"}`}
                      onClick={() => setScore(s)}
                    >
                      <config.icon className="h-3 w-3" />
                      <span className="hidden sm:inline text-xs">{config.label}</span>
                      <span className="sm:hidden text-xs">{s}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
              <Textarea
                placeholder="Last spoke 3 weeks ago about their expansion..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="gap-1.5" onClick={handleSubmit} disabled={posting || !contactName.trim()}>
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />}
                Save Check
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Check List */}
      {loading ? (
        <div className="space-y-3 animate-page-fade">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      ) : checks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No health checks yet. Start rating your top 10 relationships.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {checks.map(check => {
            const config = SCORE_CONFIG[check.health_score] || SCORE_CONFIG[3];
            const ConfigIcon = config.icon;
            return (
              <div key={check.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className={`rounded-lg p-2 shrink-0 ${config.bg}`}>
                  <ConfigIcon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{check.contact_name}</p>
                    {check.contact_company && (
                      <span className="text-xs text-muted-foreground truncate">{check.contact_company}</span>
                    )}
                  </div>
                  {check.notes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{check.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                    {config.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{daysAgo(check.checked_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
