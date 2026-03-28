import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check, X, ChevronDown, ChevronUp, Loader2,
  User, Mail, Building2, Briefcase, Phone,
  Linkedin, Globe, MapPin, Plus, Users,
} from "lucide-react";

interface DiscoveredContact {
  id: string;
  email_address: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  domain: string | null;
  hunter_verified: boolean | null;
  hunter_confidence: number | null;
  hunter_position: string | null;
  hunter_company: string | null;
  hunter_linkedin_url: string | null;
  hunter_phone: string | null;
  prospect_score: number | null;
  email_frequency: number;
  enrichment_status: string;
  status: string;
  first_seen_at: string;
  _type?: "person" | "company" | "filtered";
}

interface Props {
  contact: DiscoveredContact;
  onUpdate: (id: string, updates: Partial<DiscoveredContact>) => void;
  onSave: (id: string, entityType: "person" | "company") => void;
  onDismiss: (id: string) => void;
  /** If set, skip the person/company picker and use this value */
  defaultEntityType?: "person" | "company";
}

export default function InlineContactEditor({ contact, onUpdate, onSave, onDismiss, defaultEntityType }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(
    contact.display_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || ""
  );
  const [fields, setFields] = useState({
    company: contact.hunter_company || "",
    position: contact.hunter_position || "",
    phone: contact.hunter_phone || "",
    linkedin: contact.hunter_linkedin_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);

  const displayName = contact.display_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.email_address;

  async function saveNameInline() {
    if (!nameValue.trim()) return;
    await supabase
      .from("email_discovered_contacts" as any)
      .update({ display_name: nameValue.trim() } as any)
      .eq("id", contact.id);
    onUpdate(contact.id, { display_name: nameValue.trim() } as any);
    setEditingName(false);
    toast.success("Name updated");
  }

  async function saveFields() {
    setSaving(true);
    try {
      const updates: any = {};
      if (fields.company) updates.hunter_company = fields.company;
      if (fields.position) updates.hunter_position = fields.position;
      if (fields.phone) updates.hunter_phone = fields.phone;
      if (fields.linkedin) updates.hunter_linkedin_url = fields.linkedin;

      await supabase
        .from("email_discovered_contacts" as any)
        .update(updates)
        .eq("id", contact.id);

      onUpdate(contact.id, updates);
      toast.success("Contact details saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleSaveClick() {
    // If we already know the type from the tab context, skip picker
    if (defaultEntityType) {
      doSave(defaultEntityType);
      return;
    }
    // Otherwise show the entity picker
    setShowEntityPicker(true);
  }

  function doSave(entityType: "person" | "company") {
    setShowEntityPicker(false);
    onSave(contact.id, entityType);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold">
            {(displayName).charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  className="h-7 text-sm w-40"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Enter") saveNameInline();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveNameInline}>
                  <Check className="h-3 w-3 text-green-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingName(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="font-semibold text-sm hover:text-primary transition-colors cursor-text"
                title="Click to rename"
              >
                {displayName}
              </button>
            )}
            {contact.status === "discovered" && <Badge variant="secondary" className="text-[10px]">NEW</Badge>}
            {contact.prospect_score && <Badge variant="outline" className="text-[10px]">Score: {contact.prospect_score}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{contact.email_address}</p>
          {(contact.hunter_position || contact.hunter_company) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {contact.hunter_position}{contact.hunter_position && contact.hunter_company ? ", " : ""}{contact.hunter_company}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            {contact.hunter_verified !== null && (
              <span className={contact.hunter_verified ? "text-green-500" : "text-yellow-500"}>
                {contact.hunter_verified ? "✓ Verified" : "⚠ Unverified"}
              </span>
            )}
            <span>Seen in {contact.email_frequency} thread{contact.email_frequency !== 1 ? "s" : ""}</span>
          </div>

          {/* Entity type picker */}
          {showEntityPicker && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg border border-primary/30 bg-primary/5 animate-in fade-in-0 slide-in-from-top-1 duration-150">
              <span className="text-xs text-muted-foreground mr-1">Save as:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/10"
                onClick={() => doSave("person")}
              >
                <User className="h-3 w-3" /> Person
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/10"
                onClick={() => doSave("company")}
              >
                <Building2 className="h-3 w-3" /> Company
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setShowEntityPicker(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Action buttons */}
          {!showEntityPicker && (
            <div className="flex gap-1.5 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleSaveClick}
                disabled={sweeping || contact.status === "saved_to_contacts"}
              >
                {sweeping ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                {contact.status === "saved_to_contacts" ? "Saved" : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Edit Details
              </Button>
              {contact.hunter_linkedin_url && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(contact.hunter_linkedin_url!, "_blank")}>
                  <Linkedin className="h-3 w-3 mr-1" /> Profile
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onDismiss(contact.id)}>
                <X className="h-3 w-3 mr-1" /> Dismiss
              </Button>
            </div>
          )}

          {/* Expanded inline editor */}
          {expanded && (
            <div className="mt-3 p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground flex items-center gap-1"><Building2 className="h-2.5 w-2.5" /> Company</label>
                  <Input
                    value={fields.company}
                    onChange={e => setFields(f => ({ ...f, company: e.target.value }))}
                    placeholder="Company name"
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground flex items-center gap-1"><Briefcase className="h-2.5 w-2.5" /> Position</label>
                  <Input
                    value={fields.position}
                    onChange={e => setFields(f => ({ ...f, position: e.target.value }))}
                    placeholder="Job title"
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> Phone</label>
                  <Input
                    value={fields.phone}
                    onChange={e => setFields(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone number"
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground flex items-center gap-1"><Linkedin className="h-2.5 w-2.5" /> LinkedIn</label>
                  <Input
                    value={fields.linkedin}
                    onChange={e => setFields(f => ({ ...f, linkedin: e.target.value }))}
                    placeholder="LinkedIn URL"
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-7 text-xs" onClick={saveFields} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                  Save Details
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
