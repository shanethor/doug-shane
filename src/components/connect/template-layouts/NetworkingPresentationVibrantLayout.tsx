import { TemplateCanvasProps } from "../template-types";
export default function NetworkingPresentationVibrantLayout({ data, onFieldClick, activeField }: TemplateCanvasProps) {
  const green = data.colors?.[1] ?? "#00FF88";
  const gold  = data.colors?.[2] ?? "#FFD700";
  return (
    <div className="w-full rounded-lg overflow-hidden flex flex-col justify-between" style={{ background: "#0D0D0D", minHeight: 220, aspectRatio: "16/9" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: green }}>{data.brandName || "AURA Connect"}</div>
        <h1 className={`text-xl font-black leading-tight cursor-pointer ${activeField === "title" ? "ring-2 ring-yellow-300 rounded px-1" : ""}`} style={{ color: green }} onClick={() => onFieldClick("title")}>{data.title}</h1>
        <ul className="mt-3 space-y-1">
          {data.bullets.slice(0,3).map((b,i) => (
            <li key={i} className="text-[11px]" style={{ color: gold }}>◆ {b}</li>
          ))}
        </ul>
      </div>
      <div className="px-6 pb-4 text-center">
        <button className={`px-5 py-1.5 rounded text-xs font-bold cursor-pointer ${activeField === "cta" ? "ring-2 ring-yellow-300" : ""}`} style={{ background: green, color: "#0D0D0D" }} onClick={() => onFieldClick("cta")}>{data.cta}</button>
      </div>
    </div>
  );
}
