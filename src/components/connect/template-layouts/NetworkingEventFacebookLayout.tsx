import { TemplateCanvasProps } from "../template-types";
export default function NetworkingEventFacebookLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0, c1] = data.colors ?? ["#1A1A1A", "#F5F0E8"];
  return (
    <div className="w-full rounded-lg overflow-hidden flex" style={{ minHeight: 220, aspectRatio: "940/788" }}>
      <div className="w-5/12 flex flex-col justify-between p-4" style={{ background: c0 }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Announcing</p>
          <h1 className={`text-base font-black text-white leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        </div>
        <button className={`mt-3 px-3 py-1.5 rounded text-xs font-bold text-gray-900 cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: c1 }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
      <div className="flex-1 flex flex-col justify-between p-4" style={{ background: c1 }}>
        <ul className="space-y-2">
          {data.bullets.map((b,i) => (
            <li key={i} className="text-[11px] text-gray-700 flex gap-2 items-start">
              <span className="font-bold text-gray-400">•</span>{b}
            </li>
          ))}
        </ul>
        {data.disclaimer && <p className="text-gray-400 text-[9px] mt-2">{data.disclaimer}</p>}
      </div>
    </div>
  );
}
