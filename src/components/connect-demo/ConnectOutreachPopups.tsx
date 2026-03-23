import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Phone, Calendar, Loader2, Sparkles, Copy, Check, Send } from "lucide-react";
import { toast } from "sonner";

interface OutreachPopupProps {
  type: "email" | "text" | "call" | "meet" | null;
  onClose: () => void;
  connection: string;
  target: string;
}

export function ConnectOutreachPopup({ type, onClose, connection, target }: OutreachPopupProps) {
  if (!type) return null;

  return (
    <Dialog open={!!type} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg border-0 p-0 overflow-hidden"
        style={{ background: "hsl(240 8% 8%)", color: "white" }}
      >
        {type === "email" && <EmailPanel connection={connection} target={target} onClose={onClose} />}
        {type === "text" && <TextPanel connection={connection} target={target} onClose={onClose} />}
        {type === "call" && <CallPanel connection={connection} target={target} onClose={onClose} />}
        {type === "meet" && <MeetPanel connection={connection} target={target} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Draft Email ─── */
function EmailPanel({ connection, target, onClose }: { connection: string; target: string; onClose: () => void }) {
  const [generating, setGenerating] = useState(true);
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSubject(`Intro request — ${target}`);
      setDraft(
        `Hi ${connection},\n\nHope you're doing well! I noticed you're connected with ${target} and I'd love an introduction if you're comfortable.\n\nI'm looking to discuss potential insurance needs for their business and I think there could be a great fit. Would you be open to making a warm intro?\n\nHappy to share more context if helpful. Thanks so much!\n\nBest regards`
      );
      setGenerating(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, [connection, target]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
        <Mail className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
        <h3 className="text-sm font-semibold">Draft Email to {connection}</h3>
        <Badge className="ml-auto text-[10px]" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)", border: "none" }}>
          <Sparkles className="h-3 w-3 mr-1" /> AI Generated
        </Badge>
      </div>
      {generating ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(140 12% 58%)" }} />
          <p className="text-xs" style={{ color: "hsl(240 5% 50%)" }}>Generating personalized intro email…</p>
        </div>
      ) : sent ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
          <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: "hsl(140 50% 50% / 0.15)" }}>
            <Check className="h-7 w-7" style={{ color: "hsl(140 50% 50%)" }} />
          </div>
          <p className="text-sm font-semibold text-white">Email sent!</p>
          <p className="text-xs" style={{ color: "hsl(240 5% 50%)" }}>Your intro request has been sent to {connection}</p>
        </div>
      ) : (
        <div className="p-5 space-y-3 animate-fade-in">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(240 5% 50%)" }}>To</label>
            <Input value={`${connection}`} readOnly className="h-9 text-sm" style={{ background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "white" }} />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(240 5% 50%)" }}>Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm" style={{ background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "white" }} />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(240 5% 50%)" }}>Message</label>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={7} className="text-sm resize-none" style={{ background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "white" }} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => { setSent(true); setTimeout(onClose, 2000); }} className="flex-1 h-9 text-sm font-semibold" style={{ background: "hsl(140 12% 42%)", color: "white" }}>
              <Send className="h-4 w-4 mr-1.5" /> Send Email
            </Button>
            <Button variant="outline" onClick={() => { toast.success("Regenerating…"); setGenerating(true); setTimeout(() => setGenerating(false), 1200); }} className="h-9 text-sm" style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Send Text ─── */
function TextPanel({ connection, target, onClose }: { connection: string; target: string; onClose: () => void }) {
  const [message, setMessage] = useState(`Hey ${connection}! Quick question — would you be open to introducing me to ${target}? I think there's a great fit for their insurance needs. Happy to share more context!`);
  const [sent, setSent] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
        <MessageSquare className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
        <h3 className="text-sm font-semibold">Text {connection}</h3>
      </div>
      {sent ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
          <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: "hsl(140 50% 50% / 0.15)" }}>
            <Check className="h-7 w-7" style={{ color: "hsl(140 50% 50%)" }} />
          </div>
          <p className="text-sm font-semibold text-white">Text sent!</p>
          <p className="text-xs" style={{ color: "hsl(240 5% 50%)" }}>Message delivered to {connection}</p>
        </div>
      ) : (
        <div className="p-5 space-y-3 animate-fade-in">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(240 5% 50%)" }}>To</label>
            <Input value={`${connection} — (555) 867-5309`} readOnly className="h-9 text-sm" style={{ background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "white" }} />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(240 5% 50%)" }}>Message</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="text-sm resize-none" style={{ background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "white" }} />
            <p className="text-[10px] mt-1 text-right" style={{ color: "hsl(240 5% 40%)" }}>{message.length}/160 characters</p>
          </div>
          <Button onClick={() => { setSent(true); setTimeout(onClose, 2000); }} className="w-full h-9 text-sm font-semibold" style={{ background: "hsl(140 12% 42%)", color: "white" }}>
            <Send className="h-4 w-4 mr-1.5" /> Send Text
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Phone Call ─── */
function CallPanel({ connection, target, onClose }: { connection: string; target: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const script = `Hi ${connection}, this is [Your Name]. I hope I'm not catching you at a bad time!\n\nI wanted to reach out because I noticed you're connected with ${target}. I've been looking into their business and I think there could be a great opportunity to help them with their insurance coverage.\n\nWould you be comfortable making a quick introduction? I'd really appreciate it.\n\n[If yes]: That's great — I can send you a quick email with context you can forward along.\n[If maybe]: No pressure at all. Happy to share more about what I'm thinking first.`;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
        <Phone className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
        <h3 className="text-sm font-semibold">Call Script — {connection}</h3>
        <Badge className="ml-auto text-[10px]" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)", border: "none" }}>
          <Sparkles className="h-3 w-3 mr-1" /> AI Script
        </Badge>
      </div>
      <div className="p-5 space-y-4 animate-fade-in">
        <div className="p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed" style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 14%)", color: "hsl(240 5% 70%)" }}>
          {script}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(script.replace(/\n/g, " "));
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            variant="outline"
            className="flex-1 h-9 text-sm"
            style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }}
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? "Copied!" : "Copy Script"}
          </Button>
          <Button
            onClick={() => {
              toast.success("Calling…", { description: `Initiating call to ${connection}` });
              setTimeout(onClose, 1500);
            }}
            className="flex-1 h-9 text-sm font-semibold"
            style={{ background: "hsl(140 12% 42%)", color: "white" }}
          >
            <Phone className="h-4 w-4 mr-1.5" /> Start Call
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Schedule Meet ─── */
function MeetPanel({ connection, target, onClose }: { connection: string; target: string; onClose: () => void }) {
  const [meetType, setMeetType] = useState<"coffee" | "virtual" | "lunch">("coffee");
  const [note, setNote] = useState(`Quick intro chat about connecting with ${target}`);
  const [scheduled, setScheduled] = useState(false);

  const slots = [
    { day: "Tomorrow", time: "10:00 AM" },
    { day: "Tomorrow", time: "2:30 PM" },
    { day: "Thursday", time: "9:00 AM" },
    { day: "Friday", time: "11:00 AM" },
  ];
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid hsl(240 6% 14%)" }}>
        <Calendar className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
        <h3 className="text-sm font-semibold">Schedule with {connection}</h3>
      </div>
      {scheduled ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
          <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: "hsl(140 50% 50% / 0.15)" }}>
            <Check className="h-7 w-7" style={{ color: "hsl(140 50% 50%)" }} />
          </div>
          <p className="text-sm font-semibold text-white">Meeting scheduled!</p>
          <p className="text-xs" style={{ color: "hsl(240 5% 50%)" }}>
            {slots[selectedSlot!].day} at {slots[selectedSlot!].time} with {connection}
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-4 animate-fade-in">
          <div>
            <label className="text-[11px] font-medium mb-2 block" style={{ color: "hsl(240 5% 50%)" }}>Meeting type</label>
            <div className="flex gap-2">
              {(["coffee", "virtual", "lunch"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMeetType(t)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all"
                  style={{
                    background: meetType === t ? "hsl(140 12% 42% / 0.2)" : "hsl(240 6% 7%)",
                    border: `1px solid ${meetType === t ? "hsl(140 12% 42% / 0.5)" : "hsl(240 6% 16%)"}`,
                    color: meetType === t ? "hsl(140 12% 65%)" : "hsl(240 5% 55%)",
                  }}
                >
                  {t === "coffee" ? "☕ Coffee" : t === "virtual" ? "💻 Virtual" : "🍽️ Lunch"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium mb-2 block" style={{ color: "hsl(240 5% 50%)" }}>Available slots</label>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(i)}
                  className="p-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: selectedSlot === i ? "hsl(140 12% 42% / 0.15)" : "hsl(240 6% 7%)",
                    border: `1px solid ${selectedSlot === i ? "hsl(140 12% 42% / 0.5)" : "hsl(240 6% 16%)"}`,
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: selectedSlot === i ? "hsl(140 12% 65%)" : "white" }}>{s.day}</p>
                  <p className="text-[11px]" style={{ color: "hsl(240 5% 50%)" }}>{s.time}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(240 5% 50%)" }}>Note</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-9 text-sm" style={{ background: "hsl(240 6% 7%)", borderColor: "hsl(240 6% 16%)", color: "white" }} />
          </div>

          <Button
            onClick={() => { if (selectedSlot !== null) { setScheduled(true); setTimeout(onClose, 2200); } else { toast.error("Please select a time slot"); } }}
            disabled={selectedSlot === null}
            className="w-full h-9 text-sm font-semibold"
            style={{ background: selectedSlot !== null ? "hsl(140 12% 42%)" : "hsl(240 6% 16%)", color: "white" }}
          >
            <Calendar className="h-4 w-4 mr-1.5" /> Schedule Meeting
          </Button>
        </div>
      )}
    </div>
  );
}
