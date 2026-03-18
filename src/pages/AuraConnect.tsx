import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserFeatures } from "@/hooks/useUserFeatures";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import {
  Search, User, Zap, Users, ArrowRight, Loader2,
  MapPin, Building2, Briefcase, TrendingUp, Network, Star,
} from "lucide-react";
import { toast } from "sonner";

interface ConnectionBrief {
  who_they_are: {
    name: string;
    location?: string;
    employer?: string;
    role?: string;
    industry?: string;
    affiliations?: string[];
    summary: string;
  };
  what_changed: {
    events: Array<{ type: string; description: string; date?: string }>;
  };
  who_can_get_you_there: Array<{
    name: string;
    relationship: string;
    confidence: number;
    reason: string;
  }>;
  best_path_in: {
    person: string;
    reason: string;
    confidence: "high" | "medium" | "low";
  };
  recommended_move: string;
}

export default function AuraConnect() {
  const { user } = useAuth();
  const { hasConnect } = useUserFeatures();
  const { isAdmin } = useUserRole();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<ConnectionBrief | null>(null);

  // Gate: must have connect feature or be admin
  if (!hasConnect && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleBuildBrief = async () => {
    if (!name.trim()) {
      toast.error("Enter a name to search");
      return;
    }

    setLoading(true);
    setBrief(null);

    try {
      const { data, error } = await supabase.functions.invoke("connection-brief", {
        body: { name: name.trim(), notes: notes.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setBrief(data.brief);
      toast.success("Connection Brief ready");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate brief");
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = (c: string) => {
    if (c === "high") return "text-success";
    if (c === "medium") return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-24">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            AURA Connect
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter a name. Get the warmest path to reach them.
          </p>
        </div>

        {/* Input Block */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="text-base"
                onKeyDown={(e) => e.key === "Enter" && handleBuildBrief()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Notes (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Met at chamber event · Owns a roofing company · Referred by Mike · Lives in Bristol"
                rows={3}
              />
            </div>

            <Button
              onClick={handleBuildBrief}
              disabled={loading || !name.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Building Connection Brief…</>
              ) : (
                <><Search className="h-4 w-4" /> Build Connection Brief</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Brief Output */}
        {brief && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Best Path Card (top) */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">Best Path In</h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${confidenceColor(brief.best_path_in.confidence)}`}
                      >
                        {brief.best_path_in.confidence} confidence
                      </Badge>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{brief.best_path_in.person}</span>
                      {" — "}
                      {brief.best_path_in.reason}
                    </p>
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground italic">
                      <ArrowRight className="h-3 w-3 inline mr-1" />
                      {brief.recommended_move}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Who They Are */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Who They Are
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{brief.who_they_are.summary}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {brief.who_they_are.location && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <MapPin className="h-3 w-3" /> {brief.who_they_are.location}
                    </Badge>
                  )}
                  {brief.who_they_are.employer && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Building2 className="h-3 w-3" /> {brief.who_they_are.employer}
                    </Badge>
                  )}
                  {brief.who_they_are.role && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Briefcase className="h-3 w-3" /> {brief.who_they_are.role}
                    </Badge>
                  )}
                  {brief.who_they_are.industry && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      {brief.who_they_are.industry}
                    </Badge>
                  )}
                </div>
                {brief.who_they_are.affiliations && brief.who_they_are.affiliations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {brief.who_they_are.affiliations.map((a, i) => (
                      <Badge key={i} variant="outline" className="text-[9px]">{a}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* What Changed */}
            {brief.what_changed.events.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-warning" />
                    What Changed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {brief.what_changed.events.map((ev, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <TrendingUp className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />
                        <div>
                          <span className="font-medium">{ev.type}</span>
                          {" — "}
                          {ev.description}
                          {ev.date && (
                            <span className="text-[11px] text-muted-foreground ml-1">({ev.date})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Who Can Get You There */}
            {brief.who_can_get_you_there.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    Who Can Get You There
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {brief.who_can_get_you_there.map((c, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 p-2 rounded-lg bg-muted/40">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.relationship}</p>
                          <p className="text-xs">{c.reason}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${
                            c.confidence >= 80 ? "text-success" : c.confidence >= 50 ? "text-warning" : "text-muted-foreground"
                          }`}
                        >
                          {c.confidence}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
