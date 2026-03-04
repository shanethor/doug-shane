import { AppLayout } from "@/components/AppLayout";
import { HeartPulse } from "lucide-react";

export default function AuraPulse() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="rounded-full bg-primary/10 p-6 mb-6">
          <HeartPulse className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
          Aura Pulse
        </h1>
        <p className="text-muted-foreground max-w-lg text-sm md:text-base leading-relaxed mb-8">
          Communication Hub for your Agency. Send messages, organize team discussion boards and to do lists, video or voice call. All in one place with Aura Pulse.
        </p>
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold border border-border rounded-full px-5 py-2">
          Coming Soon
        </span>
      </div>
    </AppLayout>
  );
}
