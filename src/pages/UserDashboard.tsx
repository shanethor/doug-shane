import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilePlus, FileText } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-primary/10 text-primary",
  extracted: "bg-accent/20 text-accent-foreground",
  complete: "bg-success/20 text-success",
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("business_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSubmissions(data ?? []);
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

  return (
    <AppLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-4xl">My Clients</h1>
          <p className="text-muted-foreground font-sans text-sm mt-1">
            Upload business plans, auto-fill ACORD forms, and manage submissions — {submissions.length} client{submissions.length !== 1 ? "s" : ""} total.
          </p>
        </div>
        <Link to="/submit-plan">
          <Button size="sm" className="gap-2">
            <FilePlus className="h-4 w-4" />
            Add New Client
          </Button>
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl mb-1">No clients yet</h3>
          <p className="text-muted-foreground text-sm font-sans mb-4">
            Submit a client's business plan to start prefilling their ACORD applications.
          </p>
          <Link to="/submit-plan">
            <Button size="sm">Add New Client</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {submissions.map((s) => (
            <Link
              key={s.id}
              to={`/application/${s.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium text-sm font-sans truncate">
                    {s.company_name || "Untitled Submission"}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wider font-sans ${statusColor[s.status] || ""}`}
                  >
                    {s.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  {new Date(s.created_at).toLocaleDateString()}
                  {s.description && ` · ${s.description.slice(0, 60)}…`}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs ml-4">
                {s.status === "extracted" || s.status === "complete" ? "Review" : "View"}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
