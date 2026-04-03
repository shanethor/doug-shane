import { TemplateCanvasProps } from "../template-types";
export default function NetworkingEventLinkedInLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0,,, c3] = data.colors ?? ["#1A3E7A", "#F5A623", "#FFFFFF", "#E8F0FE"];
  const accent = data.colors?.[1] ?? "#F5A623";
  return (
    <div className="w-full rounded-lg overflow-hidden flex" style={{ minHeight: 200, aspectRatio: "1200/627" }}>
      <div className="w-1/2 flex flex-col justify-between p-5" style={{ background: c0 }}>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: accent, color: "#1A1A1A" }}>Event</span>
          <h1 className={`text-base font-black text-white mt-2 leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        </div>
        <button className={`self-start px-4 py-1.5 rounded text-xs font-bold text-gray-900 cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: accent }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
      <div className="flex-1 flex flex-col justify-center p-5" style={{ background: c3 ?? "#E8F0FE" }}>
        <ul className="space-y-2">
          {data.bullets.map((b,i) => (
            <li key={i} className="text-xs text-gray-700 flex gap-2 items-start">
              <span className="font-bold" style={{ color: c0 }}>→</span>{b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
