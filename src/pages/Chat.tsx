import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import SubmissionReviewPanel from "@/components/SubmissionReviewPanel";
import FormFillingView from "@/components/FormFillingView";
import ExtractionSummary from "@/components/ExtractionSummary";
import { Send, FileUp, ClipboardList, Search, Loader2, Paperclip, X, Download, Mic, MicOff, Globe, Lightbulb, ChevronDown, ChevronUp, FileText, BrainCircuit, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ACORD_FORM_LIST } from "@/lib/acord-forms";
import { buildAutofilledData, buildAutofilledDataWithAI } from "@/lib/acord-autofill";
import { generateAcordPdfAsync } from "@/lib/pdf-generator";
import { generateSubmissionPackage } from "@/lib/submission-package";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTrainingMode } from "@/hooks/useTrainingMode";

type ButtonMarker = { label: string; action: string };
type Msg = { role: "user" | "assistant"; content: string; fields?: FieldBubble[]; buttons?: ButtonMarker[] };
type FieldBubble = { label: string; placeholder: string; key: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

const SUGGESTIONS = [
  { icon: FileUp, label: "Submit a new client", message: "I want to submit a new client for coverage." },
  { icon: Globe, label: "Scrape a company website", message: "I have a client's website URL — can you pull their business info from it?" },
  { icon: ClipboardList, label: "Fill an ACORD form", message: "Help me fill out an ACORD form for a client." },
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
  return text.replace(/\[FIELD:[^\]]+\]/g, "").replace(/\[BUTTON:[^\]]+\]/g, "").replace(/\[SUBMISSION_ID:[^\]]+\]/g, "").trim();
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
  if (/commercial\s*auto|business\s*auto|auto\s*section/i.test(lower)) found.add("acord-127");
  if (/general\s*liability|cgl\b|gl\s*section/i.test(lower)) found.add("acord-126");
  if (/commercial\s*property|property\s*section|building\s*coverage/i.test(lower)) found.add("acord-140");
  if (/umbrella|excess\s*liability/i.test(lower)) found.add("acord-131");
  
  // Fallback: check form names from the list
  for (const f of ACORD_FORM_LIST) {
    if (lower.includes(f.name.toLowerCase())) found.add(f.id);
  }

  return Array.from(found);
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
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(null);
  const [activeFormId, setActiveFormId] = useState<string | undefined>(undefined);
  const [requestedFormIds, setRequestedFormIds] = useState<string[]>([]);
  const [submittingFields, setSubmittingFields] = useState(false);
  const skipAutoDetectRef = useRef(false);

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + " " + text : text));
  }, []);
  const handleVoiceAutoSend = useCallback((text: string) => {
    send(text);
  }, []);
  const voice = useVoiceInput(handleVoiceTranscript, handleVoiceAutoSend);

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

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 10);
    setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 10));
  };

  const removeFile = (idx: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const isFormFillingIntent = (text: string) => {
    const t = text.trim().toLowerCase();
    // Any message that mentions forms, ACORD, new client, or submission intent
    return /\bform\b|\bacord\b|\bsubmit|\bnew\s*client|\binsurance\b|\bcoverage\b|\bapplication\b/.test(t)
      || /need\s*(a|an|to|help)|\bstart\b|\bget\s*start|\bfill\b|\bcreate\b/.test(t);
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // In non-training mode, intercept form-filling intent and show the 3 intent buttons
    // Only intercept if this is a short/vague opener (not a detailed mid-conversation follow-up)
    const isShortVagueOpener = text.trim().split(/\s+/).length <= 8;
    if (!trainingMode && isFormFillingIntent(text) && isShortVagueOpener && !showIntentButtons) {
      const userMsg: Msg = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setAttachedFiles([]);
      setShowIntentButtons(true);
      return;
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
      
      if (isIntakeFields && lastUserMsg && !skipAutoDetectRef.current) {
        const userText = lastUserMsg.content.toLowerCase();
        const wantsSkip = /skip|straight to form|go to form|jump to form|skip intake|no intake|skip questions/i.test(userText);
        const extracted = tryExtractIntakeFromMessage(lastUserMsg.content);
        
        if (wantsSkip || extracted) {
          skipAutoDetectRef.current = true;
          // Auto-fill whatever we can extract (may be empty if skipping)
          const autoFilled = extracted ? autoFillFieldsFromExtracted(fields, extracted) : {};
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
      const detectedForms = detectRequestedForms(allText);
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

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragIn = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragOut = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const isEmpty = messages.length === 0;

  if (activeSubmissionId) {
    return (
      <AppLayout>
        <div className="animate-slide-in-right">
          <FormFillingView
            submissionId={activeSubmissionId}
            initialMessages={messages.map((m) => ({ role: m.role, content: m.content }))}
            initialFormId={activeFormId}
            onBack={() => setActiveSubmissionId(null)}
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
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl m-4 pointer-events-none">
            <div className="text-center space-y-2">
              <FileUp className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm font-medium text-primary">Drop files here</p>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-full gap-6 px-4 py-12">
              <div className="text-center space-y-3">
                <h1 className="text-4xl tracking-tight aura-gradient-text">
                  What are we working on?
                </h1>
                <p className="text-muted-foreground text-sm max-w-md">
                  I'm <span className="font-semibold text-foreground">AURA</span> — your AI co-pilot for submissions, ACORD forms, and coverage reviews.
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
                  <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleFiles(e.target.files)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
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
                    onClick={() => send(input)}
                    disabled={!input.trim() || isLoading}
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      // "Fill an ACORD form" with no documents → show intent buttons in non-training mode
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
              </div>

              {/* Intent buttons — shown in non-training mode when user picks "Fill ACORD form" */}
              {!trainingMode && showIntentButtons && (
                <div className="w-full max-w-2xl animate-smooth-reveal">
                  <div className="rounded-xl border bg-card p-5 space-y-3 aura-glow-shadow">
                    <p className="text-sm font-medium text-foreground">How would you like to get started?</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => { setShowIntentButtons(false); fileInputRef.current?.click(); }}
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
                        onClick={() => { setShowIntentButtons(false); send("I want to fill an ACORD form — please ask me a few short questions to gather the client information."); }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <BrainCircuit className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Use AI to Infer Customer Information After a Few Short Questions</p>
                          <p className="text-xs text-muted-foreground mt-0.5">AURA will guide you through the key fields one by one</p>
                        </div>
                      </button>
                      <button
                        onClick={() => openBlankFormEditor()}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <PenLine className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">I Want to Fill My Own Forms and Ask AI for Help Later</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Start with blank ACORD forms and get assistance on demand</p>
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
                                  // User wants to skip straight to fillable forms after uploading a document
                                  send("Skip straight to fillable forms — just extract what you can from the uploaded document and take me to the ACORD forms.");
                                } else if (b.action === "ai-questions") {
                                  // User wants AI to ask follow-up questions
                                  send("Yes, please ask me follow-up questions to fill any gaps from the uploaded document.");
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
              {/* Intent buttons in conversation view (non-training mode) */}
              {!trainingMode && showIntentButtons && !isLoading && (
                <div className="animate-smooth-reveal">
                  <div className="rounded-xl border bg-card p-5 space-y-3 aura-glow-shadow">
                    <p className="text-sm font-medium text-foreground">How would you like to get started?</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => { setShowIntentButtons(false); fileInputRef.current?.click(); }}
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
                        onClick={() => { setShowIntentButtons(false); send("I want to fill an ACORD form — please ask me a few short questions to gather the client information."); }}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <BrainCircuit className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Use AI to Infer Customer Information After a Few Short Questions</p>
                          <p className="text-xs text-muted-foreground mt-0.5">AURA will guide you through the key fields one by one</p>
                        </div>
                      </button>
                      <button
                        onClick={() => openBlankFormEditor()}
                        className="flex items-center gap-3 rounded-lg border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <PenLine className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">I Want to Fill My Own Forms and Ask AI for Help Later</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Start with blank ACORD forms and get assistance on demand</p>
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
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleFiles(e.target.files)} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
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
                  onClick={() => send(input)}
                  disabled={!input.trim() || isLoading}
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
    </AppLayout>
  );
}
