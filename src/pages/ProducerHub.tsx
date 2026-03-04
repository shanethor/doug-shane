import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, BarChart3, FolderOpen, Upload } from "lucide-react";
import Pipeline from "./Pipeline";
import ProducerDashboard from "./ProducerDashboard";

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
            <TabsTrigger value="documents" className="gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              Document Hub
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pipeline">
          <Pipeline embedded />
        </TabsContent>

        <TabsContent value="production">
          <ProducerDashboard embedded />
        </TabsContent>

        <TabsContent value="documents">
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="rounded-full bg-primary/10 p-6 mb-6">
              <FolderOpen className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-3">Document Hub</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Drag and drop new form templates here. AURA will automatically map fields for instant auto-fill across your submissions.
            </p>
            <div className="w-full border-2 border-dashed border-border rounded-xl p-8 opacity-40 pointer-events-none">
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop forms here to auto-map</p>
              </div>
            </div>
            <span className="mt-6 text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold border border-border rounded-full px-5 py-2">
              Coming Soon
            </span>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
