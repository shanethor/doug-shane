import { TemplateCanvasProps } from "../template-types";
export default function FinancialAdvisorInstagramBWLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const gold = data.colors?.[2] ?? "#D4AF37";
  return (
    <div className="w-full aspect-square flex flex-col rounded-lg overflow-hidden bg-[#F7F5F0]" style={{ minHeight: 280 }}>
      <div className="flex-1 px-5 pt-5 flex flex-col justify-between">
        <div>
          <div className="w-8 h-0.5 mb-3" style={{ background: gold }} />
          <h1 className={`text-xl font-black text-gray-900 leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        </div>
        <ul className="space-y-1 my-3">
          {data.bullets.slice(0, 3).map((b, i) => (
            <li key={i} className="text-xs text-gray-500 flex gap-2 items-start">
              <span style={{ color: gold }}>—</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 pb-4 flex items-center justify-between bg-gray-900">
        <p className="text-white/70 text-[10px]">{data.brandName || "Financial Advisor"}</p>
        <button className={`px-4 py-1 rounded text-xs font-bold text-gray-900 cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: gold }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
