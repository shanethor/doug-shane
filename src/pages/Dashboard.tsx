import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilePlus, ExternalLink, Copy, Check, Users, BarChart3, Mail, MessageSquare, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

type QuoteRequest = Tables<"quote_requests">;

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  in_review: "bg-warning/20 text-warning",
  quoted: "bg-accent/20 text-accent",
  bound: "bg-success/20 text-success",
  declined: "bg-destructive/10 text-destructive",
};

const FEATURE_BOXES = [
  {
    icon: Users,
    title: "Add a lead to our sales pipeline.",
    description: "Track prospects through quoting, presenting, and closing stages.",
    link: "/pipeline",
    cta: "Open Pipeline",
  },
  {
    icon: BarChart3,
    title: "Manage your production and renewals.",
    description: "View approved policies, pending approvals, and upcoming renewal dates.",
    link: "/approvals",
    cta: "View Production",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkQuoteId, setLinkQuoteId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("quote_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!mountedRef.current) return;
        setQuotes(data ?? []);
        setLoading(false);
      });
  }, [user]);

  // ... keep existing code (createCustomerLink, copyLink functions)

  const createCustomerLink = async () => {
    if (!linkQuoteId || !user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("customer_links")
      .insert({
        quote_id: linkQuoteId,
        agent_id: user.id,
        customer_email: customerEmail || null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create link");
      setCreating(false);
      return;
    }

    const link = `${window.location.origin}/submit/${data.token}`;
    setGeneratedLink(link);
    setCreating(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

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
      {/* Feature boxes */}
      <div className="mb-10 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {FEATURE_BOXES.map((box) => (
            <button
              key={box.title}
              onClick={() => navigate(box.link)}
              className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left hover:shadow-md hover:border-primary/30 transition-all duration-200"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <box.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{box.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{box.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Coming Soon — Email in chat */}
        <div className="relative rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-5 opacity-70">
          <Badge variant="outline" className="absolute top-3 right-3 text-[10px] uppercase tracking-wider font-sans bg-muted text-muted-foreground border-muted-foreground/30">
            Coming Soon
          </Badge>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Mail className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Email in your chat request to have a client ready to go when you get back to the office.</p>
              <p className="text-xs text-muted-foreground mt-1">Send client details via email and AURA will pre-fill everything before you arrive.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl">Quote Requests</h1>
          <p className="text-muted-foreground font-sans text-xs sm:text-sm mt-1">
            {quotes.length} submission{quotes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link to="/new-quote">
          <Button size="sm" className="gap-2">
            <FilePlus className="h-4 w-4" />
            New Quote
          </Button>
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FilePlus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl mb-1">No quotes yet</h3>
          <p className="text-muted-foreground text-sm font-sans mb-4">Create your first quote request to get started.</p>
          <Link to="/new-quote">
            <Button size="sm">Create Quote</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {quotes.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium text-sm font-sans truncate">{q.company_name}</span>
                  <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-sans ${statusColor[q.status] || ""}`}>
                    {q.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  {q.coverage_type} · {new Date(q.created_at).toLocaleDateString()}
                  {q.contact_name && ` · ${q.contact_name}`}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Dialog
                  onOpenChange={(open) => {
                    if (open) {
                      setLinkQuoteId(q.id);
                      setGeneratedLink("");
                      setCustomerEmail("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <ExternalLink className="h-3 w-3" />
                      Share Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-serif text-2xl">Send Customer Link</DialogTitle>
                    </DialogHeader>
                    {!generatedLink ? (
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Customer Email (optional)</Label>
                          <Input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="customer@company.com"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground font-sans">
                          Generate a secure link for your customer to submit their information directly. Link expires in 7 days.
                        </p>
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
                        <p className="text-xs text-muted-foreground font-sans">
                          Share this link with your customer. They can fill in company details and upload documents securely.
                        </p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Link to={`/quote/${q.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
