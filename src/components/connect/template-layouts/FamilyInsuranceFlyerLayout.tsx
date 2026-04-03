import { TemplateCanvasProps } from "../template-types";

export default function FamilyInsuranceFlyerLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const primary = data.colors?.[0] ?? "#1A3E7A";
  const accent = data.colors?.[2] ?? "#4A90D9";
  return (
    <div className="w-full h-full flex flex-col rounded-lg overflow-hidden" style={{ background: primary, minHeight: 380 }}>
      <div className="px-5 pt-5 pb-3 cursor-pointer" onClick={() => onFieldClick("title")}>
        <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: accent }}>
          {data.brandName || "Insurance Agency"}
        </div>
        <h1 className={`text-2xl font-black leading-tight text-white ${activeField === "title" ? "ring-2 ring-yellow-300 rounded" : ""}`}>
          {data.title}
        </h1>
      </div>
      <div className="flex-1 bg-white mx-4 rounded-xl p-4 shadow">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: primary }}>
          Why Choose Us
        </p>
        <ul className="space-y-1.5">
          {data.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <span className="font-bold mt-0.5" style={{ color: accent }}>✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 text-center">
        <button
          className={`px-5 py-2 rounded-full text-white text-xs font-bold shadow ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`}
          style={{ background: accent }}
          onClick={() => onFieldClick("cta")}
        >
          {data.cta}
        </button>
        {data.disclaimer && <p className="text-white/50 text-[10px] mt-2">{data.disclaimer}</p>}
      </div>
    </div>
  );
}
