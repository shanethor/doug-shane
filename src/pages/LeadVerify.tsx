import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, HelpCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Response = "yes" | "no" | "maybe" | null;
type Stage = "loading" | "selecting" | "submitting" | "done" | "error" | "already_responded";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function LeadVerify() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [stage, setStage] = useState<Stage>("loading");
  const [response, setResponse] = useState<Response>(null);
  const [company, setCompany] = useState<string>("");

  // If response came in via URL param (email button click), submit immediately
  useEffect(() => {
    const urlResponse = searchParams.get("response") as Response;
    if (urlResponse && ["yes", "no", "maybe"].includes(urlResponse)) {
      setResponse(urlResponse);
      submitResponse(urlResponse);
    } else {
      setStage("selecting");
    }
  }, []);

  const submitResponse = async (resp: Response) => {
    if (!resp || !token) return;
    setStage("submitting");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/submit-lead-questionnaire`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, response: resp }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      if (data.already_responded) {
        setStage("already_responded");
        setCompany(data.company || "");
      } else {
        setStage("done");
        setCompany(data.company || "");
        setResponse(resp);
      }
    } catch (err: any) {
      console.error(err);
      setStage("error");
    }
  };

  const handleSelect = (resp: Response) => {
    setResponse(resp);
    submitResponse(resp);
  };

  // ── Render ──

  if (stage === "loading" || stage === "submitting") {
    return (
      <PageShell>
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">
          {stage === "submitting" ? "Saving your response…" : "Loading…"}
        </p>
      </PageShell>
    );
  }

  if (stage === "error") {
    return (
      <PageShell>
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">
          This link may be invalid or expired. Please contact the person who sent it.
        </p>
      </PageShell>
    );
  }

  if (stage === "already_responded") {
    return (
      <PageShell>
        <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Already received!</h2>
        <p className="text-muted-foreground text-sm">
          We already have your response{company ? ` for ${company}` : ""}. Thanks!
        </p>
      </PageShell>
    );
  }

  if (stage === "done") {
    const icons: Record<string, React.ReactNode> = {
      yes: <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />,
      maybe: <HelpCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />,
      no: <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />,
    };
    const messages: Record<string, { title: string; body: string }> = {
      yes: {
        title: "Great — we'll be in touch!",
        body: "Thanks for confirming. We'll reach out shortly to discuss your coverage options.",
      },
      maybe: {
        title: "Got it — we'll send some info",
        body: "No pressure at all. We'll follow up with some helpful information about your options.",
      },
      no: {
        title: "No problem at all",
        body: "We appreciate you letting us know. We won't bother you again.",
      },
    };
    const msg = messages[response!] || messages.maybe;

    return (
      <PageShell>
        {icons[response!]}
        <h2 className="text-xl font-bold mb-2">{msg.title}</h2>
        {company && (
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">
            {company}
          </p>
        )}
        <p className="text-muted-foreground text-sm leading-relaxed">{msg.body}</p>
        <p className="text-xs text-muted-foreground mt-6 opacity-60">Powered by AURA · buildingaura.site</p>
      </PageShell>
    );
  }

  // stage === "selecting" — show the question UI
  return (
    <PageShell>
      <div className="mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4"
          style={{ background: "hsl(140 12% 42% / 0.1)", color: "hsl(140 12% 38%)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Insurance Check
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Quick question for you
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          An insurance advisor wants to know if you're actively looking for coverage.
          Click one answer below — it takes one second.
        </p>
      </div>

      <div className="space-y-3 w-full">
        <Button
          className="w-full h-14 text-base gap-3 justify-start px-5"
          style={{ background: "hsl(140 50% 38%)" }}
          onClick={() => handleSelect("yes")}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Yes, I'm actively looking</span>
        </Button>

        <Button
          variant="outline"
          className="w-full h-14 text-base gap-3 justify-start px-5"
          onClick={() => handleSelect("maybe")}
        >
          <HelpCircle className="h-5 w-5 shrink-0 text-blue-500" />
          <span>Maybe — tell me more</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full h-14 text-base gap-3 justify-start px-5 text-muted-foreground"
          onClick={() => handleSelect("no")}
        >
          <XCircle className="h-5 w-5 shrink-0" />
          <span>Not right now</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-6 opacity-60">
        No forms. No obligation. One click. · Powered by AURA
      </p>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-2 py-12">
        {children}
      </div>
    </div>
  );
}
