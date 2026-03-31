import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, User, Layers, DollarSign, X } from "lucide-react";

interface PipelineFiltersProps {
  ownerFilter: string;
  onOwnerFilterChange: (v: string) => void;
  stageFilter: string;
  onStageFilterChange: (v: string) => void;
  dealSizeRange: [number, number];
  onDealSizeRangeChange: (v: [number, number]) => void;
  ownerNames: Record<string, string>;
  currentUserId?: string;
  isManagerOrAdmin: boolean;
}

const STAGE_OPTIONS = [
  { value: "all", label: "All Stages" },
  { value: "prospect", label: "Prospect" },
  { value: "quoting", label: "Quoting" },
  { value: "presenting", label: "Presenting" },
  { value: "sold", label: "Sold" },
  { value: "lost", label: "Lost" },
];

export function PipelineFilters({
  ownerFilter,
  onOwnerFilterChange,
  stageFilter,
  onStageFilterChange,
  dealSizeRange,
  onDealSizeRangeChange,
  ownerNames,
  currentUserId,
  isManagerOrAdmin,
}: PipelineFiltersProps) {
  const hasActiveFilters = ownerFilter !== "all" || stageFilter !== "all" || dealSizeRange[0] > 0 || dealSizeRange[1] < 1000000;
  const activeCount = [
    ownerFilter !== "all",
    stageFilter !== "all",
    dealSizeRange[0] > 0 || dealSizeRange[1] < 1000000,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* My Leads quick filter */}
      {isManagerOrAdmin && (
        <Button
          variant={ownerFilter === currentUserId ? "default" : "outline"}
          size="sm"
          className="text-xs gap-1.5 h-7"
          onClick={() => onOwnerFilterChange(ownerFilter === currentUserId ? "all" : (currentUserId || "all"))}
        >
          <User className="h-3 w-3" />
          My Leads
        </Button>
      )}

      {/* Owner filter */}
      {isManagerOrAdmin && Object.keys(ownerNames).length > 0 && (
        <Select value={ownerFilter} onValueChange={onOwnerFilterChange}>
          <SelectTrigger className="w-[140px] h-7 text-xs">
            <SelectValue placeholder="All Reps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reps</SelectItem>
            {Object.entries(ownerNames).map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Stage filter */}
      <Select value={stageFilter} onValueChange={onStageFilterChange}>
        <SelectTrigger className="w-[120px] h-7 text-xs">
          <SelectValue placeholder="All Stages" />
        </SelectTrigger>
        <SelectContent>
          {STAGE_OPTIONS.map(s => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Deal size filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7">
            <DollarSign className="h-3 w-3" />
            Deal Size
            {(dealSizeRange[0] > 0 || dealSizeRange[1] < 1000000) && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">!</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <p className="text-xs font-medium mb-3">Deal Size Range</p>
          <div className="space-y-4">
            <Slider
              min={0}
              max={1000000}
              step={5000}
              value={[dealSizeRange[0], dealSizeRange[1]]}
              onValueChange={(v) => onDealSizeRangeChange([v[0], v[1]])}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>${(dealSizeRange[0] / 1000).toFixed(0)}K</span>
              <span>{dealSizeRange[1] >= 1000000 ? "Any" : `$${(dealSizeRange[1] / 1000).toFixed(0)}K`}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1 h-7 text-muted-foreground"
          onClick={() => {
            onOwnerFilterChange("all");
            onStageFilterChange("all");
            onDealSizeRangeChange([0, 1000000]);
          }}
        >
          <X className="h-3 w-3" />
          Clear ({activeCount})
        </Button>
      )}
    </div>
  );
}
