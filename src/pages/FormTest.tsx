import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, XCircle, Info, Download, Trash2 } from "lucide-react";
import FillablePdfViewer, { FillablePdfViewerHandle } from "@/components/FillablePdfViewer";

interface FieldChange {
  name: string;
  value: string;
  time: string;
}

type TestResult = {
  label: string;
  status: "pass" | "fail" | "pending" | "info";
  detail?: string;
};

export default function FormTest() {
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fieldChanges, setFieldChanges] = useState<FieldChange[]>([]);
  const [savedBytes, setSavedBytes] = useState<Uint8Array | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<FillablePdfViewerHandle>(null);

  const addResult = useCallback((result: TestResult) => {
    setResults((prev) => {
      const existing = prev.findIndex((r) => r.label === result.label);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result];
    });
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".pdf")) {
      addResult({ label: "File type", status: "fail", detail: "Only PDF files are supported" });
      return;
    }

    // Revoke old object URL if any
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);

    const url = URL.createObjectURL(file);
    setPdfObjectUrl(url);
    setFileName(file.name);
    setFieldChanges([]);
    setSavedBytes(null);
    setViewerReady(false);
    setResults([
      { label: "File type", status: "pass", detail: `${file.name} (${(file.size / 1024).toFixed(1)} KB)` },
      { label: "Viewer load", status: "pending" },
      { label: "Form fields", status: "pending", detail: "Edit a field in the PDF to test" },
      { label: "Save / write", status: "pending", detail: "Will confirm once Adobe saves" },
    ]);
  }, [pdfObjectUrl, addResult]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleViewerReady = () => {
    setViewerReady(true);
    addResult({ label: "Viewer load", status: "pass", detail: "Adobe Embed API initialized successfully" });
  };

  const handleFieldChange = (name: string, value: string) => {
    const time = new Date().toLocaleTimeString();
    setFieldChanges((prev) => {
      const existing = prev.findIndex((f) => f.name === name);
      const entry = { name, value, time };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = entry;
        return updated;
      }
      return [entry, ...prev].slice(0, 20);
    });
    addResult({
      label: "Form fields",
      status: "pass",
      detail: `Last change: "${name}" = "${value}"`,
    });
  };

  const handleSaveBytes = (bytes: Uint8Array) => {
    setSavedBytes(bytes);
    addResult({
      label: "Save / write",
      status: "pass",
      detail: `${bytes.length.toLocaleString()} bytes captured from Adobe`,
    });
  };

  const handleDownload = () => {
    if (!savedBytes) return;
    const blob = new Blob([savedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `filled-${fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTriggerSave = async () => {
    await viewerRef.current?.triggerSave();
  };

  const handleReset = () => {
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    setPdfObjectUrl(null);
    setFileName("");
    setFieldChanges([]);
    setSavedBytes(null);
    setResults([]);
    setViewerReady(false);
  };

  const statusIcon = (status: TestResult["status"]) => {
    if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    if (status === "fail") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    if (status === "info") return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0 animate-pulse" />;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">PDF Form Test Lab</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload any PDF to test if the Adobe viewer can load, read edits, and write back data.
            </p>
          </div>
          {pdfObjectUrl && (
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {!pdfObjectUrl ? (
          /* ── Upload zone ── */
          <div
            className={`border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop a PDF here, or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                Any fillable or non-fillable PDF — ACORD forms, custom forms, anything
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        ) : (
          /* ── Test layout ── */
          <div className="grid grid-cols-[1fr_300px] gap-4" style={{ height: "calc(100vh - 220px)" }}>
            {/* Left: PDF Viewer */}
            <div className="rounded-xl border overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate flex-1">{fileName}</span>
                {viewerReady && <Badge variant="secondary" className="text-xs">Ready</Badge>}
              </div>
              <div className="flex-1">
                <FillablePdfViewer
                  ref={viewerRef}
                  pdfUrl={pdfObjectUrl}
                  fileName={fileName}
                  onReady={handleViewerReady}
                  onFieldChange={handleFieldChange}
                  onSaveBytes={handleSaveBytes}
                />
              </div>
            </div>

            {/* Right: Results panel */}
            <div className="flex flex-col gap-4 overflow-y-auto">
              {/* Test Results */}
              <div className="rounded-xl border p-4 space-y-3">
                <h2 className="text-sm font-semibold">Test Results</h2>
                {results.map((r) => (
                  <div key={r.label} className="flex items-start gap-2">
                    {statusIcon(r.status)}
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight">{r.label}</p>
                      {r.detail && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 break-words leading-tight">{r.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="rounded-xl border p-4 space-y-2">
                <h2 className="text-sm font-semibold mb-3">Actions</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 text-xs"
                  onClick={handleTriggerSave}
                  disabled={!viewerReady}
                >
                  Trigger Save (Capture Bytes)
                </Button>
                <Button
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={handleDownload}
                  disabled={!savedBytes}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Filled PDF
                </Button>
                {savedBytes && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    {savedBytes.length.toLocaleString()} bytes ready
                  </p>
                )}
              </div>

              {/* Live field changes */}
              {fieldChanges.length > 0 && (
                <div className="rounded-xl border p-4 space-y-2">
                  <h2 className="text-sm font-semibold">Field Edits (live)</h2>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {fieldChanges.map((fc, i) => (
                      <div key={i} className="rounded-md bg-muted/40 px-2 py-1.5">
                        <p className="text-[11px] font-medium truncate text-foreground">{fc.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">"{fc.value}"</p>
                        <p className="text-[10px] text-muted-foreground/60">{fc.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="rounded-xl border p-4 space-y-2 text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground text-xs">How to test</p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>Upload a PDF — viewer should load</li>
                  <li>Click into a form field and type</li>
                  <li>Watch "Field Edits" panel update live</li>
                  <li>Click "Trigger Save" to capture bytes</li>
                  <li>Download and verify the filled PDF</li>
                </ol>
                <p className="mt-2">If fields are not editable, the PDF may be flat (non-AcroForm) or XFA-based.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
