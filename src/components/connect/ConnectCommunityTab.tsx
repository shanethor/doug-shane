import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  MessageSquare, Trophy, ThumbsUp, Send, Users,
  Briefcase, Scale, Landmark, PiggyBank, Loader2, Plus,
} from "lucide-react";

interface Post {
  id: string;
  user_id: string;
  category: string;
  post_type: string;
  title: string;
  body: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  author_name?: string;
  liked_by_me?: boolean;
}

const VERTICALS = [
  { key: "all", label: "All", icon: Users },
  { key: "cpas", label: "CPAs", icon: PiggyBank },
  { key: "lenders", label: "Lenders", icon: Landmark },
  { key: "attorneys", label: "Attorneys", icon: Scale },
  { key: "advisors", label: "Advisors", icon: Briefcase },
];

export default function ConnectCommunityTab() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVertical, setActiveVertical] = useState("all");
  const [subTab, setSubTab] = useState<"board" | "wins">("board");

  // New post form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [posting, setPosting] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("connect_community_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (subTab === "wins") {
        query = query.eq("post_type", "win");
      } else {
        query = query.eq("post_type", "discussion");
      }

      if (activeVertical !== "all") {
        query = query.eq("category", activeVertical);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch author names
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      let profiles: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        (profs || []).forEach(p => { profiles[p.user_id] = p.full_name || "Anonymous"; });
      }

      // Check likes
      let myLikes = new Set<string>();
      if (user) {
        const { data: likes } = await supabase
          .from("connect_post_likes")
          .select("post_id")
          .eq("user_id", user.id);
        (likes || []).forEach(l => myLikes.add(l.post_id));
      }

      setPosts((data || []).map(p => ({
        ...p,
        author_name: profiles[p.user_id] || "Anonymous",
        liked_by_me: myLikes.has(p.id),
      })));
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [subTab, activeVertical, user]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handlePost = async () => {
    if (!newTitle.trim() || !newBody.trim() || !user) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("connect_community_posts").insert({
        user_id: user.id,
        title: newTitle.trim(),
        body: newBody.trim(),
        category: newCategory,
        post_type: subTab === "wins" ? "win" : "discussion",
      });
      if (error) throw error;
      toast.success(subTab === "wins" ? "Win posted! 🎉" : "Post created!");
      setNewTitle("");
      setNewBody("");
      setShowForm(false);
      loadPosts();
    } catch {
      toast.error("Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post: Post) => {
    if (!user) return;
    try {
      if (post.liked_by_me) {
        await supabase.from("connect_post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
        await supabase.from("connect_community_posts").update({ likes_count: Math.max(0, post.likes_count - 1) }).eq("id", post.id);
      } else {
        await supabase.from("connect_post_likes").insert({ post_id: post.id, user_id: user.id });
        await supabase.from("connect_community_posts").update({ likes_count: post.likes_count + 1 }).eq("id", post.id);
      }
      loadPosts();
    } catch {
      toast.error("Failed to update like");
    }
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs: Board vs Wins */}
      <div className="flex items-center gap-2">
        <Button
          variant={subTab === "board" ? "default" : "ghost"}
          size="sm"
          className="gap-1.5"
          onClick={() => setSubTab("board")}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Community Board
        </Button>
        <Button
          variant={subTab === "wins" ? "default" : "ghost"}
          size="sm"
          className="gap-1.5"
          onClick={() => setSubTab("wins")}
        >
          <Trophy className="h-3.5 w-3.5" />
          Win of the Week
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" />
          {subTab === "wins" ? "Share a Win" : "New Post"}
        </Button>
      </div>

      {/* Vertical Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {VERTICALS.map(v => (
          <Badge
            key={v.key}
            variant={activeVertical === v.key ? "default" : "outline"}
            className="cursor-pointer gap-1 text-xs py-1 px-2.5"
            onClick={() => setActiveVertical(v.key)}
          >
            <v.icon className="h-3 w-3" />
            {v.label}
          </Badge>
        ))}
      </div>

      {/* Post Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-5 space-y-3">
            <Input
              placeholder={subTab === "wins" ? "What did you close / accomplish?" : "Post title"}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Textarea
              placeholder={subTab === "wins" ? "Tell the story — deal size, who referred it, how it happened..." : "Share a question, request, or insight with the community..."}
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              rows={4}
            />
            <div className="flex items-center gap-2">
              <select
                className="text-xs border rounded px-2 py-1.5 bg-background text-foreground"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
              >
                <option value="general">General</option>
                <option value="cpas">CPAs</option>
                <option value="lenders">Lenders</option>
                <option value="attorneys">Attorneys</option>
                <option value="advisors">Advisors</option>
              </select>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="gap-1.5" onClick={handlePost} disabled={posting || !newTitle.trim() || !newBody.trim()}>
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          {subTab === "wins" ? (
            <Trophy className="h-10 w-10 text-muted-foreground" />
          ) : (
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {subTab === "wins" ? "No wins shared yet. Be the first to celebrate!" : "No posts yet. Start a conversation!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            <Card key={post.id} className={`overflow-hidden ${subTab === "wins" ? "border-warning/20" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {subTab === "wins" && (
                    <div className="rounded-lg bg-warning/10 p-2 shrink-0 mt-0.5">
                      <Trophy className="h-4 w-4 text-warning" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{post.title}</p>
                      <Badge variant="outline" className="text-[9px]">{post.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{post.body}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[10px] text-muted-foreground">{post.author_name}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 gap-1 text-xs ${post.liked_by_me ? "text-primary" : "text-muted-foreground"}`}
                        onClick={() => handleLike(post)}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {post.likes_count > 0 && post.likes_count}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
