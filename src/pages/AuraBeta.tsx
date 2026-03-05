import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail, GitBranch, FileStack, FileText, Shield, Sparkles,
  HeartPulse, Upload, ClipboardList, FlaskConical,
} from "lucide-react";
import { BETA_USERS, setBetaUser } from "@/lib/beta-users";

const COMING_SOON_FEATURES = [
  {
    category: "AURA Pulse",
    items: [
      { icon: HeartPulse, title: "AI Concierge", description: "AURA Pulse acts as your automated answering machine — captures client information, delivers intake forms, and syncs data directly into the sales pipeline." },
      { icon: HeartPulse, title: "Team Discussion Boards", description: "Organize team conversations by topic, client, or project with threaded discussion boards." },
    ],
  },
  {
    category: "Dashboard",
    items: [
      { icon: Mail, title: "Email-to-Intake", description: "Email client details via email and AURA will pre-fill everything before you arrive." },
    ],
  },
  {
    category: "Producer Hub",
    items: [
      { icon: FileStack, title: "Binder Generator", description: "Produce professional binder documents with policy details, effective dates, and carrier information pre-filled from your submissions." },
      { icon: FileText, title: "LPR Generator", description: "Create Loss Payable Request documents with lender and lienholder details auto-populated from policy data." },
      { icon: Shield, title: "COI Generator", description: "Generate Certificates of Insurance with additional insured endorsements, holder information, and custom formatting per carrier requirements." },
      { icon: Sparkles, title: "AURA Smart Quote", description: "AI-powered quote simulator — model different coverage scenarios, compare carrier pricing, and generate professional coverage comparison sheets." },
      { icon: Upload, title: "Document Auto-Map", description: "Drop forms into Producer Hub to auto-map fields and extract data." },
    ],
  },
  {
    category: "Submission Package",
    items: [
      { icon: ClipboardList, title: "Statement of Values", description: "Generate and attach Statement of Values documents to submission packages." },
      { icon: FileText, title: "Supplemental Forms", description: "Support for supplemental form generation and attachment in submission packages." },
    ],
  },
  {
    category: "Loss Runs",
    items: [
      { icon: Upload, title: "File Upload Integration", description: "Upload authorization letters directly within the loss run request workflow." },
      { icon: GitBranch, title: "Loss Run Pro Integration", description: "Auto-send loss run requests via the Loss Run Pro API integration." },
    ],
  },
];

export default function AuraBeta() {
  const navigate = useNavigate();
  const totalFeatures = COMING_SOON_FEATURES.reduce((sum, c) => sum + c.items.length, 0);

  const loginAs = (userId: string) => {
    setBetaUser(userId);
    navigate("/beta/chat");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <FlaskConical className="h-6 w-6 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">AURA BETA</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            A preview of what's coming next. {totalFeatures} features currently in development.
          </p>
          <Badge variant="outline" className="mt-4 text-[10px] uppercase tracking-widest px-4 py-1.5">
            Internal Preview
          </Badge>
        </div>

        {/* AURA Pulse Demo Section — prominent at top */}
        <div className="mb-12 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <HeartPulse className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight">Demo AURA Pulse</h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            AURA Pulse is your team's communication hub — real-time chat, shared to-dos, voice channels, and video calls, all in one place.
          </p>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-sm font-semibold">Choose a demo profile to enter AURA Pulse</p>
              <p className="text-xs text-muted-foreground">
                Try real-time chat, shared to-dos, voice &amp; video — synced across users.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {Object.values(BETA_USERS).map((u) => (
                  <Button
                    key={u.id}
                    variant="outline"
                    className="w-full sm:w-auto gap-2 h-11"
                    onClick={() => loginAs(u.id)}
                  >
                    <div className={`h-6 w-6 rounded-full ${u.avatarColor} flex items-center justify-center`}>
                      <span className="text-[9px] font-bold text-white">{u.initials}</span>
                    </div>
                    Continue as {u.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pulse coming soon items right below the demo card */}
          <div className="space-y-2 pt-2">
            {COMING_SOON_FEATURES.filter(c => c.category === "AURA Pulse").flatMap(c => c.items).map((item) => (
              <Card key={item.title} className="border-dashed border-border/60 bg-muted/10">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <Badge variant="outline" className="text-[8px] uppercase tracking-wider px-1.5 py-0 text-muted-foreground border-muted-foreground/30">Coming Soon</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Other Feature Categories */}
        <div className="space-y-8">
          {COMING_SOON_FEATURES.filter(c => c.category !== "AURA Pulse").map((category) => (
            <div key={category.category}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{category.category}</h2>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{category.items.length}</Badge>
              </div>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <Card key={item.title} className="border-dashed border-border/60 bg-muted/10">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <Badge variant="outline" className="text-[8px] uppercase tracking-wider px-1.5 py-0 text-muted-foreground border-muted-foreground/30">Coming Soon</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-12">
          <p className="text-[10px] text-muted-foreground/50 tracking-widest uppercase">
            Insurance runs on <span className="font-semibold">AURA</span>
          </p>
        </div>
      </div>
    </div>
  );
}
