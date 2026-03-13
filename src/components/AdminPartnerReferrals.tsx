import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, ExternalLink, Link2, Loader2, Plus, Users, DollarSign, FileCheck, Send } from "lucide-react";
import { toast } from "sonner";

const PARTNER_NAMES: Record<string, string> = {
  "josh-chernes": "Joshua Chernes",
  "michael-wengzn": "Michael Wengzn",
  "associated": "Associated Insurance Services",
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

export default function AdminPartnerReferrals() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);

  const partnerSlugs = Object.keys(PARTNER_NAMES);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoadingTokens(true);
    const { data: tokens } = await supabase
      .from("partner_tracker_tokens" as any)
      .select("*");

    const tokenMap: Record<string, string> = {};
    (tokens ?? []).forEach((t: any) => { tokenMap[t.partner_slug] = t.token; });

    const partnerList: PartnerData[] = partnerSlugs.map((slug) => ({
      slug,
      name: PARTNER_NAMES[slug],
      token: tokenMap[slug] || null,
      stats: null,
      loading: false,
    }));
    setPartners(partnerList);
    setLoadingTokens(false);

    // Load stats for partners that have tokens
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {partner.name}
              </CardTitle>
              <div className="flex items-center gap-2">
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
