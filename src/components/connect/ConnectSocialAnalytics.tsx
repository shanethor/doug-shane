import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Eye, ThumbsUp, MessageSquare, Share2, TrendingUp, Users, Info, ShieldCheck, Activity } from "lucide-react";

// Robust Simulated Data
const VIEW_TRENDS = [
  { date: "Oct 1", views: 4200, engagement: 820 },
  { date: "Oct 5", views: 5100, engagement: 940 },
  { date: "Oct 10", views: 4800, engagement: 890 },
  { date: "Oct 15", views: 8900, engagement: 1800 }, // Viral post spike
  { date: "Oct 20", views: 6200, engagement: 1200 },
  { date: "Oct 25", views: 7100, engagement: 1400 },
  { date: "Oct 30", views: 8400, engagement: 1650 },
];

const DEMOGRAPHICS = [
  { name: "Founders/CEOs", value: 35, color: "hsl(220, 70%, 50%)" },
  { name: "Sales Leaders", value: 25, color: "hsl(280, 65%, 60%)" },
  { name: "CFOs", value: 20, color: "hsl(160, 60%, 45%)" },
  { name: "Other", value: 20, color: "hsl(220, 20%, 30%)" },
];

const RECENT_POSTS = [
  { id: 1, title: "3 Reasons your Cyber policy will deny a ransomware claim...", format: "Carousel", views: 12400, likes: 245, comments: 42, date: "2 days ago" },
  { id: 2, title: "I reviewed 50 contractor policies this month. Here's the most common gap.", format: "Text", views: 8200, likes: 180, comments: 65, date: "1 week ago" },
  { id: 3, title: "Why the hard market is actually a blessing in disguise for clients.", format: "Video", views: 18500, likes: 512, comments: 120, date: "2 weeks ago" },
  { id: 4, title: "Just saved a manufacturing client $45,000 on their GL renewal.", format: "Image", views: 6100, likes: 110, comments: 15, date: "3 weeks ago" },
];

export default function ConnectSocialAnalytics() {
  const [timeframe, setTimeframe] = useState("month");

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Social Analytics</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Shield Mode
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Track your LinkedIn organic reach and conversion metrics.</p>
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

      {/* Top Line KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Views</p>
              <Eye className="h-4 w-4 text-primary opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">44.7K</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3" /> +18.2% vs last {timeframe}
            </div>
          </CardContent>
        </Card>
        
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
                    <TooltipContent><p className="text-xs">Total engagements divided by total views</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <Activity className="h-4 w-4 text-emerald-500 opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">3.8%</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3" /> +0.5% vs last {timeframe}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Likes</p>
              <ThumbsUp className="h-4 w-4 text-sky-500 opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">1,047</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              Across 12 posts
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Comments</p>
              <MessageSquare className="h-4 w-4 text-amber-500 opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold">242</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              Averaging 20 per post
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Reach & Engagement Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={VIEW_TRENDS} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEngs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ fontSize: '13px', fontWeight: 'bold', color: 'hsl(var(--foreground))', marginBottom: '4px' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="views" name="Views" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                  <Area yAxisId="right" type="monotone" dataKey="engagement" name="Engagements" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEngs)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Demographics Pie */}
        <Card className="bg-card">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Audience Demographics
            </CardTitle>
            <CardDescription className="text-xs">Based on engaged users</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DEMOGRAPHICS}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {DEMOGRAPHICS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-full space-y-2 mt-2">
              {DEMOGRAPHICS.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
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
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_POSTS.map((post) => (
                  <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <p className="font-medium text-sm line-clamp-1">{post.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{post.date}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {post.format}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {post.views.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {post.likes}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {post.comments}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
