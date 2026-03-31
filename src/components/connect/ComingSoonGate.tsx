import { Construction, Sparkles } from "lucide-react";

export function ComingSoonGate({ pageName }: { pageName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Construction className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{pageName}</h2>
      <p className="text-lg text-muted-foreground mb-4">Coming Soon</p>
      <p className="text-sm text-muted-foreground max-w-md">
        We're building something amazing. As an early subscriber, you're getting a discounted rate
        while we finish building out all features. Stay tuned!
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground/60">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Early access pricing: $99.99/mo</span>
      </div>
    </div>
  );
}
