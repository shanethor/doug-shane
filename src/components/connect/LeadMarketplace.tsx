import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, DollarSign, Star, Trophy, Shield,
  ArrowRight, Clock, User, Handshake, TrendingUp, Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  useLeadPosts, useMyLeadPosts, useCreateLeadPost, useClaimLead,
  useMyElo, useEnsureElo, getEloBadge, type LeadPost,
} from "@/hooks/useLeadsHub";

const LEAD_TYPES = [
  { value: "insurance", label: "Insurance" },
  { value: "consulting", label: "Consulting" },
  { value: "real_estate", label: "Real Estate" },
  { value: "financial", label: "Financial Services" },
  { value: "general", label: "General" },
];

function EloBadge({ rating }: { rating: number }) {
  const badge = getEloBadge(rating);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${badge.color}`}>
      <Trophy className="h-3 w-3" />
      {badge.label} ({Math.round(rating)})
    </span>
  );
}

function PostLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createPost = useCreateLeadPost();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [leadType, setLeadType] = useState("general");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [offerType, setOfferType] = useState("flat_fee");
  const [offerValue, setOfferValue] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    try {
      await createPost.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        lead_type: leadType,
        estimated_value: parseFloat(estimatedValue) || 0,
        referral_offer_type: offerType,
        referral_offer_value: parseFloat(offerValue) || 0,
      });
      toast.success("Lead posted to marketplace!");
      onClose();
      setTitle(""); setDescription(""); setEstimatedValue(""); setOfferValue("");
    } catch {
      toast.error("Failed to post lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            Post a Lead
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Lead Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Commercial property owner in Houston" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details about the lead opportunity..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Lead Type</label>
              <Select value={leadType} onValueChange={setLeadType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Estimated Value</label>
              <Input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="$0" />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Referral Offer</label>
              <Select value={offerType} onValueChange={setOfferType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat_fee">Flat Fee</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {offerType === "percentage" ? "%" : "$"} Amount
              </label>
              <Input type="number" value={offerValue} onChange={(e) => setOfferValue(e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createPost.isPending}>
            {createPost.isPending ? "Posting…" : "Post Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadPostCard({ post, onClaim }: { post: LeadPost; onClaim: (post: LeadPost) => void }) {
  const typeLabel = LEAD_TYPES.find((t) => t.value === post.lead_type)?.label || post.lead_type;
  const offerDisplay = post.referral_offer_type === "percentage"
    ? `${post.referral_offer_value}%`
    : `$${post.referral_offer_value?.toLocaleString()}`;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold">{post.title}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
              {post.estimated_value > 0 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />{post.estimated_value.toLocaleString()}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <Button size="sm" className="gap-1 shrink-0" onClick={() => onClaim(post)}>
            <ArrowRight className="h-3.5 w-3.5" />
            Request
          </Button>
        </div>

        {post.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{post.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px]">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Posted by user</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-emerald-500" />
            <span className="text-[11px] font-medium text-emerald-500">
              {offerDisplay} referral
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeadMarketplace() {
  const [postOpen, setPostOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: posts, isLoading } = useLeadPosts();
  const { data: myElo } = useMyElo();
  const ensureElo = useEnsureElo();
  const claimLead = useClaimLead();

  const handleClaim = async (post: LeadPost) => {
    try {
      await ensureElo.mutateAsync();
      await claimLead.mutateAsync({ lead_post_id: post.id });
      toast.success(`Requested "${post.title}" — owner will be notified`);
    } catch {
      toast.error("Failed to request lead");
    }
  };

  const filtered = (posts || []).filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.lead_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{posts?.length ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Open Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex justify-center mb-1">
              {myElo ? <EloBadge rating={myElo.elo_rating} /> : <span className="text-sm text-muted-foreground">—</span>}
            </div>
            <p className="text-[11px] text-muted-foreground">Your Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{myElo?.deals_completed ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Deals Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{myElo?.reliability_score ?? 50}%</p>
            <p className="text-[11px] text-muted-foreground">Reliability</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {LEAD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setPostOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Post a Lead
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Handshake className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">No leads in the marketplace yet</p>
            <p className="text-xs text-muted-foreground mb-4">Be the first to post a lead and start building your network</p>
            <Button onClick={() => setPostOpen(true)} variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" /> Post a Lead
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((post) => (
            <LeadPostCard key={post.id} post={post} onClaim={handleClaim} />
          ))}
        </div>
      )}

      <PostLeadModal open={postOpen} onClose={() => setPostOpen(false)} />
    </div>
  );
}
