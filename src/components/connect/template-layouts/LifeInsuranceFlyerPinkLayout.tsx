import { TemplateCanvasProps } from "../template-types";
export default function LifeInsuranceFlyerPinkLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0,,c2] = data.colors ?? ["#F48FB1", "#FFFFFF", "#E91E8C"];
  return (
    <div className="w-full h-full flex flex-col rounded-lg overflow-hidden bg-pink-50" style={{ minHeight: 380 }}>
      <div className="px-5 pt-5 pb-3" style={{ background: c0 }}>
        <p className="text-white/80 text-xs uppercase tracking-widest mb-1">{data.brandName || "Life Insurance Services"}</p>
        <h1 className={`text-xl font-black text-white leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
      </div>
      <div className="flex-1 px-5 py-4">
        <ul className="space-y-2">
          {data.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="font-bold" style={{ color: c2 }}>♥</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 pb-5 text-center">
        <button className={`px-6 py-2 rounded-full text-white text-xs font-bold cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: c2 }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
        {data.disclaimer && <p className="text-gray-400 text-[9px] mt-2">{data.disclaimer}</p>}
      </div>
    </div>
  );
}
