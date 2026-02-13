import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ExternalLink, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type QuoteRequest = Tables<"quote_requests">;
type QuoteDocument = Tables<"quote_documents">;
type CustomerSubmission = Tables<"customer_submissions">;

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  in_review: "bg-warning/20 text-warning",
  quoted: "bg-accent/20 text-accent",
  bound: "bg-success/20 text-success",
  declined: "bg-destructive/10 text-destructive",
};

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [documents, setDocuments] = useState<QuoteDocument[]>([]);
  const [submissions, setSubmissions] = useState<CustomerSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerEmail, setCustomerEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("quote_requests").select("*").eq("id", id).single(),
      supabase.from("quote_documents").select("*").eq("quote_id", id),
      supabase.from("customer_submissions").select("*").eq("quote_id", id).order("created_at", { ascending: false }),
    ]).then(([qRes, dRes, sRes]) => {
      setQuote(qRes.data);
      setDocuments(dRes.data ?? []);
      setSubmissions(sRes.data ?? []);
      setLoading(false);
    });
  }, [id]);

  const createCustomerLink = async () => {
    if (!id || !user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("customer_links")
      .insert({ quote_id: id, agent_id: user.id, customer_email: customerEmail || null })
      .select()
      .single();
    if (error) { toast.error("Failed"); setCreating(false); return; }
    setGeneratedLink(`${window.location.origin}/submit/${data.token}`);
    setCreating(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !quote) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? (
      <div>
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">{label}</dt>
        <dd className="text-sm font-sans mt-0.5">{value}</dd>
      </div>
    ) : null;

  return (
    <AppLayout>
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 font-sans">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl">{quote.company_name}</h1>
            <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-sans ${statusColor[quote.status]}`}>
              {quote.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm font-sans mt-1">
            {quote.coverage_type} · Created {new Date(quote.created_at).toLocaleDateString()}
          </p>
        </div>

        <Dialog onOpenChange={() => { setGeneratedLink(""); setCustomerEmail(""); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <ExternalLink className="h-3 w-3" /> Customer Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif text-2xl">Send Customer Link</DialogTitle></DialogHeader>
            {!generatedLink ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Customer Email (optional)</Label>
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@company.com" />
                </div>
                <Button onClick={createCustomerLink} disabled={creating} className="w-full">
                  {creating ? "Generating…" : "Generate Link"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
                  <code className="flex-1 text-xs truncate font-sans">{generatedLink}</code>
                  <Button size="sm" variant="ghost" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Company Info */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-2xl mb-4">Company Information</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact Name" value={quote.contact_name} />
              <Field label="Contact Email" value={quote.contact_email} />
              <Field label="Contact Phone" value={quote.contact_phone} />
              <Field label="Industry" value={quote.industry} />
              <Field label="Annual Revenue" value={quote.annual_revenue} />
              <Field label="Employee Count" value={quote.employee_count} />
            </dl>
          </section>

          {/* Coverage */}
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-2xl mb-4">Coverage Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Effective Date" value={quote.effective_date} />
              <Field label="Expiration Date" value={quote.expiration_date} />
              <Field label="Current Carrier" value={quote.current_carrier} />
              <Field label="Current Premium" value={quote.current_premium} />
              <Field label="Coverage Limits" value={quote.coverage_limits} />
              <Field label="Deductible" value={quote.deductible} />
            </dl>
          </section>

          {quote.notes && (
            <section className="rounded-lg border bg-card p-6">
              <h2 className="text-2xl mb-4">Notes</h2>
              <p className="text-sm font-sans whitespace-pre-wrap">{quote.notes}</p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {/* Documents */}
          <section className="rounded-lg border bg-card p-6">
            <h3 className="text-xl mb-3">Documents</h3>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-sm font-sans">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{d.file_name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Customer Submissions */}
          <section className="rounded-lg border bg-card p-6">
            <h3 className="text-xl mb-3">Customer Submissions</h3>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((s) => (
                  <div key={s.id} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground font-sans mb-2">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                    <pre className="text-xs font-sans bg-muted p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(s.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
