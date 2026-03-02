import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function EmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // provider name
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Authorization denied: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing authorization code");
      return;
    }

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "exchange_code",
            provider: state,
            code,
            redirect_uri: `${window.location.origin}/email-callback`,
          }),
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Failed to connect");

        setStatus("success");
        setMessage(`Connected ${data.email} via ${data.provider === "gmail" ? "Gmail" : "Outlook"}`);

        // Redirect back — prefer stored returnTo, fallback to settings
        const returnTo = sessionStorage.getItem("email_connect_return") || "/settings";
        sessionStorage.removeItem("email_connect_return");
        setTimeout(() => navigate(returnTo, { replace: true }), 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Connection failed");
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Connecting your email account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-10 w-10 text-primary mx-auto" />
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">Redirecting to settings...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-medium text-destructive">{message}</p>
            <button
              onClick={() => navigate("/settings")}
              className="text-xs text-primary underline"
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}
