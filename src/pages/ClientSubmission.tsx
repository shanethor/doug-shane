import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UserPlus, Loader2, CheckCircle, Send, Home } from "lucide-react";

export default function ClientSubmission() {
  const { user } = useAuth();
  const { isProperty, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [oldAddress, setOldAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [partnerLink, setPartnerLink] = useState<any>(null);

  useEffect(() => {
    if (!roleLoading && !isProperty) {
      navigate("/", { replace: true });
    }
  }, [roleLoading, isProperty, navigate]);

  // Load the partner's linked advisor
  useEffect(() => {
    if (!user) return;
    supabase
      .from("property_partner_links" as any)
      .select("*")
      .eq("property_user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPartnerLink(data);
      });
  }, [user]);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !newAddress.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!partnerLink) {
      toast.error("Your account hasn't been linked to an advisor yet. Contact your admin.");
      return;
    }

    setSubmitting(true);
    try {
      const accountName = `${firstName.trim()} ${lastName.trim()}`;

      // Create lead in the linked advisor's pipeline
      const { error } = await supabase.from("leads").insert({
        account_name: accountName,
        contact_name: accountName,
        phone: phone.trim(),
        email: email.trim() || null,
        line_type: "personal",
        stage: "prospect" as any,
        owner_user_id: partnerLink.linked_advisor_user_id,
        lead_source: `partner:${partnerLink.partner_slug}`,
        state: null,
        business_type: "Residential Property",
        presenting_details: {
          old_address: oldAddress.trim(),
          new_address: newAddress.trim(),
          submitted_by: user?.id,
          partner_slug: partnerLink.partner_slug,
        },
      });

      if (error) throw error;

      // Send notification to the advisor
      await supabase.from("notifications").insert({
        user_id: partnerLink.linked_advisor_user_id,
        type: "pipeline",
        title: `New partner referral: ${accountName}`,
        body: `Submitted by ${partnerLink.partner_slug} partner — ${newAddress.trim()}`,
        link: "/pipeline",
        metadata: {
          partner_slug: partnerLink.partner_slug,
          is_partner_submission: true,
        },
      });

      setSubmitted(true);
      toast.success("Client submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (submitted) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-20 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-success mx-auto" />
          <h1 className="text-2xl font-bold">Client Submitted!</h1>
          <p className="text-muted-foreground">
            Your client has been added to the AURA pipeline. The assigned advisor will be notified and begin working on their coverage.
          </p>
          <Button onClick={() => { setSubmitted(false); setFirstName(""); setLastName(""); setPhone(""); setEmail(""); setOldAddress(""); setNewAddress(""); }}>
            Submit Another Client
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6 pb-24">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Submit a New Client
          </h1>
          <p className="text-sm text-muted-foreground">
            Submit a client for AURA coverage. They'll be added directly to your linked advisor's pipeline.
          </p>
          {partnerLink && (
            <Badge variant="outline" className="text-xs mt-2">
              <Home className="h-3 w-3 mr-1" />
              Partner: {partnerLink.partner_slug}
            </Badge>
          )}
          {!partnerLink && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-3 mt-2">
              <p className="text-xs text-warning">
                Your account hasn't been linked to an advisor yet. Contact your admin to set this up.
              </p>
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">First Name *</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="h-11"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Last Name *</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(203) 555-1234"
                  className="h-11"
                  type="tel"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@email.com"
                  className="h-11"
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Old Address</Label>
              <Input
                value={oldAddress}
                onChange={(e) => setOldAddress(e.target.value)}
                placeholder="123 Main St, Anytown, CT 06824"
                className="h-11"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">New Address *</Label>
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="456 Oak Ave, Fairfield, CT 06824"
                className="h-11"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !partnerLink}
              className="w-full h-11 gap-2"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><Send className="h-4 w-4" /> Submit to AURA</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
