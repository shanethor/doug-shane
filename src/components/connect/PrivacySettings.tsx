import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Shield, Download, Trash2, Eye, Loader2, AlertTriangle,
  CheckCircle, Clock, Mail, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ConsentRecord {
  id: string;
  consent_type: string;
  consent_version: string;
  accepted: boolean;
  created_at: string;
}

interface PrivacyRequest {
  id: string;
  request_type: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
}

export default function PrivacySettings() {
  const { user } = useAuth();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailConnected, setEmailConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    setLoading(true);

    const [consentRes, requestRes, emailRes] = await Promise.all([
      supabase.from("user_consent_records" as any).select("*")
        .eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("privacy_requests" as any).select("*")
        .eq("user_id", user!.id).order("requested_at", { ascending: false }),
      supabase.from("email_connections").select("id, is_active")
        .eq("user_id", user!.id).eq("is_active", true).limit(1),
    ]);

    setConsents((consentRes.data as any as ConsentRecord[]) || []);
    setRequests((requestRes.data as any as PrivacyRequest[]) || []);
    setEmailConnected((emailRes.data || []).length > 0);
    setLoading(false);
  }

  async function disconnectEmail() {
    setDisconnecting(true);
    try {
      // Deactivate email connections
      await supabase.from("email_connections")
        .update({ is_active: false } as any)
        .eq("user_id", user!.id);

      // Record revocation consent
      await supabase.from("user_consent_records" as any).insert({
        user_id: user!.id,
        consent_type: "email_access",
        consent_version: "1.0",
        accepted: false,
        user_agent: navigator.userAgent,
      } as any);

      setEmailConnected(false);
      toast.success("Email disconnected. No further syncs will occur.");
      loadData();
    } catch {
      toast.error("Failed to disconnect email");
    } finally {
      setDisconnecting(false);
    }
  }

  async function submitPrivacyRequest(type: string) {
    setSubmitting(type);
    try {
      await supabase.from("privacy_requests" as any).insert({
        user_id: user!.id,
        request_type: type,
      } as any);
      toast.success(`${type.replace(/_/g, " ")} request submitted`);
      loadData();
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(null);
    }
  }

  // Get latest consent status per type
  const latestConsents = new Map<string, ConsentRecord>();
  for (const c of consents) {
    if (!latestConsents.has(c.consent_type)) {
      latestConsents.set(c.consent_type, c);
    }
  }

  const consentTypes = [
    { key: "data_sharing_agreement", label: "Data Sharing Agreement", icon: Shield },
    { key: "social_enrichment", label: "Social Enrichment", icon: Eye },
    { key: "email_access", label: "Email Access (Headers)", icon: Mail },
    { key: "email_body_parsing", label: "Email Signature Parsing", icon: FileText },
  ];

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Privacy & Data Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your data sharing preferences, connected accounts, and privacy rights.
        </p>
      </div>

      {/* Active Consents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Consent Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {consentTypes.map(({ key, label, icon: Icon }) => {
            const latest = latestConsents.get(key);
            const isActive = latest?.accepted === true;
            return (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {latest ? `v${latest.consent_version} · ${new Date(latest.created_at).toLocaleDateString()}` : "Not yet accepted"}
                    </p>
                  </div>
                </div>
                <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
                  {isActive ? "Active" : latest ? "Revoked" : "Pending"}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Email Connection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connected Email</CardTitle>
        </CardHeader>
        <CardContent>
          {emailConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Email connected (read-only headers)</span>
              </div>
              <Button variant="destructive" size="sm" onClick={disconnectEmail} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              No email connected. Contact discovery is paused.
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            Disconnecting immediately stops all syncing. Existing discovered contacts remain but no new data is collected.
          </p>
        </CardContent>
      </Card>

      {/* Privacy Rights (CCPA / GDPR) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Privacy Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Under CCPA and GDPR, you have the right to access, export, and delete your data.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { type: "right_to_know", label: "Right to Know", desc: "See what data we collect about you", icon: Eye },
              { type: "data_export", label: "Export My Data", desc: "Download all your data in JSON format", icon: Download },
              { type: "opt_out_sharing", label: "Opt Out of Sharing", desc: "Stop all third-party enrichment", icon: Shield },
              { type: "data_deletion", label: "Delete My Data", desc: "Permanently delete all collected data", icon: Trash2 },
            ].map(({ type, label, desc, icon: Icon }) => {
              const existingRequest = requests.find(r => r.request_type === type && r.status === "pending");
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto py-3 px-4 justify-start"
                  disabled={!!existingRequest || submitting === type}
                  onClick={() => submitPrivacyRequest(type)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{existingRequest ? "Request pending..." : desc}</p>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Request History */}
      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-medium capitalize">{r.request_type.replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(r.requested_at).toLocaleDateString()}</p>
                  </div>
                  <Badge
                    variant={r.status === "completed" ? "default" : r.status === "processing" ? "secondary" : "outline"}
                    className="text-[10px]"
                  >
                    {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {r.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        AuRa complies with CCPA, GDPR, and applicable privacy laws. Your data is never sold. 
        Requests are processed within 30 days. Contact support for urgent matters.
      </p>
    </div>
  );
}
