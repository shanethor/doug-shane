import { TemplateCanvasProps } from "../template-types";
export default function NetworkingEventPosterLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0, c1, c2] = data.colors ?? ["#1A1A1A", "#F5F0E8", "#8B7355"];
  return (
    <div className="w-full h-full flex flex-col rounded-lg overflow-hidden" style={{ background: c1, minHeight: 380 }}>
      <div className="px-5 pt-5 pb-4 border-b-2" style={{ borderColor: c2 }}>
        <div className="flex gap-1 mb-1">{[...Array(3)].map((_,i) => <div key={i} className="flex-1 h-0.5" style={{ background: c0 }}/>)}</div>
        <h1 className={`text-2xl font-black uppercase tracking-wide leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} style={{ color: c0 }} onClick={() => onFieldClick("title")}>{data.title}</h1>
      </div>
      <div className="grid grid-cols-3 gap-1 px-5 py-3">
        {[...Array(6)].map((_,i) => (
          <div key={i} className="aspect-square rounded bg-gray-300/40" />
        ))}
      </div>
      <div className="flex-1 px-5 pb-3">
        <ul className="space-y-1.5">
          {data.bullets.map((b,i) => (
            <li key={i} className="text-xs flex gap-2 items-start" style={{ color: c0 }}>
              <span style={{ color: c2 }}>●</span>{b}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 pb-4 text-center">
        <button className={`px-6 py-2 rounded text-sm font-black tracking-wider text-white cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: c0 }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
        {data.disclaimer && <p className="text-[9px] mt-1" style={{ color: c2 }}>{data.disclaimer}</p>}
      </div>
    </div>
  );
}
