import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProductLayout } from "@/components/ProductLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Loader2, User, CreditCard, Moon, Sun, Mail, ExternalLink } from "lucide-react";

export default function ProductSettings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
      }
      setLoaded(true);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      phone,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to save");
    else toast.success("Settings saved");
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else toast.info("No active subscription found");
    } catch (err: any) {
      toast.error(err.message || "Could not open billing portal");
    } finally {
      setOpeningPortal(false);
    }
  };

  if (!loaded) return (
    <ProductLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    </ProductLayout>
  );

  return (
    <ProductLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <h1 className="text-2xl font-light tracking-tight text-white/90">Settings</h1>

        {/* Profile */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-4 w-4 text-white/30" />
            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">Profile</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-white/40">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-white/40">Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-white/40">Email</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="bg-white/5 border-white/10 text-white/30"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="h-4 w-4 text-white/30" />
            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">Subscription</h2>
          </div>
          <p className="text-sm text-white/40">Manage your billing, payment method, and subscription plan.</p>
          <Button onClick={handleManageSubscription} disabled={openingPortal} variant="outline" size="sm" className="gap-2 border-white/10 text-white/60 hover:text-white hover:bg-white/5">
            {openingPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            Manage Subscription
          </Button>
        </div>

        {/* Preferences */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">Preferences</h2>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="h-4 w-4 text-white/30" /> : <Sun className="h-4 w-4 text-white/30" />}
              <div>
                <p className="text-sm text-white/70">Dark Mode</p>
                <p className="text-xs text-white/30">Toggle dark/light theme</p>
              </div>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={(v) => {
                setDarkMode(v);
                document.documentElement.classList.toggle("dark", v);
              }}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-white/30" />
              <div>
                <p className="text-sm text-white/70">Email Notifications</p>
                <p className="text-xs text-white/30">Receive updates about your requests</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>
    </ProductLayout>
  );
}
