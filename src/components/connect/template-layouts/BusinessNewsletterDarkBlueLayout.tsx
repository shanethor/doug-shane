import { TemplateCanvasProps } from "../template-types";
export default function BusinessNewsletterDarkBlueLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0, c1, c2] = data.colors ?? ["#0D0D0D", "#1A3E7A", "#4A90D9"];
  return (
    <div className="w-full rounded-lg overflow-hidden flex flex-col" style={{ minHeight: 340 }}>
      <div className="px-5 pt-4 pb-3 flex justify-between items-center" style={{ background: c0 }}>
        <span className="text-white font-black tracking-wider text-sm">{data.brandName || "NEWSLETTER"}</span>
        <span className="text-white/40 text-[10px]">Monthly Edition</span>
      </div>
      <div className="px-5 py-4 text-white flex-1" style={{ background: c1 }}>
        <div className="text-[10px] uppercase tracking-widest text-white/60 mb-1">Top News</div>
        <h2 className={`text-lg font-black leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h2>
        <ul className="mt-3 space-y-1">
          {data.bullets.slice(0,3).map((b,i)=>(
            <li key={i} className="text-[11px] text-white/80 flex gap-2 items-start">
              <span style={{ color: c2 }}>›</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 py-3 flex justify-between items-center" style={{ background: c0 }}>
        <span className="text-white/40 text-[10px]">{data.disclaimer}</span>
        <button className={`px-4 py-1 rounded text-xs font-bold text-white cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: c2 }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
