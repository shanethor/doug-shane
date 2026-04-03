import { TemplateCanvasProps } from "../template-types";
export default function BusinessNewsletterOrangeLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const orange = data.colors?.[0] ?? "#FF6600";
  return (
    <div className="w-full rounded-lg overflow-hidden flex flex-col" style={{ minHeight: 340 }}>
      <div className="px-5 pt-4 pb-3 flex justify-between items-center" style={{ background: orange }}>
        <span className="text-white font-black tracking-wider text-sm">{data.brandName || "NEWSLETTER"}</span>
        <span className="text-white/70 text-[10px]">Industry Update</span>
      </div>
      <div className="flex-1 px-5 py-4 bg-[#1A1A1A]">
        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: orange }}>Top News</div>
        <h2 className={`text-lg font-black text-white leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h2>
        <ul className="mt-3 space-y-1.5">
          {data.bullets.slice(0,3).map((b,i)=>(
            <li key={i} className="text-xs text-gray-300 flex gap-2 items-start">
              <span style={{ color: orange }}>›</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 py-3 bg-black flex justify-end">
        <button className={`px-4 py-1.5 rounded text-xs font-bold text-white cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: orange }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
