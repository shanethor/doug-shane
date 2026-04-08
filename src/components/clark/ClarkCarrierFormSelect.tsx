import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

const ACORD_FORMS = [
  { id: "125", name: "ACORD 125 — Commercial Insurance Application" },
  { id: "126", name: "ACORD 126 — General Liability Section" },
  { id: "127", name: "ACORD 127 — Business Auto Section" },
  { id: "130", name: "ACORD 130 — Workers Compensation" },
  { id: "75", name: "ACORD 75 — Insurance Binder" },
];

interface ClarkCarrierFormSelectProps {
  suggestedForms: string[];
  onConfirm: (selectedForms: string[], carriers: string[]) => void;
}

export default function ClarkCarrierFormSelect({ suggestedForms, onConfirm }: ClarkCarrierFormSelectProps) {
  const [selectedForms, setSelectedForms] = useState<string[]>(suggestedForms);
  const [carriers, setCarriers] = useState<string[]>([""]);
  const [newCarrier, setNewCarrier] = useState("");

  const toggleForm = (id: string) => {
    setSelectedForms((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const addCarrier = () => {
    const trimmed = newCarrier.trim();
    if (trimmed && !carriers.includes(trimmed)) {
      setCarriers((prev) => {
        const filtered = prev.filter((c) => c !== "");
        return [...filtered, trimmed];
      });
      setNewCarrier("");
    }
  };

  const removeCarrier = (c: string) => setCarriers((prev) => prev.filter((x) => x !== c));

  const validCarriers = carriers.filter((c) => c.trim() !== "");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Select ACORD Forms & Carriers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">ACORD Forms</Label>
          <div className="space-y-1.5">
            {ACORD_FORMS.map((form) => (
              <label key={form.id} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={selectedForms.includes(form.id)}
                  onCheckedChange={() => toggleForm(form.id)}
                />
                <span>{form.name}</span>
                {suggestedForms.includes(form.id) && (
                  <Badge variant="secondary" className="text-[10px] h-4">suggested</Badge>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Target Carriers</Label>
          {validCarriers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {validCarriers.map((c) => (
                <Badge key={c} variant="outline" className="gap-1 text-xs">
                  {c}
                  <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => removeCarrier(c)} />
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newCarrier}
              onChange={(e) => setNewCarrier(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCarrier())}
              placeholder="e.g. Hartford, Travelers, Chubb..."
              className="h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={addCarrier} className="h-8 shrink-0">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <Button
          size="sm"
          className="w-full"
          disabled={selectedForms.length === 0}
          onClick={() => onConfirm(selectedForms, validCarriers.length > 0 ? validCarriers : ["General"])}
        >
          Confirm Selection
        </Button>
      </CardContent>
    </Card>
  );
}
