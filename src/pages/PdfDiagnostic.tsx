import { useEffect, useState, useCallback } from "react";
import { PDFDocument, PDFTextField, PDFCheckBox } from "pdf-lib";
import { FILLABLE_PDF_PATHS, ACORD_INDEX_MAPS, type AcordIndexMap } from "@/lib/acord-field-map";

interface FieldInfo {
  index: number;
  type: "TXT" | "CHK" | "OTHER";
  name: string;
}

/** Try AcroForm first; if 0 fields, attempt to enumerate XFA field names from raw XML */
async function loadFields(path: string): Promise<{ fields: FieldInfo[]; xfaNames: string[] }> {
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true });
  const form = doc.getForm();
  const acroFields = form.getFields().map((f, i) => ({
    index: i,
    name: f.getName(),
    type: (f instanceof PDFTextField ? "TXT" : f instanceof PDFCheckBox ? "CHK" : "OTHER") as "TXT" | "CHK" | "OTHER",
  }));

  // XFA field name extraction — parse raw PDF bytes looking for XFA XML
  const xfaNames: string[] = [];
  if (acroFields.length === 0) {
    try {
      // Try both UTF-8 and Latin-1 decoding to find XML content
      const rawBytes = new Uint8Array(bytes);
      // Search for XML field name patterns in chunks
      const latin1 = new TextDecoder("latin1").decode(rawBytes);
      const patterns = [
        /<(?:xfa:)?field[^>]+name="([^"]+)"/g,
        /name="([A-Za-z][A-Za-z0-9_\s\-\/()#]+)"/g,
        /\/T\s*\(([^)]+)\)/g,  // PDF AcroForm field name objects
        /\/T\s*<([0-9A-Fa-f]+)>/g, // hex-encoded field names
      ];
      const seen = new Set<string>();
      for (const regex of patterns) {
        let m;
        while ((m = regex.exec(latin1)) !== null) {
          const name = m[1].trim();
          if (name.length > 1 && name.length < 80 && !seen.has(name)) {
            seen.add(name);
            xfaNames.push(name);
          }
        }
      }
    } catch (_) { /* ignore */ }
  }

  return { fields: acroFields, xfaNames };
}

/** Fill using an index map — returns [key, idx, ok, fieldType] */
async function runRealFill(
  path: string,
  indexMap: AcordIndexMap,
  sampleData: Record<string, string>
): Promise<{ key: string; idx: number; ok: boolean; fieldType: string }[]> {
  const resp = await fetch(path);
  const bytes = await resp.arrayBuffer();
  const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const allFields = form.getFields();

  const results: { key: string; idx: number; ok: boolean; fieldType: string }[] = [];
  for (const [key, idx] of Object.entries(indexMap)) {
    const val = sampleData[key];
    if (!val) continue;
    const field = allFields[idx];
    if (!field) { results.push({ key, idx, ok: false, fieldType: "MISSING" }); continue; }
    const ft = field instanceof PDFTextField ? "TXT" : field instanceof PDFCheckBox ? "CHK" : "OTHER";
    try {
      if (field instanceof PDFTextField) { field.setText(val); results.push({ key, idx, ok: true, fieldType: ft }); }
      else { results.push({ key, idx, ok: false, fieldType: ft }); }
    } catch { results.push({ key, idx, ok: false, fieldType: ft }); }
  }
  return results;
}

const SAMPLE_DATA: Record<string, string> = {
  // Header (all forms)
  agency_name: "AURA AGENCY",
  agency_customer_id: "CUST-001",
  carrier: "HARTFORD FIRE INS CO",
  naic_code: "19682",
  policy_number: "POL-2025-001",
  effective_date: "01/01/2026",
  insured_name: "ACME CORPORATION LLC",
  // CGL 126
  general_aggregate: "$2,000,000",
  products_aggregate: "$2,000,000",
  personal_adv_injury: "$1,000,000",
  each_occurrence: "$1,000,000",
  fire_damage: "$100,000",
  medical_payments: "$5,000",
  // Auto 127
  driver_1_name: "JOHN DOE",
  driver_1_dob: "01/15/1985",
  driver_1_license: "D1234567",
  vehicle_1_year: "2022",
  vehicle_1_make: "FORD",
  vehicle_1_model: "F-150",
  vehicle_1_vin: "1FTFW1ET3NFC12345",
  garaging_city: "LOS ANGELES",
  garaging_state: "CA",
  garaging_zip: "90001",
  // WC 130
  class_code_1: "5403",
  class_description_1: "CARPENTRY",
  num_employees_1: "5",
  annual_remuneration_1: "$250,000",
  officer_1_name: "JANE SMITH",
  officer_1_title: "PRESIDENT",
  officer_1_ownership: "100%",
  wc_each_accident: "$1,000,000",
  wc_disease_policy_limit: "$1,000,000",
  wc_disease_each_employee: "$1,000,000",
  rating_state: "CA",
  // Umbrella 131
  each_occurrence_limit: "$5,000,000",
  aggregate_limit: "$5,000,000",
  underlying_gl_carrier: "HARTFORD",
  underlying_gl_occurrence: "$1,000,000",
  underlying_gl_aggregate: "$2,000,000",
  // Property 140
  building_amount: "$2,000,000",
  bpp_amount: "$500,000",
  construction_type: "FRAME",
  year_built: "1995",
  num_stories: "2",
  total_area_sq_ft: "5000",
  protection_class: "4",
  building_street_address: "123 MAIN ST",
  premises_city: "LOS ANGELES",
  premises_state: "CA",
  premises_zip: "90001",
  // Common
  mailing_address: "123 MAIN ST",
  city: "LOS ANGELES",
  state: "CA",
  zip: "90001",
  fein: "12-3456789",
  business_phone: "310-555-1234",
  description_of_operations: "GENERAL CONTRACTOR",
  annual_revenues: "$1,500,000",
  full_time_employees: "8",
  part_time_employees: "2",
};

