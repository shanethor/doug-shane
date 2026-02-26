import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import SubmissionReviewPanel from "@/components/SubmissionReviewPanel";
import FormFillingView from "@/components/FormFillingView";
import ExtractionSummary from "@/components/ExtractionSummary";
import { Send, FileUp, ClipboardList, Search, Loader2, Paperclip, X, Download, Mic, MicOff, Globe, Lightbulb, ChevronDown, ChevronUp, FileText, BrainCircuit, PenLine, Users, BarChart3, Mail, FileSearch, Camera, Plus, ArrowRight, Sparkles, LinkIcon } from "lucide-react";
import { FeatureSuggestionDialog } from "@/components/FeatureSuggestionDialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ACORD_FORM_LIST } from "@/lib/acord-forms";
import { buildAutofilledData, buildAutofilledDataWithAI } from "@/lib/acord-autofill";
import { generateAcordPdfAsync } from "@/lib/pdf-generator";
import { generateSubmissionPackage } from "@/lib/submission-package";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTrainingMode } from "@/hooks/useTrainingMode";
import { ensurePipelineLead } from "@/lib/pipeline-sync";
import { generateIntakeLink } from "@/lib/intake-links";

type ButtonMarker = { label: string; action: string };
type Msg = { role: "user" | "assistant"; content: string; fields?: FieldBubble[]; buttons?: ButtonMarker[] };
type FieldBubble = { label: string; placeholder: string; key: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

const SUGGESTIONS = [
  { icon: FileUp, label: "Submit a new client", message: "I want to submit a new client for coverage." },
  { icon: Globe, label: "Scrape a company website", message: "I have a client's website URL — can you pull their business info from it?" },
  { icon: ClipboardList, label: "Fill an ACORD form", message: "Help me fill out an ACORD form for a client." },
  { icon: Users, label: "Manage my pipeline", message: "Help me manage my sales pipeline — I need to move some leads and update statuses." },
  { icon: Search, label: "Review a submission", message: "I need to review an existing client submission." },
];

async function streamChat({
  messages,
  trainingMode,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  trainingMode: boolean;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, trainingMode }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: "Request failed" }));
    onError(body.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) { onError("No response stream"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

/** Parse assistant text for field markers like [FIELD:Label:placeholder:key] */
function parseFields(text: string): FieldBubble[] {
  const regex = /\[FIELD:([^:]+):([^:]+):([^\]]+)\]/g;
  const fields: FieldBubble[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    fields.push({ label: m[1], placeholder: m[2], key: m[3] });
  }
  return fields;
}

function parseButtons(text: string): ButtonMarker[] {
  const regex = /\[BUTTON:([^:]+):([^\]]+)\]/g;
  const buttons: ButtonMarker[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    buttons.push({ label: m[1], action: m[2] });
  }
  return buttons;
}

function stripMarkers(text: string): string {
  return text
    .replace(/\[FIELD:[^\]]+\]/g, "")
    .replace(/\[BUTTON:[^\]]+\]/g, "")
    .replace(/\[SUBMISSION_ID:[^\]]+\]/g, "")
    .replace(/\[PIPELINE_ACTION:[^\]]+\]/g, "")
    .trim();
}

type PipelineAction = {
  type: "move_lead" | "update_lead" | "delete_lead";
  account_name: string;
  stage?: string;
  field?: string;
  value?: string;
};

/** Parse pipeline action markers from AI response like [PIPELINE_ACTION:move_lead:CompanyName:lost] */
function parsePipelineActions(text: string): PipelineAction[] {
  const regex = /\[PIPELINE_ACTION:([^:]+):([^:\]]+)(?::([^:\]]+))?(?::([^\]]+))?\]/g;
  const actions: PipelineAction[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const action: PipelineAction = {
      type: m[1] as PipelineAction["type"],
      account_name: m[2],
    };
    if (m[1] === "move_lead") {
      action.stage = m[3];
    } else if (m[1] === "update_lead") {
      action.field = m[3];
      action.value = m[4];
    }
    actions.push(action);
  }
  return actions;
}

/** Try to extract intake field values from a user message */
function tryExtractIntakeFromMessage(text: string): Record<string, string> | null {
  const lower = text.toLowerCase();
  const vals: Record<string, string> = {};

  // Company name: look for explicit labels or just take the first capitalized phrase
  const companyMatch = text.match(/(?:company\s*(?:name)?|business|client)\s*[:=\-–]?\s*([A-Z][^\n,;]{2,40})/i);
  if (companyMatch) vals.company_name = companyMatch[1].trim();

  // FEIN
  const feinMatch = text.match(/(?:fein|ein|tax\s*id)\s*[:=\-–]?\s*(\d{2}[\s-]?\d{7})/i);
  if (feinMatch) vals.fein = feinMatch[1].trim();

  // Effective date
  const dateMatch = text.match(/(?:effective|eff)\s*(?:date)?\s*[:=\-–]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (dateMatch) vals.effective_date = dateMatch[1].trim();

  // State
  const stateMatch = text.match(/(?:state)\s*[:=\-–]?\s*([A-Z]{2})\b/i);
  if (stateMatch) vals.state = stateMatch[1].toUpperCase();

  // Description
  const descMatch = text.match(/(?:description|does|business\s*(?:type|desc))\s*[:=\-–]?\s*(.{10,200})/i);
  if (descMatch) vals.description = descMatch[1].trim().replace(/[,;.]$/, "");

  // Need at least company name + 2 others to consider it "complete enough"
  const filledCount = Object.keys(vals).length;
  if (vals.company_name && filledCount >= 3) return vals;
  return null;
}

/** Detect which ACORD forms the user is requesting based on chat text (returns multiple) */
function detectRequestedForms(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  
  // Direct form number mentions — find ALL (e.g., "125/127", "form 125 and 127", "125, 130")
  const allNumMatches = lower.matchAll(/\b(125|126|127|130|131|140)\b/g);
  for (const m of allNumMatches) {
    found.add(`acord-${m[1]}`);
  }

  // Coverage line keywords → form mapping
  if (/workers?\s*comp|work\s*comp|wc\b/i.test(lower)) found.add("acord-130");
  if (/commercial\s*auto|business\s*auto|auto\s*section|\bauto\b/i.test(lower)) found.add("acord-127");
  if (/general\s*liability|cgl\b|gl\s*section|\bliability\b/i.test(lower)) found.add("acord-126");
  if (/commercial\s*property|property\s*section|building\s*coverage|\bproperty\b/i.test(lower)) found.add("acord-140");
  if (/umbrella|excess\s*liability/i.test(lower)) found.add("acord-131");
  
  // Fallback: check form names from the list
  for (const f of ACORD_FORM_LIST) {
    if (lower.includes(f.name.toLowerCase())) found.add(f.id);
  }

  return Array.from(found);
}

/**
 * Detect ACORD forms from LOB flags set by AI extraction.
 * Only includes specialty forms when their specific data/flags are present.
 * ACORD 125 is always the base; 126 (GL) is included by default for commercial lines.
 */
function detectFormsFromLOBFlags(fd: Record<string, any>): string[] {
  const forms: string[] = ["acord-125"]; // Always include base application

  // Auto — only if explicit auto LOB flag or vehicle data present
  const hasAutoData = fd.lob_auto === "true" || fd.lob_auto === true
    || fd.number_of_vehicles || fd.vehicle_1_vin || fd.vehicle_1_year
    || fd.lob_business_auto === "true" || fd.lob_business_auto === true;
  if (hasAutoData) forms.push("acord-127");

  // Property — only if explicit property flag or property-specific data
  const hasPropertyData = fd.lob_property === "true" || fd.lob_property === true
    || fd.building_limit || fd.bpp_limit
    || fd.lob_commercial_property === "true" || fd.lob_commercial_property === true;
  if (hasPropertyData) forms.push("acord-140");

  // Umbrella — only if explicit umbrella flag or umbrella-specific data
  const hasUmbrellaData = fd.lob_umbrella === "true" || fd.lob_umbrella === true
    || fd.umbrella_each_occurrence || fd.umbrella_aggregate;
  if (hasUmbrellaData) forms.push("acord-131");

  // Workers Comp — only if explicit WC flag or WC-specific data
  const hasWCData = fd.lob_wc === "true" || fd.lob_wc === true
    || fd.has_workers_comp === "Yes" || fd.wc_state_1;
  if (hasWCData) forms.push("acord-130");

  // GL (126) — include by default for all commercial submissions unless ONLY auto/property
  const hasGLData = fd.lob_gl === "true" || fd.lob_gl === true
    || fd.lob_commercial_general_liability === "true" || fd.lob_commercial_general_liability === true
    || fd.gl_each_occurrence || fd.gl_general_aggregate;
  if (hasGLData || forms.length <= 1) {
    // Include GL if explicit flag OR if no other specialty forms detected (default)
    forms.push("acord-126");
  }

  return forms;
}

function autoFillFieldsFromExtracted(fields: FieldBubble[], extracted: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const f of fields) {
    if (extracted[f.key]) result[f.key] = extracted[f.key];
  }
  return result;
}

