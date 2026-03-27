import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { toast } from "sonner";
import {
  Check, X, ChevronDown, ChevronUp, Loader2,
  User, Mail, Building2, Briefcase, Phone,
  Linkedin, Globe, MapPin, Plus,
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
}

interface Props {
  contact: DiscoveredContact;
  onUpdate: (id: string, updates: Partial<DiscoveredContact>) => void;
  onSave: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function InlineContactEditor({ contact, onUpdate, onSave, onDismiss }: Props) {
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

  async function saveToContactsWithSweep() {
    setSweeping(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not authenticated"); return; }

      const finalName = nameValue.trim() || displayName;

      // Cross-platform sweep: check if this contact already exists globally
      // Check by email across ALL users' canonical_persons
      const { data: existingByEmail } = await supabase
        .from("canonical_persons")
        .select("id, owner_user_id, display_name, primary_email, company")
        .eq("primary_email", contact.email_address)
        .limit(5);

      // Check by name within user's own contacts
      const { data: existingByName } = await supabase
        .from("canonical_persons")
        .select("id, display_name, primary_email, company")
        .eq("owner_user_id", user.id)
        .ilike("display_name", finalName)
        .limit(5);

      const crossUserMatches = (existingByEmail || []).filter(e => e.owner_user_id !== user.id);
      const ownMatches = [
        ...(existingByEmail || []).filter(e => e.owner_user_id === user.id),
        ...(existingByName || []).filter(e =>
          e.primary_email !== contact.email_address &&
          (existingByEmail || []).every(ex => ex.id !== e.id)
        ),
      ];

      if (ownMatches.length > 0) {
        // Merge into existing own record
        const target = ownMatches[0];
        const updates: any = {};
        if (!target.primary_email && contact.email_address) updates.primary_email = contact.email_address;
        if (fields.company && !target.company) updates.company = fields.company;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("canonical_persons")
            .update(updates)
            .eq("id", target.id);
        }

        // Update discovered contact status
        await supabase
          .from("email_discovered_contacts" as any)
          .update({ status: "saved_to_contacts", linked_canonical_id: target.id } as any)
          .eq("id", contact.id);

        const crossInfo = crossUserMatches.length > 0
          ? ` Connected to ${crossUserMatches.length} other user(s) on the platform.`
          : "";
        toast.success(`Merged with existing contact "${target.display_name}"${crossInfo}`);
      } else {
        // Create new canonical person
        const metadata: any = {
          source: "email_discovery",
          prospect_score: contact.prospect_score,
          hunter_verified: contact.hunter_verified,
          email_frequency: contact.email_frequency,
        };

        if (crossUserMatches.length > 0) {
          metadata.platform_connections = crossUserMatches.length;
          metadata.connected_user_ids = crossUserMatches.map(m => m.owner_user_id);
        }

        const { data: newPerson, error: insertErr } = await supabase.from("canonical_persons").insert({
          owner_user_id: user.id,
          display_name: finalName,
          primary_email: contact.email_address,
          company: fields.company || contact.hunter_company || null,
          title: fields.position || contact.hunter_position || null,
          linkedin_url: fields.linkedin || contact.hunter_linkedin_url || null,
          primary_phone: fields.phone || contact.hunter_phone || null,
          tier: (contact.prospect_score || 0) >= 80 ? "A" : (contact.prospect_score || 0) >= 60 ? "B" : "C",
          metadata,
        }).select("id").single();

        if (insertErr) throw insertErr;

        await supabase
          .from("email_discovered_contacts" as any)
          .update({ status: "saved_to_contacts", linked_canonical_id: newPerson?.id } as any)
          .eq("id", contact.id);

        const crossInfo = crossUserMatches.length > 0
          ? ` 🔗 Found on ${crossUserMatches.length} other user's network!`
          : "";
        toast.success(`Saved "${finalName}" to contacts${crossInfo}`);
      }

      onUpdate(contact.id, { status: "saved_to_contacts" } as any);
    } catch (err: any) {
      toast.error(err.message || "Failed to save contact");
    } finally {
      setSweeping(false);
    }
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

          {/* Action buttons */}
          <div className="flex gap-1.5 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={saveToContactsWithSweep}
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