export default function PdfDiagnostic() {
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [xfaNames, setXfaNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState<string>("acord-127");
  const [search, setSearch] = useState("");
  const [formCounts, setFormCounts] = useState<Record<string, number>>({});
  const [fillResults, setFillResults] = useState<{ key: string; idx: number; ok: boolean; fieldType: string }[]>([]);
  const [layoutView, setLayoutView] = useState(false);

  const formIds = Object.keys(FILLABLE_PDF_PATHS);

  useEffect(() => {
    async function loadCounts() {
      const counts: Record<string, number> = {};
      for (const [id, path] of Object.entries(FILLABLE_PDF_PATHS)) {
        try {
          const { fields: f, xfaNames: x } = await loadFields(path);
          counts[id] = f.length > 0 ? f.length : x.length > 0 ? -(x.length) : -1;
        } catch { counts[id] = -1; }
      }
      setFormCounts(counts);
    }
    loadCounts();
  }, []);

  useEffect(() => {
    setFields([]);
    setXfaNames([]);
    setFillResults([]);
    setLayoutView(false);
    setLoading(true);
    const path = FILLABLE_PDF_PATHS[selectedForm];
    if (!path) { setLoading(false); return; }
    loadFields(path).then(({ fields: f, xfaNames: x }) => {
      setFields(f);
      setXfaNames(x);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedForm]);

  const applyRealData = useCallback(async () => {
    const path = FILLABLE_PDF_PATHS[selectedForm];
    const indexMap = ACORD_INDEX_MAPS[selectedForm];
    if (!path || !indexMap) { alert("No index map for " + selectedForm); return; }
    setLoading(true);
    const results = await runRealFill(path, indexMap, SAMPLE_DATA);
    setFillResults(results);
    setLoading(false);
  }, [selectedForm]);

  /** Fill all TXT fields with their index number and download the PDF */
  const fillAllAndDownload = useCallback(async () => {
    const path = FILLABLE_PDF_PATHS[selectedForm];
    if (!path) return;
    const resp = await fetch(path);
    const bytes = await resp.arrayBuffer();
    const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true, updateMetadata: false });
    const form = doc.getForm();
    const allFields = form.getFields();
    allFields.forEach((f, i) => {
      if (f instanceof PDFTextField) {
        try { f.setText(`[${i}]`); } catch {}
      }
    });
    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedForm}-FILLED-INDICES.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedForm, fields]);

  /** Download a plain-text file listing all field indices, types, and names */
  const downloadTxtList = useCallback(() => {
    const lines = fields.map(f => `[${f.index}] ${f.type} "${f.name}"`);
    const text = `${selectedForm} — ${fields.length} fields\nTXT: ${fields.filter(f=>f.type==="TXT").length} | CHK: ${fields.filter(f=>f.type==="CHK").length}\n${"─".repeat(60)}\n${lines.join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedForm}-field-list.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedForm, fields]);

  const filtered = search
    ? fields.filter(f => String(f.index).includes(search) || f.type.toLowerCase().includes(search.toLowerCase()))
    : fields;

  const currentIndexMap = ACORD_INDEX_MAPS[selectedForm];
  const txtFields = fields.filter(f => f.type === "TXT");
  const chkFields = fields.filter(f => f.type === "CHK");
  const passed = fillResults.filter(r => r.ok).length;
  const failed = fillResults.filter(r => !r.ok);

  // Generate compact layout string for copying
  const layoutSummary = fields.map(f => `[${f.index}] ${f.type}`).join("\n");

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace", fontSize: 12, background: "#0f172a", color: "#e2e8f0" }}>
      {/* Left panel */}
      <div style={{ width: 460, overflowY: "auto", borderRight: "1px solid #334155", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 style={{ fontSize: 14, margin: "0 0 6px", color: "#f1f5f9" }}>ACORD Field Mapper — Diagnostic</h2>

        {/* Form tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {formIds.map(id => (
            <button key={id} onClick={() => setSelectedForm(id)}
              style={{ padding: "4px 8px", fontSize: 11, background: id === selectedForm ? "#2563eb" : "#1e293b",
                color: id === selectedForm ? "white" : "#94a3b8",
                border: id === selectedForm ? "1px solid #3b82f6" : "1px solid #334155",
                borderRadius: 4, cursor: "pointer" }}>
              {id.replace("acord-", "")} <span style={{ opacity: 0.7 }}>({formCounts[id] ?? "…"})</span>
            </button>
          ))}
        </div>

        {/* Stats bar */}
        {fields.length > 0 && (
          <div style={{ background: "#1e293b", borderRadius: 6, padding: "6px 10px", fontSize: 11, display: "flex", gap: 16 }}>
            <span>Total: <strong style={{ color: "#f1f5f9" }}>{fields.length}</strong></span>
            <span>TXT: <strong style={{ color: "#60a5fa" }}>{txtFields.length}</strong></span>
            <span>CHK: <strong style={{ color: "#a78bfa" }}>{chkFields.length}</strong></span>
            <span>Mapped: <strong style={{ color: "#4ade80" }}>{currentIndexMap ? Object.keys(currentIndexMap).length : 0}</strong></span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={applyRealData} disabled={loading || !currentIndexMap}
            style={{ flex: 1, padding: "6px 10px", fontSize: 12, background: "#16a34a",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
            {loading ? "Running…" : "✅ Run Real Data Fill"}
          </button>
          <button onClick={fillAllAndDownload} disabled={loading}
            style={{ padding: "6px 10px", fontSize: 11, background: "#d97706",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
            📥 Fill All TXT
          </button>
          <button onClick={downloadTxtList} disabled={loading || fields.length === 0}
            style={{ padding: "6px 10px", fontSize: 11, background: "#0ea5e9",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
            📄 TXT List
          </button>
          <button onClick={() => setLayoutView(v => !v)}
            style={{ padding: "6px 10px", fontSize: 11, background: layoutView ? "#7c3aed" : "#334155",
              color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
            {layoutView ? "📋 Layout" : "📋 Layout"}
          </button>
        </div>

        {/* Fill results */}
        {fillResults.length > 0 && (
          <div style={{ background: "#0f2211", border: `1px solid ${failed.length === 0 ? "#4ade80" : "#f87171"}`, borderRadius: 6, padding: 8 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, color: failed.length === 0 ? "#4ade80" : "#f87171", marginBottom: 6 }}>
              {passed}/{fillResults.length} fields filled ({Math.round(passed/fillResults.length*100)}%)
            </div>
            {fillResults.map(r => (
              <div key={r.key} style={{ fontSize: 10, color: r.ok ? "#86efac" : "#f87171", display: "flex", gap: 6, lineHeight: "16px" }}>
                <span style={{ minWidth: 14 }}>{r.ok ? "✓" : "✗"}</span>
                <span style={{ minWidth: 26, color: "#64748b" }}>[{r.idx}]</span>
                <span style={{ color: r.ok ? "#e2e8f0" : "#f87171", flex: 1 }}>{r.key}</span>
                {!r.ok && <span style={{ color: "#f59e0b", fontSize: 9 }}>{r.fieldType}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Current index map */}
        {currentIndexMap && (
          <div style={{ background: "#1a1a2e", border: "1px solid #fde047", borderRadius: 6, padding: 8 }}>
            <div style={{ fontWeight: "bold", fontSize: 11, color: "#fde047", marginBottom: 4 }}>
              Index Map ({Object.keys(currentIndexMap).length} keys)
            </div>
            {Object.entries(currentIndexMap).map(([key, idx]) => {
              const fieldType = fields[idx]?.type ?? "?";
              const isCorrect = fieldType === "TXT";
              return (
                <div key={key} style={{ fontSize: 10, display: "flex", gap: 6, lineHeight: "15px" }}>
                  <span style={{ color: "#64748b", minWidth: 26 }}>[{idx}]</span>
                  <span style={{ color: isCorrect ? "#86efac" : "#f87171", minWidth: 28, fontSize: 9 }}>{fieldType}</span>
                  <span style={{ color: "#e2e8f0" }}>{key}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Layout view */}
        {layoutView && (
          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: 8, maxHeight: 300, overflowY: "auto" }}>
            <div style={{ fontWeight: "bold", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
              Full field layout (TXT only shown first)
            </div>
            {txtFields.map(f => (
              <div key={f.index} style={{ fontSize: 10, color: "#60a5fa", lineHeight: "14px" }}>
                [{f.index}] TXT
              </div>
            ))}
          </div>
        )}

        {/* Field list with type filter */}
        <div style={{ display: "flex", gap: 4 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by index or TXT/CHK…"
            style={{ flex: 1, padding: "4px 6px", background: "#1e293b", border: "1px solid #334155",
              borderRadius: 4, fontSize: 11, color: "#e2e8f0" }} />
        </div>
        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{filtered.length} / {fields.length} fields</div>

        <div style={{ overflow: "auto", flex: 1 }}>
          {filtered.map(f => {
            const isMapped = currentIndexMap && Object.values(currentIndexMap).includes(f.index);
            const isWrongType = isMapped && f.type !== "TXT";
            return (
              <div key={f.index} style={{
                padding: "1px 4px", fontSize: 10, borderBottom: "1px solid #1e293b",
                background: isWrongType ? "#2d0f0f" : isMapped ? "#0f2211" : "transparent",
                display: "flex", gap: 6, alignItems: "center"
              }}>
                <span style={{ color: "#475569", minWidth: 30 }}>[{f.index}]</span>
                <span style={{ color: f.type === "TXT" ? "#60a5fa" : "#a78bfa", minWidth: 28 }}>{f.type}</span>
                {isMapped && <span style={{ color: isWrongType ? "#f87171" : "#4ade80", fontSize: 9 }}>{isWrongType ? "⚠" : "✓"}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel — TXT-only compact layout for reference */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#0f172a" }}>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>
          <strong style={{ color: "#f1f5f9" }}>TXT field indices for {selectedForm}</strong>
          {" — "}use these to build the index map. Green = already mapped, red = mapped to wrong type.
        </div>

        {fields.length > 0 && (
          <>
            {/* Compact grid of TXT fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 4, marginBottom: 24 }}>
              {fields.map(f => {
                const isMapped = currentIndexMap && Object.values(currentIndexMap).includes(f.index);
                const isWrongType = isMapped && f.type !== "TXT";
                const mappedKey = currentIndexMap
                  ? Object.entries(currentIndexMap).find(([, v]) => v === f.index)?.[0]
                  : undefined;
                return (
                  <div key={f.index} style={{
                    padding: "4px 6px", borderRadius: 4, fontSize: 10,
                    background: isWrongType ? "#2d0f0f"
                      : isMapped && f.type === "TXT" ? "#0f2211"
                      : f.type === "TXT" ? "#1e293b"
                      : "#160a29",
                    border: isWrongType ? "1px solid #f87171"
                      : isMapped && f.type === "TXT" ? "1px solid #4ade80"
                      : f.type === "TXT" ? "1px solid #334155"
                      : "1px solid #2d1f4a",
                  }}>
                    <div style={{ color: f.type === "TXT" ? "#60a5fa" : "#a78bfa", fontWeight: "bold" }}>
                      [{f.index}] {f.type}
                    </div>
                    {mappedKey && (
                      <div style={{ color: isWrongType ? "#f87171" : "#4ade80", fontSize: 9, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {mappedKey}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TXT-only list for easy copy */}
            <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8 }}>TXT fields only (for index map building):</div>
            <div style={{ background: "#1e293b", borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 10, lineHeight: "18px" }}>
              {txtFields.map(f => {
                const mappedKey = currentIndexMap
                  ? Object.entries(currentIndexMap).find(([, v]) => v === f.index)?.[0]
                  : undefined;
                return (
                  <div key={f.index} style={{ color: mappedKey ? "#4ade80" : "#94a3b8" }}>
                    <span style={{ color: "#60a5fa" }}>[{f.index}]</span>
                    {mappedKey ? ` → ${mappedKey}` : " → (unmapped)"}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* XFA-only PDF: show discovered field names */}
        {fields.length === 0 && xfaNames.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: "#fbbf24", fontSize: 12, marginBottom: 8, fontWeight: "bold" }}>
              ⚠ XFA-only PDF — {xfaNames.length} field names found in XML. AcroForm index mapping not applicable.
            </div>
            <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>
              These are the XFA field names. Use them for name-based matching only.
            </div>
            <div style={{ background: "#1e293b", borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 10, lineHeight: "18px", maxHeight: 600, overflowY: "auto" }}>
              {xfaNames.map((name, i) => (
                <div key={i} style={{ color: "#94a3b8" }}>
                  <span style={{ color: "#60a5fa", minWidth: 30, display: "inline-block" }}>[{i}]</span>
                  {" "}{name}
                </div>
              ))}
            </div>
          </div>
        )}

        {fields.length === 0 && xfaNames.length === 0 && !loading && (
          <div style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>
            No AcroForm fields found and no XFA XML detected. PDF may be corrupt or unsupported.
          </div>
        )}

        {loading && (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Loading fields…</div>
        )}
      </div>
    </div>
  );
}
