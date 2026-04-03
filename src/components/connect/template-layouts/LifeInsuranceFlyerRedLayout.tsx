import { TemplateCanvasProps } from "../template-types";
export default function LifeInsuranceFlyerRedLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const primary = data.colors?.[0] ?? "#C0392B";
  return (
    <div className="w-full h-full flex flex-col rounded-lg overflow-hidden" style={{ minHeight: 380 }}>
      <div className="px-5 pt-5 pb-4 text-white" style={{ background: primary }}>
        <h1 className={`text-2xl font-black leading-tight cursor-pointer uppercase ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
      </div>
      <div className="flex-1 bg-white px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-500">Benefits</p>
        <ul className="space-y-2">
          {data.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-base font-bold leading-snug" style={{ color: primary }}>•</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 pb-5 bg-gray-50 pt-3 text-center">
        <button className={`px-8 py-2 rounded-full text-white text-sm font-bold cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: primary }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
