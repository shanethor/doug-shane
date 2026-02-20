import { useEffect, useState, useCallback } from "react";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { FILLABLE_PDF_PATHS } from "@/lib/acord-field-map";

interface FieldInfo {
  index: number;
  type: string;
  name: string;
}

async function buildTestFillUrl(path: string, testIndices: Record<number, string>): Promise<string> {
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const fields = form.getFields();
  fields.forEach((f, i) => {
    try {
      if (f instanceof PDFTextField) {
        const val = testIndices[i];
        f.setText(val !== undefined ? val : `[${i}]`);
      }
    } catch { /* skip */ }
  });
  const saved = await doc.save({ useObjectStreams: false });
  return URL.createObjectURL(new Blob([saved.buffer as ArrayBuffer], { type: "application/pdf" }));
}

async function loadFields(path: string): Promise<FieldInfo[]> {
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true });
  const form = doc.getForm();
  return form.getFields().map((f, i) => ({
    index: i,
    name: f.getName(),
    type: f.constructor.name,
  }));
}

export default function PdfDiagnostic() {
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState<string>("acord-126");
  const [search, setSearch] = useState("");
  // Test fill: map index → value
  const [testFills, setTestFills] = useState<Record<number, string>>({});
  const [testInput, setTestInput] = useState("AURA AGENCY");
  const [formCounts, setFormCounts] = useState<Record<string, number>>({});

  const formIds = Object.keys(FILLABLE_PDF_PATHS);

  // Load field counts for all forms
  useEffect(() => {
    async function loadCounts() {
      const counts: Record<string, number> = {};
      for (const [id, path] of Object.entries(FILLABLE_PDF_PATHS)) {
        try {
          const f = await loadFields(path);
          counts[id] = f.length;
        } catch { counts[id] = -1; }
      }
      setFormCounts(counts);
    }
    loadCounts();
  }, []);

  // Load fields for selected form
  useEffect(() => {
    setFields([]);
    setBlobUrl(null);
    setTestFills({});
    setLoading(true);
    const path = FILLABLE_PDF_PATHS[selectedForm];
    if (!path) { setLoading(false); return; }
    loadFields(path).then(f => {
      setFields(f);
      // Build default indexed PDF
      return buildTestFillUrl(path, {});
    }).then(url => {
      setBlobUrl(url);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedForm]);

  const applyTestFill = useCallback(async () => {
    const path = FILLABLE_PDF_PATHS[selectedForm];
    if (!path) return;
    setLoading(true);
    const url = await buildTestFillUrl(path, testFills);
    setBlobUrl(url);
    setLoading(false);
  }, [selectedForm, testFills]);

  const filtered = search
    ? fields.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || String(f.index).includes(search))
    : fields;

  const isText = (f: FieldInfo) => f.type === "PDFTextField2";

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace", fontSize: 12 }}>
      {/* Left sidebar */}
      <div style={{ width: 380, overflowY: "auto", borderRight: "1px solid #ddd", padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <h2 style={{ fontSize: 13, margin: "0 0 4px" }}>ACORD PDF Field Mapper</h2>
        
        {/* Form selector */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {formIds.map(id => (
            <button key={id} onClick={() => setSelectedForm(id)}
              style={{ padding: "3px 7px", fontSize: 11, background: id === selectedForm ? "#dbeafe" : "#f0f0f0",
                border: id === selectedForm ? "1px solid #93c5fd" : "1px solid #ddd", borderRadius: 4, cursor: "pointer" }}>
              {id} ({formCounts[id] ?? "…"})
            </button>
          ))}
        </div>

        {/* Test fill panel */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: "bold", marginBottom: 4, fontSize: 11, color: "#1e40af" }}>Test Fill by Index</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <input value={testInput} onChange={e => setTestInput(e.target.value)}
              placeholder="Test value"
              style={{ flex: 1, padding: "3px 6px", border: "1px solid #ccc", borderRadius: 4, fontSize: 11 }} />
          </div>
          <div style={{ fontSize: 10, color: "#666", marginBottom: 6 }}>
            Click a TEXT field index below to add it to the test fill map, then click "Apply Fill" to see results in the PDF.
          </div>
          {Object.keys(testFills).length > 0 && (
            <div style={{ marginBottom: 6 }}>
              {Object.entries(testFills).map(([idx, val]) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#374151" }}>
                  <span>[{idx}] = "{val}"</span>
                  <button onClick={() => setTestFills(prev => { const n = {...prev}; delete n[Number(idx)]; return n; })}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 10 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={applyTestFill} disabled={loading}
            style={{ padding: "4px 10px", background: "#2563eb", color: "white", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer", width: "100%" }}>
            {loading ? "Building…" : "Apply Fill → PDF"}
          </button>
        </div>

        {/* Field list */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search field name or index…"
          style={{ padding: "4px 6px", border: "1px solid #ccc", borderRadius: 4, fontSize: 11, marginBottom: 4 }} />
        <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>{filtered.length} / {fields.length} fields</div>
        
        <div style={{ overflow: "auto", flex: 1 }}>
          {filtered.map(f => (
            <div key={f.index}
              onClick={() => {
                if (!isText(f)) return;
                setTestFills(prev => ({ ...prev, [f.index]: testInput }));
              }}
              style={{
                padding: "2px 4px", fontSize: 10, borderBottom: "1px solid #f0f0f0",
                cursor: isText(f) ? "pointer" : "default",
                background: testFills[f.index] !== undefined ? "#dbeafe" : "transparent",
                display: "flex", gap: 6, alignItems: "center"
              }}>
              <span style={{ color: "#9ca3af", minWidth: 26 }}>[{f.index}]</span>
              <span style={{ color: isText(f) ? "#2563eb" : "#7c3aed", minWidth: 28 }}>
                {isText(f) ? "TXT" : "CHK"}
              </span>
              <span style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={f.name}>
                {f.name.length > 35 ? f.name.slice(0, 35) + "…" : f.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: PDF preview */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {loading && (
          <div style={{ padding: 12, background: "#fef3c7", fontSize: 11, textAlign: "center" }}>Building PDF…</div>
        )}
        {blobUrl ? (
          <iframe key={blobUrl} src={blobUrl + "#toolbar=0&zoom=120"} style={{ width: "100%", flex: 1, border: "none" }} />
        ) : (
          <div style={{ padding: 24, color: "#9ca3af", textAlign: "center" }}>
            {loading ? "Loading…" : "Select a form to begin"}
          </div>
        )}
      </div>
    </div>
  );
}
