import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Eye, ThumbsUp, MessageSquare, Share2, TrendingUp, Users, Info, ShieldCheck, Activity, Loader2, Link2, Download, Chrome, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

// Fallback mock data for when no real data exists yet
const MOCK_VIEW_TRENDS = [
  { date: "Week 1", likes: 120, comments: 25 },
  { date: "Week 2", likes: 180, comments: 42 },
  { date: "Week 3", likes: 95, comments: 18 },
  { date: "Week 4", likes: 220, comments: 55 },
];

interface SocialPost {
  id: string;
  post_text: string | null;
  post_format: string;
  posted_at: string | null;
  likes: number;
  comments: number;
  reposts: number;
  views: number | null;
  impressions: number | null;
  engagement_rate: number | null;
  source: string;
}

interface SocialProfile {
  linkedin_url: string;
  profile_name: string | null;
  headline: string | null;
  follower_count: number;
  connection_count: number | null;
  last_synced_at: string | null;
  sync_source: string;
  extension_installed: boolean;
}

export default function ConnectSocialAnalytics() {
  const [timeframe, setTimeframe] = useState("month");
  const { subscribed: isSubscribed } = useSubscription();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState("");

  // Data state
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Load existing profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profileData } = await supabase
        .from("social_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as any);
        setIsConnected(true);
        await loadPosts(user.id);
      }
    } catch (e) {
      console.error("Failed to load social profile:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadPosts(userId: string) {
    const daysMap: Record<string, number> = { week: 7, month: 30, quarter: 90 };
    const since = new Date();
    since.setDate(since.getDate() - (daysMap[timeframe] || 30));

    const { data } = await supabase
      .from("social_posts" as any)
      .select("*")
      .eq("user_id", userId)
      .gte("posted_at", since.toISOString())
      .order("posted_at", { ascending: false })
      .limit(50);

    if (data) setPosts(data as any[]);
  }

  // Reload posts when timeframe changes
  useEffect(() => {
    if (isConnected) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) loadPosts(user.id);
      });
    }
  }, [timeframe, isConnected]);

  const handleConnect = async () => {
    if (!linkedInUrl.trim() || !linkedInUrl.includes("linkedin.com/in/")) {
      toast.error("Enter a valid LinkedIn profile URL");
      return;
    }
    setIsConnecting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        setIsConnecting(false);
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/linkedin-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ linkedin_url: linkedInUrl.trim() }),
        }
      );

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Sync failed");

      toast.success(`Synced ${result.posts_synced} posts from LinkedIn`);
      setIsConnected(true);
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to connect LinkedIn");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleResync = async () => {
    if (!profile) return;
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/linkedin-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ linkedin_url: profile.linkedin_url }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);
      toast.success(`Re-synced ${result.posts_synced} posts`);
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const downloadExtension = () => {
    fetch("/aura-connect-extension.zip")
      .then(res => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "aura-connect-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(err => toast.error(err.message));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Not connected: show connect card ───
  if (!isConnected) {
    return (
      <Card className="bg-card border-border max-w-2xl mx-auto mt-8 mb-12">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-sans">Connect your LinkedIn</CardTitle>
          <CardDescription className="text-sm mt-2 font-sans">
            Paste your profile URL below to start syncing your organic marketing analytics and post performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground font-sans">LinkedIn Profile URL</label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://linkedin.com/in/your-profile"
                  className="pl-9 bg-muted/20 w-full font-sans text-sm"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  disabled={isConnecting}
                />
              </div>
              <Button
                onClick={handleConnect}
                disabled={isConnecting || !linkedInUrl}
                className="w-full sm:w-[150px] font-sans"
              >
                {isConnecting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
                ) : (
                  "Connect Account"
                )}
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1 font-sans">
            <Info className="h-3 w-3" /> After connecting, install the AURA Chrome extension to sync your post analytics and performance data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── Compute KPIs from real data ───
  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
  const totalReposts = posts.reduce((s, p) => s + (p.reposts || 0), 0);
  const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0);
  const hasViews = posts.some(p => p.views != null && p.views > 0);
  const postCount = posts.length;

  // Engagement rate: if we have views use views, else use follower count
  const engagementRate = hasViews && totalViews > 0
    ? ((totalLikes + totalComments + totalReposts) / totalViews * 100).toFixed(1)
    : profile?.follower_count && profile.follower_count > 0
      ? ((totalLikes + totalComments) / profile.follower_count * 100).toFixed(1)
      : "—";

  // Build trend data grouped by week
  const trendData = buildTrendData(posts);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">
              {profile?.profile_name ? `${profile.profile_name}'s Social Analytics` : "Social Analytics"}
            </h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> {profile?.extension_installed ? "Full Analytics" : "Public Data"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {profile?.headline || "Track your LinkedIn organic reach and conversion metrics."}
          </p>
          {profile?.last_synced_at && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Last synced: {new Date(profile.last_synced_at).toLocaleString()}
              {" · "}
              <button onClick={handleResync} disabled={isConnecting} className="text-primary hover:underline">
                {isConnecting ? "Syncing..." : "Re-sync now"}
              </button>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Past 7 Days</SelectItem>
              <SelectItem value="month">Past 30 Days</SelectItem>
              <SelectItem value="quarter">Past 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Extension Install CTA (show if extension not installed) */}
      {!profile?.extension_installed && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Chrome className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">Install the AURA Connect Extension</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sync your LinkedIn post analytics — likes, comments, views, impressions, and audience demographics — directly into your dashboard.
                </p>
              </div>
            </div>
            <Button size="sm" className="gap-1.5" onClick={downloadExtension}>
              <Download className="h-3.5 w-3.5" /> Download Extension
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Top Line KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {hasViews ? (
          <Card className="bg-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Total Views</p>
                <Eye className="h-4 w-4 text-primary opacity-70" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatNumber(totalViews)}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                Across {postCount} posts
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card relative">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Total Views</p>
                <Eye className="h-4 w-4 text-primary opacity-70" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-muted-foreground/30">—</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" /> Extension required
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                Engagement Rate
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {hasViews ? "Engagements / views" : "Engagements / followers (public estimate)"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <Activity className="h-4 w-4 text-emerald-500 opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{engagementRate}%</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              {profile?.follower_count ? `${formatNumber(profile.follower_count)} followers` : ""}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Likes</p>
              <ThumbsUp className="h-4 w-4 text-sky-500 opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{formatNumber(totalLikes)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              Across {postCount} posts
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Comments</p>
              <MessageSquare className="h-4 w-4 text-amber-500 opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{formatNumber(totalComments)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              {postCount > 0 ? `Averaging ${Math.round(totalComments / postCount)} per post` : "No posts yet"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Engagement Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      itemStyle={{ fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey="likes" name="Likes" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorLikes)" />
                    <Area type="monotone" dataKey="comments" name="Comments" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorComments)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No post data yet — sync your LinkedIn to populate this chart.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Demographics or Posting Consistency */}
        <Card className="bg-card">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {hasViews ? "Audience Demographics" : "Posting Consistency"}
            </CardTitle>
            <CardDescription className="text-xs">
              {hasViews ? "Based on engaged users" : "Your posting frequency"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {!hasViews ? (
              <div className="space-y-3">
                <div className="text-center py-4">
                  <p className="text-4xl font-bold">{postCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">posts this period</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg likes/post</span>
                    <span className="font-medium">{postCount > 0 ? Math.round(totalLikes / postCount) : 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg comments/post</span>
                    <span className="font-medium">{postCount > 0 ? Math.round(totalComments / postCount) : 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total reposts</span>
                    <span className="font-medium">{totalReposts}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Followers</span>
                    <span className="font-medium">{formatNumber(profile?.follower_count || 0)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Chrome className="h-3 w-3" /> Install the extension to unlock demographics
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-8">
                Demographic data will appear here once the extension collects audience insights.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Content Table */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Performing Posts</CardTitle>
          <CardDescription className="text-xs">Your most engaging content from the selected period</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-5 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Post</TableHead>
                  <TableHead>Format</TableHead>
                  {hasViews && <TableHead className="text-right">Views</TableHead>}
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={hasViews ? 5 : 4} className="text-center text-sm text-muted-foreground py-8">
                      No posts synced yet for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.slice(0, 10).map((post) => (
                    <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <p className="font-medium text-sm line-clamp-1">{post.post_text || "—"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {post.posted_at ? new Date(post.posted_at).toLocaleDateString() : "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-normal capitalize">
                          {post.post_format}
                        </Badge>
                      </TableCell>
                      {hasViews && (
                        <TableCell className="text-right font-semibold text-sm">
                          {post.views != null ? formatNumber(post.views) : "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-sm">{post.likes}</TableCell>
                      <TableCell className="text-right text-sm">{post.comments}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ───

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function buildTrendData(posts: SocialPost[]) {
  if (posts.length === 0) return [];

  // Group by week
  const weeks = new Map<string, { likes: number; comments: number }>();
  for (const p of posts) {
    if (!p.posted_at) continue;
    const d = new Date(p.posted_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const existing = weeks.get(key) || { likes: 0, comments: 0 };
    existing.likes += p.likes || 0;
    existing.comments += p.comments || 0;
    weeks.set(key, existing);
  }

  return Array.from(weeks.entries())
    .map(([date, data]) => ({ date, ...data }))
    .reverse();
}
