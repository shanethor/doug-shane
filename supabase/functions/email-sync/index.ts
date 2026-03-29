import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeDecrypt, encryptToken } from "../_shared/token-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

// Insurance auto-tagging based on subject + body keywords
const TAG_RULES: { tag: string; keywords: RegExp }[] = [
  { tag: "coi_request", keywords: /\b(certificate of insurance|coi|cert\s*of\s*ins|proof of (insurance|coverage)|additional insured|certificate holder)\b/i },
  { tag: "claim", keywords: /\b(claim\s*(number|#|no|report|filed|notice)?|loss\s*report|incident\s*report|first notice of loss|fnol|damage\s*report)\b/i },
  { tag: "cancellation_notice", keywords: /\b(cancel(l?ation)?(\s*notice)?|non[\s-]?renew(al)?|intent to cancel|notice of cancel|policy\s*cancel)\b/i },
  { tag: "audit", keywords: /\b(premium\s*audit|audit\s*(request|notice|report|results|questionnaire)|payroll\s*audit|annual\s*audit)\b/i },
  { tag: "renewal", keywords: /\b(renewal|renew(ing)?|renewal\s*(notice|quote|proposal|offer|premium)|upcoming\s*expir(ation|y))\b/i },
  { tag: "billing", keywords: /\b(invoice|billing|payment\s*(due|reminder|notice)|past\s*due|premium\s*(payment|due|notice)|balance\s*due|statement|installment)\b/i },
  { tag: "endorsement", keywords: /\b(endorsement|policy\s*change|mid[\s-]?term\s*(change|modification)|add(ition(al)?)?[\s-]?(vehicle|driver|location|insured)|coverage\s*change)\b/i },
  { tag: "service_request", keywords: /\b(service\s*request|policy\s*copy|dec(laration)?\s*page|id\s*card|auto\s*id|proof\s*of|letter\s*of\s*experience)\b/i },
];

function classifyEmail(subject: string, bodyPreview: string): string[] {
  const text = `${subject} ${bodyPreview}`;
  const matched = TAG_RULES.filter(r => r.keywords.test(text)).map(r => r.tag);
  return matched;
}

async function refreshToken(connection: any, adminClient: any): Promise<string> {
  const plainRefreshToken = await safeDecrypt(connection.refresh_token);

  let tokenResp: Response;
  let tokenData: any;

  if (connection.provider === "gmail") {
    tokenResp = await fetch(GMAIL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: plainRefreshToken,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        grant_type: "refresh_token",
      }),
    });
    tokenData = await tokenResp.json();
  } else {
    tokenResp = await fetch(OUTLOOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: plainRefreshToken,
        client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
        client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
        grant_type: "refresh_token",
        scope: "openid email Mail.Read Mail.Send offline_access",
      }),
    });
    tokenData = await tokenResp.json();
  }

  if (!tokenResp.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(tokenData)}`);
  }

  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  const encAccessToken = await encryptToken(tokenData.access_token);
  const updatePayload: any = {
    access_token: encAccessToken,
    token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  if (tokenData.refresh_token) {
    updatePayload.refresh_token = await encryptToken(tokenData.refresh_token);
  }

  await adminClient
    .from("email_connections")
    .update(updatePayload)
    .eq("id", connection.id);

  return tokenData.access_token;
}

async function getValidToken(connection: any, adminClient: any): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at);
  if (expiresAt > new Date(Date.now() + 60000)) {
    return safeDecrypt(connection.access_token);
  }
  return refreshToken(connection, adminClient);
}

// ── Attachment helpers ──

interface AttachmentMeta {
  file_name: string;
  file_size: number;
  content_type: string;
  external_attachment_id: string;
}

/** Extract HTML body from Gmail MIME payload */
function extractGmailHtmlBody(payload: any): string | null {
  if (!payload) return null;

  // Direct HTML body
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Walk multipart
  if (payload.parts) {
    // Prefer text/html
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        const nested = extractGmailHtmlBody(part);
        if (nested) return nested;
      }
    }
    // Fallback to text/plain wrapped in <pre>
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        const text = decodeBase64Url(part.body.data);
        return `<pre style="white-space:pre-wrap;font-family:inherit">${text}</pre>`;
      }
    }
  }

  // Single-part text/plain
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    const text = decodeBase64Url(payload.body.data);
    return `<pre style="white-space:pre-wrap;font-family:inherit">${text}</pre>`;
  }

  return null;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function getGmailAttachments(
  msgId: string,
  payload: any,
  accessToken: string,
): Promise<AttachmentMeta[]> {
  const attachments: AttachmentMeta[] = [];

  function walkParts(parts: any[]) {
    for (const part of parts) {
      if (part.filename && part.filename.length > 0 && part.body) {
        attachments.push({
          file_name: part.filename,
          file_size: part.body.size || 0,
          content_type: part.mimeType || "application/octet-stream",
          external_attachment_id: part.body.attachmentId || `${msgId}:${part.partId}`,
        });
      }
      if (part.parts) walkParts(part.parts);
    }
  }

  if (payload?.parts) walkParts(payload.parts);
  return attachments;
}

async function getOutlookAttachments(
  msgId: string,
  accessToken: string,
): Promise<AttachmentMeta[]> {
  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${msgId}/attachments?$select=id,name,size,contentType,isInline&$filter=isInline eq false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.value || []).map((att: any) => ({
    file_name: att.name,
    file_size: att.size || 0,
    content_type: att.contentType || "application/octet-stream",
    external_attachment_id: att.id,
  }));
}

async function fetchGmailAttachmentData(
  msgId: string,
  attachmentId: string,
  accessToken: string,
): Promise<Uint8Array | null> {
  const resp = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.data) return null;
  // Gmail returns URL-safe base64
  const base64 = data.data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function fetchOutlookAttachmentData(
  msgId: string,
  attachmentId: string,
  accessToken: string,
): Promise<Uint8Array | null> {
  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${msgId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.contentBytes) return null;
  const binary = atob(data.contentBytes);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;
    const body = await req.json();
    const { action, provider, connection_id } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "sync") {
      // Get the connection — prefer connection_id for multi-account support
      let connQuery = adminClient
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (connection_id) {
        connQuery = connQuery.eq("id", connection_id);
      } else {
        connQuery = connQuery.eq("provider", provider || "gmail");
      }

      const { data: conn } = await connQuery.maybeSingle();

      if (!conn) {
        return new Response(JSON.stringify({ error: "No active email connection found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidToken(conn, adminClient);
      let emails: any[] = [];
      // Track attachment metadata per external_id
      const attachmentsByExtId: Record<string, AttachmentMeta[]> = {};

      if (conn.provider === "gmail") {
        // Fetch last 50 emails from Gmail
        const listResp = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const listData = await listResp.json();
        if (!listResp.ok) throw new Error(`Gmail list error: ${JSON.stringify(listData)}`);

        const messageIds = (listData.messages || []).map((m: any) => m.id);

        // Fetch each message with FULL format to get attachment info
        for (const msgId of messageIds.slice(0, 50)) {
          const msgResp = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const msg = await msgResp.json();
          if (!msgResp.ok) continue;

          const headers = msg.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

          const fromRaw = getHeader("From");
          const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);

          const tags = classifyEmail(getHeader("Subject"), msg.snippet || "");

          // Extract attachment metadata
          const atts = await getGmailAttachments(msgId, msg.payload, accessToken);
          if (atts.length > 0) {
            attachmentsByExtId[msgId] = atts;
          }

          // Extract full HTML body from MIME payload
          const htmlBody = extractGmailHtmlBody(msg.payload);

          emails.push({
            user_id: userId,
            connection_id: conn.id,
            external_id: msgId,
            from_address: fromMatch ? fromMatch[2] : fromRaw,
            from_name: fromMatch ? fromMatch[1].replace(/"/g, "").trim() : null,
            to_addresses: getHeader("To").split(",").map((e: string) => e.trim().replace(/.*<([^>]+)>.*/, "$1")),
            subject: getHeader("Subject"),
            body_html: htmlBody || null,
            body_preview: msg.snippet || "",
            is_read: !msg.labelIds?.includes("UNREAD"),
            received_at: new Date(parseInt(msg.internalDate)).toISOString(),
            has_attachments: atts.length > 0,
            ...(tags.length > 0 ? { tags } : {}),
          });
        }

      } else if (conn.provider === "outlook") {
        // Fetch last 50 emails from Microsoft Graph
        const mailResp = await fetch(
          "https://graph.microsoft.com/v1.0/me/messages?$top=50&$select=id,from,toRecipients,subject,body,bodyPreview,isRead,receivedDateTime,hasAttachments&$orderby=receivedDateTime desc",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const mailData = await mailResp.json();
        if (!mailResp.ok) throw new Error(`Outlook error: ${JSON.stringify(mailData)}`);

        for (const m of (mailData.value || [])) {
          const tags = classifyEmail(m.subject || "", m.bodyPreview || "");

          // If message has attachments, fetch their metadata
          if (m.hasAttachments) {
            const atts = await getOutlookAttachments(m.id, accessToken);
            if (atts.length > 0) {
              attachmentsByExtId[m.id] = atts;
            }
          }

          emails.push({
            user_id: userId,
            connection_id: conn.id,
            external_id: m.id,
            from_address: m.from?.emailAddress?.address || "",
            from_name: m.from?.emailAddress?.name || null,
            to_addresses: (m.toRecipients || []).map((r: any) => r.emailAddress?.address),
            subject: m.subject || "",
            body_preview: m.bodyPreview || "",
            is_read: m.isRead ?? false,
            received_at: m.receivedDateTime,
            has_attachments: !!m.hasAttachments,
            ...(tags.length > 0 ? { tags } : {}),
          });
        }
      }

      // Upsert emails — preserve local is_read state for existing emails
      if (emails.length > 0) {
        const externalIds = emails.map((e: any) => e.external_id);
        const { data: existingRows } = await adminClient
          .from("synced_emails")
          .select("external_id")
          .eq("connection_id", conn.id)
          .in("external_id", externalIds);
        const existingSet = new Set((existingRows || []).map((r: any) => r.external_id));

        const newEmails = emails.filter((e: any) => !existingSet.has(e.external_id));
        const existingEmails = emails.filter((e: any) => existingSet.has(e.external_id));

        if (newEmails.length > 0) {
          const { error: insertErr } = await adminClient
            .from("synced_emails")
            .upsert(newEmails, { onConflict: "connection_id,external_id", ignoreDuplicates: false });
          if (insertErr) console.error("Email insert error:", insertErr);
        }

        if (existingEmails.length > 0) {
          const updateData = existingEmails.map((e: any) => {
            const { is_read, ...rest } = e;
            return rest;
          });
          const { error: updateErr } = await adminClient
            .from("synced_emails")
            .upsert(updateData, { onConflict: "connection_id,external_id", ignoreDuplicates: false });
          if (updateErr) console.error("Email update error:", updateErr);
        }

        // Now persist attachment metadata for new emails
        const extIdsWithAttachments = Object.keys(attachmentsByExtId);
        if (extIdsWithAttachments.length > 0) {
          // Get the DB IDs for these emails
          const { data: emailRows } = await adminClient
            .from("synced_emails")
            .select("id, external_id")
            .eq("connection_id", conn.id)
            .in("external_id", extIdsWithAttachments);

          if (emailRows && emailRows.length > 0) {
            // Check which attachments already exist
            const emailDbIds = emailRows.map((r: any) => r.id);
            const { data: existingAtts } = await adminClient
              .from("email_attachments")
              .select("email_id, external_attachment_id")
              .in("email_id", emailDbIds);

            const existingAttSet = new Set(
              (existingAtts || []).map((a: any) => `${a.email_id}:${a.external_attachment_id}`)
            );

            const attRows: any[] = [];
            for (const row of emailRows) {
              const atts = attachmentsByExtId[row.external_id] || [];
              for (const att of atts) {
                const key = `${row.id}:${att.external_attachment_id}`;
                if (!existingAttSet.has(key)) {
                  attRows.push({
                    email_id: row.id,
                    user_id: userId,
                    file_name: att.file_name,
                    file_size: att.file_size,
                    content_type: att.content_type,
                    external_attachment_id: att.external_attachment_id,
                  });
                }
              }
            }

            if (attRows.length > 0) {
              const { error: attErr } = await adminClient
                .from("email_attachments")
                .insert(attRows);
              if (attErr) console.error("Attachment insert error:", attErr);
              else console.log(`[email-sync] Saved ${attRows.length} attachment records`);
            }
          }
        }
      }

      // ── Auto-assign clients (background) ──
      // Match unassigned emails' from/to addresses against leads' email field
      try {
        const { data: unassigned } = await adminClient
          .from("synced_emails")
          .select("id, from_address, to_addresses")
          .eq("user_id", userId)
          .is("client_id", null)
          .limit(200);

        if (unassigned && unassigned.length > 0) {
          // Get all leads with email for this user
          const { data: leads } = await adminClient
            .from("leads")
            .select("id, email, contact_name, account_name")
            .eq("owner_user_id", userId)
            .not("email", "is", null);

          if (leads && leads.length > 0) {
            // Build email-to-lead map (lowercase)
            const emailToLead: Record<string, string> = {};
            for (const lead of leads) {
              if (lead.email) {
                const emails = lead.email.split(",").map((e: string) => e.trim().toLowerCase());
                for (const em of emails) {
                  if (em) emailToLead[em] = lead.id;
                }
              }
            }

            // Match each unassigned email
            const updates: { id: string; client_id: string }[] = [];
            for (const email of unassigned) {
              const addresses = [
                email.from_address?.toLowerCase(),
                ...(email.to_addresses || []).map((a: string) => a.toLowerCase()),
              ].filter(Boolean);

              for (const addr of addresses) {
                if (emailToLead[addr]) {
                  updates.push({ id: email.id, client_id: emailToLead[addr] });
                  break;
                }
              }
            }

            // Batch update matched emails
            for (const upd of updates) {
              await adminClient
                .from("synced_emails")
                .update({
                  client_id: upd.client_id,
                  client_link_source: "auto",
                })
                .eq("id", upd.id);
            }

            if (updates.length > 0) {
              console.log(`[email-sync] Auto-assigned ${updates.length} emails to clients`);

              // Trigger ingestion for emails with attachments
              for (const upd of updates) {
                const { data: hasAtts } = await adminClient
                  .from("email_attachments")
                  .select("id")
                  .eq("email_id", upd.id)
                  .eq("user_id", userId)
                  .limit(1);

                if (hasAtts && hasAtts.length > 0) {
                  // Inline ingest: save attachments as client_documents
                  const { data: atts } = await adminClient
                    .from("email_attachments")
                    .select("id, file_name, file_size, content_type")
                    .eq("email_id", upd.id)
                    .eq("user_id", userId);

                  const { data: lead } = await adminClient
                    .from("leads")
                    .select("id, submission_id")
                    .eq("id", upd.client_id)
                    .maybeSingle();

                  const docExts = /\.(pdf|docx?|xlsx?|csv|png|jpe?g|tiff?)$/i;
                  for (const att of (atts || [])) {
                    const isDoc = docExts.test(att.file_name) ||
                      (att.content_type && (att.content_type.includes("pdf") || att.content_type.includes("document") || att.content_type.includes("image/")));
                    if (!isDoc) continue;

                    const { data: exists } = await adminClient
                      .from("client_documents")
                      .select("id")
                      .eq("user_id", userId)
                      .eq("lead_id", upd.client_id)
                      .eq("file_name", att.file_name)
                      .maybeSingle();

                    if (!exists) {
                      await adminClient.from("client_documents").insert({
                        user_id: userId,
                        lead_id: upd.client_id,
                        submission_id: lead?.submission_id || null,
                        file_name: att.file_name,
                        file_url: `email-attachment://${att.id}`,
                        file_size: att.file_size || 0,
                        document_type: "other",
                      });
                    }
                  }
                }
              }
            }
          }
        }

        // ── Intake email alias detection ──
        // Check if any synced email was addressed to a *-intake@buildingaura.site alias
        const { data: profile } = await adminClient
          .from("profiles")
          .select("intake_email_alias")
          .eq("user_id", userId)
          .maybeSingle();

        const intakeAlias = (profile as any)?.intake_email_alias?.toLowerCase();
        if (intakeAlias && unassigned && unassigned.length > 0) {
          const intakeEmails = unassigned.filter((e: any) => {
            const toAddrs = (e.to_addresses || []).map((a: string) => a.toLowerCase());
            return toAddrs.includes(intakeAlias);
          });

          for (const intakeEmail of intakeEmails) {
            const senderAddr = intakeEmail.from_address?.toLowerCase();
            if (!senderAddr) continue;

            // Check if we already have a lead for this sender
            const { data: existingLeads } = await adminClient
              .from("leads")
              .select("id")
              .eq("owner_user_id", userId)
              .ilike("email", `%${senderAddr}%`)
              .limit(1);

            let leadId: string;

            if (existingLeads && existingLeads.length > 0) {
              leadId = existingLeads[0].id;
            } else {
              // Auto-create a new lead from the sender
              const senderName = intakeEmail.from_address.split("@")[0].replace(/[._]/g, " ");
              const { data: newLead, error: leadErr } = await adminClient
                .from("leads")
                .insert({
                  owner_user_id: userId,
                  account_name: senderName.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
                  contact_name: senderName.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
                  email: senderAddr,
                  stage: "prospect",
                  line_type: "commercial",
                  lead_source: "intake_email",
                })
                .select("id")
                .single();

              if (leadErr || !newLead) {
                console.error("[email-sync] Failed to create lead from intake email:", leadErr);
                continue;
              }
              leadId = newLead.id;
              console.log(`[email-sync] Created new lead ${leadId} from intake email sender ${senderAddr}`);

              // Notify the producer
              await adminClient.from("notifications").insert({
                user_id: userId,
                type: "intake",
                title: "New client from intake email",
                body: `${senderAddr} sent documents to your intake email. A new prospect has been created.`,
                link: `/pipeline/${leadId}`,
              });
            }

            // Assign the email to this lead
            await adminClient
              .from("synced_emails")
              .update({ client_id: leadId, client_link_source: "intake_email" })
              .eq("id", intakeEmail.id);

            // Ingest attachments
            const { data: atts } = await adminClient
              .from("email_attachments")
              .select("id, file_name, file_size, content_type")
              .eq("email_id", intakeEmail.id)
              .eq("user_id", userId);

            const docExts = /\.(pdf|docx?|xlsx?|csv|png|jpe?g|tiff?)$/i;
            let ingested = 0;
            for (const att of (atts || [])) {
              const isDoc = docExts.test(att.file_name) ||
                (att.content_type && (att.content_type.includes("pdf") || att.content_type.includes("document") || att.content_type.includes("image/")));
              if (!isDoc) continue;

              const { data: exists } = await adminClient
                .from("client_documents")
                .select("id")
                .eq("user_id", userId)
                .eq("lead_id", leadId)
                .eq("file_name", att.file_name)
                .maybeSingle();

              if (!exists) {
                await adminClient.from("client_documents").insert({
                  user_id: userId,
                  lead_id: leadId,
                  file_name: att.file_name,
                  file_url: `email-attachment://${att.id}`,
                  file_size: att.file_size || 0,
                  document_type: "other",
                });
                ingested++;
              }
            }

            if (ingested > 0) {
              await adminClient.from("notifications").insert({
                user_id: userId,
                type: "document",
                title: `${ingested} document${ingested > 1 ? "s" : ""} from intake email`,
                body: `Auto-ingested from ${senderAddr}`,
                link: `/pipeline/${leadId}`,
              });
            }
          }
        }
      } catch (autoAssignErr) {
        console.error("[email-sync] Auto-assign error:", autoAssignErr);
        // Non-fatal — don't block sync response
      }

      return new Response(JSON.stringify({ synced: emails.length, provider: conn.provider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Ingest email attachments for a client ──
    if (action === "ingest-email") {
      const { email_id, client_id } = body;
      if (!email_id || !client_id) {
        return new Response(JSON.stringify({ error: "Missing email_id or client_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the email
      const { data: emailRow } = await adminClient
        .from("synced_emails")
        .select("id, external_id, connection_id, subject, from_name, from_address")
        .eq("id", email_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!emailRow) {
        return new Response(JSON.stringify({ error: "Email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get attachments for this email
      const { data: attachments } = await adminClient
        .from("email_attachments")
        .select("id, file_name, file_size, content_type, external_attachment_id")
        .eq("email_id", email_id)
        .eq("user_id", userId);

      if (!attachments || attachments.length === 0) {
        return new Response(JSON.stringify({ ingested: 0, message: "No attachments to ingest" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the lead to find submission_id
      const { data: lead } = await adminClient
        .from("leads")
        .select("id, submission_id")
        .eq("id", client_id)
        .maybeSingle();

      // Filter for document-type attachments (PDF, DOCX, images)
      const docExtensions = /\.(pdf|docx?|xlsx?|csv|png|jpe?g|tiff?)$/i;
      const relevantAtts = attachments.filter((a: any) =>
        docExtensions.test(a.file_name) ||
        (a.content_type && (
          a.content_type.includes("pdf") ||
          a.content_type.includes("document") ||
          a.content_type.includes("spreadsheet") ||
          a.content_type.includes("image/")
        ))
      );

      let ingested = 0;
      for (const att of relevantAtts) {
        // Check if already ingested
        const { data: existing } = await adminClient
          .from("client_documents")
          .select("id")
          .eq("user_id", userId)
          .eq("lead_id", client_id)
          .eq("file_name", att.file_name)
          .maybeSingle();

        if (existing) continue;

        // Save as client document (reference to email attachment - no file download needed yet)
        const { error: docErr } = await adminClient
          .from("client_documents")
          .insert({
            user_id: userId,
            lead_id: client_id,
            submission_id: lead?.submission_id || null,
            file_name: att.file_name,
            file_url: `email-attachment://${att.id}`,
            file_size: att.file_size || 0,
            document_type: "other",
          });

        if (!docErr) ingested++;
      }

      if (ingested > 0) {
        // Create a notification
        await adminClient.from("notifications").insert({
          user_id: userId,
          type: "document",
          title: `${ingested} document${ingested > 1 ? "s" : ""} from email`,
          body: `Auto-ingested from: ${emailRow.from_name || emailRow.from_address} — ${emailRow.subject || "(no subject)"}`,
          link: lead ? `/pipeline/${client_id}` : null,
        });
      }

      return new Response(JSON.stringify({ ingested, total_attachments: attachments.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Process email intake: resolve client, create submission, ingest, send intake link ──
    if (action === "process-email-intake") {
      const { email_id } = body;
      if (!email_id) {
        return new Response(JSON.stringify({ error: "Missing email_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1) Get the email
      const { data: emailRow } = await adminClient
        .from("synced_emails")
        .select("id, external_id, connection_id, subject, from_name, from_address, body_preview, client_id")
        .eq("id", email_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!emailRow) {
        return new Response(JSON.stringify({ error: "Email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const senderAddr = (emailRow.from_address || "").toLowerCase();
      const senderName = emailRow.from_name || senderAddr.split("@")[0].replace(/[._]/g, " ");
      let isNew = false;
      let leadId: string | null = emailRow.client_id || null;

      // 2) Resolve existing vs new client
      if (!leadId) {
        // Check leads by email
        const { data: existingLeads } = await adminClient
          .from("leads")
          .select("id, account_name")
          .eq("owner_user_id", userId)
          .ilike("email", `%${senderAddr}%`)
          .limit(1);

        if (existingLeads && existingLeads.length > 0) {
          leadId = existingLeads[0].id;
        } else {
          // Also try domain match: e.g. cfo@patrconstruction.com → Patrick Construction
          const senderDomain = senderAddr.split("@")[1]?.split(".")[0] || "";
          if (senderDomain && senderDomain.length > 3) {
            const { data: domainLeads } = await adminClient
              .from("leads")
              .select("id, account_name, email")
              .eq("owner_user_id", userId)
              .ilike("account_name", `%${senderDomain}%`)
              .limit(1);
            if (domainLeads && domainLeads.length > 0) {
              leadId = domainLeads[0].id;
            }
          }
        }

        if (!leadId) {
          // Create new lead
          isNew = true;
          const prettyName = senderName.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          const { data: newLead, error: leadErr } = await adminClient
            .from("leads")
            .insert({
              owner_user_id: userId,
              account_name: prettyName,
              contact_name: prettyName,
              email: senderAddr,
              stage: "prospect",
              line_type: "commercial",
              lead_source: "email_intake",
            })
            .select("id")
            .single();

          if (leadErr || !newLead) {
            console.error("[email-sync] Failed to create lead:", leadErr);
            return new Response(JSON.stringify({ error: "Failed to create client" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          leadId = newLead.id;
        }

        // Assign email to this lead
        await adminClient
          .from("synced_emails")
          .update({ client_id: leadId, client_link_source: "email_intake" })
          .eq("id", email_id);
      }

      // 3) Find or create a submission for this lead
      const { data: existingSub } = await adminClient
        .from("business_submissions")
        .select("id, status")
        .eq("lead_id", leadId)
        .in("status", ["new", "draft"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let submissionId: string;
      if (existingSub) {
        submissionId = existingSub.id;
      } else {
        const { data: newSub, error: subErr } = await adminClient
          .from("business_submissions")
          .insert({
            user_id: userId,
            lead_id: leadId,
            company_name: senderName,
            status: "new",
          })
          .select("id")
          .single();

        if (subErr || !newSub) {
          console.error("[email-sync] Failed to create submission:", subErr);
          return new Response(JSON.stringify({ error: "Failed to create submission" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        submissionId = newSub.id;

        // Link submission to lead
        await adminClient
          .from("leads")
          .update({ submission_id: submissionId })
          .eq("id", leadId);
      }

      // 4) Ingest attachments as client documents + extract data from PDFs/images
      const { data: atts } = await adminClient
        .from("email_attachments")
        .select("id, file_name, file_size, content_type, external_attachment_id")
        .eq("email_id", email_id)
        .eq("user_id", userId);

      // Get the email connection for downloading attachments
      const { data: emailRowFull } = await adminClient
        .from("synced_emails")
        .select("external_id, connection_id")
        .eq("id", email_id)
        .maybeSingle();

      let connForDownload: any = null;
      let accessTokenForDownload: string | null = null;
      if (emailRowFull) {
        const { data: c } = await adminClient.from("email_connections").select("*").eq("id", emailRowFull.connection_id).maybeSingle();
        if (c) {
          connForDownload = c;
          accessTokenForDownload = await getValidToken(c, adminClient);
        }
      }

      const docExts = /\.(pdf|docx?|xlsx?|csv|png|jpe?g|tiff?)$/i;
      let ingested = 0;
      const extractableFiles: { base64: string; mimeType: string; fileName: string }[] = [];

      for (const att of (atts || [])) {
        const isDoc = docExts.test(att.file_name) ||
          (att.content_type && (att.content_type.includes("pdf") || att.content_type.includes("document") || att.content_type.includes("image/")));
        if (!isDoc) continue;

        const { data: exists } = await adminClient
          .from("client_documents")
          .select("id")
          .eq("user_id", userId)
          .eq("lead_id", leadId)
          .eq("file_name", att.file_name)
          .maybeSingle();

        if (!exists) {
          await adminClient.from("client_documents").insert({
            user_id: userId,
            lead_id: leadId,
            submission_id: submissionId,
            file_name: att.file_name,
            file_url: `email-attachment://${att.id}`,
            file_size: att.file_size || 0,
            document_type: "other",
          });
          ingested++;
        }

        // Download the actual file for extraction (PDFs and images only)
        const isExtractable = att.content_type && (
          att.content_type.includes("pdf") || att.content_type.includes("image/")
        );
        if (isExtractable && connForDownload && accessTokenForDownload && emailRowFull) {
          try {
            let fileBytes: Uint8Array | null = null;
            if (connForDownload.provider === "gmail") {
              fileBytes = await fetchGmailAttachmentData(emailRowFull.external_id, att.external_attachment_id, accessTokenForDownload);
            } else if (connForDownload.provider === "outlook") {
              fileBytes = await fetchOutlookAttachmentData(emailRowFull.external_id, att.external_attachment_id, accessTokenForDownload);
            }
            if (fileBytes && fileBytes.length < 10 * 1024 * 1024) { // max 10MB per file
              let b64 = "";
              const chunkSize = 8192;
              for (let i = 0; i < fileBytes.length; i += chunkSize) {
                const chunk = fileBytes.subarray(i, i + chunkSize);
                b64 += String.fromCharCode(...chunk);
              }
              b64 = btoa(b64);
              extractableFiles.push({
                base64: b64,
                mimeType: att.content_type || "application/pdf",
                fileName: att.file_name,
              });
            }
          } catch (dlErr) {
            console.error(`[email-sync] Failed to download attachment ${att.file_name} for extraction:`, dlErr);
          }
        }
      }

      // 4b) Run AI extraction on downloaded files
      let extractedData: Record<string, any> = {};
      let detectedLineType: string | null = null;

      if (extractableFiles.length > 0) {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          try {
            console.log(`[email-sync] Extracting data from ${extractableFiles.length} file(s)...`);

            type ContentPart = { type: string; text?: string; image_url?: { url: string } };
            const userContent: ContentPart[] = [{
              type: "text",
              text: "Extract all policy information from the attached insurance documents. Determine if this is personal lines (auto, home, renters, flood, boat, umbrella) or commercial lines (general liability, workers comp, commercial auto, commercial property, umbrella, professional liability, cyber). Return a JSON object with: line_type ('personal' or 'commercial'), business_name (if commercial), and all extracted fields."
            }];

            for (const file of extractableFiles) {
              userContent.push({
                type: "image_url",
                image_url: { url: `data:${file.mimeType};base64,${file.base64}` },
              });
            }

            const extractionPrompt = `You are an insurance document data extraction expert. Extract ALL information from these documents and return a JSON object.

IMPORTANT: First determine if this is personal lines or commercial lines insurance.
- Personal lines: auto, homeowners, renters, flood, boat, umbrella, personal articles
- Commercial lines: general liability, workers comp, commercial auto, commercial property, BOP, professional liability, cyber, umbrella/excess

Return this JSON structure:
{
  "line_type": "personal" or "commercial",
  "business_name": "Business/Company name if commercial, empty if personal",
  "applicant_name": "Full name of the insured person",
  "applicant_email": "",
  "applicant_phone": "",
  "applicant_address": "Street address",
  "applicant_city": "",
  "applicant_state": "2-letter state code",
  "applicant_zip": "",
  "current_carrier": "Insurance company name",
  "naic_code": "",
  "policy_number": "",
  "policy_effective_date": "YYYY-MM-DD",
  "policy_expiration_date": "YYYY-MM-DD",
  "coverage_types_detected": ["auto", "homeowners", "general_liability", etc.],
  "drivers": [{ "name": "", "dob": "", "license_number": "", "license_state": "" }],
  "vehicles": [{ "year": "", "make": "", "model": "", "vin": "", "usage": "" }],
  "home": { "address": "", "year_built": "", "square_footage": "", "construction_type": "", "roof_type": "" },
  "auto_coverage": { "bi_limit": "", "pd_limit": "", "comp_deductible": "", "collision_deductible": "" },
  "commercial": {
    "business_type": "", "ein": "", "employee_count": "", "annual_revenue": "",
    "years_in_business": "", "industry": "", "dba": "",
    "coverage_lines": []
  }
}

Return ONLY valid JSON. No markdown fences, no explanation.`;

            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: extractionPrompt },
                  { role: "user", content: userContent },
                ],
              }),
            });

            if (aiResp.ok) {
              const aiResult = await aiResp.json();
              const rawText = aiResult.choices?.[0]?.message?.content || "{}";
              const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
              try {
                extractedData = JSON.parse(cleaned);
                detectedLineType = extractedData.line_type || null;
                console.log(`[email-sync] Extracted data — line_type: ${detectedLineType}, business: ${extractedData.business_name || "(none)"}`);
              } catch (parseErr) {
                console.error("[email-sync] AI extraction JSON parse error:", parseErr);
              }
            } else {
              console.error("[email-sync] AI extraction failed:", aiResp.status, await aiResp.text());
            }
          } catch (extractErr) {
            console.error("[email-sync] Extraction error:", extractErr);
          }
        }
      }

      // 4c) If commercial and we found a business name, update the lead
      if (detectedLineType === "commercial" && extractedData.business_name && isNew) {
        const bizName = extractedData.business_name;
        await adminClient.from("leads").update({
          account_name: bizName,
          line_type: "commercial",
          business_type: extractedData.commercial?.business_type || null,
        }).eq("id", leadId);
        console.log(`[email-sync] Updated lead ${leadId} account_name to "${bizName}"`);
      } else if (detectedLineType === "personal" && isNew) {
        await adminClient.from("leads").update({ line_type: "personal" }).eq("id", leadId);
      }

      // 5) Generate intake link with prefill data and line_type
      const { data: intakeLink, error: intakeErr } = await adminClient
        .from("intake_links")
        .insert({
          agent_id: userId,
          lead_id: leadId,
          submission_id: submissionId,
          customer_name: senderName,
          customer_email: senderAddr,
          prefill_data: Object.keys(extractedData).length > 0 ? extractedData : {},
          line_type: detectedLineType,
        } as any)
        .select("token")
        .single();

      let intakeUrl: string | null = null;
      if (intakeLink) {
        const siteUrl = Deno.env.get("SITE_URL") || "https://doug-shane.lovable.app";
        intakeUrl = `${siteUrl}/intake/${intakeLink.token}`;
      }

      // 6) Send intake email to the sender
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      let emailSent = false;
      if (RESEND_API_KEY && intakeUrl && senderAddr) {
        // Get agent profile
        let agentName = "Your insurance advisor";
        let agencyName = "AURA Risk Group";
        const { data: profile } = await adminClient
          .from("profiles")
          .select("full_name, agency_name, agency_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (profile?.full_name) agentName = profile.full_name;
        if (profile?.agency_id) {
          const { data: ag } = await adminClient.from("agencies").select("name").eq("id", profile.agency_id).maybeSingle();
          if (ag?.name) agencyName = ag.name;
        }
        if (!agencyName && profile?.agency_name) agencyName = profile.agency_name;

        const emailSubject = isNew
          ? "We received your insurance documents"
          : "Updated your insurance file – please review";

        const intro = isNew
          ? `We created a secure profile for you and pre-filled details from your documents.`
          : `We added your new documents to your existing account and updated your file.`;

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a2e; margin-bottom: 8px;">${emailSubject}</h2>
            <p style="color: #444; line-height: 1.6;">
              Hi ${senderName},
            </p>
            <p style="color: #444; line-height: 1.6;">
              ${intro}
            </p>
            <p style="color: #444; line-height: 1.6;">
              Please review and fill in any missing details here:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${intakeUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a2e; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Open Secure Intake Form
              </a>
            </div>
            <p style="color: #888; font-size: 12px;">
              If the button doesn't work, copy and paste this link:<br/>
              <a href="${intakeUrl}" style="color: #1a1a2e;">${intakeUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">– ${agentName} · ${agencyName} · Powered by AURA</p>
          </div>
        `;

        try {
          const resendResp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: `${agencyName} <noreply@buildingaura.site>`,
              to: [senderAddr],
              subject: emailSubject,
              html,
            }),
          });
          emailSent = resendResp.ok;
          if (!emailSent) {
            console.error("[email-sync] Failed to send intake email:", await resendResp.text());
          }
        } catch (sendErr) {
          console.error("[email-sync] Resend error:", sendErr);
        }
      }

      // 7) Notify the producer
      await adminClient.from("notifications").insert({
        user_id: userId,
        type: "intake",
        title: isNew ? "New client from email intake" : "Updated existing client from email",
        body: `${senderAddr} — ${ingested} doc${ingested !== 1 ? "s" : ""} ingested${emailSent ? ", intake link sent" : ""}`,
        link: `/pipeline/${leadId}`,
      });

      return new Response(JSON.stringify({
        success: true,
        is_new: isNew,
        lead_id: leadId,
        submission_id: submissionId,
        documents_ingested: ingested,
        intake_link_sent: emailSent,
        intake_url: intakeUrl,
        line_type_detected: detectedLineType,
        extracted_fields: Object.keys(extractedData).length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Download attachment action ──
    if (action === "download-attachment") {
      const { attachment_id } = body;
      if (!attachment_id) {
        return new Response(JSON.stringify({ error: "Missing attachment_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Look up the attachment record
      const { data: att } = await adminClient
        .from("email_attachments")
        .select("*, synced_emails!inner(external_id, connection_id)")
        .eq("id", attachment_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!att) {
        return new Response(JSON.stringify({ error: "Attachment not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the email connection for this email
      const emailRow = (att as any).synced_emails;
      const { data: conn } = await adminClient
        .from("email_connections")
        .select("*")
        .eq("id", emailRow.connection_id)
        .maybeSingle();

      if (!conn) {
        return new Response(JSON.stringify({ error: "Email connection not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidToken(conn, adminClient);
      let fileBytes: Uint8Array | null = null;

      if (conn.provider === "gmail") {
        fileBytes = await fetchGmailAttachmentData(
          emailRow.external_id,
          att.external_attachment_id,
          accessToken
        );
      } else if (conn.provider === "outlook") {
        fileBytes = await fetchOutlookAttachmentData(
          emailRow.external_id,
          att.external_attachment_id,
          accessToken
        );
      }

      if (!fileBytes) {
        return new Response(JSON.stringify({ error: "Failed to download attachment" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return as base64 with metadata
      let base64 = "";
      const chunkSize = 8192;
      for (let i = 0; i < fileBytes.length; i += chunkSize) {
        const chunk = fileBytes.subarray(i, i + chunkSize);
        base64 += String.fromCharCode(...chunk);
      }
      base64 = btoa(base64);

      return new Response(JSON.stringify({
        file_name: att.file_name,
        content_type: att.content_type,
        data: base64,
        size: fileBytes.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── fetch-body: on-demand full HTML body retrieval ──
    if (action === "fetch-body") {
      const { email_id } = body;
      if (!email_id) {
        return new Response(JSON.stringify({ error: "Missing email_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Look up the synced email row
      const { data: emailRow } = await adminClient
        .from("synced_emails")
        .select("id, external_id, connection_id, body_html")
        .eq("id", email_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!emailRow) {
        return new Response(JSON.stringify({ error: "Email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If body_html is already populated, return it
      if (emailRow.body_html) {
        return new Response(JSON.stringify({ body_html: emailRow.body_html }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the connection to fetch from provider
      const { data: conn } = await adminClient
        .from("email_connections")
        .select("*")
        .eq("id", emailRow.connection_id)
        .maybeSingle();

      if (!conn) {
        return new Response(JSON.stringify({ error: "Connection not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidToken(conn, adminClient);
      let htmlBody: string | null = null;

      if (conn.provider === "gmail") {
        // Fetch full message
        const msgResp = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailRow.external_id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (msgResp.ok) {
          const msg = await msgResp.json();
          htmlBody = extractGmailHtmlBody(msg.payload);
        }
      } else if (conn.provider === "outlook") {
        const msgResp = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages/${emailRow.external_id}?$select=body`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (msgResp.ok) {
          const msg = await msgResp.json();
          htmlBody = msg.body?.content || null;
        }
      }

      // Persist to DB so we don't fetch again
      if (htmlBody) {
        await adminClient
          .from("synced_emails")
          .update({ body_html: htmlBody })
          .eq("id", email_id);
      }

      return new Response(JSON.stringify({ body_html: htmlBody }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send") {
      const { to, subject, body_html, send_provider, connection_id } = body;

      if (!to || !subject) {
        return new Response(JSON.stringify({ error: "Missing to or subject" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get active connection – prefer explicit connection_id, fall back to provider match
      let connQuery = adminClient
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (connection_id) {
        connQuery = connQuery.eq("id", connection_id);
      } else {
        connQuery = connQuery.eq("provider", send_provider || provider || "gmail");
      }

      const { data: conn } = await connQuery.maybeSingle();

      if (!conn) {
        return new Response(JSON.stringify({ error: "No email account connected. Connect Gmail or Outlook in Settings." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidToken(conn, adminClient);
      const recipients = Array.isArray(to) ? to : [to];

      if (conn.provider === "gmail") {
        const toLine = recipients.join(", ");
        const rawEmail = [
          `To: ${toLine}`,
          `Subject: ${subject}`,
          "MIME-Version: 1.0",
          "Content-Type: text/html; charset=utf-8",
          "",
          body_html || "",
        ].join("\r\n");

        const encoder = new TextEncoder();
        const bytes = encoder.encode(rawEmail);
        const base64 = btoa(String.fromCharCode(...bytes))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const sendResp = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ raw: base64 }),
          }
        );

        if (!sendResp.ok) {
          const errBody = await sendResp.text();
          console.error("Gmail send error:", errBody);
          return new Response(JSON.stringify({ error: "Failed to send via Gmail" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = await sendResp.json();
        await adminClient.from("email_drafts").insert({
          user_id: userId,
          to_addresses: recipients,
          subject,
          body_html: body_html || "",
          status: "sent",
          sent_at: new Date().toISOString(),
          connection_id: conn.id,
        });
        return new Response(JSON.stringify({ success: true, id: result.id, sent_from: conn.email_address }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } else if (conn.provider === "outlook") {
        const message = {
          message: {
            subject,
            body: { contentType: "HTML", content: body_html || "" },
            toRecipients: recipients.map((email: string) => ({
              emailAddress: { address: email },
            })),
          },
          saveToSentItems: true,
        };

        const sendResp = await fetch(
          "https://graph.microsoft.com/v1.0/me/sendMail",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          }
        );

        if (!sendResp.ok) {
          const errBody = await sendResp.text();
          console.error("Outlook send error:", errBody);
          return new Response(JSON.stringify({ error: "Failed to send via Outlook" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await adminClient.from("email_drafts").insert({
          user_id: userId,
          to_addresses: recipients,
          subject,
          body_html: body_html || "",
          status: "sent",
          sent_at: new Date().toISOString(),
          connection_id: conn.id,
        });
        return new Response(JSON.stringify({ success: true, sent_from: conn.email_address }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("email-sync error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
