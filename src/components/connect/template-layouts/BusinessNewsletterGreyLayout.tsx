import { TemplateCanvasProps } from "../template-types";
export default function BusinessNewsletterGreyLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  return (
    <div className="w-full rounded-lg overflow-hidden flex flex-col" style={{ minHeight: 340 }}>
      <div className="px-5 pt-4 pb-3 bg-black flex justify-between items-center">
        <span className="text-white font-black tracking-wider text-sm">{data.brandName || "NEWSLETTER"}</span>
        <span className="text-white/40 text-[10px]">Monthly Edition</span>
      </div>
      <div className="flex-1 px-5 py-4 bg-white">
        <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Top News</div>
        <h2 className={`text-xl font-black text-gray-900 leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h2>
        <div className="h-px bg-gray-200 my-3" />
        <ul className="space-y-1.5">
          {data.bullets.slice(0,3).map((b,i)=>(
            <li key={i} className="text-xs text-gray-600 flex gap-2 items-start">
              <span className="text-gray-400">›</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 py-3 bg-gray-100 flex justify-between items-center">
        <span className="text-gray-400 text-[10px]">Unsubscribe</span>
        <button className={`px-4 py-1 rounded bg-gray-900 text-xs font-bold text-white cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
