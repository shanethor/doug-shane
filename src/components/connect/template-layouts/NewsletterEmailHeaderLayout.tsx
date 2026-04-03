import { TemplateCanvasProps } from "../template-types";
export default function NewsletterEmailHeaderLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0, c1] = data.colors ?? ["#1A3E7A", "#4A90D9"];
  return (
    <div className="w-full rounded-lg overflow-hidden flex items-stretch" style={{ minHeight: 120, background: `linear-gradient(90deg, ${c0} 0%, ${c1} 100%)` }}>
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="text-xs font-bold text-white/60 uppercase tracking-widest">{data.brandName || "Your Brand"}</div>
        <h1 className={`text-lg font-black text-white cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        <button className={`self-start mt-1 px-3 py-1 rounded text-xs font-bold text-white border border-white/50 cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
