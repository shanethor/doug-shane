import { TemplateCanvasProps } from "../template-types";
export default function FinancialAdvisorInstagramBlueLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0,,c2] = data.colors ?? ["#1A3A6E","#FFFFFF","#4A90D9"];
  return (
    <div className="w-full aspect-square flex rounded-lg overflow-hidden" style={{ minHeight: 280 }}>
      <div className="w-1/2 flex flex-col justify-between p-4 text-white" style={{ background: c0 }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/60 mb-2">{data.brandName || "Agency"}</p>
          <h1 className={`text-base font-black leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        </div>
        <button className={`mt-3 py-1.5 rounded text-xs font-bold cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: c2 }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
      <div className="w-1/2 bg-white flex flex-col justify-center p-4">
        <ul className="space-y-2">
          {data.bullets.slice(0,4).map((b,i) => (
            <li key={i} className="text-[10px] text-gray-600 flex gap-1.5 items-start">
              <span className="font-bold text-xs" style={{ color: c0 }}>•</span>{b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