const TRAINING_TIPS = [
  {
    icon: FileText,
    title: "Upload Policy Docs & Decks",
    tip: "Drop in existing policy PDFs, loss runs, or submission decks — AURA extracts all fields automatically for maximum pre-fill rates.",
    accent: "primary",
  },
  {
    icon: Globe,
    title: "Share the Client's Website",
    tip: "Paste a company URL and AURA will scrape it for business info, industry class, and location data to pre-fill ACORD forms instantly.",
    accent: "success",
  },
  {
    icon: ClipboardList,
    title: "Request Specific ACORD Forms",
    tip: 'Tell AURA which coverage lines you need — e.g. "125/126/130" or "GL and Workers Comp" — and it targets only those forms for extraction.',
    accent: "accent",
  },
  {
    icon: Search,
    title: "Add Supplementals & Schedules",
    tip: "Upload supplemental applications or carrier-specific schedules — AURA uses them to fill gaps the main forms leave behind.",
    accent: "warning",
  },
];

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [displayedText, setDisplayedText] = useState(""); // typewriter buffer
  const [showTips, setShowTips] = useState(true);
  const [showIntentButtons, setShowIntentButtons] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullTextRef = useRef(""); // full streamed text so far
  const typewriterRef = useRef<number | null>(null);
  const streamDoneRef = useRef(false); // true once SSE finishes
  const onFinishRef = useRef<(() => void) | null>(null); // callback when typewriter catches up
  const { toast } = useToast();
  const { user } = useAuth();
  const { trainingMode } = useTrainingMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(null);
  const [activeFormId, setActiveFormId] = useState<string | undefined>(undefined);
  const [blankFormMode, setBlankFormMode] = useState(false);
  const [requestedFormIds, setRequestedFormIds] = useState<string[]>([]);
  const [submittingFields, setSubmittingFields] = useState(false);
  const skipAutoDetectRef = useRef(false);
  const bypassIntentRef = useRef(false);
  const inCoverageLoopRef = useRef(false);
  const [coverageInfo, setCoverageInfo] = useState<{ filled: number; total: number; percent: number } | null>(null);
  const [showFeatureSuggestion, setShowFeatureSuggestion] = useState(false);

  // Calculate coverage from form_data for a given submission
  const calculateCoverage = useCallback(async (submissionId: string) => {
    const { data } = await supabase
      .from("insurance_applications")
      .select("form_data")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.form_data) {
      const fd = data.form_data as Record<string, any>;
      const total = Object.keys(fd).length;
      const filled = Object.entries(fd).filter(([_, v]) => v && String(v).trim() && v !== "N/A").length;
      const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
      setCoverageInfo({ filled, total, percent });
      return { filled, total, percent, fd };
    }
    return null;
  }, []);

  // Helper: get current submission ID from chat messages
  const getSessionSubmissionId = useCallback(() => {
    let subId: string | null = null;
    for (const msg of messages) {
      const sidMatch = msg.content.match(/\[SUBMISSION_ID:([^\]]+)\]/);
      if (sidMatch) subId = sidMatch[1];
    }
    return subId || activeSubmissionId || pendingSubmissionId || null;
  }, [messages, activeSubmissionId, pendingSubmissionId]);

  

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + " " + text : text));
  }, []);
  const handleVoiceAutoSend = useCallback((text: string) => {
    send(text);
  }, []);
  const voice = useVoiceInput(handleVoiceTranscript, handleVoiceAutoSend);

  // Auto-send prefill message from navigation state (e.g., from training page)
  const prefillSentRef = useRef(false);
  useEffect(() => {
    const state = location.state as { prefillMessage?: string } | null;
    if (state?.prefillMessage && !prefillSentRef.current) {
      prefillSentRef.current = true;
      // Clear location state so refresh doesn't re-send
      window.history.replaceState({}, "");
      // Small delay to let component fully mount
      setTimeout(() => send(state.prefillMessage!), 300);
    }
  }, [location.state]);

  const downloadSubmission = async (subId: string, mode: "individual" | "package" = "package") => {
    if (!user) return;
    setDownloadingId(subId);
    try {
      const { data: app } = await supabase
        .from("insurance_applications")
        .select("*")
        .eq("submission_id", subId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!app) { toast({ variant: "destructive", title: "Error", description: "Application not found. Data may still be processing — try again in a moment." }); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, agency_name, phone, form_defaults")
        .eq("user_id", user.id)
        .single();

      const aiData = (app.form_data || {}) as Record<string, any>;
      const defaults = (profile?.form_defaults || {}) as Record<string, string>;

      // Use all forms for download
      const forms = ACORD_FORM_LIST;
      const results: { form: typeof forms[0]; data: Record<string, any> }[] = [];

      for (const form of forms) {
        const { data: filled } = await buildAutofilledDataWithAI(form, aiData, profile, defaults);
        for (const [k, v] of Object.entries(defaults)) {
          if (v && (!filled[k] || (typeof filled[k] === "string" && !filled[k].trim()))) {
            filled[k] = v;
          }
        }
        // Only include forms that have meaningful data
        const filledCount = Object.values(filled).filter(v => v && String(v).trim()).length;
        if (filledCount > 3) results.push({ form, data: filled });
      }

      if (results.length === 0) {
        toast({ variant: "destructive", title: "No forms", description: "No forms have enough data to download." });
        return;
      }

      if (mode === "individual") {
        for (let i = 0; i < results.length; i++) {
          const { form, data } = results[i];
          const pdf = await generateAcordPdfAsync(form, data);
          pdf.save(`${form.name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
          if (i < results.length - 1) await new Promise(r => setTimeout(r, 600));
        }
        toast({ title: "Downloaded", description: `${results.length} form(s) downloaded.` });
      } else {
        const companyName = aiData.applicant_name || aiData.insured_name || aiData.company_name || "Submission";
        const pkg = await generateSubmissionPackage({
          companyName,
          narrative: (app as any).narrative || "",
          agencyName: profile?.agency_name || defaults.agency_name || "",
          producerName: profile?.full_name || defaults.producer_name || "",
          coverageLines: [],
          forms: results,
          effectiveDate: aiData.effective_date || aiData.proposed_eff_date || "",
        });
        const safeName = companyName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
        pkg.save(`Submission_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast({ title: "Downloaded", description: "Submission package downloaded!" });
      }
    } catch (err) {
      console.error("Download error:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to download" });
    } finally {
      setDownloadingId(null);
    }
  };

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, displayedText, scrollToBottom]);

  // Typewriter: drains fullTextRef into displayedText char-by-char
  const startTypewriter = useCallback(() => {
    if (typewriterRef.current) return;
    const tick = () => {
      const full = fullTextRef.current;
      setDisplayedText((prev) => {
        if (prev.length >= full.length) {
          if (streamDoneRef.current) {
            // Typewriter caught up and stream is done — finalize
            if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
            if (onFinishRef.current) { setTimeout(onFinishRef.current, 0); onFinishRef.current = null; }
            return prev;
          }
          // Stream still going — wait for more text
          typewriterRef.current = window.setTimeout(tick, 30);
          return prev;
        }
        // Reveal a few chars at a time for smoothness
        const step = Math.min(3, full.length - prev.length);
        typewriterRef.current = window.setTimeout(tick, 18);
        return full.slice(0, prev.length + step);
      });
    };
    tick();
  }, []);

  const killTypewriter = useCallback(() => {
    if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
    setDisplayedText(fullTextRef.current);
    streamDoneRef.current = false;
    onFinishRef.current = null;
  }, []);

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    });

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });

  /** Persist uploaded files to client_documents so they show on the Documents tab */
  const persistFilesToDocuments = async (
    files: File[],
    userId: string,
    submissionId: string,
    leadId: string | null,
    docType: string,
  ) => {
    for (const file of files) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        const insertData: Record<string, any> = {
          user_id: userId,
          file_name: file.name,
          file_url: dataUrl,
          document_type: docType,
          file_size: file.size,
          submission_id: submissionId,
        };
        if (leadId) insertData.lead_id = leadId;
        await supabase.from("client_documents" as any).insert(insertData);
      } catch (err) {
        console.warn("Failed to persist file to client_documents:", file.name, err);
      }
    }
  };
  /** Extract handwritten notes from images — uses OCR with fuzzy text matching */
  const triggerHandwrittenExtraction = async (files: File[]) => {
    if (!user || files.length === 0) return;
    setIsLoading(true);
    setShowIntentButtons(false);

    // Filter to only images, or use all files if none are images
    const imageFiles = files.filter(f => f.type.startsWith("image/") || /\.(png|jpg|jpeg|heic|webp|bmp|tiff?)$/i.test(f.name));
    const filesToProcess = imageFiles.length > 0 ? imageFiles : files;
    const fileNames = filesToProcess.map(f => f.name).join(", ");
    const userMsg: Msg = { role: "user", content: `📸 Scanning handwritten notes: ${fileNames}` };
    setMessages(prev => [...prev, userMsg]);

    toast({ title: "Scanning handwritten notes…", description: "Running OCR with fuzzy text matching." });

    try {
      const pdfFiles: { name: string; base64: string; mimeType: string }[] = [];
      for (const file of filesToProcess) {
        const base64 = await readFileAsBase64(file);
        pdfFiles.push({ name: file.name, base64, mimeType: file.type || "image/jpeg" });
      }

      const companyName = "New Client";
      const { data: sub, error: subErr } = await supabase
        .from("business_submissions")
        .insert({ user_id: user.id, company_name: companyName, description: `Handwritten notes scan: ${fileNames}`, status: "processing" })
        .select()
        .single();
      if (subErr) throw subErr;

      const extractResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-business-data`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            description: `HANDWRITTEN NOTES — apply aggressive OCR fuzzy matching. Characters may be ambiguous: 0/O, 1/l/I, 5/S, 8/B, Z/2, etc. Use contextual clues (addresses, names, numbers) to resolve ambiguous characters. If a word is partially illegible, use the most likely insurance/business term that fits.\n\nScanned from: ${fileNames}`,
            pdf_files: pdfFiles,
            submission_id: sub.id,
          }),
        }
      );

      if (!extractResp.ok) {
        const errBody = await extractResp.json().catch(() => ({}));
        throw new Error(errBody.error || `Extraction failed (${extractResp.status})`);
      }

      const extracted = await extractResp.json();
      const detectedCompany = extracted?.form_data?.applicant_name || extracted?.form_data?.insured_name || companyName;
      if (detectedCompany !== companyName) {
        await supabase.from("business_submissions").update({ company_name: detectedCompany }).eq("id", sub.id);
      }

      const fd = extracted?.form_data || {};
      const leadId = await ensurePipelineLead({
        userId: user.id,
        accountName: detectedCompany || companyName,
        state: fd.state || fd.mailing_state || null,
        businessType: fd.business_description || fd.sic_description || null,
        submissionId: sub.id,
      });

      // Persist uploaded files to client_documents so they appear on the Documents tab
      await persistFilesToDocuments(filesToProcess, user.id, sub.id, leadId, "other");

      const detectedForms = detectFormsFromLOBFlags(fd);
      setRequestedFormIds(detectedForms);
      if (detectedForms.length > 0) setActiveFormId(detectedForms[0]);

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Scanned handwritten notes from **${fileNames}**. Extracted **${Object.keys(fd).filter(k => fd[k]).length}** fields${detectedCompany !== "New Client" ? ` for **${detectedCompany}**` : ""}. Routing to form view… [SUBMISSION_ID:${sub.id}]`,
        },
      ]);

      setTimeout(() => {
        setPendingSubmissionId(sub.id);
        setIsLoading(false);
      }, 1200);
    } catch (err: any) {
      console.error("Handwritten extraction error:", err);
      toast({ variant: "destructive", title: "Scan failed", description: err.message || "Could not read handwritten notes" });
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't read those handwritten notes. Try a clearer image or type the information directly." }]);
      setIsLoading(false);
    }
  };

  /** Immediately run document extraction when files are uploaded — no intent step needed */
  const triggerDocumentExtraction = async (files: File[]) => {
    if (!user || files.length === 0) return;
    setIsLoading(true);
    setShowIntentButtons(false);

    const fileNames = files.map(f => f.name).join(", ");
    const userMsg: Msg = { role: "user", content: `📎 Uploaded: ${fileNames}` };
    setMessages(prev => [...prev, userMsg]);

    toast({ title: "Extracting from documents…", description: "Reading your files and mapping to ACORD fields." });

    try {
      // Collect files by type
      let textContents = "";
      const pdfFiles: { name: string; base64: string; mimeType: string }[] = [];

      for (const file of files) {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const base64 = await readFileAsBase64(file);
          pdfFiles.push({ name: file.name, base64, mimeType: "application/pdf" });
        } else if (file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name)) {
          const content = await readFileAsText(file);
          textContents += `\n--- ${file.name} ---\n${content}`;
        } else if (file.type.startsWith("image/")) {
          const base64 = await readFileAsBase64(file);
          pdfFiles.push({ name: file.name, base64, mimeType: file.type });
        }
      }

      const description = `Insurance document upload: ${fileNames}${textContents ? `\n\nFile contents:\n${textContents}` : ""}`;
      const companyName = "New Client";

      const { data: sub, error: subErr } = await supabase
        .from("business_submissions")
        .insert({ user_id: user.id, company_name: companyName, description, status: "processing" })
        .select()
        .single();
      if (subErr) throw subErr;

      // Run extraction — send PDFs as base64 for Gemini multimodal reading
      const extractResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-business-data`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            description,
            file_contents: textContents || undefined,
            pdf_files: pdfFiles.length > 0 ? pdfFiles : undefined,
            submission_id: sub.id,
          }),
        }
      );

      if (!extractResp.ok) {
        const errBody = await extractResp.json().catch(() => ({}));
        throw new Error(errBody.error || `Extraction failed (${extractResp.status})`);
      }

      const extracted = await extractResp.json();
      const detectedCompany = extracted?.form_data?.applicant_name || extracted?.form_data?.insured_name || companyName;

      // Update company name if we found one
      if (detectedCompany !== companyName) {
        await supabase.from("business_submissions").update({ company_name: detectedCompany }).eq("id", sub.id);
      }

      // Detect form types from extracted LOB flags
      const fd = extracted?.form_data || {};

      // Auto-create pipeline lead in Quoting stage with synced data
      const leadId = await ensurePipelineLead({
        userId: user.id,
        accountName: detectedCompany || companyName,
        state: fd.state || fd.mailing_state || null,
        businessType: fd.business_description || fd.sic_description || null,
        submissionId: sub.id,
      });

      // Persist uploaded files to client_documents so they appear on the Documents tab
      await persistFilesToDocuments(files, user.id, sub.id, leadId, "application");

      const detectedForms = detectFormsFromLOBFlags(fd);

      setRequestedFormIds(detectedForms);
      if (detectedForms.length > 0) setActiveFormId(detectedForms[0]);

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Extracted data from **${fileNames}**. Found **${Object.keys(fd).filter(k => fd[k]).length}** fields${detectedCompany !== "New Client" ? ` for **${detectedCompany}**` : ""}. Routing you to the form view now… [SUBMISSION_ID:${sub.id}]`,
        },
      ]);

      // Route through ExtractionSummary so AI-inferred data gets persisted properly
      setTimeout(() => {
        setPendingSubmissionId(sub.id);
        setIsLoading(false);
      }, 1200);
    } catch (err: any) {
      console.error("Document extraction error:", err);
      toast({ variant: "destructive", title: "Extraction failed", description: err.message || "Could not extract from documents" });
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't extract data from those files. Please try again or paste the information directly." }]);
      setIsLoading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 10);
    setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 10));
  };

  const removeFile = (idx: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  /** Detect purely informational / question-style messages that should go to AI, not the 3-bucket picker */
  const isInformationalQuery = (text: string) => {
    const t = text.trim().toLowerCase();
    // Questions about what AURA/the app can do, what forms are available, how things work, etc.
    return /^(what|which|how|why|when|can\s+you|do\s+you|tell\s+me|show\s+me|list|explain|describe|give\s+me|are\s+there|is\s+there)\b/.test(t)
      || /\?\s*$/.test(t) // ends with a question mark
      || /what\s+(forms?|acord\s+forms?)\s+(do\s+you|are|can|have|would)\b/i.test(t)
      || /available\s+(for\s+me|to\s+me|forms?)\b/i.test(t)
      || /\b(help|options?|info|information|details?|capabilities?|features?)\b/.test(t)
      || /how\s+(do|does|can|would|should)\b/.test(t);
  };

  const isPipelineIntent = (text: string) => {
    const t = text.trim().toLowerCase();
    return /\b(move|update|change|set|mark)\b.+\b(lead|pipeline|stage|prospect|quoting|presenting|lost|dead|renewal|production)\b/.test(t)
      || /\b(pipeline|production|renewal|dead\s*lead)/i.test(t)
      || /\bmanage\s*(my\s*)?(pipeline|leads?|production|renewals?)\b/.test(t);
  };

  const isFormFillingIntent = (text: string) => {
    const t = text.trim().toLowerCase();
    // First: if this looks like an informational question, let AI handle it naturally
    if (isInformationalQuery(text)) return false;
    // Pipeline/production management should not trigger form filling
    if (isPipelineIntent(text)) return false;
    // Match forms, ACORD, coverage lines, submission intent, or specific form/coverage mentions
    return /\bforms?\b|\bacord\b|\bsubmit|\bnew\s*client|\binsurance\b|\bcoverage\b|\bapplication\b/.test(t)
      || /need\s*(a|an|to|help|forms?)|\bstart\b|\bget\s*start|\bfill\b|\bcreate\b/.test(t)
      || /workers?\s*comp|work\s*comp|\bliability\b|\bproperty\b|\bumbrella\b|\bauto\b/.test(t)
      || detectRequestedForms(text).length > 0; // direct form number/coverage mention always triggers
  };

  /** Detect if user is asking for a customer intake link/form */
  const isIntakeLinkIntent = (text: string) => {
    const t = text.trim().toLowerCase();
    const patterns = [
      /\bintake\s*(form|link)\b/,
      /\bclient\s*intake\b/,
      /\bcustomer\s*(intake|form|link)\b/,
      /\bsend\s*(a|an|the)?\s*(intake|customer)\b/,
      /\bneed\s*(a|an)?\s*(client|customer)?\s*intake\b/,
      /\bgenerate\s*(an?\s*)?(intake|customer)\s*(link|form)\b/,
      /\bcollect\s*(customer|client)\s*(info|information|details)\b/,
      /\blink\s*(to\s*)?(give|send|share)\s*(to\s*)?(a\s*)?(customer|client)\b/,
      /\b(give|send|share)\s*(a\s*)?(link|form)\s*(to\s*)?(a\s*)?(customer|client)\b/,
      /\bneed\s*(a\s*)?(link|form)\s*(to\s*)?(give|send|share)\b/,
      /\bneed\s*(a\s*)?(link|form)\s*(for\s*)?(a\s*)?(customer|client)\b/,
      /\bcustomer\s*(submission|onboard|onboarding)\s*(link|form)?\b/,
      /\b(new|create)\s*(client|customer)\s*(link|form)\b/,
      /\bonboard\s*(a\s*)?(new\s*)?(client|customer)\b/,
    ];
    return patterns.some(p => p.test(t));
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Intercept intake link requests BEFORE anything else
    if (isIntakeLinkIntent(text) && user) {
      const userMsg: Msg = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);
      try {
        const result = await generateIntakeLink({ agentId: user.id });
        if (result) {
          await navigator.clipboard.writeText(result.url);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `✅ **Intake link generated and copied to clipboard!**\n\nShare this link with your customer:\n\`${result.url}\`\n\nWhen they fill it out, their info will automatically sync to your pipeline and pre-fill ACORD forms. The link expires in 7 days.`,
            },
          ]);
          toast({ title: "Intake link copied!", description: "Share this link with your customer." });
        }
      } catch (err) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't generate the intake link. Please try again." }]);
      }
      setIsLoading(false);
      return;
    }

    // Intercept skip intent BEFORE sending to AI — go directly to blank form editor
    const isSkipIntent = /\bskip\b|\bgo\s*(straight\s*)?to\s*(the\s*)?form\b|\bjump\s*to\s*form\b|\bskip\s*(intake|questions)\b/i.test(text);
    if (isSkipIntent) {
      const userMsg: Msg = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      if (!trainingMode) {
        setShowIntentButtons(true);
        return;
      }
      openBlankFormEditor();
      return;
    }

    // In non-training mode: intercept any form-filling intent and show the 3 bucket buttons.
    // Exceptions — files already attached → trigger document upload path automatically
    // Also skip if bypassIntentRef is set (e.g. from ai-questions or infer buttons)
    const shouldBypass = bypassIntentRef.current;
    bypassIntentRef.current = false;
    if (!trainingMode && !shouldBypass && !inCoverageLoopRef.current && isFormFillingIntent(text) && !showIntentButtons) {
      const userMsg: Msg = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      // Detect and pre-store any form numbers mentioned so all 3 paths carry context
      const detected = detectRequestedForms(text);
      if (detected.length > 0) {
        setRequestedFormIds(detected);
        setActiveFormId(detected[0]);
      }
      if (attachedFiles.length > 0) {
        // Files attached → auto-route to document extraction flow
        const filesToExtract = [...attachedFiles];
        setAttachedFiles([]);
        triggerDocumentExtraction(filesToExtract);
        return;
      } else {
        setAttachedFiles([]);
        setShowIntentButtons(true);
        return;
      }
    }

    let content = text.trim();
    if (attachedFiles.length > 0) {
      content += `\n\n[${attachedFiles.length} file(s) attached: ${attachedFiles.map((f) => f.name).join(", ")}]`;
    }

    const userMsg: Msg = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);

    fullTextRef.current = "";
    setDisplayedText("");
    streamDoneRef.current = false;

    const upsert = (chunk: string) => {
      fullTextRef.current += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev;
        return [...prev, { role: "assistant", content: "" }];
      });
    };

    const finalizeMessage = () => {
      const finalText = fullTextRef.current;
      const fields = parseFields(finalText);
      const buttons = parseButtons(finalText);
      
      // Check if the user's last message already had intake data
      const lastUserMsg = [...messages, userMsg].filter(m => m.role === "user").pop();
      const isIntakeFields = fields.length >= 4 && fields.some(f => f.key === "company_name" || f.key === "website_url");
      
      if (isIntakeFields && lastUserMsg && !skipAutoDetectRef.current && !inCoverageLoopRef.current) {
        const extracted = tryExtractIntakeFromMessage(lastUserMsg.content);
        
        if (extracted) {
          skipAutoDetectRef.current = true;
          // Auto-fill whatever we can extract from inline data
          const autoFilled = autoFillFieldsFromExtracted(fields, extracted);
          setFieldValues(autoFilled);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: finalText, fields, buttons } : m
              );
            }
            return [...prev, { role: "assistant", content: finalText, fields, buttons }];
          });
          setIsLoading(false);
          // Auto-submit after a brief delay
          setTimeout(() => {
            const filledVals: Record<string, string> = {};
            for (const f of fields) {
              filledVals[f.key] = autoFilled[f.key] || "";
            }
            setFieldValues(filledVals);
            submitFieldsWithValues(fields, filledVals);
          }, 800);
          return;
        }

        // If a document was previously uploaded/extracted for THIS session, pre-fill intake
        // Only use activeSubmissionId to avoid cross-session data contamination
        if (user && activeSubmissionId) {
          (async () => {
            const { data: latestApp } = await supabase
              .from("insurance_applications")
              .select("form_data")
              .eq("submission_id", activeSubmissionId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latestApp?.form_data) {
              const fd = latestApp.form_data as Record<string, any>;
              const preFilled: Record<string, string> = {};
              for (const f of fields) {
                const val = fd[f.key] || fd[f.key.replace(/_/g, "")] || "";
                if (val && String(val).trim() && val !== "N/A") {
                  preFilled[f.key] = String(val);
                }
              }
              // Map common extraction keys to intake field keys
              if (!preFilled["company_name"] && (fd.applicant_name || fd.insured_name)) {
                preFilled["company_name"] = fd.applicant_name || fd.insured_name;
              }
              if (!preFilled["state"] && (fd.state || fd.mailing_state || fd.states_of_operation)) {
                preFilled["state"] = fd.state || fd.mailing_state || fd.states_of_operation;
              }
              if (!preFilled["business_description"] && (fd.business_description || fd.description_of_operations || fd.sic_description)) {
                preFilled["business_description"] = fd.business_description || fd.description_of_operations || fd.sic_description;
              }
              if (!preFilled["website_url"] && fd.website) {
                preFilled["website_url"] = fd.website;
              }
              if (Object.keys(preFilled).length > 0) {
                setFieldValues(prev => ({ ...prev, ...preFilled }));
              }
            }
          })();
        }
      }
      
      // Execute pipeline actions if present
      const pipelineActions = parsePipelineActions(finalText);
      if (pipelineActions.length > 0) {
        executePipelineActions(pipelineActions);
      }

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: finalText, fields, buttons } : m
          );
        }
        return [...prev, { role: "assistant", content: finalText, fields, buttons }];
      });
      setIsLoading(false);

      // In coverage loop mode, recalculate coverage after each AI response
      if (inCoverageLoopRef.current) {
        const subId = getSessionSubmissionId();
        if (subId) {
          setTimeout(() => calculateCoverage(subId), 500);
        }
      }
    };

    setTimeout(() => startTypewriter(), 50);

    try {
      await streamChat({
        messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        trainingMode,
        onDelta: upsert,
        onDone: () => {
          // Signal stream done — typewriter will call finalizeMessage when it catches up
          streamDoneRef.current = true;
          onFinishRef.current = finalizeMessage;
        },
        onError: (err) => {
          killTypewriter();
          toast({ variant: "destructive", title: "Error", description: err });
          setIsLoading(false);
        },
      });
    } catch {
      killTypewriter();
      toast({ variant: "destructive", title: "Connection error", description: "Could not reach the assistant." });
      setIsLoading(false);
    }
  };

  // Start the AI coverage loop: extract inline (without navigating away), then ask questions until 85%+
  const startCoverageLoop = async (filesToExtract?: File[]) => {
    if (!user) return;
    setShowIntentButtons(false);
    setIsLoading(true);
    inCoverageLoopRef.current = true;

    let subId: string | null = null;

    // If files provided, extract inline without setting pendingSubmissionId
    if (filesToExtract && filesToExtract.length > 0) {
      const fileNames = filesToExtract.map(f => f.name).join(", ");
      const userMsg: Msg = { role: "user", content: `🧠 AI Infer mode — extracting from: ${fileNames}` };
      setMessages(prev => [...prev, userMsg]);
      toast({ title: "Extracting from documents…", description: "Reading files and mapping to ACORD fields." });

      try {
        let textContents = "";
        const pdfFiles: { name: string; base64: string; mimeType: string }[] = [];
        for (const file of filesToExtract) {
          if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            const base64 = await readFileAsBase64(file);
            pdfFiles.push({ name: file.name, base64, mimeType: "application/pdf" });
          } else if (file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name)) {
            const content = await readFileAsText(file);
            textContents += `\n--- ${file.name} ---\n${content}`;
          } else if (file.type.startsWith("image/")) {
            const base64 = await readFileAsBase64(file);
            pdfFiles.push({ name: file.name, base64, mimeType: file.type });
          }
        }

        const description = `Insurance document upload: ${fileNames}${textContents ? `\n\nFile contents:\n${textContents}` : ""}`;
        const { data: sub, error: subErr } = await supabase
          .from("business_submissions")
          .insert({ user_id: user.id, company_name: "New Client", description, status: "processing" })
          .select()
          .single();
        if (subErr) throw subErr;
        subId = sub.id;

        const extractResp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-business-data`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ description, file_contents: textContents || undefined, pdf_files: pdfFiles.length > 0 ? pdfFiles : undefined, submission_id: sub.id }),
          }
        );
        if (!extractResp.ok) {
          const errBody = await extractResp.json().catch(() => ({}));
          throw new Error(errBody.error || `Extraction failed (${extractResp.status})`);
        }

        const extracted = await extractResp.json();
        const fd = extracted?.form_data || {};
        const detectedCompany = fd.applicant_name || fd.insured_name || "New Client";
        if (detectedCompany !== "New Client") {
          await supabase.from("business_submissions").update({ company_name: detectedCompany }).eq("id", sub.id);
        }

        await ensurePipelineLead({
          userId: user.id,
          accountName: detectedCompany,
          state: fd.state || fd.mailing_state || null,
          businessType: fd.business_description || fd.sic_description || null,
          submissionId: sub.id,
        });

        const detectedForms = detectFormsFromLOBFlags(fd);
        setRequestedFormIds(detectedForms);
        if (detectedForms.length > 0) setActiveFormId(detectedForms[0]);

        const filledCount = Object.keys(fd).filter(k => fd[k]).length;
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `✅ Extracted **${filledCount}** fields from **${fileNames}**${detectedCompany !== "New Client" ? ` for **${detectedCompany}**` : ""}. Now let me ask you some follow-up questions to increase coverage… [SUBMISSION_ID:${sub.id}]`,
        }]);
      } catch (err: any) {
        console.error("Coverage loop extraction error:", err);
        toast({ variant: "destructive", title: "Extraction failed", description: err.message || "Could not extract" });
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, extraction failed. Let me ask you questions directly instead." }]);
        setIsLoading(false);
        // Fall through to ask questions without extracted data
      }
    }

    // Get submission ID from messages if not set
    if (!subId) {
      for (const msg of messages) {
        const sidMatch = msg.content.match(/\[SUBMISSION_ID:([^\]]+)\]/);
        if (sidMatch) subId = sidMatch[1];
      }
      subId = subId || activeSubmissionId || pendingSubmissionId;
    }

    if (!subId) {
      setIsLoading(false);
      bypassIntentRef.current = true;
      send("I want to fill an ACORD form — please ask me a few short questions to gather the client information.");
      return;
    }

    const result = await calculateCoverage(subId);
    setIsLoading(false);
    if (!result) {
      bypassIntentRef.current = true;
      send("I want to fill an ACORD form — please ask me targeted follow-up questions about the client. Do NOT show the standard intake form.");
      return;
    }

    const { filled, total, percent, fd } = result;
    const filledEntries = Object.entries(fd).filter(([_, v]) => v && String(v).trim() && v !== "N/A");
    const missingEntries = Object.entries(fd).filter(([_, v]) => !v || !String(v).trim() || v === "N/A");

    const dataContext = `\n\nCurrent coverage: ${percent}% (${filled}/${total} fields filled).\n\nAlready extracted:\n${filledEntries.slice(0, 30).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n\nFields still missing (${missingEntries.length}): ${missingEntries.map(([k]) => k).join(", ")}\n\nIMPORTANT: Keep asking me targeted questions about the MISSING fields, 2-3 at a time, until we reach at least 85% coverage. Do NOT show the intake form. Ask conversational questions. After I answer, acknowledge and ask the next batch. Current target: 85-90% coverage.`;

    bypassIntentRef.current = true;
    send(`Please help me fill in the remaining gaps from this submission. Use AI inference where possible and ask me targeted follow-up questions for the rest. Do NOT show the standard intake form.${dataContext}`);
  };

  /** Execute pipeline actions parsed from AI response */
  const executePipelineActions = async (actions: PipelineAction[]) => {
    if (!user) return;
    for (const action of actions) {
      try {
        if (action.type === "move_lead" && action.stage) {
          // Find lead by account name (case-insensitive)
          const { data: leads } = await supabase
            .from("leads")
            .select("id, account_name, stage")
            .eq("owner_user_id", user.id)
            .ilike("account_name", `%${action.account_name}%`);

          if (leads && leads.length > 0) {
            const validStages = ["prospect", "quoting", "presenting", "lost"];
            const targetStage = action.stage.toLowerCase().replace(/\s+/g, "_");
            const mapped = targetStage === "dead" || targetStage === "dead_leads" ? "lost" : targetStage;
            if (validStages.includes(mapped)) {
              for (const lead of leads) {
                await supabase
                  .from("leads")
                  .update({ stage: mapped as any, updated_at: new Date().toISOString() })
                  .eq("id", lead.id);
              }
              toast({ title: "Pipeline updated", description: `Moved ${leads.length} lead(s) to "${mapped}".` });
            }
          } else {
            toast({ variant: "destructive", title: "Lead not found", description: `No lead matching "${action.account_name}".` });
          }
        } else if (action.type === "update_lead" && action.field && action.value) {
          const { data: leads } = await supabase
            .from("leads")
            .select("id, account_name")
            .eq("owner_user_id", user.id)
            .ilike("account_name", `%${action.account_name}%`);

          if (leads && leads.length > 0) {
            const allowedFields = ["contact_name", "email", "phone", "business_type", "state", "lead_source"];
            if (allowedFields.includes(action.field)) {
              for (const lead of leads) {
                await supabase
                  .from("leads")
                  .update({ [action.field]: action.value, updated_at: new Date().toISOString() })
                  .eq("id", lead.id);
              }
              toast({ title: "Lead updated", description: `Updated ${action.field} for ${leads.length} lead(s).` });
            }

            // Handle policy-level updates (renewal date = effective_date on policies)
            if (action.field === "renewal_date" || action.field === "effective_date") {
              const { data: policies } = await supabase
                .from("policies")
                .select("id")
                .in("lead_id", leads.map(l => l.id));
              if (policies && policies.length > 0) {
                for (const pol of policies) {
                  await supabase
                    .from("policies")
                    .update({ effective_date: action.value, updated_at: new Date().toISOString() })
                    .eq("id", pol.id);
                }
                toast({ title: "Renewal updated", description: `Updated renewal date for ${policies.length} polic(ies).` });
              }
            }
          } else {
            toast({ variant: "destructive", title: "Lead not found", description: `No lead matching "${action.account_name}".` });
          }
        }
      } catch (err) {
        console.error("Pipeline action failed:", err);
        toast({ variant: "destructive", title: "Action failed", description: `Could not execute: ${action.type}` });
      }
    }
  };

  /** Detect URLs in text and scrape them for business data */
  const scrapeWebsiteUrls = async (text: string): Promise<Record<string, any>> => {
    const urlRegex = /https?:\/\/[^\s,)]+/gi;
    const urls = text.match(urlRegex);
    if (!urls || urls.length === 0) return {};

    let allExtracted: Record<string, any> = {};
    for (const url of urls.slice(0, 3)) { // max 3 URLs
      try {
        const { data, error } = await supabase.functions.invoke("scrape-website", {
          body: { url },
        });
        if (!error && data?.extracted_data) {
          allExtracted = { ...allExtracted, ...data.extracted_data };
          toast({
            title: "Website scraped",
            description: `Extracted business data from ${data.page_title || url}`,
          });
        }
      } catch (err) {
        console.warn("Scrape failed for", url, err);
      }
    }
    return allExtracted;
  };

  const submitFieldsWithValues = async (fields: FieldBubble[], vals: Record<string, string>) => {
    if (!user) return;
    setSubmittingFields(true);

    // Check if website URL was provided and scrape it
    const websiteUrl = vals["website_url"] || "";
    let scrapedData: Record<string, any> = {};
    if (websiteUrl && /https?:\/\//i.test(websiteUrl)) {
      toast({ title: "Scraping website…", description: `Pulling business data from ${websiteUrl}` });
      scrapedData = await scrapeWebsiteUrls(websiteUrl);
    }

    // Also check all user messages for URLs to scrape
    const allUserText = messages.filter(m => m.role === "user").map(m => m.content).join(" ") + " " + Object.values(vals).join(" ");
    if (Object.keys(scrapedData).length === 0) {
      const urlMatch = allUserText.match(/https?:\/\/[^\s,)]+/gi);
      if (urlMatch && urlMatch.length > 0) {
        scrapedData = await scrapeWebsiteUrls(urlMatch.join(" "));
      }
    }

    const filled = fields.map((f) => `${f.label}: ${vals[f.key] || "(empty)"}`).join("\n");
    
    const description = fields.map((f) => `${f.label}: ${vals[f.key] || ""}`).filter(l => !l.endsWith(": ")).join("\n");
    const companyName = vals["company_name"] || vals["applicant_name"] || scrapedData.applicant_name || scrapedData.company_name || "New Client";

    // Build full context from ALL chat messages + current intake fields + scraped data
    const fullChatContext = messages
      .map((m) => {
        const clean = m.content.replace(/\[FIELD:[^\]]+\]/g, "").replace(/\[BUTTON:[^\]]+\]/g, "").replace(/\[SUBMISSION_ID:[^\]]+\]/g, "").trim();
        return `${m.role === "user" ? "Agent" : "AURA"}: ${clean}`;
      })
      .join("\n\n");
    
    let fullDescription = `${fullChatContext}\n\n--- Current Intake Fields ---\n${description}`;
    
    if (Object.keys(scrapedData).length > 0) {
      fullDescription += `\n\n--- Data Scraped from Website ---\n${JSON.stringify(scrapedData, null, 2)}`;
    }

    try {
      const { data: sub, error: subErr } = await supabase
        .from("business_submissions")
        .insert({
          user_id: user.id,
          company_name: companyName,
          description: fullDescription,
          status: "processing",
        })
        .select()
        .single();

      if (subErr) throw subErr;

      const extractResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-business-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ description: fullDescription, submission_id: sub.id }),
        }
      );

      if (!extractResp.ok) console.warn("Extract failed:", extractResp.status);

      send(`Here are the details:\n${filled}${websiteUrl ? `\nWebsite: ${websiteUrl}` : ""}\n\n[SUBMISSION_ID:${sub.id}]`);
      // Detect which forms the user is requesting from chat context
      const allText = messages.map(m => m.content).join(" ") + " " + filled;
      let detectedForms = detectRequestedForms(allText);

      // If no explicit form/coverage mentions, try LOB flags from extracted data
      if (detectedForms.length === 0) {
        // Fetch the extracted form_data to check LOB flags
        const { data: appRow } = await supabase
          .from("insurance_applications")
          .select("form_data")
          .eq("submission_id", sub.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const fd = (appRow?.form_data || {}) as Record<string, any>;
        detectedForms = detectFormsFromLOBFlags(fd);
      }

      // Fallback: always at least ACORD 125 (base app) + 126 (GL)
      if (detectedForms.length === 0) {
        detectedForms = ["acord-125", "acord-126"];
      }
      // Always ensure ACORD 125 is included as the base application
      if (!detectedForms.includes("acord-125")) {
        detectedForms.unshift("acord-125");
      }

      setRequestedFormIds(detectedForms);
      if (detectedForms.length > 0) setActiveFormId(detectedForms[0]);
      setTimeout(() => setPendingSubmissionId(sub.id), 1500);
    } catch (err) {
      console.error("Failed to create submission:", err);
      send(`Here are the details:\n${filled}`);
    }

    setFieldValues({});
    setSubmittingFields(false);
  };

  const submitFields = async (fields: FieldBubble[]) => {
    submitFieldsWithValues(fields, fieldValues);
  };

  /** Directly open a blank form editor without any intake — used by the "Fill Manually" button */
  const openBlankFormEditor = async () => {
    if (!user) return;
    setShowIntentButtons(false);
    try {
      const { data: sub, error } = await supabase
        .from("business_submissions")
        .insert({ user_id: user.id, status: "draft", company_name: "New Client" })
        .select()
        .single();
      if (error || !sub) throw error || new Error("Failed to create submission");
      setBlankFormMode(true);
      setActiveSubmissionId(sub.id);
    } catch (err) {
      console.error("Failed to open blank form editor:", err);
      toast({ title: "Error", description: "Could not open form editor. Please try again.", variant: "destructive" });
    }
  };

  const skipToForm = async (fields: FieldBubble[]) => {
    // Submit with whatever is filled (even if empty)
    submitFieldsWithValues(fields, fieldValues);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const dragCounterRef = useRef(0);
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setDragActive(true);
  };
  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current = 0;
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const newFiles = [...attachedFiles, ...files].slice(0, 10);
      setAttachedFiles(newFiles);
      // Show intent buttons so user can choose how to process dropped files
      const fileNames = files.map(f => f.name).join(", ");
      const userMsg: Msg = { role: "user", content: `📎 Dropped: ${fileNames}` };
      setMessages(prev => [...prev, userMsg]);
      setShowIntentButtons(true);
    }
  };

  const isEmpty = messages.length === 0;

  if (activeSubmissionId) {
    const handleBackFromForm = () => { setActiveSubmissionId(null); setBlankFormMode(false); };
    return (
      <AppLayout onLogoClick={handleBackFromForm}>
        <div className="animate-slide-in-right">
          <FormFillingView
            submissionId={activeSubmissionId}
            initialMessages={messages.map((m) => ({ role: m.role, content: m.content }))}
            initialFormId={activeFormId}
            initialFormIds={requestedFormIds.length > 0 ? requestedFormIds : undefined}
            onBack={handleBackFromForm}
            suppressAutoAnalysis={blankFormMode && !trainingMode}
            initialCompanyName={blankFormMode ? "New Client" : undefined}
          />
        </div>
      </AppLayout>
    );
  }

  if (pendingSubmissionId) {
    return (
      <AppLayout>
        <ExtractionSummary
          submissionId={pendingSubmissionId}
          requestedFormIds={requestedFormIds}
          onContinue={(formId) => {
            if (formId) setActiveFormId(formId);
            setActiveSubmissionId(pendingSubmissionId);
            setPendingSubmissionId(null);
          }}
          onFormsChanged={(ids) => setRequestedFormIds(ids)}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className="flex flex-col h-[calc(100vh-7.5rem)]"
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragActive && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl m-4"
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center space-y-2 pointer-events-none">
              <FileUp className="h-10 w-10 text-primary mx-auto" />
              <p className="text-lg font-semibold text-primary">Drop to extract & fill forms</p>
              <p className="text-xs text-muted-foreground">PDF, images, or text files</p>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-full gap-6 px-4 py-12">
              <div className="text-center space-y-2">
                <h1 className="text-4xl tracking-tight aura-gradient-text">
                  What are we working on?
                </h1>
                <p className="text-muted-foreground text-sm">
                  I'm <span className="font-bold text-foreground">AURA</span> — your insurance trained AI co-pilot
                </p>
              </div>

              {/* Chat input inline */}
              <div className="w-full max-w-2xl">
                {attachedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-md bg-card border px-2.5 py-1.5 text-xs">
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="max-w-[120px] truncate">{f.name}</span>
                        <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-xl border bg-card p-3 aura-glow-shadow focus-within:ring-2 focus-within:ring-ring">
                  <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 0) { setAttachedFiles(prev => [...prev, ...files].slice(0, 10)); const fileNames = files.map(f => f.name).join(", "); setMessages(prev => [...prev, { role: "user" as const, content: `📎 Attached: ${fileNames}` }]); setShowIntentButtons(true); } e.target.value = ""; }} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment"; inp.multiple = true; inp.onchange = (e) => { const files = Array.from((e.target as HTMLInputElement).files || []); if (files.length > 0) triggerHandwrittenExtraction(files); }; inp.click(); }}
                    title="Scan handwritten notes"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about your clients..."
                    rows={2}
                    className="flex-1 resize-none bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground min-h-[52px] max-h-40 py-2"
                  />
                  <Button
                    variant={voice.isListening ? "destructive" : "ghost"}
                    size="icon"
                    className={`shrink-0 h-9 w-9 transition-all ${voice.isListening ? "animate-pulse ring-2 ring-red-400/50" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={voice.toggle}
                    disabled={voice.isConnecting}
                    title={voice.isListening ? "Stop recording" : "Voice input"}
                  >
                    {voice.isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={() => {
                      if (attachedFiles.length > 0 && !input.trim()) {
                        // Show intent buttons so user can choose how to process
                        const fileNames = attachedFiles.map(f => f.name).join(", ");
                        setMessages(prev => [...prev, { role: "user" as const, content: `📎 Attached: ${fileNames}` }]);
                        setShowIntentButtons(true);
                      } else {
                        send(input);
                      }
                    }}
                    disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                    size="icon"
                    className="shrink-0 h-9 w-9"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {voice.isListening && voice.liveText ? (
                  <p className="text-xs text-primary text-center mt-2 animate-pulse">
                    🎙️ "{voice.liveText}"
                  </p>
                ) : voice.isListening ? (
                  <p className="text-xs text-primary text-center mt-2 animate-pulse">
                    🎙️ Listening… speak now
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    Drop files anywhere or click <Paperclip className="inline h-3 w-3" /> to attach
                  </p>
                )}
              </div>

              {trainingMode && (
                <>
              <div className="grid grid-cols-3 gap-3 w-full max-w-2xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      if (!trainingMode && s.message.includes("ACORD form")) {
                        setShowIntentButtons(true);
                      } else {
                        send(s.message);
                      }
                    }}
                    className="flex flex-col items-start gap-2 rounded-xl border bg-card/80 backdrop-blur-sm p-4 text-left hover-lift aura-glow-shadow transition-colors group"
                  >
                    <s.icon className="h-5 w-5 text-accent group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">{s.label}</span>
                  </button>
                ))}
                {/* Run Loss Runs */}
                <button
                  onClick={() => navigate("/pipeline")}
                  className="flex flex-col items-start gap-2 rounded-xl border bg-card/80 backdrop-blur-sm p-4 text-left hover-lift aura-glow-shadow transition-colors group"
                >
                  <FileSearch className="h-5 w-5 text-accent group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium">Run loss runs</span>
                </button>
                {/* Send Intake Form */}
                <button
                  onClick={async () => {
                    if (!user) return;
                    const result = await generateIntakeLink({ agentId: user.id });
                    if (result) {
                      await navigator.clipboard.writeText(result.url);
                      toast({ title: "Intake link copied!", description: "Share this link with your customer to collect their details." });
                    }
                  }}
                  className="flex flex-col items-start gap-2 rounded-xl border bg-card/80 backdrop-blur-sm p-4 text-left hover-lift aura-glow-shadow transition-colors group"
                >
                  <LinkIcon className="h-5 w-5 text-accent group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium">Send intake form</span>
                </button>
              </div>

              {/* Feature action boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                <button
                  onClick={() => navigate("/pipeline")}
                  className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Add a lead to our sales pipeline.</p>
                    <p className="text-xs text-muted-foreground mt-1">Track prospects through quoting, presenting, and closing stages.</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/approvals")}
                  className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Manage your production and renewals.</p>
                    <p className="text-xs text-muted-foreground mt-1">View approved policies, pending approvals, and upcoming renewal dates.</p>
                  </div>
                </button>
              </div>

              {/* Coming Soon — Email in chat */}
              <div className="w-full max-w-2xl relative rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 opacity-70">
                <Badge variant="outline" className="absolute top-3 right-3 text-[10px] uppercase tracking-wider font-sans bg-muted text-muted-foreground border-muted-foreground/30">
                  Coming Soon
                </Badge>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Email in your chat request to have a client ready to go when you get back to the office.</p>
                    <p className="text-xs text-muted-foreground mt-1">Send client details via email and AURA will pre-fill everything before you arrive.</p>
                  </div>
                </div>
              </div>

              {/* Suggest a Feature */}
              <button
                onClick={() => setShowFeatureSuggestion(true)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Suggest a feature to our team</span>
              </button>
                </>
              )}
              {/* Intent buttons — shown when files dropped or form filling intent detected */}
              {showIntentButtons && (
                <div className="w-full max-w-2xl animate-smooth-reveal">
                  <div className="rounded-xl border bg-card p-5 space-y-3 aura-glow-shadow">
                    <p className="text-sm font-medium text-foreground">How would you like to get started?</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setShowIntentButtons(false);
                          if (attachedFiles.length > 0) {
                            setMessages(prev => [...prev, {
                              role: "assistant" as const,
                              content: `📂 You have **${attachedFiles.length} document${attachedFiles.length > 1 ? 's' : ''}** ready. Would you like to add more, or continue with extraction?`,
                              buttons: [
                                { label: "Add More Documents", action: "add-more-docs" },
                                { label: "Continue with Extraction", action: "extract-current-docs" },
                              ]
                            }]);
                          } else {
                            setMessages(prev => [...prev, {
                              role: "assistant" as const,
                              content: "📂 Upload your client documents — policies, decks, loss runs, or any supporting files. I'll extract and pre-fill your ACORD forms automatically.",
                              buttons: [
                                { label: "Upload Documents", action: "open-file-picker" },
                                { label: "Skip to Fillable Forms", action: "skip-to-form" },
                              ]
                            }]);
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Add Documents to Have AI Pre-fill ACORD Forms</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Upload policies, decks, or loss runs for automated extraction</p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowIntentButtons(false);
                          if (attachedFiles.length > 0) {
                            setMessages(prev => [...prev, {
                              role: "assistant" as const,
                              content: `📸 You have **${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''}** attached. Take a photo of handwritten notes to add to these, or continue with extraction from what you have.`,
                              buttons: [
                                { label: "📷 Take Photo of Notes", action: "scan-handwritten-camera" },
                                { label: "Continue with Extraction", action: "extract-current-docs" },
                              ]
                            }]);
                          } else {
                            setMessages(prev => [...prev, {
                              role: "assistant" as const,
                              content: "📸 Take a photo of your handwritten client notes for OCR scanning, or upload documents instead.",
                              buttons: [
                                { label: "📷 Take Photo of Notes", action: "scan-handwritten-camera" },
                                { label: "Upload Documents Instead", action: "open-file-picker" },
                                { label: "Skip to Fillable Forms", action: "skip-to-form" },
                              ]
                            }]);
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <Camera className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Scan Handwritten Client Notes</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Take a photo of handwritten notes — OCR with fuzzy matching fills ACORD fields</p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowIntentButtons(false);
                          if (attachedFiles.length > 0) {
                            const filesToExtract = [...attachedFiles];
                            setAttachedFiles([]);
                            startCoverageLoop(filesToExtract);
                          } else {
                            const formContext = requestedFormIds.length > 0 ? ` The agent has already specified these ACORD forms: ${requestedFormIds.map(id => id.replace("acord-", "ACORD ")).join(", ")}.` : "";
                            bypassIntentRef.current = true;
                            send(`I want to fill an ACORD form — please ask me a few short questions to gather the client information.${formContext}`);
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <BrainCircuit className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Use AI to Infer Customer Information</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Extracts data, uses AI inference, and asks questions until 85-90% coverage</p>
                        </div>
                      </button>
                      <button
                        onClick={async () => {
                          if (attachedFiles.length > 0) {
                            const filesToExtract = [...attachedFiles];
                            setAttachedFiles([]);
                            setShowIntentButtons(false);
                            triggerDocumentExtraction(filesToExtract);
                          } else {
                            // No files — create a blank submission and route through ExtractionSummary
                            if (!user) return;
                            setShowIntentButtons(false);
                            try {
                              const { data: sub, error } = await supabase
                                .from("business_submissions")
                                .insert({ user_id: user.id, status: "draft", company_name: "New Client" })
                                .select()
                                .single();
                              if (error || !sub) throw error || new Error("Failed to create submission");
                              setMessages(prev => [...prev, { role: "assistant" as const, content: `📝 Opening blank form workspace… [SUBMISSION_ID:${sub.id}]` }]);
                              setPendingSubmissionId(sub.id);
                            } catch (err) {
                              console.error("Failed to open blank form editor:", err);
                              toast({ title: "Error", description: "Could not open form editor. Please try again.", variant: "destructive" });
                            }
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <PenLine className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">I Want to Fill My Own Forms and Ask AI for Help Later</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{attachedFiles.length > 0 ? "Extract from your files, then edit forms manually" : "Start with blank ACORD forms and get assistance on demand"}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Training mode tips panel */}
              {trainingMode && (
                <div className="w-full max-w-2xl animate-smooth-reveal">
                  <button
                    onClick={() => setShowTips(p => !p)}
                    className="flex items-center justify-between w-full rounded-xl border bg-card/60 px-4 py-3 text-left hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold">Tips for Maximum ACORD Coverage</span>
                      <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full font-medium">Training Mode</span>
                    </div>
                    {showTips ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {showTips && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {TRAINING_TIPS.map((tip, i) => (
                        <div
                          key={i}
                          className="rounded-xl border bg-card p-4 opacity-0 animate-[slideUpFadeIn_0.4s_ease-out_forwards]"
                          style={{ animationDelay: `${i * 0.08}s` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0 text-accent">
                              <tip.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold mb-1 text-foreground">{tip.title}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{tip.tip}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {messages.map((m, i) => {
                const isLastAssistant = m.role === "assistant" && i === messages.length - 1;
                const textToShow = isLastAssistant && isLoading ? displayedText : m.content;
                return (
                <div key={i}>
                  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded-xl px-4 py-3 max-w-[85%] text-sm leading-relaxed transition-smooth ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground whitespace-pre-wrap animate-slide-in-right"
                          : "bg-muted text-foreground prose prose-sm prose-headings:text-foreground prose-strong:text-foreground prose-p:my-1.5 prose-li:my-0.5 prose-ol:my-1 prose-ul:my-1 max-w-none animate-slide-in-left"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <ReactMarkdown>{stripMarkers(textToShow)}</ReactMarkdown>
                      ) : m.content}
                    </div>
                  </div>

                  {/* Pop-out field bubbles with slide-up animation */}
                  {m.role === "assistant" && m.fields && m.fields.length > 0 && !isLoading && (
                    <div className="ml-0 max-w-[85%] animate-smooth-reveal">
                      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Please fill in the following
                        </p>
                        {m.fields.map((f, fIdx) => (
                          <div
                            key={f.key}
                            className="space-y-1 opacity-0 animate-[slideUpFadeIn_0.4s_ease-out_forwards]"
                            style={{ animationDelay: `${0.5 + fIdx * 0.1}s` }}
                          >
                            <label className="text-xs font-medium text-foreground">{f.label}</label>
                            <Input
                              placeholder={f.placeholder}
                              value={fieldValues[f.key] || ""}
                              onChange={(e) => setFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                              className="h-9 text-sm"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2 mt-1 opacity-0 animate-[slideUpFadeIn_0.4s_ease-out_forwards]" style={{ animationDelay: `${0.5 + (m.fields?.length || 0) * 0.1 + 0.1}s` }}>
                          <Button size="sm" className="flex-1" onClick={() => submitFields(m.fields!)} disabled={submittingFields}>
                            {submittingFields ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />}
                            {submittingFields ? "Processing…" : "Submit details"}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => skipToForm(m.fields!)} disabled={submittingFields}>
                            Skip — go to form
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {m.role === "assistant" && m.buttons && m.buttons.length > 0 && !isLoading && (
                    <div className="ml-0 max-w-[85%] animate-smooth-reveal">
                      <div className="flex flex-wrap gap-2">
                        {m.buttons.map((b, bIdx) => {
                          const appMatch = b.action.match(/^\/application\/(.+)/);
                          const downloadMatch = b.action.match(/^download:(.+)/);
                          const downloadPkgMatch = b.action.match(/^download-pkg:(.+)/);
                          const isDownloading = downloadingId && (downloadMatch?.[1] === downloadingId || downloadPkgMatch?.[1] === downloadingId);

                          return (
                            <Button
                              key={bIdx}
                              variant={downloadMatch || downloadPkgMatch ? "default" : "outline"}
                              disabled={!!isDownloading}
                              onClick={() => {
                                if (downloadPkgMatch) {
                                  downloadSubmission(downloadPkgMatch[1], "package");
                                } else if (downloadMatch) {
                                  downloadSubmission(downloadMatch[1], "individual");
                                } else if (appMatch) {
                                  setActiveSubmissionId(appMatch[1]);
                                } else if (b.action === "skip-to-form") {
                                  send("Skip straight to fillable forms — just extract what you can from the uploaded document and take me to the ACORD forms.");
                                } else if (b.action === "ai-questions") {
                                  (async () => {
                                    let dataContext = "";
                                    const subId = getSessionSubmissionId();
                                    if (subId) {
                                      const result = await calculateCoverage(subId);
                                      if (result) {
                                        const { filled, total, percent, fd } = result;
                                        const filledEntries = Object.entries(fd).filter(([_, v]) => v && String(v).trim() && v !== "N/A");
                                        const missingEntries = Object.entries(fd).filter(([_, v]) => !v || !String(v).trim() || v === "N/A");
                                        dataContext = `\n\nCurrent coverage: ${percent}% (${filled}/${total} fields).\n\nAlready extracted:\n${filledEntries.slice(0, 30).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n\nFields still missing (${missingEntries.length}): ${missingEntries.map(([k]) => k).join(", ")}\n\nKeep asking me targeted questions about the MISSING fields, 2-3 at a time, until we reach at least 85% coverage. Do NOT show the intake form.`;
                                      }
                                    }
                                    bypassIntentRef.current = true;
                                    send(`Yes, please ask me follow-up questions to fill any gaps from the uploaded document. Do NOT show the standard intake form — I already uploaded a document with data extracted.${dataContext}`);
                                  })();
                                } else if (b.action === "add-more-docs") {
                                  const inp = document.createElement("input");
                                  inp.type = "file"; inp.multiple = true;
                                  inp.accept = ".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.md,.csv";
                                  inp.onchange = (e) => {
                                    const files = Array.from((e.target as HTMLInputElement).files || []);
                                    if (files.length > 0) triggerDocumentExtraction(files);
                                  };
                                  inp.click();
                                } else if (b.action === "extract-current-docs") {
                                  const f = [...attachedFiles]; setAttachedFiles([]);
                                  if (f.length > 0) triggerDocumentExtraction(f);
                                } else if (b.action === "open-file-picker") {
                                  const inp = document.createElement("input");
                                  inp.type = "file"; inp.multiple = true;
                                  inp.accept = ".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.md,.csv";
                                  inp.onchange = (e) => {
                                    const files = Array.from((e.target as HTMLInputElement).files || []);
                                    if (files.length > 0) triggerDocumentExtraction(files);
                                  };
                                  inp.click();
                                } else if (b.action === "scan-handwritten-camera") {
                                  const existingFiles = [...attachedFiles];
                                  const inp = document.createElement("input");
                                  inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment"; inp.multiple = true;
                                  inp.onchange = (e) => {
                                    const newFiles = Array.from((e.target as HTMLInputElement).files || []);
                                    const combined = [...existingFiles, ...newFiles].slice(0, 10);
                                    setAttachedFiles([]);
                                    if (combined.length > 0) triggerHandwrittenExtraction(combined);
                                  };
                                  inp.click();
                                } else if (b.action === "continue-to-form") {
                                  setCoverageInfo(null);
                                  inCoverageLoopRef.current = false;
                                  send("Skip straight to fillable forms — take me to the ACORD forms with the data we have.");
                                } else if (b.action.startsWith("/") || b.action.startsWith("http")) {
                                  navigate(b.action);
                                } else {
                                  send(b.label);
                                }
                              }}
                              className="opacity-0 animate-[slideUpFadeIn_0.4s_ease-out_forwards]"
                              style={{ animationDelay: `${0.5 + bIdx * 0.1}s` }}
                            >
                              {isDownloading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : downloadMatch || downloadPkgMatch ? (
                                <Download className="h-4 w-4 mr-2" />
                              ) : appMatch ? (
                                <ClipboardList className="h-4 w-4 mr-2" />
                              ) : (
                                <ClipboardList className="h-4 w-4 mr-2" />
                              )}
                              {b.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
              {/* Coverage tracker */}
              {coverageInfo && (
                <div className="animate-smooth-reveal">
                  <div className="rounded-xl border bg-card p-4 space-y-3 aura-glow-shadow">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">📊 Field Coverage</p>
                      <span className={`text-sm font-bold ${coverageInfo.percent >= 85 ? 'text-green-600' : coverageInfo.percent >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {coverageInfo.percent}%
                      </span>
                    </div>
                    <Progress value={coverageInfo.percent} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {coverageInfo.filled} of {coverageInfo.total} fields filled
                      {coverageInfo.percent >= 85
                        ? " — Great coverage! You can continue to fillable forms."
                        : ` — Target: 85%+ (${Math.max(0, Math.ceil(coverageInfo.total * 0.85) - coverageInfo.filled)} more fields needed)`}
                    </p>
                    {coverageInfo.percent >= 85 && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setCoverageInfo(null);
                          inCoverageLoopRef.current = false;
                          send("Skip straight to fillable forms — take me to the ACORD forms with the data we have.");
                        }}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Continue to Fillable Forms
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {/* Intent buttons in conversation view */}
              {showIntentButtons && !isLoading && (
                <div className="animate-smooth-reveal">
                  <div className="rounded-xl border bg-card p-5 space-y-3 aura-glow-shadow">
                    <p className="text-sm font-medium text-foreground">How would you like to get started?</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setShowIntentButtons(false);
                          if (attachedFiles.length > 0) {
                            setMessages(prev => [...prev, {
                              role: "assistant" as const,
                              content: `📂 You have **${attachedFiles.length} document${attachedFiles.length > 1 ? 's' : ''}** ready. Would you like to add more, or continue with extraction?`,
                              buttons: [
                                { label: "Add More Documents", action: "add-more-docs" },
                                { label: "Continue with Extraction", action: "extract-current-docs" },
                              ]
                            }]);
                          } else {
                            setMessages(prev => [...prev, {
                              role: "assistant" as const,
                              content: "📂 Upload your client documents — policies, decks, loss runs, or any supporting files. I'll extract and pre-fill your ACORD forms automatically.",
                              buttons: [
                                { label: "Upload Documents", action: "open-file-picker" },
                                { label: "Skip to Fillable Forms", action: "skip-to-form" },
                              ]
                            }]);
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Add Documents to Have AI Pre-fill ACORD Forms</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Upload policies, decks, or loss runs for automated extraction</p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowIntentButtons(false);
                          if (attachedFiles.length > 0) {
                            setMessages(prev => [...prev, {
                              role: "assistant" as const,
                              content: `📸 You have **${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''}** attached. Take a photo of handwritten notes to add to these, or continue with extraction from what you have.`,
                              buttons: [
                                { label: "📷 Take Photo of Notes", action: "scan-handwritten-camera" },
                                { label: "Continue with Extraction", action: "extract-current-docs" },
                              ]
                            }]);
                          } else {
                            setMessages(prev => [...prev, {
                              role: "assistant" as const,
                              content: "📸 Take a photo of your handwritten client notes for OCR scanning, or upload documents instead.",
                              buttons: [
                                { label: "📷 Take Photo of Notes", action: "scan-handwritten-camera" },
                                { label: "Upload Documents Instead", action: "open-file-picker" },
                                { label: "Skip to Fillable Forms", action: "skip-to-form" },
                              ]
                            }]);
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <Camera className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Scan Handwritten Client Notes</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Take a photo of handwritten notes — OCR with fuzzy matching fills ACORD fields</p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowIntentButtons(false);
                          if (attachedFiles.length > 0) {
                            const filesToExtract = [...attachedFiles];
                            setAttachedFiles([]);
                            startCoverageLoop(filesToExtract);
                          } else {
                            const formContext = requestedFormIds.length > 0 ? ` The agent has already specified these ACORD forms: ${requestedFormIds.map(id => id.replace("acord-", "ACORD ")).join(", ")}.` : "";
                            bypassIntentRef.current = true;
                            send(`I want to fill an ACORD form — please ask me a few short questions to gather the client information.${formContext}`);
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <BrainCircuit className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Use AI to Infer Customer Information</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Extracts data, uses AI inference, and asks questions until 85-90% coverage</p>
                        </div>
                      </button>
                      <button
                        onClick={async () => {
                          if (attachedFiles.length > 0) {
                            const filesToExtract = [...attachedFiles];
                            setAttachedFiles([]);
                            setShowIntentButtons(false);
                            triggerDocumentExtraction(filesToExtract);
                          } else {
                            if (!user) return;
                            setShowIntentButtons(false);
                            try {
                              const { data: sub, error } = await supabase
                                .from("business_submissions")
                                .insert({ user_id: user.id, status: "draft", company_name: "New Client" })
                                .select()
                                .single();
                              if (error || !sub) throw error || new Error("Failed to create submission");
                              setMessages(prev => [...prev, { role: "assistant" as const, content: `📝 Opening blank form workspace… [SUBMISSION_ID:${sub.id}]` }]);
                              setPendingSubmissionId(sub.id);
                            } catch (err) {
                              console.error("Failed to open blank form editor:", err);
                              toast({ title: "Error", description: "Could not open form editor. Please try again.", variant: "destructive" });
                            }
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <PenLine className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">I Want to Fill My Own Forms and Ask AI for Help Later</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{attachedFiles.length > 0 ? "Extract from your files, then edit forms manually" : "Start with blank ACORD forms and get assistance on demand"}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isLoading && displayedText === "" && (
                <div className="flex justify-start animate-page-enter">
                  <div className="bg-muted rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground" style={{ animation: 'subtlePulse 1.5s ease-in-out infinite' }}>Thinking…</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attached files preview — only when conversation active */}
        {!isEmpty && attachedFiles.length > 0 && (
          <div className="border-t bg-muted/30 px-4 py-2">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-md bg-card border px-2.5 py-1.5 text-xs">
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input area — only when conversation active */}
        {!isEmpty && (
          <div className="border-t bg-background p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 rounded-xl border bg-card p-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 0) setAttachedFiles(prev => [...prev, ...files].slice(0, 10)); e.target.value = ""; }} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment"; inp.multiple = true; inp.onchange = (e) => { const files = Array.from((e.target as HTMLInputElement).files || []); if (files.length > 0) triggerHandwrittenExtraction(files); }; inp.click(); }}
                  title="Scan handwritten notes"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your clients..."
                  rows={2}
                  className="flex-1 resize-none bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground min-h-[52px] max-h-40 py-2"
                />
                <Button
                  variant={voice.isListening ? "destructive" : "ghost"}
                  size="icon"
                  className={`shrink-0 h-9 w-9 transition-all ${voice.isListening ? "animate-pulse ring-2 ring-red-400/50" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={voice.toggle}
                  disabled={voice.isConnecting}
                  title={voice.isListening ? "Stop recording" : "Voice input"}
                >
                  {voice.isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => {
                    if (attachedFiles.length > 0 && !input.trim()) {
                      const fileNames = attachedFiles.map(f => f.name).join(", ");
                      setMessages(prev => [...prev, { role: "user" as const, content: `📎 Attached: ${fileNames}` }]);
                      setShowIntentButtons(true);
                    } else {
                      send(input);
                    }
                  }}
                  disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                  size="icon"
                  className="shrink-0 h-9 w-9"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {voice.isListening && voice.liveText ? (
                <p className="text-xs text-primary text-center mt-2 animate-pulse">
                  🎙️ "{voice.liveText}"
                </p>
              ) : voice.isListening ? (
                <p className="text-xs text-primary text-center mt-2 animate-pulse">
                  🎙️ Listening… speak now
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Drop files anywhere or click <Paperclip className="inline h-3 w-3" /> to attach
                  <span className="mx-1">·</span>
                  <button onClick={() => setShowFeatureSuggestion(true)} className="hover:text-primary transition-colors underline-offset-2 hover:underline">Suggest a feature</button>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submission Review Dialog */}
      <Dialog open={!!reviewSubmissionId} onOpenChange={(open) => { if (!open) setReviewSubmissionId(null); }}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
          <ScrollArea className="h-full p-6">
            {reviewSubmissionId && (
              <SubmissionReviewPanel submissionId={reviewSubmissionId} />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <FeatureSuggestionDialog open={showFeatureSuggestion} onOpenChange={setShowFeatureSuggestion} />
    </AppLayout>
  );
}
