import { Mail, LayoutGrid, Sparkles } from "lucide-react";
import type { EmailLayout } from "./useEmailEngine";

const LAYOUTS: { id: EmailLayout; label: string; icon: React.ElementType }[] = [
  { id: "gmail", label: "Gmail", icon: Mail },
  { id: "outlook", label: "Outlook", icon: LayoutGrid },
  { id: "aura", label: "AuRa", icon: Sparkles },
];

export default function EmailLayoutSwitcher({
  current, onChange,
}: { current: EmailLayout; onChange: (l: EmailLayout) => void }) {
  return (
    <div className="inline-flex rounded-md overflow-hidden" style={{ border: "1px solid hsl(240 6% 18%)" }}>
      {LAYOUTS.map(l => {
        const active = current === l.id;
        return (
          <button
            key={l.id}
            onClick={() => onChange(l.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: active ? "hsl(140 12% 42% / 0.15)" : "hsl(240 8% 9%)",
              color: active ? "hsl(140 12% 58%)" : "hsl(240 5% 50%)",
              borderRight: "1px solid hsl(240 6% 18%)",
            }}
          >
            <l.icon className="h-3 w-3" />
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
