import { useEffect, useState } from "react";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";

interface FieldInfo {
  index: number;
  type: string;
  value?: string;
}

/** Fills every text field with its own index so we can identify fields visually */
async function buildIndexedBlobUrl(path: string): Promise<string> {
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { 
    ignoreEncryption: true,
    updateMetadata: false,
  });
  const form = doc.getForm();
  const fields = form.getFields();
  fields.forEach((f, i) => {
    try {
      if (f instanceof PDFTextField) f.setText(`[${i}]`);
    } catch { /* skip fields that can't be written */ }
  });
  const saved = await doc.save({ useObjectStreams: false });
  const blob = new Blob([saved.buffer as ArrayBuffer], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}


export default function PdfDiagnostic() {
  const [results, setResults] = useState<Record<string, FieldInfo[]>>({});
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<string>("acord-126");

  useEffect(() => {
    async function run() {
      const out: Record<string, FieldInfo[]> = {};
      const urls: Record<string, string> = {};
      for (const [formId, path] of Object.entries(FILLABLE_PDF_PATHS)) {
        try {
          const resp = await fetch(path);
          const bytes = await resp.arrayBuffer();
          const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true });
          const form = doc.getForm();
          const fields = form.getFields();
          const infos: FieldInfo[] = fields.map((f, i) => ({
            index: i,
            type: f.constructor.name,
            value: f instanceof PDFTextField ? (f.getText() || undefined) : undefined,
          }));
          out[formId] = infos;

          // Build indexed PDF for visual identification
          try {
            urls[formId] = await buildIndexedBlobUrl(path);
          } catch { /* 125 will fail */ }
        } catch (e) {
          out[formId] = [{ index: -1, type: `ERROR: ${e}` }];
        }
      }
      setResults(out);
      setPdfUrls(urls);
      setLoading(false);
    }
    run();
  }, []);

  const formIds = Object.keys(FILLABLE_PDF_PATHS);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace", fontSize: 12 }}>
      {/* Left: field list */}
      <div style={{ width: 300, overflowY: "auto", borderRight: "1px solid #ddd", padding: 12 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8 }}>Forms</h2>
        {formIds.map(id => (
          <button key={id} onClick={() => setSelectedForm(id)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 8px", marginBottom: 4,
              background: id === selectedForm ? "#dbeafe" : "#f4f4f4", border: "none", cursor: "pointer", borderRadius: 4 }}>
            {id} ({results[id]?.length ?? "…"} fields)
          </button>
        ))}
        {loading && <p>Loading…</p>}
        {selectedForm && results[selectedForm] && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 12, marginBottom: 6, color: "#1a56db" }}>{selectedForm}</h3>
            {results[selectedForm].map((f) => (
              <div key={f.index} style={{ padding: "2px 0", color: (f.type || "").includes("ERROR") ? "red" : "#333", fontSize: 11 }}>
                <span style={{ color: "#888", marginRight: 4 }}>[{f.index}]</span>
                <span style={{ color: f.type === "PDFTextField2" ? "#0070f3" : "#7c3aed" }}>
                  {f.type === "PDFTextField2" ? "TEXT" : f.type === "PDFCheckBox2" ? "CHECK" : (f.type || "?")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Right: PDF preview with index labels */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {pdfUrls[selectedForm] ? (
          <iframe src={pdfUrls[selectedForm] + "#toolbar=0"} style={{ width: "100%", height: "100%", border: "none" }} />
        ) : (
          <div style={{ padding: 24, color: "#888" }}>
            {loading ? "Building indexed PDF…" : "No preview available for this form."}
          </div>
        )}
      </div>
    </div>
  );
}


