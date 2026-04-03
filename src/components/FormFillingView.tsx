import { useState, useEffect, useRef, useCallback } from "react";
import JSZip from "jszip";
import FillablePdfViewer, { type FillablePdfViewerHandle } from "@/components/FillablePdfViewer";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { useAuth } from "@/hooks/useAuth";
import { ACORD_FORMS, ACORD_FORM_LIST, type AcordFormField, type AcordFormDefinition } from "@/lib/acord-forms";
import { buildAutofilledData, buildAutofilledDataWithAI, formatUSD, CURRENCY_FIELDS, MANUAL_CODE_FIELDS } from "@/lib/acord-autofill";
import { FIELD_POSITION_MAP, type FieldPosition } from "@/lib/acord-field-positions";
import { generateSubmissionPackage } from "@/lib/submission-package";
import SubmitPackageDialog from "@/components/SubmitPackageDialog";
import { FILLABLE_PDF_PATHS, ACORD_FIELD_MAPS, ACORD_INDEX_MAPS } from "@/lib/acord-field-map";
import { getMergedIndexMap } from "@/lib/acord-pdf-fields";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Download, Send, Paperclip, Loader2, FileText, CheckCircle, X, Filter, Eye, Image, Mail, ChevronLeft, ChevronRight, ClipboardList, MessageSquare, Mic, MicOff, Plus, BrainCircuit, ShieldAlert, Package, LinkIcon, StickyNote, FileSearch } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { generateIntakeLink } from "@/lib/intake-links";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

interface FormFillingViewProps {
  submissionId: string;
  initialMessages: Msg[];
  initialFormId?: string;
  initialFormIds?: string[]; // pre-selected forms from chat context
  onBack: () => void;
  suppressAutoAnalysis?: boolean;
  initialCompanyName?: string;
}

type FieldFilter = "all" | "filled" | "empty";
type CenterView = "form" | "data";

const MOBILE_PANELS = [
  { key: "fields", label: "Fields", icon: ClipboardList },
  { key: "form", label: "Form", icon: FileText },
  { key: "chat", label: "Chat", icon: MessageSquare },
] as const;

type MobilePanel = typeof MOBILE_PANELS[number]["key"];

