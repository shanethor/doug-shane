import { TemplateCanvasProps } from "../template-types";
export default function NetworkingPresentationBlueLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0, c1] = data.colors ?? ["#1A3E7A", "#4A90D9"];
  return (
    <div className="w-full rounded-lg overflow-hidden flex flex-col" style={{ minHeight: 220, aspectRatio: "16/9", background: `linear-gradient(135deg, ${c0}, ${c1})` }}>
      <div className="flex-1 flex flex-col items-start justify-center px-8">
        <div className="text-xs uppercase tracking-widest text-white/60 mb-2">{data.brandName || "Business Presentation"}</div>
        <h1 className={`text-2xl font-black text-white leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        <div className="w-12 h-0.5 bg-white/40 mt-3 mb-3" />
        <ul className="space-y-1">
          {data.bullets.slice(0,3).map((b,i) => (
            <li key={i} className="text-xs text-white/70 flex gap-2 items-start">
              <span className="text-white/40">—</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-8 pb-4">
        <button className={`px-5 py-1.5 rounded text-xs font-bold text-gray-900 bg-white cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
