import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Mail, Save, User, BrainCircuit, Eye, EyeOff, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AGENCY_FIELDS = [
  { key: "agency_name", label: "Agency Name", placeholder: "ABC Insurance Agency" },
  { key: "agency_phone", label: "Agency Phone", placeholder: "(555) 123-4567" },
  { key: "agency_fax", label: "Agency Fax", placeholder: "(555) 123-4568" },
  { key: "agency_email", label: "Agency Email", placeholder: "info@agency.com" },
  { key: "producer_name", label: "Producer Name", placeholder: "Jane Smith" },
  { key: "producer_license_no", label: "Producer License No.", placeholder: "LIC-123456" },
  { key: "from_email", label: "Send-From Email", placeholder: "submissions@agency.com" },
];

export default function Settings() {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [aiProvider, setAiProvider] = useState("lovable");
  const [openaiKey, setOpenaiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("form_defaults, full_name, agency_name, phone, from_email, ai_provider, openai_api_key_encrypted")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data?.[0]) {
          const defaults = (data[0].form_defaults as Record<string, any>) || {};
          const merged: Record<string, string> = {};
          AGENCY_FIELDS.forEach((f) => {
            merged[f.key] = defaults[f.key] || "";
          });
          if (!merged.agency_name && data[0].agency_name) merged.agency_name = data[0].agency_name;
          if (!merged.producer_name && data[0].full_name) merged.producer_name = data[0].full_name;
          if (!merged.from_email && data[0].from_email) merged.from_email = data[0].from_email;
          if (!merged.agency_phone && data[0].phone) merged.agency_phone = data[0].phone;
          setValues(merged);
          setAiProvider((data[0] as any).ai_provider || "lovable");
          setOpenaiKey((data[0] as any).openai_api_key_encrypted || "");
        }
        setLoaded(true);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const nonEmpty = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v.trim())
      );
      const { error } = await supabase
        .from("profiles")
        .update({
          agency_name: nonEmpty.agency_name || null,
          phone: nonEmpty.agency_phone || null,
          full_name: nonEmpty.producer_name || user.user_metadata?.full_name || null,
          from_email: nonEmpty.from_email || null,
          form_defaults: nonEmpty,
          ai_provider: aiProvider,
          openai_api_key_encrypted: openaiKey || null,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Settings saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
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
      <h1 className="text-4xl mb-6">Settings</h1>

      {/* Account Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground w-32">Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{user?.email}</span>
              <Badge variant="outline" className="text-[10px]">Verified</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground w-32">User ID</Label>
            <span className="text-xs text-muted-foreground font-mono">{user?.id?.slice(0, 12)}…</span>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground w-32">Member Since</Label>
            <span className="text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Agency Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Agency Information
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            These details auto-fill on every ACORD form you generate.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGENCY_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </Label>
                <Input
                  value={values[f.key] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="h-10"
                />
              </div>
            ))}
          </div>

          <Separator />

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* AI & Email Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-accent" />
            AI & Email
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Configure which AI provider drafts your emails and notes. The built-in AURA AI works out of the box — or connect your own OpenAI API key to use your GPT with its memory.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">AI Provider</Label>
            <Select value={aiProvider} onValueChange={setAiProvider}>
              <SelectTrigger className="w-64 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">AURA AI (built-in, no key needed)</SelectItem>
                <SelectItem value="openai">My OpenAI API Key</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {aiProvider === "openai" && (
            <div className="space-y-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 p-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">OpenAI API Key</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    <p className="font-medium mb-1">Where to find your key:</p>
                    <ol className="list-decimal pl-3 space-y-0.5">
                      <li>Go to <strong>platform.openai.com</strong></li>
                      <li>Click your profile → <strong>API keys</strong></li>
                      <li>Click <strong>Create new secret key</strong></li>
                      <li>Copy and paste it here</li>
                    </ol>
                    <p className="mt-1 text-muted-foreground">Your key is stored securely and only used server-side for email drafting.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="h-10 pr-10 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Using your own key lets you leverage your GPT's memory and custom instructions for more personalized drafts.
              </p>
            </div>
          )}

          <Separator />
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
