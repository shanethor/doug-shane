import { TemplateCanvasProps } from "../template-types";
export default function FinancialAdvisorFlyerCleanLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const gold = data.colors?.[3] ?? "#B8860B";
  return (
    <div className="w-full h-full flex flex-col rounded-lg overflow-hidden bg-white" style={{ minHeight: 380 }}>
      <div className="px-5 pt-4 pb-2 border-b" style={{ borderColor: `${gold}40` }}>
        <p className="text-xs text-gray-400 uppercase tracking-widest">{data.brandName || "www.youragency.com"}</p>
      </div>
      <div className="flex-1 px-5 pt-5 pb-3">
        <h1 className={`text-2xl font-black text-gray-900 leading-tight mb-1 cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        <div className="w-10 h-1 rounded mb-3" style={{ background: gold }} />
        <ul className="space-y-2 mt-2">
          {data.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="font-bold text-sm" style={{ color: gold }}>›</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 pb-5 flex gap-2">
        <button className={`flex-1 py-2 rounded text-white text-xs font-bold cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: gold }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
