import { TemplateCanvasProps } from "../template-types";
export default function InsuranceAgencyServiceFlyerLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0, c1, c2] = data.colors ?? ["#0F2B6B", "#1E5FBF", "#3A9EDB"];
  return (
    <div className="w-full h-full flex flex-col rounded-lg overflow-hidden" style={{ background: `linear-gradient(160deg, ${c0} 0%, ${c1} 60%, ${c2} 100%)`, minHeight: 380 }}>
      <div className="px-5 pt-5 pb-2 border-b border-white/20">
        <p className="text-white/60 text-[10px] uppercase tracking-widest">{data.brandName || "Liceria & Co."}</p>
        <h1 className={`text-xl font-black text-white mt-1 cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
      </div>
      <div className="flex-1 px-5 py-3 space-y-2">
        {data.bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 text-xs text-white">
            <span className="w-4 h-4 rounded border border-white/50 flex items-center justify-center text-[9px]">✓</span>
            {b}
          </div>
        ))}
      </div>
      <div className="p-4 bg-black/20 text-center">
        <button className={`px-5 py-2 rounded text-xs font-bold text-white border border-white/60 ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
