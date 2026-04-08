import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";

interface ClarkOnboardingProps {
  onComplete: () => void;
}

export default function ClarkOnboarding({ onComplete }: ClarkOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    producer_name: "",
    firm_name: "",
    firm_address: "",
    contact_phone: "",
    contact_email: "",
    license_number: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.producer_name || !form.firm_name) {
      toast.error("Producer name and firm name are required.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("clark_profiles").upsert({
        user_id: user.id,
        ...form,
      }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Profile saved!");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Welcome to Clark</CardTitle>
          <CardDescription>Set up your firm profile so Clark can auto-fill your agency details on every submission.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="producer_name">Producer Name *</Label>
                <Input id="producer_name" value={form.producer_name} onChange={set("producer_name")} placeholder="Jane Smith" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="firm_name">Firm Name *</Label>
                <Input id="firm_name" value={form.firm_name} onChange={set("firm_name")} placeholder="Smith Insurance Group" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firm_address">Firm Address</Label>
              <Input id="firm_address" value={form.firm_address} onChange={set("firm_address")} placeholder="123 Main St, Anytown, USA" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input id="contact_phone" value={form.contact_phone} onChange={set("contact_phone")} placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" value={form.contact_email} onChange={set("contact_email")} placeholder="jane@smithinsurance.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="license_number">License Number</Label>
              <Input id="license_number" value={form.license_number} onChange={set("license_number")} placeholder="Optional" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
