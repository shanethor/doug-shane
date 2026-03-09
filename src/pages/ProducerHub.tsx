import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  GitBranch, BarChart3, FolderOpen, Upload, FileSearch, FileSignature,
  CreditCard, FileStack, FileText, Shield, Sparkles, Clock, Radar
} from "lucide-react";
import Pipeline from "./Pipeline";
import ProducerDashboard from "./ProducerDashboard";
import LeadEnginePanel from "@/components/LeadEnginePanel";

type ToolTab = {
  id: string;
  icon: React.ElementType;
  label: string;
  title: string;
  description: string;
  details?: string[];
};

const TOOL_TABS: ToolTab[] = [
  {
    id: "documents",
    icon: FolderOpen,
    label: "Doc Hub",
    title: "Document Hub",
    description: "Drag and drop custom form templates — AURA auto-maps fields for instant pre-fill across all your submissions.",
    details: [
      "Upload carrier-specific supplemental forms",
      "Auto-detect field names and map to ACORD data",
      "Reuse templates across clients instantly",
    ],
  },
  {
    id: "loss-runs",
    icon: FileSearch,
    label: "Loss Runs",
    title: "Loss Run Requests",
    description: "Integrated with Loss Run Pro — request, track, and receive loss run documents directly from carriers without manual emails.",
    details: [
      "One-click loss run requests to carriers",
      "Automatic status tracking and follow-ups",
      "Documents auto-attach to lead records",
    ],
  },
  {
    id: "bor",
    icon: FileSignature,
    label: "BOR",
    title: "BOR Generator",
    description: "Create signable Broker of Record letters with custom agency letterhead. Clients sign digitally and documents auto-attach to the lead.",
    details: [
      "Custom letterhead per agency",
      "Digital signature portal for clients",
      "Auto-transitions lead to Presenting stage",
    ],
  },
  {
    id: "id-cards",
    icon: CreditCard,
    label: "ID Cards",
    title: "ID Card Generator",
    description: "Generate proof-of-insurance ID cards instantly for auto, commercial, and specialty lines policies.",
    details: [
      "Auto-fill from policy data",
      "Print-ready and digital formats",
      "Bulk generation for fleet accounts",
    ],
  },
  {
    id: "binders",
    icon: FileStack,
    label: "Binders",
    title: "Binder Generator",
    description: "Produce professional binder documents with policy details, effective dates, and carrier information pre-filled from your submissions.",
    details: [
      "Pre-populated from submission data",
      "Carrier-compliant formatting",
      "Instant PDF download and email",
    ],
  },
  {
    id: "lpr",
    icon: FileText,
    label: "LPR",
    title: "LPR Generator",
    description: "Create Loss Payable Request documents with lender and lienholder details auto-populated from policy data.",
    details: [
      "Auto-pull lender info from existing records",
      "Standardized format across carriers",
      "Track request status in pipeline",
    ],
  },
  {
    id: "coi",
    icon: Shield,
    label: "COI",
    title: "COI Generator",
    description: "Generate Certificates of Insurance with additional insured endorsements, holder information, and custom formatting per carrier requirements.",
    details: [
      "Additional insured & holder management",
      "Carrier-specific formatting rules",
      "Batch generation for multi-location accounts",
    ],
  },
  {
    id: "smart-quote",
    icon: Sparkles,
    label: "Smart Quote",
    title: "AURA Smart Quote",
    description: "AI-powered quote simulator — model different coverage scenarios, compare carrier pricing, and generate professional coverage comparison sheets for clients.",
    details: [
      "Simulate various coverage scenarios",
      "Side-by-side carrier comparisons",
      "Generate client-ready comparison PDFs",
      "AI recommendations for optimal coverage",
    ],
  },
];

function ComingSoonPanel({ tool }: { tool: ToolTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center max-w-lg mx-auto px-4">
      <div className="rounded-full bg-primary/10 p-5 mb-5">
        <tool.icon className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-2">{tool.title}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed mb-5">
        {tool.description}
      </p>
      {tool.details && (
        <ul className="text-left w-full space-y-2 mb-6">
          {tool.details.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
              {d}
            </li>
          ))}
        </ul>
      )}
      {tool.id === "documents" && (
        <div className="w-full border-2 border-dashed border-border rounded-xl p-6 opacity-40 pointer-events-none mb-4">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-7 w-7 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Drop forms here to auto-map</p>
          </div>
        </div>
      )}
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold border border-border rounded-full px-5 py-2">
        <Clock className="h-3 w-3" />
        Coming Soon
      </span>
    </div>
  );
}

export default function ProducerHub() {
  const { isClientServices } = useUserRole();
  const [activeTab, setActiveTab] = useState("production");

  // Client Services users cannot access Producer Hub
  if (isClientServices) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <GitBranch className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">Command Center</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide mb-4">
          <TabsList className="inline-flex w-auto min-w-max h-auto flex-wrap sm:flex-nowrap gap-0">
            <TabsTrigger value="production" className="gap-1.5 text-xs px-2.5 sm:px-3">
              <BarChart3 className="h-3.5 w-3.5 hidden sm:block" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5 text-xs px-2.5 sm:px-3">
              <GitBranch className="h-3.5 w-3.5 hidden sm:block" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="lead-engine" className="gap-1.5 text-xs px-2.5 sm:px-3">
              <Radar className="h-3.5 w-3.5 hidden sm:block" />
              Lead Engine
            </TabsTrigger>
            {TOOL_TABS.map((tool) => (
              <TabsTrigger key={tool.id} value={tool.id} className="gap-1.5 text-xs px-2.5 sm:px-3">
                <tool.icon className="h-3.5 w-3.5 hidden sm:block" />
                {tool.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="production">
          <ProducerDashboard embedded />
        </TabsContent>

        <TabsContent value="pipeline">
          <Pipeline embedded />
        </TabsContent>

        <TabsContent value="lead-engine">
          <LeadEnginePanel />
        </TabsContent>

        {TOOL_TABS.map((tool) => (
          <TabsContent key={tool.id} value={tool.id}>
            <ComingSoonPanel tool={tool} />
          </TabsContent>
        ))}
      </Tabs>
    </AppLayout>
  );
}
