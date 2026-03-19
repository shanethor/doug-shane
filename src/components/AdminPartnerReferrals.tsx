import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, ExternalLink, Link2, Loader2, Users, DollarSign, FileCheck, Send, UserCheck } from "lucide-react";
import { toast } from "sonner";

const PARTNER_NAMES: Record<string, string> = {
  "josh-chernes": "Joshua Chernes",
  "michael-wengzn": "Michael Wengzn",
  "associated": "Associated Insurance Services",
  "omit": "OMiT",
  "domisource": "DomiSource",
  "rayco": "Rayco Inc.",
  "prestige": "Prestige Abatement & Construction",
};

const STAGE_COLORS: Record<string, string> = {
  prospect: "bg-muted text-muted-foreground",
  quoting: "bg-primary/10 text-primary",
  presenting: "bg-accent/20 text-accent-foreground",
  lost: "bg-destructive/10 text-destructive",
};

type PartnerData = {
  slug: string;
  name: string;
  token: string | null;
  assignedAdvisorId: string | null;
  assignedAdvisorName: string | null;
  stats: {
    total_submissions: number;
    leads_created: number;
    policies_sold: number;
    total_premium_sold: number;
    total_revenue_sold: number;
    referrals?: any[];
  } | null;
  loading: boolean;
};

type AdvisorOption = { id: string; name: string; role: string };

