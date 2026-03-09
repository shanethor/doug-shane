import { Badge } from "@/components/ui/badge";

const TAG_CHIPS = [
  { label: "COIs", tag: "coi_request" },
  { label: "Claims", tag: "claim" },
  { label: "Cancellations", tag: "cancellation_notice" },
  { label: "Audits", tag: "audit" },
  { label: "Renewals", tag: "renewal" },
  { label: "Billing", tag: "billing" },
  { label: "Endorsements", tag: "endorsement" },
  { label: "Service Requests", tag: "service_request" },
] as const;

interface EmailFilterChipsProps {
  activeTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function EmailFilterChips({
  activeTags,
  onTagsChange,
}: EmailFilterChipsProps) {
  const toggleTag = (tag: string) => {
    onTagsChange(
      activeTags.includes(tag)
        ? activeTags.filter((t) => t !== tag)
        : [...activeTags, tag]
    );
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {TAG_CHIPS.map((chip) => {
        const active = activeTags.includes(chip.tag);
        return (
          <Badge
            key={chip.tag}
            variant={active ? "default" : "outline"}
            className={`cursor-pointer select-none text-[11px] px-2.5 py-1 transition-colors ${
              active
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-muted"
            }`}
            onClick={() => toggleTag(chip.tag)}
          >
            {chip.label}
          </Badge>
        );
      })}
    </div>
  );
}
