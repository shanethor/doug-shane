import { useEffect, useState, useCallback } from "react";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { FILLABLE_PDF_PATHS, ACORD_INDEX_MAPS, type AcordIndexMap } from "@/lib/acord-field-map";

interface FieldInfo {
  index: number;
  type: string;
  name: string;
}

/** Fill every text field with its own index label [N] */
async function buildIndexedPdfUrl(path: string): Promise<string> {
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const fields = form.getFields();
  fields.forEach((f, i) => {
    try {
      if (f instanceof PDFTextField) f.setText(`[${i}]`);
    } catch { /* skip */ }
  });
  const saved = await doc.save({ useObjectStreams: false });
  return URL.createObjectURL(new Blob([saved.buffer as ArrayBuffer], { type: "application/pdf" }));
}

/** Fill specific fields by index with a test value */
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
        f.setText(val !== undefined ? val : "");
      }
    } catch { /* skip */ }
  });
  const saved = await doc.save({ useObjectStreams: false });
  return URL.createObjectURL(new Blob([saved.buffer as ArrayBuffer], { type: "application/pdf" }));
}

/** Fill using an index map with real sample data */
async function buildRealDataFillUrl(path: string, indexMap: AcordIndexMap, sampleData: Record<string, string>): Promise<string> {
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const fields = form.getFields();

  const results: { key: string; idx: number; val: string; ok: boolean }[] = [];

  for (const [key, idx] of Object.entries(indexMap)) {
    const val = sampleData[key];
    if (!val) continue;
    const field = fields[idx];
    if (!field) { results.push({ key, idx, val, ok: false }); continue; }
    try {
      if (field instanceof PDFTextField) {
        field.setText(val);
        results.push({ key, idx, val, ok: true });
      }
    } catch { results.push({ key, idx, val, ok: false }); }
  }
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

const SAMPLE_DATA: Record<string, string> = {
  agency_name: "AURA AGENCY",
  agency_customer_id: "CUST-001",
  carrier: "HARTFORD FIRE INS CO",
  naic_code: "19682",
  policy_number: "POL-2025-001",
  effective_date: "01/01/2026",
  insured_name: "ACME CORPORATION LLC",
  general_aggregate: "$2,000,000",
  products_aggregate: "$2,000,000",
  personal_adv_injury: "$1,000,000",
  each_occurrence: "$1,000,000",
  fire_damage: "$100,000",
  medical_payments: "$5,000",
};

type ViewMode = "indexed" | "test" | "real";

export default function PdfDiagnostic() {
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState<string>("acord-126");
  const [search, setSearch] = useState("");
  const [testFills, setTestFills] = useState<Record<number, string>>({});
  const [testInput, setTestInput] = useState("AURA AGENCY");
  const [formCounts, setFormCounts] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("indexed");
  const [fillResults, setFillResults] = useState<{ key: string; idx: number; ok: boolean }[]>([]);

  const formIds = Object.keys(FILLABLE_PDF_PATHS);

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

  // Load fields + indexed view on form change
  useEffect(() => {
    setFields([]);
    setBlobUrl(null);
    setTestFills({});
    setFillResults([]);
    setLoading(true);
    const path = FILLABLE_PDF_PATHS[selectedForm];
    if (!path) { setLoading(false); return; }
    loadFields(path).then(async (f) => {
      setFields(f);
      const url = await buildIndexedPdfUrl(path);
      setBlobUrl(url);
      setViewMode("indexed");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedForm]);

  const showIndexed = useCallback(async () => {
    const path = FILLABLE_PDF_PATHS[selectedForm];
    if (!path) return;
    setLoading(true);
    const url = await buildIndexedPdfUrl(path);
    setBlobUrl(url);
    setViewMode("indexed");
    setLoading(false);
  }, [selectedForm]);

  const applyTestFill = useCallback(async () => {
    const path = FILLABLE_PDF_PATHS[selectedForm];
    if (!path) return;
    setLoading(true);
    const url = await buildTestFillUrl(path, testFills);
    setBlobUrl(url);
    setViewMode("test");
    setLoading(false);
  }, [selectedForm, testFills]);

  const applyRealData = useCallback(async () => {
    const path = FILLABLE_PDF_PATHS[selectedForm];
    const indexMap = ACORD_INDEX_MAPS[selectedForm];
    if (!path || !indexMap) { alert("No index map configured for " + selectedForm); return; }
    setLoading(true);

    // Build results
    const resp = await fetch(path);
    const bytes = await resp.arrayBuffer();
    const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true, updateMetadata: false });
    const form = doc.getForm();
    const allFields = form.getFields();

    const results: { key: string; idx: number; ok: boolean }[] = [];
    for (const [key, idx] of Object.entries(indexMap)) {
      const val = SAMPLE_DATA[key];
      if (!val) continue;
      const field = allFields[idx];
      if (!field) { results.push({ key, idx, ok: false }); continue; }
      try {
        if (field instanceof PDFTextField) {
          field.setText(val);
          results.push({ key, idx, ok: true });
        } else {
          results.push({ key, idx, ok: false });
        }
      } catch { results.push({ key, idx, ok: false }); }
    }

    const saved = await doc.save({ useObjectStreams: false });
    const url = URL.createObjectURL(new Blob([saved.buffer as ArrayBuffer], { type: "application/pdf" }));
    setBlobUrl(url);
    setFillResults(results);
    setViewMode("real");
    setLoading(false);
  }, [selectedForm]);

  const filtered = search
    ? fields.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || String(f.index).includes(search))
    : fields;

  const isText = (f: FieldInfo) => f.type === "PDFTextField2";
  const currentIndexMap = ACORD_INDEX_MAPS[selectedForm];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace", fontSize: 12 }}>
      {/* Left sidebar */}
      <div style={{ width: 420, overflowY: "auto", borderRight: "1px solid #ddd", padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
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

        {/* View mode buttons */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <button onClick={showIndexed} disabled={loading}
            style={{ flex: 1, padding: "5px 8px", fontSize: 11, background: viewMode === "indexed" ? "#1d4ed8" : "#64748b",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: viewMode === "indexed" ? "bold" : "normal" }}>
            📍 Show All Indices
          </button>
          <button onClick={applyRealData} disabled={loading}
            style={{ flex: 1, padding: "5px 8px", fontSize: 11, background: viewMode === "real" ? "#16a34a" : "#64748b",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: viewMode === "real" ? "bold" : "normal" }}>
            ✅ Test Real Data Fill
          </button>
        </div>

        {/* Real data fill results */}
        {viewMode === "real" && fillResults.length > 0 && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: "bold", fontSize: 11, color: "#166534", marginBottom: 4 }}>
              Fill Results ({fillResults.filter(r => r.ok).length}/{fillResults.length} fields filled)
            </div>
            {fillResults.map(r => (
              <div key={r.key} style={{ fontSize: 10, color: r.ok ? "#166534" : "#dc2626", display: "flex", gap: 6 }}>
                <span>{r.ok ? "✓" : "✗"}</span>
                <span style={{ color: "#374151" }}>{r.key}</span>
                <span style={{ color: "#9ca3af" }}>→ [{r.idx}]</span>
              </div>
            ))}
          </div>
        )}

        {/* Test fill panel */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: "bold", marginBottom: 4, fontSize: 11, color: "#1e40af" }}>Manual Index Test</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <input value={testInput} onChange={e => setTestInput(e.target.value)}
              placeholder="Test value"
              style={{ flex: 1, padding: "3px 6px", border: "1px solid #ccc", borderRadius: 4, fontSize: 11 }} />
          </div>
          <div style={{ fontSize: 10, color: "#666", marginBottom: 6 }}>
            Click a TXT field index below to add it, then apply.
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
          <button onClick={applyTestFill} disabled={loading || Object.keys(testFills).length === 0}
            style={{ padding: "4px 10px", background: Object.keys(testFills).length > 0 ? "#2563eb" : "#94a3b8",
              color: "white", border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer", width: "100%" }}>
            {loading ? "Building…" : "Apply Manual Test → PDF"}
          </button>
        </div>

        {/* Current index map */}
        {currentIndexMap && (
          <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 6, padding: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: "bold", fontSize: 11, color: "#713f12", marginBottom: 4 }}>
              Configured Index Map ({Object.keys(currentIndexMap).length} keys)
            </div>
            {Object.entries(currentIndexMap).map(([key, idx]) => (
              <div key={key} style={{ fontSize: 10, color: "#374151", display: "flex", gap: 6 }}>
                <span style={{ color: "#9ca3af", minWidth: 26 }}>[{idx}]</span>
                <span>{key}</span>
                {SAMPLE_DATA[key] && <span style={{ color: "#16a34a" }}>= "{SAMPLE_DATA[key]}"</span>}
              </div>
            ))}
          </div>
        )}

        {/* Field list */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search field name or index…"
          style={{ padding: "4px 6px", border: "1px solid #ccc", borderRadius: 4, fontSize: 11, marginBottom: 4 }} />
        <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>{filtered.length} / {fields.length} fields</div>

        <div style={{ overflow: "auto", flex: 1 }}>
          {filtered.map(f => {
            const isMapped = currentIndexMap && Object.values(currentIndexMap).includes(f.index);
            return (
              <div key={f.index}
                onClick={() => {
                  if (!isText(f)) return;
                  setTestFills(prev => ({ ...prev, [f.index]: testInput }));
                }}
                style={{
                  padding: "2px 4px", fontSize: 10, borderBottom: "1px solid #f0f0f0",
                  cursor: isText(f) ? "pointer" : "default",
                  background: testFills[f.index] !== undefined ? "#dbeafe" : isMapped ? "#f0fdf4" : "transparent",
                  display: "flex", gap: 6, alignItems: "center"
                }}>
                <span style={{ color: "#9ca3af", minWidth: 26 }}>[{f.index}]</span>
                <span style={{ color: isText(f) ? "#2563eb" : "#7c3aed", minWidth: 28 }}>
                  {isText(f) ? "TXT" : "CHK"}
                </span>
                {isMapped && <span style={{ color: "#16a34a", fontSize: 9 }}>✓</span>}
                <span style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={f.name}>
                  {f.name.length > 32 ? f.name.slice(0, 32) + "…" : f.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: PDF preview */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {loading && (
          <div style={{ padding: 12, background: "#fef3c7", fontSize: 11, textAlign: "center" }}>Building PDF…</div>
        )}
        <div style={{ padding: "6px 10px", background: "#1e293b", color: "#94a3b8", fontSize: 10, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "white", fontWeight: "bold" }}>
            {viewMode === "indexed" ? "📍 Every text field shows its own index [N]"
              : viewMode === "real" ? "✅ Real data filled using index map — check fields match expected labels"
              : "🧪 Manual test fill"}
          </span>
          {viewMode === "indexed" && (
            <span style={{ color: "#94a3b8" }}>Compare [N] values with physical form labels to verify mapping</span>
          )}
        </div>
        {blobUrl ? (
          <iframe key={blobUrl} src={blobUrl + "#toolbar=1&navpanes=0&zoom=120"} style={{ width: "100%", flex: 1, border: "none" }} />
        ) : (
          <div style={{ padding: 24, color: "#9ca3af", textAlign: "center" }}>
            {loading ? "Loading…" : "Select a form to begin"}
          </div>
        )}
      </div>
    </div>
  );
}
