import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CheckCircle, Clock } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-primary/10 text-primary",
  extracted: "bg-accent/20 text-accent-foreground",
  draft: "bg-warning/20 text-warning",
  complete: "bg-success/20 text-success",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("business_submissions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("insurance_applications")
        .select("*")
        .order("created_at", { ascending: false }),
    ]).then(([subRes, appRes]) => {
      setSubmissions(subRes.data ?? []);
      setApplications(appRes.data ?? []);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const completedApps = applications.filter((a) => a.status === "complete").length;
  const pendingSubs = submissions.filter((s) => s.status === "pending" || s.status === "processing").length;

  return (
    <AppLayout>
      <h1 className="text-4xl mb-8">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2.5">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold font-sans">{submissions.length}</p>
                <p className="text-xs text-muted-foreground font-sans">Total Submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-warning/10 p-2.5">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-semibold font-sans">{pendingSubs}</p>
                <p className="text-xs text-muted-foreground font-sans">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent/10 p-2.5">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-semibold font-sans">{applications.length}</p>
                <p className="text-xs text-muted-foreground font-sans">Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-success/10 p-2.5">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold font-sans">{completedApps}</p>
                <p className="text-xs text-muted-foreground font-sans">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All submissions */}
      <h2 className="text-2xl mb-4">All Submissions</h2>
      <div className="grid gap-3">
        {submissions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-medium text-sm font-sans truncate">
                  {s.company_name || "Untitled"}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase tracking-wider font-sans ${statusColor[s.status] || ""}`}
                >
                  {s.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-sans">
                User: {s.user_id.slice(0, 8)}… · {new Date(s.created_at).toLocaleDateString()}
              </p>
            </div>
            <Link to={`/application/${s.id}`}>
              <Button variant="ghost" size="sm" className="text-xs">
                View Application
              </Button>
            </Link>
          </div>
        ))}
        {submissions.length === 0 && (
          <p className="text-center text-muted-foreground font-sans text-sm py-12">
            No submissions yet.
          </p>
        )}
      </div>
    </AppLayout>
  );
}
