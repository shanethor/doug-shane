import { TemplateCanvasProps } from "../template-types";
export default function FinancialAdvisorInstagramGreenLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0,,c2] = data.colors ?? ["#1B4332","#FFFFFF","#40916C"];
  return (
    <div className="w-full aspect-square flex flex-col rounded-lg overflow-hidden" style={{ background: c0, minHeight: 280 }}>
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: c2 }}>{data.brandName || "Financial Advisor"}</div>
          <h1 className={`text-xl font-black text-white leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        </div>
        <ul className="mt-2 space-y-1">
          {data.bullets.slice(0,3).map((b,i) => (
            <li key={i} className="text-[10px] text-white/70 flex gap-2">
              <span style={{ color: c2 }}>✓</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white px-5 py-3 flex justify-between items-center">
        <span className="text-xs text-gray-500">{data.brandName || "Your Agency"}</span>
        <button className={`px-4 py-1 rounded-full text-white text-xs font-bold cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: c0 }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
