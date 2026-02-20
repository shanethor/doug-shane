import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { ACORD_FORMS } from "@/lib/acord-forms";
import { FIELD_POSITION_MAP } from "@/lib/acord-field-positions";
import { CURRENCY_FIELDS, formatUSD } from "@/lib/acord-autofill";

interface FillablePdfViewerProps {
  formId: string;
  formData: Record<string, any>;
  onFieldChange?: (key: string, value: string) => void;
}

/** Letter-size page dimensions in points (matches pdf-generator) */
const PAGE_W = 612;
const PAGE_H = 792;

function formatDateForDisplay(val: string): string {
  if (!val) return "";
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  return val;
}

function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val);
  if (s === "false") return "";
  if (s === "true") return "✓";
  if (CURRENCY_FIELDS.has(key)) return formatUSD(s);
  if (key.includes("date") || key.includes("eff_") || key.includes("exp_")) return formatDateForDisplay(s);
  return s;
}

export default function FillablePdfViewer({ formId, formData }: FillablePdfViewerProps) {
  const form = ACORD_FORMS[formId];
  const positions = FIELD_POSITION_MAP[formId] || {};

  const pages = useMemo(() => form?.pages || [], [form]);

  // Build per-page overlay entries
  const overlaysByPage = useMemo(() => {
    const byPage: Record<number, Array<{ key: string; display: string; x: number; y: number; maxWidth: number; fontSize: number; checkbox: boolean }>> = {};

    for (const [key, pos] of Object.entries(positions)) {
      const rawVal = formData[key];
      const display = formatFieldValue(key, rawVal);
      if (!display) continue;

      const pageIdx = pos.page;
      if (pageIdx >= pages.length) continue;

      if (!byPage[pageIdx]) byPage[pageIdx] = [];
      byPage[pageIdx].push({
        key,
        display,
        x: pos.x,
        y: pos.y,
        maxWidth: pos.maxWidth || 200,
        fontSize: pos.fontSize || 8,
        checkbox: pos.checkbox || false,
      });
    }
    return byPage;
  }, [positions, formData, pages.length]);

  if (!form || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
        <AlertCircle className="h-8 w-8 text-yellow-500" />
        <p className="text-sm font-medium">No preview available for this form</p>
        <p className="text-xs">{formId}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 overflow-y-auto h-full bg-muted/30">
      {pages.map((pageImg, pageIdx) => {
        const overlays = overlaysByPage[pageIdx] || [];
        return (
          <div
            key={pageIdx}
            className="relative mx-auto shadow-md"
            style={{
              width: "100%",
              maxWidth: "816px", // 612pt at 96dpi → 816px
              aspectRatio: `${PAGE_W} / ${PAGE_H}`,
            }}
          >
            {/* ACORD form page image */}
            <img
              src={pageImg}
              alt={`${form.name} page ${pageIdx + 1}`}
              className="w-full h-full object-fill select-none"
              draggable={false}
            />

            {/* Field value overlays */}
            {overlays.map(({ key, display, x, y, maxWidth, fontSize, checkbox }) => {
              const leftPct = (x / PAGE_W) * 100;
              const topPct = (y / PAGE_H) * 100;
              const maxWidthPct = (maxWidth / PAGE_W) * 100;
              // Scale font: 8pt base → at 816px wide, ~10.67px; scale proportionally
              const fontSizePct = (fontSize / PAGE_H) * 100;

              return (
                <span
                  key={key}
                  style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    maxWidth: `${maxWidthPct}%`,
                    fontSize: `${fontSizePct}%`,
                    // Use vw as proxy for element width — font scales with container
                    lineHeight: 1.1,
                    color: "rgb(0 0 140)",
                    fontFamily: "Helvetica, Arial, sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                  title={`${key}: ${display}`}
                >
                  {checkbox
                    ? (display === "✓" ? "✓" : "")
                    : display}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