export default function FormFillingView({ submissionId, initialMessages, initialFormId, initialFormIds, onBack, suppressAutoAnalysis, initialCompanyName }: FormFillingViewProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [companyName, setCompanyName] = useState(initialCompanyName || "New Client");
  const [editingName, setEditingName] = useState(!!initialCompanyName && initialCompanyName === "New Client");
  const [loading, setLoading] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formDataRef = useRef<Record<string, any>>({});
  const [activeFormId, setActiveFormId] = useState(initialFormId || "acord-125");
  const [fieldFilter, setFieldFilter] = useState<FieldFilter>("all");
  const [centerView, setCenterView] = useState<CenterView>("form");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("fields");
  const [showFormProgress, setShowFormProgress] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100); // kept for backward compat
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Form package selection — which forms are in the active package
  const defaultEnabledIds = initialFormIds && initialFormIds.length > 0
    ? initialFormIds
    : ACORD_FORM_LIST.map(f => f.id);
  const [enabledFormIds, setEnabledFormIds] = useState<Set<string>>(new Set(defaultEnabledIds));
  const [showAddFormDialog, setShowAddFormDialog] = useState(false);

  // Submit Package dialog
  const [submitPackageOpen, setSubmitPackageOpen] = useState(false);
  const [narrativeOpen, setNarrativeOpen] = useState(false);

  // Email dialog state (kept for backward compat)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailMode, setEmailMode] = useState<"individual" | "package">("individual");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFormVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + " " + text : text));
  }, []);
  const handleFormVoiceAutoSend = useCallback((text: string) => {
    sendMessage(text);
  }, []);
  const formVoice = useVoiceInput(handleFormVoiceTranscript, handleFormVoiceAutoSend);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bytes captured from Adobe SAVE_API (includes in-viewer edits) keyed by formId
  const [savedPdfBytesMap, setSavedPdfBytesMap] = useState<Record<string, Uint8Array>>({});
  // Ref to the active FillablePdfViewer so we can trigger a save / inject field values
  const pdfViewerRef = useRef<FillablePdfViewerHandle>(null);
  // Debounce timer for left-panel → Adobe field injection
  const fillPdfTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether Adobe viewer is ready (has APIs) for the current form
  const [adobeReady, setAdobeReady] = useState(false);

  // ── Debounced viewer remount: prevent remount on every keystroke ──
  // viewerRevision increments after 1.5s of no panel edits → triggers PDF remount
  const [viewerRevision, setViewerRevision] = useState(0);
  const viewerRevisionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag: true when the latest formData change originated from the PDF viewer
  const editFromPdfRef = useRef(false);

  // Swipe gesture support
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  const isAllForms = activeFormId === "all";
  const activeForm = isAllForms ? null : ACORD_FORMS[activeFormId];

  // Only forms that are enabled in the package
  const enabledFormList = ACORD_FORM_LIST.filter(f => enabledFormIds.has(f.id));
  const formsNotInPackage = ACORD_FORM_LIST.filter(f => !enabledFormIds.has(f.id));

  // Merged fields across enabled forms (deduplicated by key)
  const allFormFields = (() => {
    const seen = new Set<string>();
    const fields: AcordFormField[] = [];
    for (const form of enabledFormList) {
      for (const field of form.fields) {
        if (!seen.has(field.key)) {
          seen.add(field.key);
          fields.push(field);
        }
      }
    }
    return fields;
  })();

  const currentFields = isAllForms ? allFormFields : (activeForm?.fields || []);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
    const panelKeys = MOBILE_PANELS.map(p => p.key);
    const currentIdx = panelKeys.indexOf(mobilePanel);
    if (dx < 0 && currentIdx < panelKeys.length - 1) {
      setMobilePanel(panelKeys[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      setMobilePanel(panelKeys[currentIdx - 1]);
    }
  }, [mobilePanel]);

  // Track latest formData in a ref so the debounce closure always sees current values

  /**
   * Build prefillByIndex for the active form: maps field INDEX → formatted string value.
   * Uses runtime-merged index map (PDF field names + semantic aliases) for full coverage.
   */
   const buildPrefillByIndex = useCallback(async (fId: string, data: Record<string, any>): Promise<Record<number, string>> => {
    // Merge BOTH runtime discovery AND static verified index maps for full coverage.
    // Runtime map must win because it reflects the exact currently loaded PDF bytes.
    const runtimeMap = await getMergedIndexMap(fId).catch(() => null) || {};
    const staticMap = ACORD_INDEX_MAPS[fId] || {};
    // Static map fills gaps only when runtime/alias lookup does not resolve a key.
    const indexMap: Record<string, number> = { ...staticMap, ...runtimeMap };
    if (Object.keys(indexMap).length === 0) return {};

    // Build a comprehensive set of checkbox keys from multiple sources:
    // 1. Explicit ACORD checkbox keys (LOB boxes, yes/no questions, attachment flags)
    const checkboxKeys = new Set<string>([
      // ACORD 125 LOB checkboxes
      "lob_commercial_general_liability",
      "lob_commercial_property",
      "lob_business_auto",
      "lob_umbrella",
      "lob_crime",
      "lob_cyber",
      "lob_inland_marine",
      "lob_boiler_machinery",
      "lob_bop",
      // ACORD 125 attachment flags
      "attach_addl_interest",
      "attach_schedule_auto",
      // ACORD 126 yes/no questions
      "draws_plans_for_others",
      "blasting_explosives",
      "excavation_underground",
      "subs_less_coverage",
      "subs_without_coi",
    ]);
    // 2. Form field definitions with type "checkbox"
    const formDef = ACORD_FORMS[fId as keyof typeof ACORD_FORMS];
    if (formDef?.fields) {
      for (const f of formDef.fields as AcordFormField[]) {
        if (f.type === "checkbox") checkboxKeys.add(f.key);
      }
    }
    // 3. Any key starting with "chk_" or "lob_" in the index map
    for (const key of Object.keys(indexMap)) {
      if (key.startsWith("chk_") || key.startsWith("lob_")) checkboxKeys.add(key);
    }

    const result: Record<number, string> = {};
    const debugEntries: string[] = [];
    for (const [internalKey, rawIdx] of Object.entries(indexMap)) {
      const idx = rawIdx as number;
      const val = data[internalKey];
      if (val === undefined || val === null || val === "") continue;
      const s = String(val).trim();
      // Skip N/A and other non-data placeholders — they should not go into the PDF
      if (s === "" || s === "N/A" || s === "n/a" || s === "[]") continue;

      let display: string;

      if (checkboxKeys.has(internalKey)) {
        // Normalize checkbox values to "On" (the standard ACORD PDF export value)
        const lower = s.toLowerCase();
        const isChecked = lower === "yes" || lower === "y" || lower === "true" || lower === "on"
          || lower === "x" || lower === "1" || s === internalKey;
        display = isChecked ? "On" : "Off";
        if (!isChecked) continue; // Skip unchecked boxes
      } else {
        // Skip boolean "false" for non-checkbox keys — prevents "false" text in PDF fields
        if (s === "false") continue;
        display = s;
        const isoMatch = display.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) display = `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
      }

      result[idx] = display;
      debugEntries.push(`  [${idx}] ${internalKey} = "${display.slice(0, 40)}"${checkboxKeys.has(internalKey) ? " ☑" : ""}`);
    }
    // Log unmapped keys: only warn about keys defined in THIS form's field list
    // that have values but no PDF index — ignore all cross-form data automatically
    const formFieldKeys = new Set(formDef?.fields?.map((f: any) => f.key) || []);
    const unmappedKeys: string[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined || val === null || val === "" || String(val).trim() === "") continue;
      if (key in indexMap) continue;
      // Only flag if this key actually belongs to this form's field definitions
      if (!formFieldKeys.has(key)) continue;
      unmappedKeys.push(key);
    }
    if (import.meta.env.DEV) {
      console.warn(`[prefill] ${fId}: ${debugEntries.length} fields mapped:\n${debugEntries.join("\n")}`);
    }
    if (unmappedKeys.length > 0 && import.meta.env.DEV) {
      console.warn(`[prefill] ${fId}: ${unmappedKeys.length} UNMAPPED keys (no PDF index):\n  ${unmappedKeys.join("\n  ")}`);
    }
    return result;
  }, []);

  // Compute prefill data from live formData — used at viewer mount time
  const [prefillByIndex, setPrefillByIndex] = useState<Record<number, string>>({});
  // Safety: track highest prefill count seen to prevent regression from stale re-renders
  const maxPrefillCountRef = useRef(0);
  // Timeout safety valve to dismiss loading overlay if prefill never resolves
  const [prefillTimedOut, setPrefillTimedOut] = useState(false);
  useEffect(() => {
    if (activeFormId && activeFormId !== "all") {
      buildPrefillByIndex(activeFormId, formData).then((result) => {
        const count = Object.keys(result).length;
        // Only update prefill if it has data OR we never had data (prevent clearing by stale sync)
        if (count >= maxPrefillCountRef.current || maxPrefillCountRef.current === 0) {
          maxPrefillCountRef.current = count;
          setPrefillByIndex(result);
        }
      });
    } else {
      setPrefillByIndex({});
    }
  }, [activeFormId, formData, buildPrefillByIndex]);
  // Reset max count when form changes
  useEffect(() => {
    maxPrefillCountRef.current = 0;
    setPrefillTimedOut(false);
  }, [activeFormId]);
  // Safety timeout: auto-dismiss overlay after 5s
  useEffect(() => {
    if (!dbLoaded) return;
    const timer = setTimeout(() => setPrefillTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [dbLoaded, activeFormId]);

  // Viewer key: remounts on form switch, initial DB load, debounced revision, OR when prefill data becomes available
  const prefillCount = Object.keys(prefillByIndex).length;
  const prefillKey = `${activeFormId}-${dbLoaded}-${viewerRevision}-${prefillCount}`;

  // Reset adobeReady when form changes (new Adobe instance mounts)
  useEffect(() => {
    setAdobeReady(false);
  }, [activeFormId]);

  // Debounced viewer refresh: after 1.5s of no panel edits, bump revision to remount viewer
  useEffect(() => {
    if (!dbLoaded) return;
    // If the edit came from the PDF, don't trigger a remount (would cause a loop)
    if (editFromPdfRef.current) {
      editFromPdfRef.current = false;
      return;
    }
    if (viewerRevisionTimerRef.current) clearTimeout(viewerRevisionTimerRef.current);
    viewerRevisionTimerRef.current = setTimeout(() => {
      setViewerRevision((r) => r + 1);
    }, 1500);
    return () => {
      if (viewerRevisionTimerRef.current) clearTimeout(viewerRevisionTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, dbLoaded]);

  /**
   * Build reverse map: actual PDF field name (as Adobe returns it) → internal key.
   *
   * For index-mapped forms: load the PDF, enumerate fields in order, then invert
   * index→key to get actualPdfFieldName→internalKey.
   * For name-mapped forms: directly invert the name map.
   */
  const buildReverseFieldMap = useCallback(async (formId: string): Promise<Record<string, string>> => {
    const reverse: Record<string, string> = {};
    const indexMap = ACORD_INDEX_MAPS[formId];

    if (indexMap) {
      // Index-based forms: load the PDF and read actual field names at each index
      const pdfPath = FILLABLE_PDF_PATHS[formId];
      if (pdfPath) {
        try {
          const { PDFDocument } = await import("pdf-lib");
          const resp = await fetch(pdfPath);
          const bytes = await resp.arrayBuffer();
          const doc = await PDFDocument.load(new Uint8Array(bytes), { ignoreEncryption: true });
          const allFields = doc.getForm().getFields();
          // Build index→internalKey then actualName→internalKey
          for (const [internalKey, idx] of Object.entries(indexMap)) {
            const field = allFields[idx];
            if (field) reverse[field.getName()] = internalKey;
          }
        } catch (e) {
          console.warn("[ReverseMap] Could not load PDF for reverse map:", e);
        }
      }
    }

    // Also include name-based fallback entries (covers non-index-mapped forms)
    const nameMap = ACORD_FIELD_MAPS[formId] || {};
    for (const [internalKey, pdfFieldName] of Object.entries(nameMap)) {
      if (!reverse[pdfFieldName]) reverse[pdfFieldName] = internalKey;
    }

    return reverse;
  }, []);

  // Per-form reverse maps (cached as promises to avoid duplicate fetches)
  const reverseFieldMapsRef = useRef<Record<string, Record<string, string>>>({});
  const reverseMapPromisesRef = useRef<Record<string, Promise<Record<string, string>>>>({});

  const getReverseMap = useCallback((formId: string): Record<string, string> => {
    // Start building async if not already cached
    if (!reverseMapPromisesRef.current[formId]) {
      reverseMapPromisesRef.current[formId] = buildReverseFieldMap(formId).then(map => {
        reverseFieldMapsRef.current[formId] = map;
        return map;
      });
    }
    // Return currently cached map (may be empty on first call, fills in async)
    return reverseFieldMapsRef.current[formId] || {};
  }, [buildReverseFieldMap]);

  // Pre-build reverse map whenever active form changes
  useEffect(() => {
    if (activeFormId && activeFormId !== "all") {
      getReverseMap(activeFormId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFormId]);

  // Handle field changes from Adobe viewer — reverse-map PDF field name → internal key
  const handleAdobeFieldChange = useCallback((formId: string, pdfFieldName: string, value: string) => {
    // Flag that this change came from the PDF so the debounce effect skips remounting
    editFromPdfRef.current = true;
    const reverseMap = getReverseMap(formId);
    // Try exact match, then case-insensitive
    const internalKey = reverseMap[pdfFieldName]
      || Object.entries(reverseMap).find(([k]) => k.toLowerCase() === pdfFieldName.toLowerCase())?.[1]
      || pdfFieldName;
    handleFieldChange(internalKey, value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getReverseMap]);
  /**
   * PDF→Panel sync via pdf-lib extraction.
   * When Adobe saves (auto-polled every 3s), we receive the PDF bytes,
   * parse them with pdf-lib, extract all field values by index, diff
   * against current formData, and sync any changes back to the left panel.
   */
  const handleSavedPdfBytes = useCallback(async (formId: string, bytes: Uint8Array) => {
    // Store bytes for download
    setSavedPdfBytesMap(prev => ({ ...prev, [formId]: bytes }));

    // Extract field values from the saved PDF
    // Use runtime+static merged map so PDF→panel sync follows the active PDF version.
    const runtimeMap = await getMergedIndexMap(formId).catch(() => null) || {};
    const staticMap = ACORD_INDEX_MAPS[formId] || {};
    const indexMap: Record<string, number> = { ...staticMap, ...runtimeMap };
    if (Object.keys(indexMap).length === 0) return;

    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const form = doc.getForm();
      const allFields = form.getFields();

      const updates: Record<string, string> = {};
      for (const [internalKey, idx] of Object.entries(indexMap)) {
        const field = allFields[idx];
        if (!field) continue;
        try {
          const f = field as any;
          let pdfValue = "";
          // Use method-existence checks instead of constructor.name
          if (typeof f.getText === "function") {
            pdfValue = f.getText() || "";
          } else if (typeof f.isChecked === "function") {
            pdfValue = f.isChecked() ? "true" : "false";
          } else if (typeof f.getSelected === "function") {
            const selected = f.getSelected();
            pdfValue = Array.isArray(selected) ? selected[0] || "" : String(selected || "");
          }

          const currentValue = String(formDataRef.current[internalKey] || "");
          // Don't sync boolean "false" into non-checkbox form data keys
          if (pdfValue === "false" && !internalKey.startsWith("chk_")) pdfValue = "";
          // Don't clear panel values with empty PDF values — only sync non-empty PDF edits
          // This prevents the save poll from wiping DB-loaded data before the PDF is prefilled
          if (pdfValue === "" && currentValue !== "") continue;
          // Sync any value that differs — most recent edit wins
          if (pdfValue !== currentValue) {
            updates[internalKey] = pdfValue;
          }
        } catch (_) {}
      }

      if (Object.keys(updates).length > 0) {
        // Flag as PDF-origin to prevent remount loop
        editFromPdfRef.current = true;
        setFormData(prev => {
          const next = { ...prev, ...updates };
          formDataRef.current = next;
          // Debounce DB persist
          if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
          autoSaveTimer.current = setTimeout(() => persistFormData(formDataRef.current), 800);
          return next;
        });
      }
    } catch (e) {
      // Silently fail — polling will retry
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollChatToBottom = useCallback(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollChatToBottom(); }, [messages, scrollChatToBottom]);

  // Auto-send an initial message when the 3-column view loads — deferred until DB data is loaded
  const hasAutoSent = useRef(false);
  useEffect(() => {
    if (hasAutoSent.current || loading || !dbLoaded) return;
    hasAutoSent.current = true;

    if (suppressAutoAnalysis) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ready when you are. Ask me anything about the fields or I can help you fill them in." },
      ]);
      return;
    }

    // Now formData has DB values — compute accurate stats
    const clientName = formData.applicant_name || formData.insured_name || formData.company_name || "this client";
    const packageFields = ACORD_FORM_LIST.filter(f => enabledFormIds.has(f.id)).flatMap(f => f.fields);
    const seen = new Set<string>();
    const uniqueFields = packageFields.filter(f => { if (seen.has(f.key)) return false; seen.add(f.key); return true; });
    const filledKeys = uniqueFields.filter(f => formData[f.key] && String(formData[f.key]).trim());
    const emptyKeys = uniqueFields.filter(f => !formData[f.key] || !String(formData[f.key]).trim());

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Loaded **${clientName}** — ${filledKeys.length} fields pre-filled, ${emptyKeys.length} remaining. Ask me to fill gaps, or say "auto-fill" to run AI inference on all fields.`,
      },
    ]);
  }, [loading, dbLoaded]);

  // Keep ref in sync so the debounced save always uses the latest data
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  const persistFormData = useCallback(async (data: Record<string, any>) => {
    if (!user || !submissionId) return;
    setAutoSaving(true);
    try {
      await supabase
        .from("insurance_applications")
        .update({ form_data: data })
        .eq("submission_id", submissionId)
        .eq("user_id", user.id);
    } catch (err) {
      console.error("Auto-save failed:", err);
      toast.error("Auto-save failed — your changes may not be saved. Please save manually.");
    } finally {
      setAutoSaving(false);
    }
  }, [user, submissionId]);

  // Load saved form data from DB on mount, and inject agency defaults if blank
  useEffect(() => {
    if (!user || !submissionId) return;
    (async () => {
      const { data } = await supabase
        .from("insurance_applications")
        .select("form_data")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let loaded: Record<string, any> = {};
      if (data?.form_data && typeof data.form_data === "object") {
        loaded = data.form_data as Record<string, any>;
      }

      // Always inject agency profile defaults for missing agency fields
      // (not just on blank forms — intake-sourced forms need agent data too)
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, agency_name, agency_id, phone, form_defaults")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const defaults: Record<string, string> = {};
          // Resolve agency name from agencies table (always up-to-date)
          if ((profile as any).agency_id) {
            const { data: agencyData } = await supabase.from("agencies").select("name").eq("id", (profile as any).agency_id).maybeSingle();
            if (agencyData) defaults.agency_name = agencyData.name;
          } else if (profile.agency_name) {
            defaults.agency_name = profile.agency_name;
          }
          if (profile.full_name) defaults.producer_name = profile.full_name;
          if (profile.phone) defaults.agency_phone = profile.phone;

          // Merge form_defaults (agency_email, agency_fax, producer_license_no, etc.)
          // NOTE: Skip agency_name here — it's already resolved from the canonical agencies table above
          const formDefaults = (profile.form_defaults || {}) as Record<string, string>;
          for (const [k, v] of Object.entries(formDefaults)) {
            if (k === "agency_name") continue; // agencies table is source of truth
            if (v && typeof v === "string" && v.trim()) {
              defaults[k] = v;
            }
          }

          // Agency name & producer name ALWAYS come from the user's profile/agencies table
          // (overrides whatever the AI may have extracted from the carrier's document)
          const FORCE_OVERRIDE_KEYS = ["agency_name", "producer_name"];
          for (const [k, v] of Object.entries(defaults)) {
            if (FORCE_OVERRIDE_KEYS.includes(k) && v) {
              loaded[k] = v;
            } else if (!loaded[k] || (typeof loaded[k] === "string" && !loaded[k].trim())) {
              loaded[k] = v;
            }
          }

          console.info("[FormFilling] Injected", Object.keys(defaults).length, "agency defaults");
        }
      } catch (e) {
        console.warn("[FormFilling] Could not load agency defaults:", e);
      }

      // Apply form-definition defaults (e.g. Y/N → "No") for fields with no extracted/DB value
      for (const form of ACORD_FORM_LIST) {
        for (const field of form.fields) {
          if (field.default && (!loaded[field.key] || (typeof loaded[field.key] === "string" && !loaded[field.key].trim()))) {
            loaded[field.key] = field.default;
          }
        }
      }

      // Expand arrays (drivers[], vehicles[], wc_classifications[], etc.) into flat fields
      // buildAutofilledData is the only place that does this expansion, so run it on DB load
      try {
        const { buildAutofilledData } = await import("@/lib/acord-autofill");
        for (const form of ACORD_FORM_LIST) {
          const expanded = buildAutofilledData(form, loaded, null, null, loaded);
          for (const [k, v] of Object.entries(expanded)) {
            const current = loaded[k];
            const currentStr = typeof current === "string" ? current.trim().toLowerCase() : "";
            const isFalseLike = current === false || currentStr === "false" || currentStr === "off" || currentStr === "no" || currentStr === "n" || currentStr === "0";
            const isEmptyLike = current === undefined || current === null || current === "" || (typeof current === "string" && !current.trim());
            const shouldFill = isEmptyLike || (v === true && isFalseLike);
            if (v !== undefined && v !== null && v !== "" && shouldFill) {
              loaded[k] = v;
            }
          }
        }
        console.info("[FormFilling] Expanded arrays into", Object.keys(loaded).length, "total fields");
      } catch (e) {
        console.warn("[FormFilling] Array expansion failed:", e);
      }

      setFormData(loaded);
      formDataRef.current = loaded;
      // Snapshot AI-extracted values for correction tracking
      aiSnapshotRef.current = { ...loaded };
      console.info("[FormFilling] Loaded", Object.values(loaded).filter(v => v && String(v).trim()).length, "fields from DB");
      setDbLoaded(true);
    })();
  }, [user, submissionId]);

  // Snapshot of AI-extracted values — set once after AI inference or DB load
  const aiSnapshotRef = useRef<Record<string, any>>({});
  // Debounce timer for batching correction inserts
  const correctionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCorrectionsRef = useRef<Record<string, { ai: string; corrected: string; label?: string }>>({});

  const flushCorrections = useCallback(() => {
    const corrections = pendingCorrectionsRef.current;
    pendingCorrectionsRef.current = {};
    if (!user || !submissionId || Object.keys(corrections).length === 0) return;
    const rows = Object.entries(corrections).map(([field_key, c]) => ({
      user_id: user.id,
      submission_id: submissionId,
      form_id: activeFormId || "unknown",
      field_key,
      field_label: c.label || field_key,
      ai_value: c.ai || "",
      corrected_value: c.corrected,
    }));
    supabase.from("extraction_corrections" as any).insert(rows as any).then(({ error }) => {
      if (error) console.warn("[CorrectionTracker] insert error:", error);
    });
  }, [user, submissionId, activeFormId]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      formDataRef.current = next;
      // Debounce DB persist — fires 800ms after last edit
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => persistFormData(formDataRef.current), 800);

      // Track correction if the value differs from AI snapshot
      const aiVal = String(aiSnapshotRef.current[key] || "");
      const newVal = String(value || "");
      if (aiVal && newVal !== aiVal) {
        const fieldDef = currentFields.find(f => f.key === key);
        pendingCorrectionsRef.current[key] = { ai: aiVal, corrected: newVal, label: fieldDef?.label };
        if (correctionTimerRef.current) clearTimeout(correctionTimerRef.current);
        correctionTimerRef.current = setTimeout(flushCorrections, 3000);
      }

      return next;
    });
  };

  // Send chat message
  const INFER_KEYWORDS = /\b(infer|auto.?fill|fill.?what.?you.?can|fill.?missing|fill.?fields|fill.?gaps|update.?fields|run.?ai|ai.?fill|use.?ai)\b/i;

  /**
   * Extract field values from natural language user messages.
   * Handles patterns like "Client email: shane@example.com", "Phone: 555-1234", etc.
   */
  const extractInlineFieldValues = (text: string): Record<string, string> => {
    const updates: Record<string, string> = {};
    const t = text.trim();

    // Email patterns: "client email: X", "email: X", "email is X", "their email is X"
    const emailMatch = t.match(/(?:client\s*)?e[-.]?mail(?:\s*address)?[\s:=]+\s*([^\s,;]+@[^\s,;]+)/i)
      || t.match(/(?:their|the|customer|client)\s+email\s+(?:is|=)\s+([^\s,;]+@[^\s,;]+)/i);
    if (emailMatch) updates.contact_email = emailMatch[1].trim();

    // Phone patterns
    const phoneMatch = t.match(/(?:client\s*)?(?:phone|tel|cell|mobile)(?:\s*(?:number|#))?[\s:=]+\s*([\d\s()+-]{7,20})/i)
      || t.match(/(?:their|the|customer|client)\s+(?:phone|number)\s+(?:is|=)\s+([\d\s()+-]{7,20})/i);
    if (phoneMatch) updates.contact_phone = phoneMatch[1].trim();

    // Contact name patterns
    const nameMatch = t.match(/(?:client\s*)?(?:contact\s*name|client\s*name|insured\s*name)[\s:=]+\s*([A-Z][^\n,;]{2,40})/i)
      || t.match(/(?:the\s+)?(?:contact|client|insured)\s+(?:is|name\s+is)\s+([A-Z][^\n,;]{2,40})/i);
    if (nameMatch) updates.contact_name = nameMatch[1].trim();

    // Company name
    const companyMatch = t.match(/(?:company|business)\s*(?:name)?[\s:=]+\s*([A-Z][^\n,;]{2,40})/i);
    if (companyMatch) updates.applicant_name = companyMatch[1].trim();

    // FEIN
    const feinMatch = t.match(/(?:fein|ein|tax\s*id)[\s:=]+\s*(\d{2}[\s-]?\d{7})/i);
    if (feinMatch) updates.fein = feinMatch[1].trim();

    // Address patterns
    const addressMatch = t.match(/(?:mailing\s*)?address[\s:=]+\s*(.{10,100})/i);
    if (addressMatch) updates.mailing_address = addressMatch[1].trim().replace(/[,;.]$/, "");

    return updates;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Detect inference intent and route to AI inference pipeline
    if (INFER_KEYWORDS.test(text)) {
      setInput("");
      runAiInference();
      return;
    }

    // Try to extract field values directly from user message (e.g. "Client email: shane@example.com")
    const inlineUpdates = extractInlineFieldValues(text);
    if (Object.keys(inlineUpdates).length > 0) {
      setFormData(prev => {
        const next = { ...prev, ...inlineUpdates };
        formDataRef.current = next;
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => persistFormData(formDataRef.current), 800);
        return next;
      });
      toast.success(`Filled ${Object.keys(inlineUpdates).length} field(s) from your message`);
    }

    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHeaders = await getAuthHeaders();
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: chatHeaders,
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) throw new Error("Chat failed");
      if (!resp.body) throw new Error("No stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              const currentText = fullText;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: currentText };
                return updated;
              });
            }
          } catch { break; }
        }
      }

      parseAndApplyFieldUpdates(fullText);
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to send message");
    }
    setIsLoading(false);
  };

  const parseAndApplyFieldUpdates = (text: string) => {
    const allKeys = new Set(ACORD_FORM_LIST.flatMap((f) => f.fields.map((field) => field.key)));
    const lines = text.split("\n");
    const updates: Record<string, string> = {};

    for (const line of lines) {
      const match = line.match(/^\s*[-•*]?\s*\*{0,2}([a-z_][a-z0-9_]*)\*{0,2}\s*[:=]\s*(.+)/i);
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, "_");
        if (allKeys.has(key)) {
          let val = match[2].trim().replace(/^["'`]|["'`]$/g, "").replace(/\*{1,2}$/g, "").trim();
          if (val) updates[key] = val;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
      toast.success(`Updated ${Object.keys(updates).length} field(s) from chat`);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // ── AI Inference: run full AI pipeline on all enabled forms and update fields ──
  const [isInferring, setIsInferring] = useState(false);
  const runAiInference = async () => {
    if (isInferring) return;
    setIsInferring(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Run AI inference and fill in any missing fields you can." },
    ]);
    try {
      const aiData = formData as Record<string, any>;
      const { buildAutofilledDataWithAI } = await import("@/lib/acord-autofill");

      let totalNewFields = 0;
      const merged: Record<string, any> = { ...formData };

      for (const form of enabledFormList) {
        const { data: inferred, aiInferredCount } = await buildAutofilledDataWithAI(form, aiData, undefined, undefined, aiData);
        for (const [k, v] of Object.entries(inferred)) {
          const current = merged[k];
          const currentStr = typeof current === "string" ? current.trim().toLowerCase() : "";
          const isFalseLike = current === false || currentStr === "false" || currentStr === "off" || currentStr === "no" || currentStr === "n" || currentStr === "0";
          const isEmptyLike = current === undefined || current === null || current === "" || (typeof current === "string" && !current.trim());
          const shouldFill = isEmptyLike || (v === true && isFalseLike);
          if (v !== "" && v !== null && v !== undefined && shouldFill) {
            merged[k] = v;
            totalNewFields++;
          }
        }
      }

      setFormData(merged);
      // Update AI snapshot so future user edits are tracked against new AI values
      aiSnapshotRef.current = { ...merged };

      // Persist to DB
      await supabase
        .from("insurance_applications")
        .update({ form_data: merged })
        .eq("submission_id", submissionId)
        .eq("user_id", user?.id);

      const assistantMsg = totalNewFields > 0
        ? `✅ AI inference complete — I filled in **${totalNewFields} additional field(s)** based on the available data. Check the Fields panel to review the updated values.`
        : "I reviewed all the fields but couldn't infer additional values from the existing data. Try uploading more documents or providing more details in the chat.";

      setMessages((prev) => [...prev, { role: "assistant", content: assistantMsg }]);
    } catch (err) {
      console.error("AI inference error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, AI inference encountered an error. Please try again." },
      ]);
    }
    setIsInferring(false);
  };

  /**
   * Download filled ACORD PDFs.
   * Triggers Adobe SAVE_API to capture in-viewer edits, then downloads the original
   * ACORD PDF bytes with AcroForm fields filled — preserves 100% of original formatting.
   */
  const downloadForms = async (mode: "individual" | "package") => {
    if (!user) return;
    setDownloading(true);
    try {
      // 1. Trigger Adobe save to capture the latest in-viewer edits into savedPdfBytesMap
      if (pdfViewerRef.current) {
        try {
          await pdfViewerRef.current.triggerSave();
          // Give React state a tick to update savedPdfBytesMap after SAVE_API fires
          await new Promise(r => setTimeout(r, 300));
        } catch (saveErr) {
          console.warn("[download] triggerSave failed, will use pdf-lib fallback:", saveErr);
        }
      }

      // 2. Auto-save current formData to DB so edits persist
      await supabase
        .from("insurance_applications")
        .update({ form_data: formData })
        .eq("submission_id", submissionId)
        .eq("user_id", user.id);

      // 3. Determine which forms to download
      const formsToProcess = mode === "individual" && !isAllForms
        ? enabledFormList.filter(f => f.id === activeFormId)
        : enabledFormList;

      // 4. Download forms
      const date = new Date().toISOString().slice(0, 10);
      const zip = mode === "package" ? new JSZip() : null;
      let count = 0;

      for (const form of formsToProcess) {
        // Check declared fields OR prefill index map for data presence
        let hasData = form.fields.some(f => formData[f.key] && String(formData[f.key]).trim());
        if (!hasData) {
          try {
            const prefillCheck = await buildPrefillByIndex(form.id, formData);
            hasData = Object.values(prefillCheck).some(v => v && String(v).trim());
          } catch (_) {}
        }
        if (!hasData) continue;

        try {
          let pdfBytes: Uint8Array | null = savedPdfBytesMap[form.id] || null;

          // Fallback: if Adobe SAVE_API didn't capture bytes, rebuild from formData via pdf-lib
          if (!pdfBytes) {
            try {
              const prefill = await buildPrefillByIndex(form.id, formData);
              if (Object.keys(prefill).length > 0) {
                const pdfPath = FILLABLE_PDF_PATHS[form.id] || `/acord-fillable/${form.id}.pdf`;
                const resp = await fetch(pdfPath);
                if (resp.ok) {
                  const { PDFDocument, StandardFonts, PDFName } = await import("pdf-lib");
                  const rawBuf = await resp.arrayBuffer();
                  const doc = await PDFDocument.load(new Uint8Array(rawBuf), { ignoreEncryption: true });
                  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
                  const pdfForm = doc.getForm();
                  const allFields = pdfForm.getFields();
                  for (const [idxStr, value] of Object.entries(prefill)) {
                    const idx = Number(idxStr);
                    const field = allFields[idx];
                    if (!field || !value) continue;
                    try {
                      const f = field as any;
                      const lower = String(value).toLowerCase();
                      const isChk = lower === "on" || lower === "true" || lower === "yes" || lower === "y" || lower === "x" || lower === "1";
                      if (typeof f.check === "function") {
                        if (isChk) {
                          f.check();
                          try {
                            const widgets = f.acroField?.getWidgets?.() || [];
                            for (const widget of widgets) {
                              const ap = widget.dict.get(PDFName.of("AP"));
                              if (ap) {
                                const normalDict = (ap as any).get?.(PDFName.of("N"));
                                if (normalDict && typeof normalDict.entries === "function") {
                                  for (const [key] of normalDict.entries()) {
                                    const keyName = key instanceof PDFName ? key.decodeText() : String(key);
                                    if (keyName !== "Off") {
                                      widget.dict.set(PDFName.of("AS"), PDFName.of(keyName));
                                      widget.dict.set(PDFName.of("V"), PDFName.of(keyName));
                                      break;
                                    }
                                  }
                                }
                              }
                            }
                          } catch (_) {}
                        }
                      } else if (typeof f.setText === "function") {
                        if (isChk) continue;
                        let textVal = String(value);
                        const maxLen = f.getMaxLength?.();
                        if (maxLen && textVal.length > maxLen) {
                          if (maxLen === 1) {
                            const l = textVal.toLowerCase();
                            textVal = l === "yes" || l === "true" || l === "y" ? "Y" : l === "no" || l === "false" || l === "n" ? "N" : textVal.substring(0, 1);
                          } else {
                            textVal = textVal.substring(0, maxLen);
                          }
                        }
                        f.setText(textVal);
                        try { f.defaultUpdateAppearances(helvetica); } catch (_) {}
                      } else if (typeof f.select === "function") {
                        try { f.select(String(value)); } catch (_) {}
                      }
                    } catch (_) {}
                  }
                  pdfBytes = await doc.save();
                  console.warn(`[download] Built ${form.id} PDF via pdf-lib fallback (${pdfBytes.length} bytes)`);
                }
              }
            } catch (fbErr) {
              console.error(`[download] pdf-lib fallback failed for ${form.id}:`, fbErr);
            }
          }

          if (pdfBytes) {
            const fileName = `${form.name.replace(/\s/g, "_")}_${date}.pdf`;
            if (zip) {
              zip.file(fileName, pdfBytes);
            } else {
              const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = fileName;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 10000);
            }
            count++;
          } else {
            toast.error(`Could not generate PDF for ${form.name}.`);
          }
          if (!zip && count < formsToProcess.length) await new Promise(r => setTimeout(r, 400));
        } catch (err) {
          console.error(`Failed to process PDF for ${form.name}:`, err);
        }
      }

      // If package mode, generate and download the zip
      if (zip && count > 0) {
        const companyName = formData.applicant_name || formData.insured_name || "Submission";
        const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ACORD_Package_${safeName}_${date}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }

      if (count === 0) {
        toast.error("No forms have enough data to download.");
      } else {
        toast.success(zip ? `${count} form(s) bundled into ZIP.` : `${count} filled form(s) downloaded.`);
      }
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download");
    }
    setDownloading(false);
  };

  // Email PDF
  const handleEmailPdf = async () => {
    if (!emailTo.trim() || !user) return;
    setSendingEmail(true);
    try {
      // Get user's from_email from profile defaults
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, agency_name, phone, form_defaults")
        .eq("user_id", user.id)
        .single();

      const defaults = (profile?.form_defaults || {}) as Record<string, string>;
      const fromEmail = defaults.from_email || undefined;

      // Generate PDFs as base64 attachments
      const formsToProcess = enabledFormList;
      const results: { form: AcordFormDefinition; data: Record<string, any> }[] = [];
      for (const form of formsToProcess) {
        const data: Record<string, any> = {};
        for (const field of form.fields) {
          if (formData[field.key]) data[field.key] = formData[field.key];
        }
        const filledCount = Object.values(data).filter((v) => v && String(v).trim()).length;
        if (filledCount > 3) results.push({ form, data });
      }

      if (results.length === 0) {
        toast.error("No forms have enough data to email.");
        setSendingEmail(false);
        return;
      }

      // Generate package PDF as base64
      const companyName = formData.applicant_name || formData.insured_name || "Submission";
      const pkg = await generateSubmissionPackage({
        companyName,
        narrative: "",
        agencyName: profile?.agency_name || "",
        producerName: profile?.full_name || "",
        coverageLines: [],
        forms: results,
        effectiveDate: formData.effective_date || formData.proposed_eff_date || "",
      });

      const pdfBase64 = pkg.output("datauristring").split(",")[1];
      const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
      const filename = `Submission_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;

      const subject = `ACORD Forms - ${companyName}`;
      const html = `<p>Please find the attached ACORD form package for <strong>${companyName}</strong>.</p><p>Please review and let me know if you need any changes.</p><p style="color:#888;font-size:12px;">Sent via AURA</p>`;

      const emailHeaders = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: emailHeaders,
        body: JSON.stringify({
          to: emailTo,
          from_email: fromEmail,
          subject,
          html,
          attachments: [{ filename, content: pdfBase64 }],
        }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Failed to send email");

      toast.success("Email sent successfully!");
      setEmailDialogOpen(false);
      setEmailTo("");
    } catch (err: any) {
      console.error("Email error:", err);
      toast.error(err.message || "Failed to send email");
    }
    setSendingEmail(false);
  };

  // Save form data back to DB
  const saveFormData = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("insurance_applications")
      .update({ form_data: formData })
      .eq("submission_id", submissionId)
      .eq("user_id", user.id);
    if (error) toast.error("Failed to save");
    else toast.success("Progress saved!");
  };

  const renderField = (field: AcordFormField) => {
    const value = formData[field.key];
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            rows={2}
            className="text-xs"
          />
        );
      case "select":
        return (
          <Select value={value || ""} onValueChange={(v) => handleFieldChange(field.key, v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}</SelectContent>
          </Select>
        );
      case "checkbox": {
        // Normalize: treat "true", "Yes", "On", true, "1" as checked
        const isChecked = (() => {
          if (typeof value === "boolean") return value;
          if (!value) return false;
          const lower = String(value).toLowerCase();
          return lower === "true" || lower === "yes" || lower === "y" || lower === "on" || lower === "1" || lower === "x";
        })();
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isChecked}
              onCheckedChange={(checked) => {
                // Store as string "true"/"false" so buildPrefillByIndex normalizes consistently
                handleFieldChange(field.key, checked ? "true" : "false");
              }}
            />
            <span className="text-xs">{field.label}</span>
          </div>
        );
      }
      default:
        if (field.type === "currency") {
          return (
            <Input
              type="text"
              value={value ? formatUSD(value) : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[$,\s]/g, "");
                handleFieldChange(field.key, raw);
              }}
              placeholder="$0"
              className="h-8 text-xs"
            />
          );
        }
        return (
          <Input
            type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
            value={value || ""}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="h-8 text-xs"
          />
        );
    }
  };

  const getFilteredSections = () => {
    const fields = currentFields;
    if (fields.length === 0) return [];
    const sections: { name: string; fields: AcordFormField[] }[] = [];
    const seen = new Set<string>();
    for (const field of fields) {
      const sectionLabel = field.section;
      if (!seen.has(sectionLabel)) {
        seen.add(sectionLabel);
        let sectionFields = fields.filter((f) => f.section === sectionLabel);
        if (fieldFilter === "filled") {
          sectionFields = sectionFields.filter((f) => formData[f.key] && String(formData[f.key]).trim());
        } else if (fieldFilter === "empty") {
          sectionFields = sectionFields.filter((f) => !formData[f.key] || !String(formData[f.key]).trim());
        }
        if (sectionFields.length > 0) {
          sections.push({ name: sectionLabel, fields: sectionFields });
        }
      }
    }
    return sections;
  };

  const filledCount = currentFields.filter((f) => formData[f.key] && String(formData[f.key]).trim()).length;
  const totalCount = currentFields.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Shared panel content renderers ───
  const renderFieldsPanel = () => (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b p-3 space-y-2">
        {/* Inline client name rename — shown when opened via Fill Manually */}
        {initialCompanyName !== undefined && (
          <div className="flex items-center gap-1.5 pb-1">
            {editingName ? (
              <input
                autoFocus
                className="flex-1 text-sm font-semibold border-b border-primary bg-transparent outline-none py-0.5"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onBlur={async () => {
                  setEditingName(false);
                  if (companyName.trim() && companyName !== "New Client") {
                    await supabase
                      .from("business_submissions")
                      .update({ company_name: companyName.trim() })
                      .eq("id", submissionId);
                  }
                }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                placeholder="Client name…"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-sm font-semibold hover:text-primary transition-colors truncate max-w-[200px]"
                title="Click to rename"
              >
                {companyName || "New Client"} <span className="text-[10px] text-muted-foreground ml-1">✎</span>
              </button>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ fontFamily: "'Instrument Serif', serif" }}>Form Fields</h2>
          <div className="flex items-center gap-2">
            {autoSaving && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground animate-pulse">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Saving…
              </span>
            )}
            <Badge variant="secondary" className="text-[10px]">{filledCount}/{totalCount}</Badge>
          </div>
        </div>
        {/* Form package selector — checkboxes to include/exclude, + to add more */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Package Forms</span>
            {formsNotInPackage.length > 0 && (
              <button
                onClick={() => setShowAddFormDialog(true)}
                className="flex items-center gap-0.5 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
                title="Add a form to the package"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {ACORD_FORM_LIST.map((f) => {
              const isEnabled = enabledFormIds.has(f.id);
              const isActive = activeFormId === f.id;
              const fFilled = f.fields.filter((fd) => formData[fd.key] && String(formData[fd.key]).trim()).length;
              const fTotal = f.fields.length;
              return (
                <div
                  key={f.id}
                  onClick={() => {
                    if (!isEnabled) {
                      setEnabledFormIds((prev) => new Set(prev).add(f.id));
                    }
                    setActiveFormId(f.id);
                  }}
                  className={`flex items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer ${
                    isEnabled ? "opacity-100" : "opacity-60"
                  } ${isActive && isEnabled ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
                >
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={(checked) => {
                      setEnabledFormIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(f.id);
                        else {
                          next.delete(f.id);
                          if (activeFormId === f.id) {
                            const remaining = ACORD_FORM_LIST.find(x => next.has(x.id));
                            setActiveFormId(remaining?.id || "all");
                          }
                        }
                        return next;
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3 w-3 shrink-0"
                  />
                  <span
                    className={`flex-1 text-left text-[10px] font-medium truncate ${
                      isActive && isEnabled ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {f.name}
                  </span>
                  {(f.id === "acord-125" || f.id === "acord-126") && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-yellow-400/30 text-yellow-700 dark:text-yellow-400 font-semibold shrink-0" title="Most AI training data available">
                      AI+
                    </span>
                  )}
                  <span className="text-[9px] font-mono text-muted-foreground shrink-0">{fFilled}/{fTotal}</span>
                </div>
              );
            })}
          </div>
          {/* Narrative / Executive Summary — opens Submit Package dialog */}
          <div
            onClick={() => {
              setNarrativeOpen(true);
            }}
            className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer hover:bg-muted/50"
          >
            <StickyNote className="h-3 w-3 shrink-0 text-primary/60" />
            <span className="flex-1 text-left text-[10px] font-medium truncate text-foreground">
              Narrative / Executive Summary
            </span>
            <Badge variant="secondary" className="text-[8px] px-1.5 py-0">Note</Badge>
          </div>
          {/* Statement of Values placeholder */}
          <div className="flex items-center gap-2 rounded-md px-2 py-1 opacity-40 cursor-default">
            <Checkbox checked={false} disabled className="h-3 w-3 shrink-0" />
            <span className="flex-1 text-left text-[10px] font-medium truncate text-foreground">Statement of Values</span>
            <Badge variant="outline" className="text-[8px] px-1.5 py-0">Coming Soon</Badge>
          </div>
          {/* Supplemental placeholder */}
          <div className="flex items-center gap-2 rounded-md px-2 py-1 opacity-40 cursor-default">
            <Checkbox checked={false} disabled className="h-3 w-3 shrink-0" />
            <span className="flex-1 text-left text-[10px] font-medium truncate text-foreground">Supplemental</span>
            <Badge variant="outline" className="text-[8px] px-1.5 py-0">Coming Soon</Badge>
          </div>
        </div>
        <div className="flex gap-1">
          {(["all", "filled", "empty"] as FieldFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setFieldFilter(filter)}
              className={`text-[10px] px-2 py-0.5 rounded capitalize transition-colors ${
                fieldFilter === filter
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pt-2">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {getFilteredSections().map((section) => (
            <div key={section.name}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {section.name}
              </h3>
              <div className="space-y-2">
                {section.fields.map((field) => {
                  const isCodeField = MANUAL_CODE_FIELDS.has(field.key);
                  return (
                    <div key={field.key} className="space-y-0.5">
                      {field.type !== "checkbox" && (
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          {field.required && <span className="text-destructive">*</span>}
                          {field.label}
                          {isCodeField && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-0.5 ml-1 px-1 py-0 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[8px] font-semibold uppercase tracking-wide cursor-help">
                                  <ShieldAlert className="h-2.5 w-2.5" />
                                  Manual
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px] text-xs">
                                This code field cannot be AI-inferred. It must come directly from uploaded documents or be entered manually.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </Label>
                      )}
                      {renderField(field)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-3 space-y-2">
        <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={saveFormData}>
          Save Progress
        </Button>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="flex-1 text-xs h-7"
            disabled={downloading}
            onClick={() => downloadForms("individual")}
          >
            {downloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
            Form
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs h-7"
            disabled={downloading}
            onClick={() => setSubmitPackageOpen(true)}
          >
            <Package className="h-3 w-3 mr-1" />
            Submit Package
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-7 gap-1"
          onClick={() => {
            const url = submissionId && submissionId !== "draft"
              ? `/loss-runs/new?submissionId=${submissionId}`
              : "/loss-runs/new";
            window.location.href = url;
          }}
        >
          <FileSearch className="h-3 w-3" />
          Request Loss Runs
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-7"
          onClick={async () => {
            if (!user) return;
            const result = await generateIntakeLink({
              agentId: user.id,
              submissionId: submissionId !== "draft" ? submissionId : null,
            });
            if (result) {
              await navigator.clipboard.writeText(result.url);
              toast.success("Intake link copied to clipboard!");
            } else {
              toast.error("Failed to generate intake link");
            }
          }}
        >
          <LinkIcon className="h-3 w-3 mr-1" />
          Send Intake to Customer
        </Button>
      </div>
    </div>
  );

  /** Render field value overlays for a single page of a form */
  const renderPageOverlay = (formId: string, pageIdx: number, containerRef?: HTMLDivElement | null) => {
    const positions = FIELD_POSITION_MAP[formId] || {};
    const PAGE_W = 612; // letter width in points
    const PAGE_H = 792; // letter height in points

    const overlayEntries = Object.entries(positions)
      .filter(([, pos]) => pos.page === pageIdx);

    if (overlayEntries.length === 0) return null;

    return overlayEntries.map(([key, pos]) => {
        const raw = formData[key];
        if (raw === undefined || raw === null || raw === "") return null;
        let display = String(raw);
        if (display === "true") display = "✓";
        if (display === "false") return null;
        if (display === "N/A") return null;
        if (CURRENCY_FIELDS.has(key)) display = formatUSD(display);

        // Format dates
        if (key.includes("date") || key.includes("eff_") || key.includes("exp_")) {
          const isoMatch = display.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (isoMatch) display = `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
        }

        const leftPct = (pos.x / PAGE_W) * 100;
        const topPct = (pos.y / PAGE_H) * 100;
        const maxWPct = ((pos.maxWidth || 200) / PAGE_W) * 100;
        const fontScale = (pos.fontSize || 8) / 8;

        return (
          <span
            key={key}
            className="absolute leading-tight pointer-events-none whitespace-pre-wrap break-words z-10"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              maxWidth: `${maxWPct}%`,
              fontSize: `clamp(6px, ${0.58 * fontScale}cqw, ${(pos.fontSize || 8) * 1.5}px)`,
              fontFamily: "Helvetica, Arial, sans-serif",
              color: "hsl(230 80% 28%)",
            }}
          >
            {pos.checkbox ? (raw === true || raw === "Yes" || display === "✓" ? "✓" : "") : display}
          </span>
        );
      });
  };

  const renderFormPreview = () => {
    const previewTitle = isAllForms ? `Package (${enabledFormList.length} forms)` : activeForm?.name;
    const previewSubtitle = isAllForms
      ? `${filledCount} of ${totalCount} unique fields filled`
      : activeForm?.fullName;

    return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="border-b p-3 flex items-center justify-between bg-background">
        <div>
          <h2 className="text-sm font-semibold">{previewTitle}</h2>
          <p className="text-[10px] text-muted-foreground">{previewSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {filledCount === totalCount && totalCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              <CheckCircle className="h-3 w-3 mr-1" />Complete
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            disabled={downloading}
            onClick={() => downloadForms(isAllForms ? "package" : "individual")}
          >
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Download PDF
          </Button>
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setCenterView("form")}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 transition-colors ${
                centerView === "form" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent/50"
              }`}
            >
              <Image className="h-3 w-3" />PDF
            </button>
            <button
              onClick={() => setCenterView("data")}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 transition-colors ${
                centerView === "data" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent/50"
              }`}
            >
              <Eye className="h-3 w-3" />Data
            </button>
          </div>
        </div>
      </div>

      {/* ── CENTER: Fillable PDF viewer or Data view ── */}
      {centerView === "form" ? (
        <div className="flex-1 overflow-hidden">
          {/* In "all forms" mode, show the first enabled form's PDF instead of trying to load all simultaneously */}
          {isAllForms ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8 text-center">
              <FileText className="h-8 w-8 text-primary/50" />
              <p className="text-sm font-medium">Select a specific form from the left panel to view and edit its fillable PDF.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {enabledFormList.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFormId(f.id)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          ) : activeForm && FILLABLE_PDF_PATHS[activeFormId] ? (
            <div className="relative h-full">
              {/* Loading overlay while prefill data is being computed */}
              {prefillCount === 0 && dbLoaded && !prefillTimedOut && Object.keys(formData).length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-background/90 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Preparing form data…</p>
                  <p className="text-[10px] text-muted-foreground">Mapping fields to {activeForm.name}</p>
                </div>
              )}
             <FillablePdfViewer
               key={prefillKey}
               ref={pdfViewerRef}
               pdfUrl={FILLABLE_PDF_PATHS[activeFormId]}
               fileName={`${activeForm.name}.pdf`}
               onFieldChange={(pdfFieldName, value) => handleAdobeFieldChange(activeFormId, pdfFieldName, value)}
               onSaveBytes={(bytes) => handleSavedPdfBytes(activeFormId, bytes)}
               onReady={() => setAdobeReady(true)}
               prefillByIndex={prefillByIndex}
             />
            </div>
           ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No fillable PDF available for this form</div>
           )}
        </div>
      ) : (
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="bg-background border rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
            <div className="text-center border-b pb-4 mb-6">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">ACORD®</p>
              <h1 className="text-lg font-bold">
                {isAllForms ? "ALL FORMS — UNIFIED VIEW" : activeForm?.fullName?.toUpperCase()}
              </h1>
              <p className="text-[10px] text-muted-foreground mt-1">
                {isAllForms
                  ? `${enabledFormList.map(f => f.name).join(" • ")} — Generated ${new Date().toLocaleDateString()}`
                  : `Generated ${new Date().toLocaleDateString()}`
                }
              </p>
            </div>
            {isAllForms ? (
              enabledFormList.map((form) => {
                const sections: { name: string; fields: AcordFormField[] }[] = [];
                const seen = new Set<string>();
                for (const field of form.fields) {
                  if (!seen.has(field.section)) {
                    seen.add(field.section);
                    sections.push({ name: field.section, fields: form.fields.filter((f) => f.section === field.section) });
                  }
                }
                const formFilled = form.fields.filter(f => formData[f.key] && String(formData[f.key]).trim()).length;
                return (
                  <div key={form.id} className="mb-8">
                    <div className="flex items-center gap-2 mb-3 border-b-2 border-primary/50 pb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-bold text-primary">{form.name}</h2>
                      <Badge variant="secondary" className="text-[9px] ml-auto">{formFilled}/{form.fields.length}</Badge>
                    </div>
                    {sections.map((section) => (
                      <div key={`${form.id}-${section.name}`} className="mb-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-2">
                          {section.name}
                        </h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {section.fields.map((field) => {
                            const value = formData[field.key];
                            const hasValue = value && String(value).trim();
                            const isFullWidth = field.type === "textarea";
                            return (
                              <div key={field.key} className={`${isFullWidth ? "col-span-2" : ""}`}>
                                <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-medium">
                                  {field.label}
                                </p>
                                <p className={`text-xs border-b pb-1 min-h-[1.25rem] ${
                                  hasValue ? "text-foreground" : "text-muted-foreground/40 italic"
                                }`}>
                                  {hasValue
                                    ? (field.type === "currency" ? formatUSD(value) : Array.isArray(value) ? value.join(", ") : String(value))
                                    : "—"
                                  }
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            ) : activeForm ? (() => {
              const sections: { name: string; fields: AcordFormField[] }[] = [];
              const seen = new Set<string>();
              for (const field of activeForm.fields) {
                if (!seen.has(field.section)) {
                  seen.add(field.section);
                  sections.push({ name: field.section, fields: activeForm.fields.filter((f) => f.section === field.section) });
                }
              }
              return sections.map((section) => (
                <div key={section.name} className="mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary border-b border-primary/30 pb-1 mb-3">
                    {section.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {section.fields.map((field) => {
                      const value = formData[field.key];
                      const hasValue = value && String(value).trim();
                      const isFullWidth = field.type === "textarea";
                      return (
                        <div key={field.key} className={`${isFullWidth ? "col-span-2" : ""}`}>
                          <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-medium">
                            {field.label}
                          </p>
                          <p className={`text-xs border-b pb-1 min-h-[1.25rem] ${
                            hasValue ? "text-foreground" : "text-muted-foreground/40 italic"
                          }`}>
                            {hasValue
                              ? (field.type === "currency" ? formatUSD(value) : Array.isArray(value) ? value.join(", ") : String(value))
                              : "—"
                            }
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })() : null}
          </div>
        </div>
      </ScrollArea>
      )}
    </div>
  ); };


  const [chatDragActive, setChatDragActive] = useState(false);

  const handleChatDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChatDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)].slice(0, 10));
    }
  }, []);

  const handleChatDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChatDragActive(true);
  }, []);

  const handleChatDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChatDragActive(false);
  }, []);

  const renderChatPanel = () => (
    <div
      className="flex flex-col h-full bg-background relative"
      onDrop={handleChatDrop}
      onDragOver={handleChatDragOver}
      onDragLeave={handleChatDragLeave}
    >
      {/* Drag overlay */}
      {chatDragActive && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/40 rounded-lg backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Paperclip className="h-6 w-6" />
            <p className="text-xs font-medium">Drop files here</p>
          </div>
        </div>
      )}
      <div className="border-b p-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold shrink-0" style={{ fontFamily: "'Instrument Serif', serif" }}>Chat</h2>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-6 px-2 gap-1 border-primary/40 text-primary hover:bg-primary/10"
            onClick={runAiInference}
            disabled={isInferring}
            title="Run AI inference to fill in missing fields from existing data"
          >
            {isInferring ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <BrainCircuit className="h-2.5 w-2.5" />}
            {isInferring ? "Inferring…" : "AI Infer & Fill"}
          </Button>
          {!isMobile && (
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 gap-1" onClick={onBack}>
              <ChevronLeft className="h-3 w-3" /> Back
            </Button>
          )}
        </div>
      </div>

      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`rounded-lg px-3 py-2 max-w-[90%] text-xs leading-relaxed ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground prose prose-xs max-w-none"
            }`}>
              {m.role === "assistant" ? (
                <ReactMarkdown>{m.content.replace(/\[FIELD:[^\]]+\]/g, "").replace(/\[BUTTON:[^\]]+\]/g, "").replace(/\[SUBMISSION_ID:[^\]]+\]/g, "").trim()}</ReactMarkdown>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {attachedFiles.length > 0 && (
        <div className="border-t bg-muted/30 px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {attachedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1 rounded-md bg-card border px-2 py-1 text-[10px]">
                <Paperclip className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="max-w-[80px] truncate">{f.name}</span>
                <button onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t p-3">
        <div className="flex items-end gap-1.5 rounded-lg border bg-card p-2">
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {
            if (e.target.files) {
              setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 10));
            }
          }} />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-3 w-3" />
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            placeholder="Ask about fields or upload docs..."
            rows={3}
            className="flex-1 resize-none bg-transparent border-0 outline-none text-xs placeholder:text-muted-foreground min-h-[56px] max-h-28 py-1"
          />
          <Button
            variant={formVoice.isListening ? "destructive" : "ghost"}
            size="icon"
            className={`shrink-0 h-7 w-7 transition-all ${formVoice.isListening ? "animate-pulse ring-2 ring-red-400/50" : "text-muted-foreground hover:text-foreground"}`}
            onClick={formVoice.toggle}
            disabled={formVoice.isConnecting}
            title={formVoice.isListening ? "Stop recording" : "Voice input"}
          >
            {formVoice.isConnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : formVoice.isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          </Button>
          <Button
            onClick={() => {
              let content = input.trim();
              if (attachedFiles.length > 0) {
                content += `\n\n[${attachedFiles.length} file(s) attached: ${attachedFiles.map((f) => f.name).join(", ")}]`;
                setAttachedFiles([]);
              }
              sendMessage(content);
            }}
            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
            size="icon"
            className="shrink-0 h-7 w-7"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
        {formVoice.isListening && (
          <p className="text-[10px] text-primary text-center animate-pulse mt-1">
            🎙️ {formVoice.liveText || "Listening… speak now"}
          </p>
        )}
      </div>
    </div>
  );

  // ─── Add Form Dialog ───
  const addFormDialog = (
    <Dialog open={showAddFormDialog} onOpenChange={setShowAddFormDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm">Add Forms to Package</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select additional ACORD forms to include in this submission package.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {formsNotInPackage.map((f) => (
            <label key={f.id} className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/50">
              <Checkbox
                onCheckedChange={(checked) => {
                  if (checked) {
                    setEnabledFormIds((prev) => new Set([...prev, f.id]));
                    setShowAddFormDialog(false);
                  }
                }}
              />
              <div>
                <p className="text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddFormDialog(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ─── Email Dialog ───
  const emailDialog = (
    <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Send Submission Package</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Email the full submission package (all forms with data) directly to a recipient.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Recipient Email</Label>
            <Input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="underwriter@carrier.com"
              className="h-8 text-xs mt-1"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Sent from your configured send-from address (set in Agent Defaults).
          </p>
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleEmailPdf}
            disabled={!emailTo.trim() || sendingEmail}
          >
            {sendingEmail ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ─── MOBILE LAYOUT ───
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {addFormDialog}
        {emailDialog}
        <SubmitPackageDialog
          open={submitPackageOpen}
          onOpenChange={setSubmitPackageOpen}
          narrativeOpen={narrativeOpen}
          onNarrativeOpenChange={setNarrativeOpen}
          enabledFormIds={enabledFormIds}
          formData={formData}
          savedPdfBytesMap={savedPdfBytesMap}
          submissionId={submissionId}
          userId={user?.id}
          triggerSave={async () => { if (pdfViewerRef.current) await pdfViewerRef.current.triggerSave(); }}
        />
        
        {/* Mobile top bar with back button */}
        <div className="border-b bg-background px-3 py-2 flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onBack}>
            <ChevronLeft className="h-3 w-3 mr-1" /> Back
          </Button>
          <span className="text-xs font-medium text-muted-foreground">{isAllForms ? "All Forms" : activeForm?.name}</span>
          <Badge variant="secondary" className="text-[10px]">{filledCount}/{totalCount}</Badge>
        </div>

        {/* Panel navigation tabs */}
        <div className="border-b bg-background flex shrink-0">
          {MOBILE_PANELS.map((panel, idx) => {
            const Icon = panel.icon;
            const isActive = mobilePanel === panel.key;
            return (
              <button
                key={panel.key}
                onClick={() => setMobilePanel(panel.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors relative ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{panel.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Swipe hint */}
        <div className="bg-muted/50 flex items-center justify-center gap-2 py-1 text-[9px] text-muted-foreground shrink-0">
          <ChevronLeft className="h-3 w-3" />
          <span>Swipe to navigate</span>
          <ChevronRight className="h-3 w-3" />
        </div>

        {/* Panel dots indicator */}
        <div className="flex justify-center gap-1.5 py-1 bg-background shrink-0">
          {MOBILE_PANELS.map((panel) => (
            <div
              key={panel.key}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                mobilePanel === panel.key ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Swipeable panel content */}
        <div
          ref={swipeContainerRef}
          className="flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {mobilePanel === "fields" && renderFieldsPanel()}
          {mobilePanel === "form" && renderFormPreview()}
          {mobilePanel === "chat" && renderChatPanel()}
        </div>
      </div>
    );
  }

  // ─── DESKTOP LAYOUT (unchanged 3-column) ───
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {addFormDialog}
      {emailDialog}
      <SubmitPackageDialog
        open={submitPackageOpen}
        onOpenChange={setSubmitPackageOpen}
        narrativeOpen={narrativeOpen}
        onNarrativeOpenChange={setNarrativeOpen}
        enabledFormIds={enabledFormIds}
        formData={formData}
        savedPdfBytesMap={savedPdfBytesMap}
        submissionId={submissionId}
        userId={user?.id}
        triggerSave={async () => { if (pdfViewerRef.current) await pdfViewerRef.current.triggerSave(); }}
      />

      {/* LEFT PANEL — Editable Fields (collapsible) */}
      <div
        className="border-r flex flex-col shrink-0 relative transition-all duration-300 ease-in-out"
        style={{ width: leftPanelCollapsed ? "0px" : "260px", overflow: leftPanelCollapsed ? "hidden" : "visible" }}
      >
        <div style={{ width: "260px", minWidth: "260px" }} className="flex flex-col h-full">
          {renderFieldsPanel()}
        </div>
      </div>

      {/* Collapse / Expand toggle tab */}
      <div className="relative flex items-start shrink-0">
        <button
          onClick={() => setLeftPanelCollapsed(v => !v)}
          className="absolute left-0 top-16 z-10 flex items-center justify-center w-4 h-10 rounded-r-md bg-muted border border-l-0 border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          title={leftPanelCollapsed ? "Expand fields panel" : "Collapse fields panel"}
        >
          {leftPanelCollapsed
            ? <ChevronRight className="h-3 w-3" />
            : <ChevronLeft className="h-3 w-3" />}
        </button>
      </div>

      {/* CENTER PANEL — Form Preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {renderFormPreview()}
      </div>

      {/* Collapse / Expand toggle tab for chat */}
      <div className="relative flex items-start shrink-0">
        <button
          onClick={() => setRightPanelCollapsed(v => !v)}
          className="absolute right-0 top-16 z-10 flex items-center justify-center w-4 h-10 rounded-l-md bg-muted border border-r-0 border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          title={rightPanelCollapsed ? "Expand chat panel" : "Collapse chat panel"}
        >
          {rightPanelCollapsed
            ? <ChevronLeft className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />}
        </button>
      </div>

      {/* RIGHT PANEL — Chat (collapsible) */}
      <div
        className="border-l flex flex-col shrink-0 relative transition-all duration-300 ease-in-out"
        style={{ width: rightPanelCollapsed ? "0px" : "300px", overflow: rightPanelCollapsed ? "hidden" : "visible" }}
      >
        <div style={{ width: "300px", minWidth: "300px" }} className="flex flex-col h-full">
          {renderChatPanel()}
        </div>
      </div>
    </div>
  );
}
