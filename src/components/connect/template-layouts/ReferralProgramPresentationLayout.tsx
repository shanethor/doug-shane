import { TemplateCanvasProps } from "../template-types";
export default function ReferralProgramPresentationLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const [green, blue] = data.colors ?? ["#00E676", "#1565C0"];
  return (
    <div className="w-full rounded-lg overflow-hidden flex flex-col justify-between" style={{ background: "#0D0D0D", minHeight: 220, aspectRatio: "16/9" }}>
      <div className="flex items-center justify-center flex-1 flex-col px-6 text-center">
        <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: green }}>INTRODUCING</div>
        <h1 className={`text-xl font-black text-white leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} onClick={() => onFieldClick("title")}>{data.title}</h1>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {data.bullets.slice(0,4).map((b,i) => (
            <div key={i} className="text-[10px] text-white/70 rounded px-2 py-1" style={{ background: `${blue}40`, border: `1px solid ${blue}60` }}>
              {b}
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 pb-4 text-center">
        <button className={`px-5 py-1.5 rounded text-xs font-bold cursor-pointer text-gray-900 ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: green }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
