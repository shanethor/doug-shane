import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Send, FileSignature, Plus, Trash2, Download,
} from "lucide-react";
import { toast } from "sonner";
import { getCarriers, type Carrier } from "@/lib/carrier-data";
import { generateLossRunPdf, type LossRunPdfData } from "@/lib/loss-run-pdf";

const POLICY_TYPES = ["GL", "Property", "Auto", "WC", "Umbrella", "BOP", "Professional", "Cyber", "Other"];

interface PolicyRow {
  carrier_id: string;
  carrier_name: string;
  carrier_email: string;
  policy_number: string;
  policy_type: string;
  effective_date: string;
  expiration_date: string;
  fax_number: string;
}

const emptyPolicy = (): PolicyRow => ({
  carrier_id: "",
  carrier_name: "",
  carrier_email: "",
  policy_number: "",
  policy_type: "",
  effective_date: "",
  expiration_date: "",
  fax_number: "",
});

export default function LossRunNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get("submissionId");
  const leadId = searchParams.get("leadId");

  const [step, setStep] = useState(1);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [saving, setSaving] = useState(false);

  // Step 1 fields
  const [namedInsured, setNamedInsured] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [producerEmail, setProducerEmail] = useState("");
  const [producerFax, setProducerFax] = useState("");
  const [aorNeeded, setAorNeeded] = useState(false);
  const [yearsRequested, setYearsRequested] = useState(5);

  // Step 2 fields
  const [policies, setPolicies] = useState<PolicyRow[]>([emptyPolicy()]);

  useEffect(() => {
    getCarriers().then(setCarriers);
  }, []);

  // Auto-populate from profile
  useEffect(() => {
    if (profile) {
      setProducerEmail((profile as any).from_email || "");
      const defaults = (profile as any).form_defaults as any;
      if (defaults?.agencyfax) setProducerFax(defaults.agencyfax);
    }
  }, [profile]);

  // Auto-populate from submission
  useEffect(() => {
    if (!submissionId) return;
    (async () => {
      const { data } = await supabase
        .from("insurance_applications")
        .select("form_data")
        .eq("id", submissionId)
        .maybeSingle();
      if (!data) return;
      const fd = (data as any).form_data || {};
      setNamedInsured(fd.applicantname || fd.insuredname || "");
      setAddress(fd.mailingaddress || "");
      setCity(fd.city || "");
      setState(fd.state || "");
      setZip(fd.zip || "");
      setPhone(fd.businessphone || "");
      setSignerName(fd.contactname1 || fd.producername || "");
      setSignerEmail(fd.contactemail1 || "");
      if (fd.carrier) {
        setPolicies([{
          ...emptyPolicy(),
          carrier_name: fd.carrier,
          policy_number: fd.policynumber || "",
          effective_date: fd.proposedeffdate || fd.effectivedate || "",
          expiration_date: fd.proposedexpdate || fd.expirationdate || "",
        }]);
      }
    })();
  }, [submissionId]);

  // Auto-populate from lead
  useEffect(() => {
    if (!leadId) return;
    (async () => {
      const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
      if (!data) return;
      setNamedInsured(data.account_name || "");
      setPhone(data.phone || "");
      setSignerEmail(data.email || "");
      if (data.contact_name) setSignerName(data.contact_name);
      if (data.state) setState(data.state);
    })();
  }, [leadId]);

  const updatePolicy = (i: number, field: keyof PolicyRow, value: string) => {
    const updated = [...policies];
    updated[i] = { ...updated[i], [field]: value };

    // Auto-fill carrier email when carrier selected
    if (field === "carrier_id" && value) {
      const carrier = carriers.find((c) => c.id === value);
      if (carrier) {
        updated[i].carrier_name = carrier.name;
        updated[i].carrier_email = carrier.loss_run_email || "";
        if (carrier.loss_run_fax) updated[i].fax_number = carrier.loss_run_fax;
      }
    }
    setPolicies(updated);
  };

  const addPolicy = () => setPolicies([...policies, emptyPolicy()]);
  const removePolicy = (i: number) => {
    if (policies.length <= 1) return;
    setPolicies(policies.filter((_, idx) => idx !== i));
  };

  const step1Valid = namedInsured && signerName && signerEmail;
  const step2Valid = policies.some((p) => p.carrier_name && p.policy_number);

  const handleSave = async (sendForSignature: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: req, error } = await supabase
        .from("loss_run_requests")
        .insert({
          lead_id: leadId || null,
          requested_by: user.id,
          user_id: user.id,
          status: (sendForSignature ? "awaiting_signature" : "draft") as any,
          named_insured: namedInsured,
          insured_address: address,
          insured_city: city,
          insured_state: state,
          insured_zip: zip,
          insured_phone: phone,
          signer_name: signerName,
          signer_title: signerTitle,
          signer_email: signerEmail,
          producer_email: producerEmail,
          producer_fax: producerFax,
          aor_needed: aorNeeded,
          years_requested: yearsRequested,
          submission_id: submissionId || null,
          signature_token: sendForSignature ? btoa(`${Date.now()}:${signerEmail}`) : null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Insert policy rows
      const policyInserts = policies
        .filter((p) => p.carrier_name)
        .map((p) => ({
          loss_run_request_id: req.id,
          carrier_id: p.carrier_id || null,
          carrier_name: p.carrier_name,
          policy_number: p.policy_number,
          policy_type: p.policy_type || null,
          effective_start: p.effective_date || null,
          effective_end: p.expiration_date || null,
          insured_name: namedInsured,
          request_email: p.carrier_email || null,
          fax_number: p.fax_number || null,
        }));

      if (policyInserts.length > 0) {
        await supabase.from("loss_run_policy_items").insert(policyInserts as any);
      }

      if (sendForSignature) {
        // Send signature request email
        try {
          const signUrl = `${window.location.origin}/loss-runs/${req.id}/sign?token=${(req as any).signature_token}`;
          await supabase.functions.invoke("send-email", {
            body: {
              to: signerEmail,
              subject: `Signature Required: Loss Run Request for ${namedInsured}`,
              html: `
                <h2>Loss Run Request — Signature Required</h2>
                <p>A loss run request has been created for <strong>${namedInsured}</strong>.</p>
                <p>Please click the link below to review and sign the request letter:</p>
                <p><a href="${signUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Review & Sign</a></p>
                <p style="color:#666;font-size:12px;">This link will remain active until the request is signed.</p>
              `,
            },
          });
          toast.success("Request saved & signature email sent!");
        } catch {
          toast.success("Request saved. Signature email may not have sent.");
        }
      } else {
        toast.success("Loss run request saved as draft");
      }

      navigate(`/loss-runs/${req.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save request");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    const pdfData: LossRunPdfData = {
      named_insured: namedInsured,
      insured_address: address,
      insured_city: city,
      insured_state: state,
      insured_zip: zip,
      insured_phone: phone,
      signer_name: signerName,
      signer_title: signerTitle,
      signer_email: signerEmail,
      producer_email: producerEmail,
      producer_fax: producerFax,
      years_requested: yearsRequested,
      policies: policies.filter((p) => p.carrier_name).map((p) => ({
        carrier_name: p.carrier_name,
        policy_type: p.policy_type,
        policy_number: p.policy_number,
        effective_start: p.effective_date,
        effective_end: p.expiration_date,
      })),
    };
    const bytes = await generateLossRunPdf(pdfData);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Loss_Run_Request_${namedInsured.replace(/\s+/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/loss-runs")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">New Loss Run Request</h1>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  s === step ? "bg-primary text-primary-foreground" : s < step ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 ${s < step ? "bg-success" : "bg-muted"}`} />}
            </div>
          ))}
          <span className="ml-3 text-xs text-muted-foreground">
            {step === 1 ? "Client & Signer Info" : step === 2 ? "Policy / Carrier Selection" : "Review & Send"}
          </span>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Client & Signer Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Named Insured *</Label>
                  <Input value={namedInsured} onChange={(e) => setNamedInsured(e.target.value)} placeholder="Business or individual name" />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>State</Label>
                    <Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input value={zip} onChange={(e) => setZip(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <Label>Years Requested</Label>
                  <Select value={String(yearsRequested)} onValueChange={(v) => setYearsRequested(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 10].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} years</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <hr className="border-border" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signer</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Signer Name *</Label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                </div>
                <div>
                  <Label>Signer Title</Label>
                  <Input value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Signer Email *</Label>
                  <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Producer Email</Label>
                  <Input type="email" value={producerEmail} onChange={(e) => setProducerEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Producer Fax</Label>
                  <Input value={producerFax} onChange={(e) => setProducerFax(e.target.value)} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={aorNeeded} onCheckedChange={setAorNeeded} />
                  <Label>AOR Letter Needed</Label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!step1Valid} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Policy / Carrier Selection</CardTitle>
                <Button size="sm" variant="outline" onClick={addPolicy} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {policies.map((pol, i) => (
                <div key={i} className="border border-border rounded-lg p-4 space-y-3 relative">
                  {policies.length > 1 && (
                    <Button
                      size="icon" variant="ghost"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => removePolicy(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Carrier *</Label>
                      <Select
                        value={pol.carrier_id}
                        onValueChange={(v) => updatePolicy(i, "carrier_id", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select carrier…" /></SelectTrigger>
                        <SelectContent>
                          {carriers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!pol.carrier_id && (
                        <Input
                          className="mt-1"
                          value={pol.carrier_name}
                          onChange={(e) => updatePolicy(i, "carrier_name", e.target.value)}
                          placeholder="Or type carrier name"
                        />
                      )}
                    </div>
                    <div>
                      <Label>Carrier Email</Label>
                      <Input
                        type="email"
                        value={pol.carrier_email}
                        onChange={(e) => updatePolicy(i, "carrier_email", e.target.value)}
                        placeholder="Loss run email"
                      />
                    </div>
                    <div>
                      <Label>Policy Number</Label>
                      <Input value={pol.policy_number} onChange={(e) => updatePolicy(i, "policy_number", e.target.value)} />
                    </div>
                    <div>
                      <Label>Policy Type</Label>
                      <Select value={pol.policy_type} onValueChange={(v) => updatePolicy(i, "policy_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {POLICY_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Effective Date</Label>
                      <Input type="date" value={pol.effective_date} onChange={(e) => updatePolicy(i, "effective_date", e.target.value)} />
                    </div>
                    <div>
                      <Label>Expiration Date</Label>
                      <Input type="date" value={pol.expiration_date} onChange={(e) => updatePolicy(i, "expiration_date", e.target.value)} />
                    </div>
                    <div>
                      <Label>Fax Number</Label>
                      <Input value={pol.fax_number} onChange={(e) => updatePolicy(i, "fax_number", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!step2Valid} className="gap-1.5">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 — Review & Send */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Letter Preview</CardTitle></CardHeader>
              <CardContent>
                <div className="bg-muted/30 border border-border rounded-lg p-6 font-serif text-sm leading-relaxed space-y-3">
                  <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                  <p className="font-bold">RE: Loss Run Request</p>
                  <p>Named Insured: {namedInsured}</p>
                  {policies.filter((p) => p.carrier_name).map((pol, i) => (
                    <div key={i} className="pl-4 border-l-2 border-primary/20 space-y-1">
                      <p>Insurance Carrier: {pol.carrier_name}</p>
                      {pol.policy_type && <p>Policy Type: {pol.policy_type}</p>}
                      <p>Policy Number: {pol.policy_number}</p>
                    </div>
                  ))}
                  <p>To Whom It May Concern,</p>
                  <p>
                    On behalf of {namedInsured}, I hereby request a copy of the entire History / a current Loss Run
                    for policies listed above, and any for other policies that pertain to {namedInsured} for the
                    past {yearsRequested} years.
                  </p>
                  <p>
                    Please send the requested information to my attention
                    {producerFax && ` by fax at ${producerFax}`} and by e-mail to {signerEmail}
                    {producerEmail && ` and ${producerEmail}`}.
                  </p>
                  <p>
                    Please do not delay in forwarding the requested information. Should any questions arise
                    please contact me immediately{phone && ` at ${phone}`}.
                  </p>
                  <p>Thank you in advance,</p>
                  <p>Sincerely,</p>
                  <p className="border-t border-foreground/30 pt-2 w-48" />
                  <p className="font-bold">{signerName}</p>
                  {signerTitle && <p>{signerTitle}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Send Options</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full gap-1.5"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  <FileSignature className="h-4 w-4" />
                  Send for E-Signature
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="gap-1.5" onClick={() => handleSave(false)} disabled={saving}>
                    Save as Draft
                  </Button>
                  <Button variant="outline" className="gap-1.5" onClick={handleDownloadPdf}>
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
