import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Loader2, Shield, Eraser, Download } from "lucide-react";
import { toast } from "sonner";
import { generateBorPdf, applySignatureToBorPdf, downloadPdf } from "@/lib/bor-pdf-generator";
import auraLogo from "@/assets/aura-logo.png";

export default function BorSign() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [borRecord, setBorRecord] = useState<any>(null);
  const [expired, setExpired] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await (supabase
        .from("bor_signatures" as any)
        .select("*")
        .eq("token", token)
        .maybeSingle() as any);

      if (error || !data) { setExpired(true); setLoading(false); return; }
      if (data.status === "signed") { setSigned(true); setBorRecord(data); setLoading(false); return; }
      if (new Date(data.expires_at) < new Date()) { setExpired(true); setLoading(false); return; }
      setBorRecord(data);
      setLoading(false);
    })();
  }, [token]);

  // Canvas drawing
  const getCtx = useCallback(() => canvasRef.current?.getContext("2d"), []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const pos = "touches" in e ? e.touches[0] : e;
    ctx.beginPath();
    ctx.moveTo(pos.clientX - rect.left, pos.clientY - rect.top);
  }, [getCtx]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const pos = "touches" in e ? e.touches[0] : e;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(pos.clientX - rect.left, pos.clientY - rect.top);
    ctx.stroke();
  }, [getCtx]);

  const endDraw = useCallback(() => { isDrawing.current = false; }, []);

  const clearSignature = () => {
    const ctx = getCtx();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const isCanvasBlank = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((v, i) => i % 4 === 3 && v > 0); // Check alpha channel
  };

  const handleSign = async () => {
    if (!borRecord || !canvasRef.current) return;
    if (isCanvasBlank()) { toast.error("Please draw your signature above"); return; }

    setSigning(true);
    try {
      const signatureDataUrl = canvasRef.current.toDataURL("image/png");

      // Generate the BOR PDF with signature applied
      const borPdfBytes = await generateBorPdf({
        insuredName: borRecord.insured_name,
        insuredAddress: borRecord.insured_address || "",
        carrierName: borRecord.carrier_name || "",
        policyNumber: borRecord.policy_number || "",
        policyEffectiveDate: borRecord.policy_effective_date || "",
        policyExpirationDate: borRecord.policy_expiration_date || "",
        selectedLines: borRecord.selected_lines || [],
        advisorName: "", advisorEmail: "", advisorPhone: "",
      });

      const signedPdfBytes = await applySignatureToBorPdf(borPdfBytes, signatureDataUrl, borRecord.insured_name);

      // Convert to base64 for storage in the record
      const signedBase64 = btoa(String.fromCharCode(...signedPdfBytes));

      // Update BOR record
      await (supabase
        .from("bor_signatures" as any)
        .update({
          status: "signed",
          signature_data: signatureDataUrl,
          signed_pdf_url: `data:application/pdf;base64,${signedBase64}`,
          signed_at: new Date().toISOString(),
        } as any)
        .eq("token", token) as any);

      // Trigger the completion edge function
      try {
        await supabase.functions.invoke("complete-bor-signing", {
          body: { token },
        });
      } catch {
        // Non-blocking — agent will still see the signed status
      }

      setSigned(true);
      toast.success("BOR letter signed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Signing failed");
    } finally {
      setSigning(false);
    }
  };

  const handleDownload = async () => {
    if (!borRecord) return;
    try {
      const borPdfBytes = await generateBorPdf({
        insuredName: borRecord.insured_name,
        insuredAddress: borRecord.insured_address || "",
        carrierName: borRecord.carrier_name || "",
        policyNumber: borRecord.policy_number || "",
        policyEffectiveDate: borRecord.policy_effective_date || "",
        policyExpirationDate: borRecord.policy_expiration_date || "",
        selectedLines: borRecord.selected_lines || [],
        advisorName: "", advisorEmail: "", advisorPhone: "",
      });

      if (borRecord.signature_data) {
        const signedBytes = await applySignatureToBorPdf(borPdfBytes, borRecord.signature_data, borRecord.insured_name);
        downloadPdf(signedBytes, `BOR_${borRecord.insured_name.replace(/\s+/g, "_")}_Signed.pdf`);
      } else {
        downloadPdf(borPdfBytes, `BOR_${borRecord.insured_name.replace(/\s+/g, "_")}.pdf`);
      }
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-warning mx-auto" />
            <h2 className="text-xl font-semibold">Link Expired or Invalid</h2>
            <p className="text-sm text-muted-foreground">This signing link is no longer valid. Please contact your insurance agent.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
            <img src={auraLogo} alt="AURA Risk Group" className="h-7" />
            <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> E-Signature
            </span>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-6">
          <div className="rounded-full bg-primary/10 p-4 inline-block">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Broker of Record Signed</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your Broker of Record authorization has been executed. A copy has been saved to your agent's file. Your agent has been notified and will begin working on your account immediately.
          </p>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" /> Download Signed Copy
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Signed at: {borRecord?.signed_at ? new Date(borRecord.signed_at).toLocaleString() : new Date().toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <img src={auraLogo} alt="AURA Risk Group" className="h-7" />
          <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" /> Secure E-Signature
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Broker of Record Authorization</h1>
          <p className="text-sm text-muted-foreground">Please review and sign below to authorize AURA Risk Group as your Broker of Record.</p>
        </div>

        {/* BOR Summary */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Insured</p>
                <p className="font-semibold">{borRecord.insured_name}</p>
                {borRecord.insured_address && <p className="text-xs text-muted-foreground">{borRecord.insured_address}</p>}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Carrier</p>
                <p className="font-semibold">{borRecord.carrier_name || "—"}</p>
              </div>
              {borRecord.policy_number && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Policy #</p>
                  <p>{borRecord.policy_number}</p>
                </div>
              )}
              {(borRecord.policy_effective_date || borRecord.policy_expiration_date) && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Policy Period</p>
                  <p>{[borRecord.policy_effective_date, borRecord.policy_expiration_date].filter(Boolean).join(" – ")}</p>
                </div>
              )}
            </div>
            {borRecord.selected_lines?.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Lines of Coverage</p>
                <div className="flex flex-wrap gap-1">
                  {borRecord.selected_lines.map((line: string) => (
                    <span key={line} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">{line}</span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BOR Letter Preview */}
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none text-sm leading-relaxed">
              <p>To Whom It May Concern:</p>
              <p>
                This letter confirms that effective upon renewal, {borRecord.policy_effective_date || "immediately"}, we have appointed <strong>AURA Risk Group</strong> as our retail agent with respect to the {borRecord.selected_lines?.join(", ") || "insurance program"} with {borRecord.carrier_name || "the current carrier"}.
              </p>
              <p>
                This appointment of AURA Risk Group rescinds all previous appointments, and this authority shall remain in full force until cancelled by us in writing. AURA Risk Group are hereby authorized to negotiate directly with any insurance company on our behalf and make any and all changes to all existing policies captioned, or binders in effect, including cancellations.
              </p>
              <p>
                This letter also constitutes the authority to AURA Risk Group with all information that they may request as it pertains to the above referenced insurance.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Signature Pad */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Your Signature</p>
              <Button variant="ghost" size="sm" onClick={clearSignature} className="text-xs">
                <Eraser className="h-3 w-3 mr-1" /> Clear
              </Button>
            </div>
            <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={560}
                height={150}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Draw your signature above using your mouse or finger</p>

            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                By signing below, I, <strong>{borRecord.insured_name}</strong>, authorize AURA Risk Group to act as Broker of Record for the selected lines of coverage. This does not cancel existing coverage.
              </p>
            </div>

            <Button className="w-full h-12 text-base" onClick={handleSign} disabled={signing}>
              {signing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing...</> : "Sign & Execute BOR Letter"}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center pb-4 space-y-1">
          <p className="text-[10px] text-muted-foreground">
            This document is legally binding. A timestamp and signature will be recorded for compliance purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
