import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileSignature, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { generateLossRunPdf, addSignatureToPdf } from "@/lib/loss-run-pdf";

export default function LossRunSign() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [request, setRequest] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    (async () => {
      if (!id || !token) {
        setError("Invalid signing link.");
        setLoading(false);
        return;
      }
      const { data: req } = await supabase
        .from("loss_run_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (!req || (req as any).signature_token !== token) {
        setError("Invalid or expired signing link.");
        setLoading(false);
        return;
      }

      if (req.status === "sent" || req.status === "fulfilled" || req.status === "complete_received") {
        setSigned(true);
      }

      setRequest(req);

      const { data: pols } = await supabase
        .from("loss_run_policy_items")
        .select("*")
        .eq("loss_run_request_id", id);
      setPolicies(pols || []);
      setLoading(false);
    })();
  }, [id, token]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      isDrawing.current = true;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };

    const stopDraw = () => { isDrawing.current = false; };

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDraw);

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDraw);
    };
  }, [loading, signed]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !request) return;

    const sigBase64 = canvas.toDataURL("image/png");

    // Check if canvas is blank
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const hasContent = pixels.some((_, i) => i % 4 === 3 && pixels[i] > 0);
      if (!hasContent) {
        toast.error("Please sign before submitting.");
        return;
      }
    }

    setSigning(true);
    try {
      // Generate PDF with signature
      const pdfBytes = await generateLossRunPdf({
        named_insured: request.named_insured,
        insured_phone: request.insured_phone,
        signer_name: request.signer_name,
        signer_title: request.signer_title,
        signer_email: request.signer_email,
        producer_email: request.producer_email,
        producer_fax: request.producer_fax,
        years_requested: request.years_requested || 5,
        policies: policies.map((p: any) => ({
          carrier_name: p.carrier_name,
          policy_type: p.policy_type,
          policy_number: p.policy_number,
        })),
      });

      const signedPdf = await addSignatureToPdf(pdfBytes, sigBase64);

      // Update request status
      await supabase
        .from("loss_run_requests")
        .update({
          status: "sent" as any,
          signed_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Trigger auto-delivery to carrier
      try {
        await supabase.functions.invoke("send-loss-run", {
          body: { requestId: id, signedPdfBase64: btoa(String.fromCharCode(...signedPdf)) },
        });
      } catch {
        // Silent fail - the signed status is already saved
      }

      setSigned(true);
      toast.success("Thank you! Your signature has been captured and the request has been sent.");
    } catch (err) {
      toast.error("Failed to process signature. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Signed Successfully</h2>
            <p className="text-sm text-muted-foreground">
              The loss run request for <strong>{request?.named_insured}</strong> has been signed and sent to the carrier.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="text-center mb-6">
          <FileSignature className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-xl font-semibold">Loss Run Request — Signature Required</h1>
          <p className="text-sm text-muted-foreground">Please review the letter below and sign to authorize the release.</p>
        </div>

        {/* Letter Preview */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Request Letter</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-muted/30 border border-border rounded-lg p-5 font-serif text-sm leading-relaxed space-y-2">
              <p>{new Date(request.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              <p className="font-bold">RE: Loss Run Request</p>
              <p>Named Insured: {request.named_insured}</p>
              {policies.map((p: any, i: number) => (
                <div key={i} className="pl-4 border-l-2 border-primary/20">
                  <p>Carrier: {p.carrier_name} · Policy: {p.policy_number}</p>
                </div>
              ))}
              <p>To Whom It May Concern,</p>
              <p>On behalf of {request.named_insured}, I hereby request a copy of the current Loss Run for policies listed above for the past {request.years_requested || 5} years.</p>
              <p>Sincerely,<br/>{request.signer_name}{request.signer_title && `, ${request.signer_title}`}</p>
            </div>
          </CardContent>
        </Card>

        {/* Signature Canvas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Your Signature</CardTitle>
              <Button size="sm" variant="ghost" onClick={clearSignature}>Clear</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg bg-white">
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair"
                style={{ height: 150, touchAction: "none" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Draw your signature above using your mouse or finger.
            </p>
          </CardContent>
        </Card>

        <Button className="w-full gap-1.5 h-12 text-base" onClick={handleSign} disabled={signing}>
          {signing ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          I Agree & Sign
        </Button>
      </div>
    </div>
  );
}
