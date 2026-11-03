import type { Category } from "@/lib/catalog";

/** Drawn stand-in shown until a product photo is uploaded. */
export default function GarmentArt({ category, color }: { category: Category; color: string }) {
  const seam = { stroke: "#000", strokeOpacity: 0.16, strokeWidth: 1.2, fill: "none" } as const;
  let body: React.ReactNode;
  if (category === "hoodie") {
    const hood = "M104 72C104 40 124 22 150 22S196 40 196 72C186 92 170 100 150 100S114 92 104 72Z";
    body = (
      <>
        <path d="M96 70C110 92 128 104 150 104S190 92 204 70L252 92C262 96 268 104 270 114L290 236 256 246 236 150V318C236 324 232 328 226 328H74C68 328 64 324 64 318V150L44 246 10 236 30 114C32 104 38 96 48 92Z" fill={color} />
        <path d={hood} fill={color} />
        <path d={hood} fill="#000" fillOpacity={0.14} />
        <path d="M118 74C126 86 138 92 150 92S174 86 182 74" {...seam} />
        <path d="M140 100V150M160 100V146" {...seam} />
        <path d="M98 232H202L214 290H86Z" {...seam} />
        <path d="M64 310H236M10 236 44 246M256 246 290 236" {...seam} />
      </>
    );
  } else if (category === "pants") {
    body = (
      <>
        <path d="M86 24H214L222 62 240 334H174L150 118 126 334H60L78 62Z" fill={color} />
        <path d="M80 52H220" stroke="#000" strokeOpacity={0.16} strokeWidth={20} />
        <path d="M150 62V118M140 62 132 84M160 62 168 84M62 318H124M176 318H238" {...seam} />
      </>
    );
  } else if (category === "acc") {
    const brim = "M64 206H236C268 210 284 220 280 232 258 244 216 240 150 238 108 237 80 232 62 222Z";
    body = (
      <>
        <path d="M64 206C64 128 100 88 150 88S236 128 236 206Z" fill={color} />
        <path d={brim} fill={color} />
        <path d={brim} fill="#000" fillOpacity={0.1} />
        <path d="M150 90V206M150 90C120 110 104 150 100 206M150 90C180 110 196 150 200 206" {...seam} />
      </>
    );
  } else {
    body = (
      <>
        <path d="M102 46C116 62 132 68 150 68S184 62 198 46L262 74 290 150 248 168 232 128V318C232 324 228 328 222 328H78C72 328 68 324 68 318V128L52 168 10 150 38 74Z" fill={color} />
        <path d="M68 128 52 168M232 128 248 168M68 316H232" {...seam} />
      </>
    );
  }
  return (
    <svg viewBox="0 0 300 350" aria-hidden="true" className="art">
      {body}
    </svg>
  );
}
