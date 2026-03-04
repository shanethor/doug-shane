import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  GitBranch, BarChart3, FolderOpen, Upload, FileSearch, FileSignature,
  CreditCard, FileStack, FileText, Shield, Sparkles, Clock
} from "lucide-react";
import Pipeline from "./Pipeline";
import ProducerDashboard from "./ProducerDashboard";

const TOOLS = [
  {
    icon: FileSearch,
    title: "Loss Run Requests",
    description: "Integrated with Loss Run Pro — request, track, and receive loss run documents directly from carriers without manual emails.",
    status: "coming-soon" as const,
  },
  {
    icon: FileSignature,
    title: "BOR Generator",
    description: "Create signable Broker of Record letters with custom agency letterhead. Clients sign digitally and documents attach to the lead automatically.",
    status: "coming-soon" as const,
  },
  {
    icon: CreditCard,
    title: "ID Card Generator",
    description: "Generate proof-of-insurance ID cards instantly for auto, commercial, and specialty lines policies.",
    status: "coming-soon" as const,
  },
  {
    icon: FileStack,
    title: "Binder Generator",
    description: "Produce professional binder documents with policy details, effective dates, and carrier information pre-filled from your submissions.",
    status: "coming-soon" as const,
  },
  {
    icon: FileText,
    title: "LPR Generator",
    description: "Create Loss Payable Request documents with lender and lienholder details auto-populated from policy data.",
    status: "coming-soon" as const,
  },
  {
    icon: Shield,
    title: "COI Generator",
    description: "Generate Certificates of Insurance with additional insured endorsements, holder information, and custom formatting per carrier requirements.",
    status: "coming-soon" as const,
  },
  {
    icon: Sparkles,
    title: "AURA Smart Quote",
    description: "AI-powered quote simulator — model different coverage scenarios, compare carrier pricing, and generate professional coverage comparison sheets for clients.",
    status: "coming-soon" as const,
  },
];

export default function ProducerHub() {
  const [activeTab, setActiveTab] = useState("pipeline");

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <GitBranch className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">Producer Hub</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide mb-4">
          <TabsList className="inline-flex w-auto min-w-max">
            <TabsTrigger value="pipeline" className="gap-1.5">
              <GitBranch className="h-3.5 w-3.5" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="production" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Production
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              Tools
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pipeline">
          <Pipeline embedded />
        </TabsContent>

        <TabsContent value="production">
          <ProducerDashboard embedded />
        </TabsContent>

        <TabsContent value="tools">
          {/* Document Hub */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-1">Document Hub</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop custom form templates — AURA auto-maps fields for instant pre-fill.
            </p>
            <div className="border-2 border-dashed border-border rounded-xl p-8 opacity-40 pointer-events-none">
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop forms here to auto-map</p>
              </div>
            </div>
            <div className="flex justify-center mt-3">
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold border border-border rounded-full px-4 py-1.5">
                Coming Soon
              </span>
            </div>
          </div>

          {/* Producer Tools Grid */}
          <h2 className="text-lg font-semibold mb-1">Producer Tools</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generators, integrations, and AI-powered tools to streamline your workflow.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOOLS.map((tool) => (
              <Card key={tool.title} className="relative overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <tool.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/60 rounded-full px-2.5 py-1">
                      <Clock className="h-3 w-3" />
                      Soon
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold">{tool.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
