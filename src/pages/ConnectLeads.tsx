import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Handshake, Rocket } from "lucide-react";
import LeadMarketplace from "@/components/connect/LeadMarketplace";
import LeadGenerator from "@/components/connect/LeadGenerator";

export default function ConnectLeads() {
  const [tab, setTab] = useState("generator");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Leads</h1>
        <p className="text-sm text-muted-foreground">Trade leads on the marketplace or generate new ones with AI</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="generator" className="gap-1.5">
            <Rocket className="h-4 w-4" />
            Lead Generator
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-1.5">
            <Handshake className="h-4 w-4" />
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="mt-4">
          <LeadGenerator />
        </TabsContent>
        <TabsContent value="marketplace" className="mt-4">
          <LeadMarketplace />
        </TabsContent>
      </Tabs>
    </div>
  );
}
