import { TemplateCanvasProps } from "../template-types";
export default function NetworkingStepsInfographicLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [c0,,c2] = data.colors ?? ["#2C3E50","#E74C3C","#3498DB"];
  return (
    <div className="w-full aspect-square flex flex-col rounded-lg overflow-hidden" style={{ background: c0, minHeight: 280 }}>
      <div className="px-4 pt-4 pb-2">
        <h1 className={`text-base font-black text-white text-center cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        <div className="w-12 h-0.5 mx-auto mt-1" style={{ background: c2 }} />
      </div>
      <div className="flex-1 px-4 py-2 space-y-1.5 overflow-hidden">
        {data.bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-2 bg-white/10 rounded px-2 py-1.5">
            <span className="text-xs font-black rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0" style={{ background: c2, color: "#fff" }}>{i+1}</span>
            <span className="text-[10px] text-white/80 leading-tight">{b}</span>
          </div>
        ))}
      </div>
      <div className="px-4 pb-3 text-center">
        <button className={`px-4 py-1.5 rounded text-xs font-bold text-white cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: c2 }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