export default function AdminPartnerReferrals() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [advisors, setAdvisors] = useState<AdvisorOption[]>([]);

  const partnerSlugs = Object.keys(PARTNER_NAMES);

  useEffect(() => {
    loadTokens();
    loadAdvisors();
  }, []);

  const loadAdvisors = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "advisor", "manager"] as any);

    if (!roles || roles.length === 0) return;

    const userIds = roles.map((r: any) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const roleMap: Record<string, string> = {};
    roles.forEach((r: any) => { roleMap[r.user_id] = r.role; });

    const list: AdvisorOption[] = (profiles ?? []).map((p: any) => ({
      id: p.user_id,
      name: p.full_name || "Unnamed",
      role: roleMap[p.user_id] || "advisor",
    }));
    setAdvisors(list.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const loadTokens = async () => {
    setLoadingTokens(true);
    const { data: tokens } = await supabase
      .from("partner_tracker_tokens" as any)
      .select("*");

    const { data: partnerLinks } = await supabase
      .from("property_partner_links" as any)
      .select("*");

    const tokenMap: Record<string, string> = {};
    (tokens ?? []).forEach((t: any) => { tokenMap[t.partner_slug] = t.token; });

    const linkMap: Record<string, any> = {};
    (partnerLinks ?? []).forEach((l: any) => { linkMap[l.partner_slug] = l; });

    // Get advisor names for linked partners
    const linkedAdvisorIds = Object.values(linkMap)
      .map((l: any) => l.linked_advisor_user_id)
      .filter(Boolean);

    let advisorNameMap: Record<string, string> = {};
    if (linkedAdvisorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", linkedAdvisorIds);
      (profiles ?? []).forEach((p: any) => { advisorNameMap[p.user_id] = p.full_name || "Unnamed"; });
    }

    const partnerList: PartnerData[] = partnerSlugs.map((slug) => ({
      slug,
      name: PARTNER_NAMES[slug],
      token: tokenMap[slug] || null,
      assignedAdvisorId: linkMap[slug]?.linked_advisor_user_id || null,
      assignedAdvisorName: linkMap[slug]?.linked_advisor_user_id
        ? advisorNameMap[linkMap[slug].linked_advisor_user_id] || null
        : null,
      stats: null,
      loading: false,
    }));
    setPartners(partnerList);
    setLoadingTokens(false);

    partnerList.forEach((p) => {
      if (p.token) loadPartnerStats(p.slug, p.token);
    });
  };

  const loadPartnerStats = async (slug: string, token: string) => {
    setPartners((prev) => prev.map((p) => p.slug === slug ? { ...p, loading: true } : p));
    const { data } = await supabase.functions.invoke("partner-stats", {
      body: { token, mode: "admin" },
    });
    setPartners((prev) =>
      prev.map((p) =>
        p.slug === slug
          ? { ...p, loading: false, stats: data?.error ? null : data }
          : p
      )
    );
  };

  const generateToken = async (slug: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("partner_tracker_tokens" as any)
      .insert({ partner_slug: slug, created_by: user.id } as any)
      .select("token")
      .single();

    if (error) {
      toast.error("Failed to generate token");
      return;
    }
    toast.success("Tracker link generated!");
    const newToken = (data as any).token;
    setPartners((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, token: newToken } : p))
    );
    loadPartnerStats(slug, newToken);
  };

  const assignAdvisor = async (slug: string, advisorId: string) => {
    // Check if a link already exists
    const { data: existing } = await supabase
      .from("property_partner_links" as any)
      .select("id")
      .eq("partner_slug", slug)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("property_partner_links" as any)
        .update({ linked_advisor_user_id: advisorId } as any)
        .eq("id", (existing as any).id);
    } else {
      await supabase
        .from("property_partner_links" as any)
        .insert({
          partner_slug: slug,
          linked_advisor_user_id: advisorId,
          property_user_id: advisorId,
        } as any);
    }

    const advisor = advisors.find((a) => a.id === advisorId);
    setPartners((prev) =>
      prev.map((p) =>
        p.slug === slug
          ? { ...p, assignedAdvisorId: advisorId, assignedAdvisorName: advisor?.name || null }
          : p
      )
    );
    toast.success(`${PARTNER_NAMES[slug]} assigned to ${advisor?.name || "advisor"}`);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/partner/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  if (loadingTokens) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {partners.map((partner) => (
        <Card key={partner.slug}>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {partner.name}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Advisor assignment */}
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select
                    value={partner.assignedAdvisorId || ""}
                    onValueChange={(v) => assignAdvisor(partner.slug, v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-[160px]">
                      <SelectValue placeholder="Assign advisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {advisors.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.name} <span className="text-muted-foreground ml-1">({a.role})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {partner.token ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => copyLink(partner.token!)}>
                          <Copy className="h-3 w-3" /> Copy Link
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy shareable tracker link for {partner.name}</TooltipContent>
                    </Tooltip>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => window.open(`/partner/${partner.token}`, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" /> Preview
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => generateToken(partner.slug)}>
                    <Link2 className="h-3 w-3" /> Generate Tracker Link
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {partner.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !partner.stats ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {partner.token ? "No referral data yet" : "Generate a tracker link to start tracking referrals"}
              </p>
            ) : (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <div className="rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Send className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Submissions</span>
                    </div>
                    <p className="text-lg font-bold">{partner.stats.total_submissions}</p>
                  </div>
                  <div className="rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Leads</span>
                    </div>
                    <p className="text-lg font-bold">{partner.stats.leads_created}</p>
                  </div>
                  <div className="rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FileCheck className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] text-muted-foreground">Sold</span>
                    </div>
                    <p className="text-lg font-bold">{partner.stats.policies_sold}</p>
                  </div>
                  <div className="rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <DollarSign className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] text-muted-foreground">Premium</span>
                    </div>
                    <p className="text-lg font-bold">{fmt(partner.stats.total_premium_sold)}</p>
                  </div>
                  <div className="rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <DollarSign className="h-3 w-3 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Revenue</span>
                    </div>
                    <p className="text-lg font-bold">{fmt(partner.stats.total_revenue_sold)}</p>
                  </div>
                </div>

                {/* Referral detail table */}
                {partner.stats.referrals && partner.stats.referrals.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Client</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Stage</TableHead>
                        <TableHead className="text-xs">Referred</TableHead>
                        <TableHead className="text-xs text-right">Premium</TableHead>
                        <TableHead className="text-xs text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partner.stats.referrals.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm font-medium">{r.account_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{r.line_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${STAGE_COLORS[r.stage] || "bg-muted"}`}>
                              {r.stage}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm text-right">{r.premium > 0 ? fmt(r.premium) : "—"}</TableCell>
                          <TableCell className="text-sm text-right">{r.revenue > 0 ? fmt(r.revenue) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
