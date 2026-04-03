import { TemplateCanvasProps } from "../template-types";
export default function LifeInsuranceFlyerTealLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0, c1] = data.colors ?? ["#006B6B", "#00A878"];
  return (
    <div className="w-full h-full flex flex-col rounded-lg overflow-hidden bg-white" style={{ minHeight: 380 }}>
      <div className="px-5 pt-5 pb-4 text-white" style={{ background: `linear-gradient(135deg, ${c0}, ${c1})` }}>
        <p className="text-xs uppercase tracking-widest text-white/70 mb-1">{data.brandName || "Your Agency"}</p>
        <h1 className={`text-2xl font-black leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
      </div>
      <div className="flex-1 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: c0 }}>Our Services</p>
        <ul className="space-y-2">
          {data.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="font-bold" style={{ color: c1 }}>→</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 pb-5">
        <button className={`w-full py-2 rounded-lg text-white text-sm font-bold cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: c0 }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
        {data.disclaimer && <p className="text-gray-400 text-[10px] mt-2 text-center">{data.disclaimer}</p>}
      </div>
    </div>
  );
}
