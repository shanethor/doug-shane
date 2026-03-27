import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas, FabricObject, Textbox, Rect, Circle, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Download, Type, Square, CircleIcon,
  Image as ImageIcon, Trash2, Copy, Undo2, Redo2,
  ZoomIn, ZoomOut, Layers, MousePointer, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, Loader2, MoveUp, MoveDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DesignEditorProps {
  creationId?: string;
  templateId?: string;
  initialDesignJson?: any;
  width?: number;
  height?: number;
  title?: string;
  brandColors?: string[];
  brandName?: string;
  disclaimer?: string;
  onBack: () => void;
}

export default function DesignEditor({
  creationId, templateId, initialDesignJson, width = 1080, height = 1080,
  title: initialTitle = "Untitled", brandColors = [], brandName = "", disclaimer = "",
  onBack,
}: DesignEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(creationId || "");
  const [docTitle, setDocTitle] = useState(initialTitle);
  const [selectedObj, setSelectedObj] = useState<FabricObject | null>(null);
  const [zoom, setZoom] = useState(0.45);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [objects, setObjects] = useState<FabricObject[]>([]);
  const undoingRef = useRef(false);

  // Init canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new Canvas(canvasRef.current, {
      width: width * zoom,
      height: height * zoom,
      backgroundColor: "#ffffff",
      selection: true,
    });
    canvas.setZoom(zoom);
    fabricRef.current = canvas;

    canvas.on("selection:created", (e) => { setSelectedObj(e.selected?.[0] || null); });
    canvas.on("selection:updated", (e) => { setSelectedObj(e.selected?.[0] || null); });
    canvas.on("selection:cleared", () => { setSelectedObj(null); });
    canvas.on("object:modified", () => { pushHistory(); syncObjects(); });
    canvas.on("object:added", () => { if (!undoingRef.current) { pushHistory(); syncObjects(); } });
    canvas.on("object:removed", () => { if (!undoingRef.current) syncObjects(); });

    // Load initial design
    if (initialDesignJson?.objects) {
      loadDesignJson(canvas, initialDesignJson);
    }

    return () => { canvas.dispose(); };
  }, []);

  // Update zoom
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setZoom(zoom);
    canvas.setDimensions({ width: width * zoom, height: height * zoom });
    canvas.renderAll();
  }, [zoom, width, height]);

  function syncObjects() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setObjects([...canvas.getObjects()]);
  }

  function pushHistory() {
    const canvas = fabricRef.current;
    if (!canvas || undoingRef.current) return;
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const next = [...prev.slice(0, historyIdx + 1), json];
      setHistoryIdx(next.length - 1);
      return next.slice(-30); // keep last 30 states
    });
  }

  function undo() {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    undoingRef.current = true;
    fabricRef.current?.loadFromJSON(JSON.parse(history[newIdx])).then(() => {
      fabricRef.current?.renderAll();
      setHistoryIdx(newIdx);
      syncObjects();
      undoingRef.current = false;
    });
  }

  function redo() {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    undoingRef.current = true;
    fabricRef.current?.loadFromJSON(JSON.parse(history[newIdx])).then(() => {
      fabricRef.current?.renderAll();
      setHistoryIdx(newIdx);
      syncObjects();
      undoingRef.current = false;
    });
  }

  function resolveBrandTokens(json: any): any {
    const str = JSON.stringify(json)
      .replace(/\{\{primaryColor\}\}/g, brandColors[0] || "#8A9A8C")
      .replace(/\{\{secondaryColor\}\}/g, brandColors[1] || "#F5F5F0")
      .replace(/\{\{brandName\}\}/g, brandName || "Your Brand")
      .replace(/\{\{disclaimer\}\}/g, disclaimer || "");
    return JSON.parse(str);
  }

  async function loadDesignJson(canvas: Canvas, json: any) {
    const resolved = resolveBrandTokens(json);
    try {
      await canvas.loadFromJSON(resolved);
      canvas.renderAll();
      pushHistory();
      syncObjects();
    } catch (e) {
      console.error("Failed to load design JSON:", e);
      // Fallback: manually create objects
      if (resolved.objects) {
        for (const obj of resolved.objects) {
          try {
            if (obj.type === "textbox") {
              const tb = new Textbox(obj.text || "Text", {
                left: obj.left || 0, top: obj.top || 0, width: obj.width || 400,
                fontSize: obj.fontSize || 24, fill: obj.fill || "#000000",
                fontFamily: obj.fontFamily || "Arial", fontWeight: obj.fontWeight || "normal",
                textAlign: obj.textAlign || "left", lineHeight: obj.lineHeight || 1.2,
              });
              canvas.add(tb);
            } else if (obj.type === "rect") {
              const r = new Rect({
                left: obj.left || 0, top: obj.top || 0,
                width: obj.width || 100, height: obj.height || 100,
                fill: obj.fill || "#cccccc", rx: obj.rx || 0, ry: obj.ry || 0,
                opacity: obj.opacity ?? 1, selectable: obj.selectable !== false,
              });
              canvas.add(r);
            }
          } catch {}
        }
        canvas.renderAll();
        pushHistory();
        syncObjects();
      }
    }
  }

  function addText() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const tb = new Textbox("Edit me", {
      left: 100, top: 100, width: 400,
      fontSize: 32, fill: "#000000", fontFamily: "Arial",
    });
    canvas.add(tb);
    canvas.setActiveObject(tb);
    canvas.renderAll();
  }

  function addRect() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const r = new Rect({
      left: 100, top: 100, width: 200, height: 200,
      fill: brandColors[0] || "#8A9A8C", rx: 8, ry: 8,
    });
    canvas.add(r);
    canvas.setActiveObject(r);
    canvas.renderAll();
  }

  function addCircle() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const c = new Circle({
      left: 100, top: 100, radius: 80,
      fill: brandColors[1] || "#F5F5F0",
    });
    canvas.add(c);
    canvas.setActiveObject(c);
    canvas.renderAll();
  }

  async function addImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        try {
          const img = await FabricImage.fromURL(reader.result as string);
          img.scaleToWidth(300);
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        } catch (err) {
          toast.error("Failed to add image");
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function deleteSelected() {
    const canvas = fabricRef.current;
    if (!canvas || !selectedObj) return;
    canvas.remove(selectedObj);
    setSelectedObj(null);
    canvas.renderAll();
    pushHistory();
  }

  function duplicateSelected() {
    const canvas = fabricRef.current;
    if (!canvas || !selectedObj) return;
    selectedObj.clone().then((cloned: FabricObject) => {
      cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  }

  function moveLayer(dir: "up" | "down") {
    const canvas = fabricRef.current;
    if (!canvas || !selectedObj) return;
    if (dir === "up") canvas.bringObjectForward(selectedObj);
    else canvas.sendObjectBackwards(selectedObj);
    canvas.renderAll();
    syncObjects();
  }

  function updateSelected(prop: string, value: any) {
    if (!selectedObj) return;
    (selectedObj as any).set(prop, value);
    fabricRef.current?.renderAll();
    pushHistory();
    // Force re-render of inspector
    setSelectedObj({ ...selectedObj } as any);
  }

  function getCanvasJSON() {
    return fabricRef.current?.toJSON() || {};
  }

  async function saveCreation() {
    setSaving(true);
    try {
      const json = getCanvasJSON();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (savedId) {
        await supabase.from("design_creations" as any).update({
          title: docTitle, design_json: json, updated_at: new Date().toISOString(),
        } as any).eq("id", savedId);
      } else {
        const { data, error } = await supabase.from("design_creations" as any).insert({
          user_id: user.id, template_id: templateId || null,
          title: docTitle, design_json: json, width, height,
        } as any).select("id").single();
        if (error) throw error;
        setSavedId((data as any).id);
      }
      toast.success("Saved");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function exportImage(format: "png" | "jpeg") {
    const canvas = fabricRef.current;
    if (!canvas) return;
    // Export at full resolution
    const prevZoom = canvas.getZoom();
    canvas.setZoom(1);
    canvas.setDimensions({ width, height });
    const dataURL = canvas.toDataURL({
      format, quality: 0.95, multiplier: 1,
    });
    canvas.setZoom(prevZoom);
    canvas.setDimensions({ width: width * prevZoom, height: height * prevZoom });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `${docTitle || "design"}.${format === "jpeg" ? "jpg" : format}`;
    link.click();
    toast.success(`Exported as ${format.toUpperCase()}`);
  }

  // Auto-save every 10s
  useEffect(() => {
    if (!savedId) return;
    const interval = setInterval(() => {
      const json = getCanvasJSON();
      supabase.from("design_creations" as any).update({
        design_json: json, updated_at: new Date().toISOString(),
      } as any).eq("id", savedId).then(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [savedId]);

  const isTextbox = selectedObj instanceof Textbox || (selectedObj as any)?.type === "textbox";

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-background">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-card shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Input
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          className="h-8 w-48 text-sm bg-muted/30"
          placeholder="Design title"
        />
        <Badge variant="outline" className="text-[9px] shrink-0">{width}×{height}</Badge>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={undo} disabled={historyIdx <= 0} title="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={redo} disabled={historyIdx >= history.length - 1} title="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(0.15, z - 0.1))} title="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} title="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={saveCreation} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
        </Button>
        <Select onValueChange={(v) => exportImage(v as "png" | "jpeg")}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <Download className="h-3 w-3 mr-1" />
            Export
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpeg">JPG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Element tools */}
        <div className="w-14 border-r bg-card/50 flex flex-col items-center gap-1 py-3 shrink-0">
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0 flex flex-col gap-0.5" title="Select" onClick={() => fabricRef.current?.discardActiveObject()}>
            <MousePointer className="h-4 w-4" />
            <span className="text-[8px]">Select</span>
          </Button>
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0 flex flex-col gap-0.5" title="Add Text" onClick={addText}>
            <Type className="h-4 w-4" />
            <span className="text-[8px]">Text</span>
          </Button>
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0 flex flex-col gap-0.5" title="Add Rectangle" onClick={addRect}>
            <Square className="h-4 w-4" />
            <span className="text-[8px]">Rect</span>
          </Button>
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0 flex flex-col gap-0.5" title="Add Circle" onClick={addCircle}>
            <CircleIcon className="h-4 w-4" />
            <span className="text-[8px]">Circle</span>
          </Button>
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0 flex flex-col gap-0.5" title="Add Image" onClick={addImage}>
            <ImageIcon className="h-4 w-4" />
            <span className="text-[8px]">Image</span>
          </Button>
          <Separator className="my-1 w-8" />
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0 flex flex-col gap-0.5" title="Layers" disabled>
            <Layers className="h-4 w-4" />
            <span className="text-[8px]">Layers</span>
          </Button>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 p-8">
          <div className="shadow-2xl" style={{ border: "1px solid hsl(var(--border))" }}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="w-56 border-l bg-card/50 overflow-y-auto shrink-0">
          <div className="p-3 space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Properties</p>

            {!selectedObj ? (
              <p className="text-xs text-muted-foreground">Select an element to edit its properties.</p>
            ) : (
              <div className="space-y-3">
                {/* Position & Size */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9px] text-muted-foreground">X</label>
                    <Input className="h-7 text-xs bg-muted/30" type="number" value={Math.round(selectedObj.left || 0)}
                      onChange={(e) => updateSelected("left", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Y</label>
                    <Input className="h-7 text-xs bg-muted/30" type="number" value={Math.round(selectedObj.top || 0)}
                      onChange={(e) => updateSelected("top", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">W</label>
                    <Input className="h-7 text-xs bg-muted/30" type="number" value={Math.round((selectedObj.width || 0) * (selectedObj.scaleX || 1))}
                      onChange={(e) => updateSelected("width", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">H</label>
                    <Input className="h-7 text-xs bg-muted/30" type="number" value={Math.round((selectedObj.height || 0) * (selectedObj.scaleY || 1))}
                      onChange={(e) => updateSelected("height", Number(e.target.value))} />
                  </div>
                </div>

                {/* Fill color */}
                <div>
                  <label className="text-[9px] text-muted-foreground">Fill</label>
                  <div className="flex gap-1.5 items-center">
                    <input type="color" value={String(selectedObj.fill || "#000000")} className="w-7 h-7 rounded cursor-pointer border-0"
                      onChange={(e) => updateSelected("fill", e.target.value)} />
                    <Input className="h-7 text-xs bg-muted/30 flex-1" value={String(selectedObj.fill || "")}
                      onChange={(e) => updateSelected("fill", e.target.value)} />
                  </div>
                  {brandColors.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {brandColors.map((c, i) => (
                        <button key={i} className="w-5 h-5 rounded border cursor-pointer hover:scale-110 transition-transform"
                          style={{ background: c }} onClick={() => updateSelected("fill", c)} title={c} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Opacity */}
                <div>
                  <label className="text-[9px] text-muted-foreground">Opacity</label>
                  <Input className="h-7 text-xs bg-muted/30" type="number" min={0} max={1} step={0.05}
                    value={selectedObj.opacity ?? 1} onChange={(e) => updateSelected("opacity", Number(e.target.value))} />
                </div>

                {/* Text properties */}
                {isTextbox && (
                  <>
                    <Separator />
                    <p className="text-[9px] font-medium text-muted-foreground">TEXT</p>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Font Size</label>
                      <Input className="h-7 text-xs bg-muted/30" type="number" value={(selectedObj as any).fontSize || 24}
                        onChange={(e) => updateSelected("fontSize", Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Font</label>
                      <Select value={(selectedObj as any).fontFamily || "Arial"} onValueChange={(v) => updateSelected("fontFamily", v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Arial", "Georgia", "Times New Roman", "Helvetica", "Verdana", "Courier New", "Impact"].map(f => (
                            <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-1">
                      <Button variant={(selectedObj as any).fontWeight === "bold" ? "default" : "outline"} size="sm" className="h-7 w-7 p-0"
                        onClick={() => updateSelected("fontWeight", (selectedObj as any).fontWeight === "bold" ? "normal" : "bold")}>
                        <Bold className="h-3 w-3" />
                      </Button>
                      <Button variant={(selectedObj as any).fontStyle === "italic" ? "default" : "outline"} size="sm" className="h-7 w-7 p-0"
                        onClick={() => updateSelected("fontStyle", (selectedObj as any).fontStyle === "italic" ? "normal" : "italic")}>
                        <Italic className="h-3 w-3" />
                      </Button>
                      <Separator orientation="vertical" className="h-7" />
                      <Button variant={(selectedObj as any).textAlign === "left" ? "default" : "outline"} size="sm" className="h-7 w-7 p-0"
                        onClick={() => updateSelected("textAlign", "left")}><AlignLeft className="h-3 w-3" /></Button>
                      <Button variant={(selectedObj as any).textAlign === "center" ? "default" : "outline"} size="sm" className="h-7 w-7 p-0"
                        onClick={() => updateSelected("textAlign", "center")}><AlignCenter className="h-3 w-3" /></Button>
                      <Button variant={(selectedObj as any).textAlign === "right" ? "default" : "outline"} size="sm" className="h-7 w-7 p-0"
                        onClick={() => updateSelected("textAlign", "right")}><AlignRight className="h-3 w-3" /></Button>
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Line Height</label>
                      <Input className="h-7 text-xs bg-muted/30" type="number" min={0.5} max={3} step={0.1}
                        value={(selectedObj as any).lineHeight || 1.2} onChange={(e) => updateSelected("lineHeight", Number(e.target.value))} />
                    </div>
                  </>
                )}

                <Separator />
                {/* Actions */}
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={duplicateSelected}>
                    <Copy className="h-3 w-3" /> Duplicate
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => moveLayer("up")}>
                    <MoveUp className="h-3 w-3" /> Up
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => moveLayer("down")}>
                    <MoveDown className="h-3 w-3" /> Down
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 text-[10px] gap-1" onClick={deleteSelected}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            )}

            {/* Layers list */}
            <Separator />
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Layers ({objects.length})</p>
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {[...objects].reverse().map((obj, i) => (
                <button
                  key={i}
                  className={`w-full text-left px-2 py-1 rounded text-[10px] truncate transition-colors ${
                    selectedObj === obj ? "bg-primary/20 text-primary" : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                  onClick={() => { fabricRef.current?.setActiveObject(obj); fabricRef.current?.renderAll(); setSelectedObj(obj); }}
                >
                  {(obj as any).type === "textbox" ? `T: ${(obj as any).text?.slice(0, 20) || "Text"}` :
                   (obj as any).type === "rect" ? "■ Rectangle" :
                   (obj as any).type === "circle" ? "● Circle" :
                   (obj as any).type === "image" ? "🖼 Image" :
                   (obj as any).type || "Element"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
