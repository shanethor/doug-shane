import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Users, Calendar, Mail, Loader2,
  CheckCircle, ArrowRight, Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AnalyticsData {
  totalLists: number;
  totalProspects: number;
  introEmailsSent: number;
  convertedToMeeting: number;
  convertedToClient: number;
  avgScore: number;
  conversionRate: number;
  recentLists: any[];
}

export default function FeederListAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadAnalytics(); }, [user]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      // Get feeder lists
      const { data: lists } = await supabase
        .from("feeder_lists" as any)
        .select("id, client_name, meeting_date, status, generated_at, auto_triggered")
        .order("generated_at", { ascending: false })
        .limit(100);

      const listIds = (lists || []).map((l: any) => l.id);

      // Get all prospects
      let prospects: any[] = [];
      if (listIds.length > 0) {
        const { data: p } = await supabase
          .from("feeder_list_prospects" as any)
          .select("id, prospect_score, intro_email_sent, converted_to_meeting, converted_to_client, status")
          .in("feeder_list_id", listIds);
        prospects = (p as any[]) || [];
      }

      const introsSent = prospects.filter(p => p.intro_email_sent).length;
      const meetings = prospects.filter(p => p.converted_to_meeting).length;
      const clients = prospects.filter(p => p.converted_to_client).length;
      const scores = prospects.filter(p => p.prospect_score != null).map(p => p.prospect_score);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

      setData({
        totalLists: (lists || []).length,
        totalProspects: prospects.length,
        introEmailsSent: introsSent,
        convertedToMeeting: meetings,
        convertedToClient: clients,
        avgScore,
        conversionRate: prospects.length > 0 ? Math.round((clients / prospects.length) * 100) : 0,
        recentLists: (lists || []).slice(0, 10),
      });
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markConverted(prospectId: string, field: "converted_to_meeting" | "converted_to_client") {
    const update: any = { [field]: true };
    if (field === "converted_to_meeting") update.meeting_date = new Date().toISOString();
    if (field === "converted_to_client") update.client_converted_at = new Date().toISOString();

    await supabase.from("feeder_list_prospects" as any).update(update).eq("id", prospectId);
    toast.success(`Marked as ${field.replace(/_/g, " ")}`);
    loadAnalytics();
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!data) return null;

  const stats = [
    { label: "Feeder Lists", value: data.totalLists, icon: BarChart3, color: "text-primary" },
    { label: "Total Prospects", value: data.totalProspects, icon: Users, color: "text-blue-500" },
    { label: "Intro Emails", value: data.introEmailsSent, icon: Mail, color: "text-purple-500" },
    { label: "→ Meetings", value: data.convertedToMeeting, icon: Calendar, color: "text-amber-500" },
    { label: "→ New Clients", value: data.convertedToClient, icon: CheckCircle, color: "text-green-500" },
    { label: "Conversion Rate", value: `${data.conversionRate}%`, icon: TrendingUp, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Feeder List Analytics
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track the conversion funnel: Prospect → Meeting → New Client
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="py-3 px-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {[
              { label: "Prospects", count: data.totalProspects, color: "bg-blue-500" },
              { label: "Intro Sent", count: data.introEmailsSent, color: "bg-purple-500" },
              { label: "Meeting Set", count: data.convertedToMeeting, color: "bg-amber-500" },
              { label: "New Client", count: data.convertedToClient, color: "bg-green-500" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2 flex-1">
                <div className="flex-1 text-center">
                  <div className={`h-2 rounded-full ${step.color}`} style={{
                    width: `${data.totalProspects > 0 ? Math.max(10, (step.count / data.totalProspects) * 100) : 10}%`,
                    margin: "0 auto",
                  }} />
                  <p className="text-lg font-bold mt-1">{step.count}</p>
                  <p className="text-[11px] text-muted-foreground">{step.label}</p>
                </div>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Average Score */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Average Prospect Score</p>
              <p className="text-sm text-muted-foreground">Across all generated feeder lists</p>
            </div>
          </div>
          <span className={`text-3xl font-bold ${data.avgScore >= 70 ? "text-green-500" : data.avgScore >= 50 ? "text-amber-500" : "text-muted-foreground"}`}>
            {data.avgScore}
          </span>
        </CardContent>
      </Card>

      {/* Recent Lists */}
      {data.recentLists.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Feeder Lists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentLists.map((list: any) => (
              <div key={list.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{list.client_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(list.generated_at).toLocaleDateString()}
                    {list.auto_triggered && " · Auto-triggered"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {list.auto_triggered && <Badge variant="secondary" className="text-[10px]">⚡ Auto</Badge>}
                  <Badge variant={list.status === "ready" ? "default" : "secondary"} className="text-[10px]">{list.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Need toast import
import { toast } from "sonner";
