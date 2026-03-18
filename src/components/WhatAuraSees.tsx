import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Eye, Shield, Mail, Users, Linkedin, Phone, Calendar,
  MessageSquare, Lock, Database, Info, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VisibilitySetting {
  source: string;
  data_type: string;
  is_enabled: boolean;
}

const DATA_SOURCES = [
  {
    source: "gmail",
    label: "Gmail",
    icon: <Mail className="h-4 w-4" />,
    dataTypes: [
      { key: "contact_names", label: "Contact names & emails", description: "Names and email addresses from your contacts" },
      { key: "email_metadata", label: "Email metadata", description: "Sender, recipient, timestamps — never email content" },
      { key: "calendar_events", label: "Calendar attendees", description: "Meeting attendees and scheduling data" },
    ],
  },
  {
    source: "outlook",
    label: "Outlook / Office 365",
    icon: <Mail className="h-4 w-4" />,
    dataTypes: [
      { key: "contact_names", label: "Contact names & emails", description: "Names and email addresses from your Outlook contacts" },
      { key: "email_metadata", label: "Email metadata", description: "Sender, recipient, timestamps — never email content" },
      { key: "calendar_events", label: "Calendar attendees", description: "Meeting attendees and scheduling data" },
    ],
  },
  {
    source: "linkedin",
    label: "LinkedIn",
    icon: <Linkedin className="h-4 w-4" />,
    dataTypes: [
      { key: "connections", label: "Connection names & companies", description: "Names, companies, and titles from your CSV export" },
      { key: "profile_urls", label: "Profile URLs", description: "LinkedIn profile links for identity matching" },
    ],
  },
  {
    source: "phone",
    label: "Phone Contacts",
    icon: <Phone className="h-4 w-4" />,
    dataTypes: [
      { key: "contact_info", label: "Names, phones & emails", description: "Contact details imported from your phone" },
    ],
  },
];

const NEVER_STORED = [
  "Email body content or attachments",
  "SMS or call content or recordings",
  "Financial transaction details",
  "Passwords or authentication tokens shown to users",
  "Social media post content",
];

export function WhatAuraSees() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<VisibilitySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("data_visibility_settings")
      .select("source, data_type, is_enabled")
      .eq("user_id", user!.id);

    // Build complete settings with defaults
    const existing = new Map((data || []).map(s => [`${s.source}:${s.data_type}`, s.is_enabled]));
    const all: VisibilitySetting[] = [];
    for (const src of DATA_SOURCES) {
      for (const dt of src.dataTypes) {
        const key = `${src.source}:${dt.key}`;
        all.push({
          source: src.source,
          data_type: dt.key,
          is_enabled: existing.has(key) ? existing.get(key)! : true,
        });
      }
    }
    setSettings(all);
    setLoading(false);
  };

  const handleToggle = async (source: string, dataType: string, enabled: boolean) => {
    // Optimistic update
    setSettings(prev => prev.map(s =>
      s.source === source && s.data_type === dataType ? { ...s, is_enabled: enabled } : s
    ));

    const { error } = await supabase
      .from("data_visibility_settings")
      .upsert({
        user_id: user!.id,
        source,
        data_type: dataType,
        is_enabled: enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,source,data_type" });

    if (error) {
      toast.error("Failed to save setting");
      setSettings(prev => prev.map(s =>
        s.source === source && s.data_type === dataType ? { ...s, is_enabled: !enabled } : s
      ));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">What AURA Sees</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AURA only stores metadata (names, emails, timestamps) from your connected accounts.
                We <strong>never</strong> read email content, messages, or financial details.
                Toggle individual data types on/off below.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-source toggles */}
      {DATA_SOURCES.map((src) => (
        <Card key={src.source}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {src.icon}
              {src.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {src.dataTypes.map((dt) => {
              const setting = settings.find(s => s.source === src.source && s.data_type === dt.key);
              return (
                <div key={dt.key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{dt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{dt.description}</p>
                  </div>
                  <Switch
                    checked={setting?.is_enabled ?? true}
                    onCheckedChange={(v) => handleToggle(src.source, dt.key, v)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* What we NEVER store */}
      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <Lock className="h-4 w-4" />
            What AURA Never Stores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {NEVER_STORED.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3 text-destructive shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Compliance note */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          All data access is audit-logged. You can disconnect any source at any time to remove all associated data.
          Contact your administrator for a full data export or deletion request.
        </p>
      </div>
    </div>
  );
}
