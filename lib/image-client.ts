/**
 * Prepares product photos in the browser before upload:
 * 1. cuts off uniform borders (e.g. black bars from screenshots or wide white margins),
 * 2. pads the photo to the shop's 3:4 frame with its own background colour, so it sits cleanly in every tile,
 * 3. scales it down and saves it as JPEG, so it loads fast on phones.
 */

const RATIO = 3 / 4; // width / height of product tiles
const TOL = 22; // colour distance that still counts as "same background"

type RGB = [number, number, number];
type Pixels = { data: Uint8ClampedArray; w: number; h: number };

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }
}

function canvasOf(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

const px = (p: Pixels, x: number, y: number): RGB => {
  const i = (y * p.w + x) * 4;
  // Transparent pixels count as white (PNG cut-outs).
  const a = p.data[i + 3] / 255;
  return [p.data[i] * a + 255 * (1 - a), p.data[i + 1] * a + 255 * (1 - a), p.data[i + 2] * a + 255 * (1 - a)];
};
const dist = (a: RGB, b: RGB) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

/** Typical colour of a set of pixels (per-channel median, so a product touching the edge does not tint it). */
function mean(list: RGB[]): RGB {
  const med = (ch: 0 | 1 | 2) => {
    const v = list.map((c) => c[ch]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  return [med(0), med(1), med(2)];
}

/** Pixels of one line (row or column) between start and end. */
function line(p: Pixels, horizontal: boolean, index: number, start: number, end: number) {
  const out: RGB[] = [];
  const step = Math.max(1, Math.floor((end - start) / 400));
  for (let k = start; k < end; k += step) out.push(horizontal ? px(p, k, index) : px(p, index, k));
  return out;
}

/** True if at least `share` of the pixels are within TOL of `color`. */
const uniform = (pixels: RGB[], color: RGB, share = 0.985) => pixels.filter((c) => dist(c, color) <= TOL).length >= pixels.length * share;

/** Finds the box inside uniform borders. Each side is checked on its own, so e.g. only left/right black bars are removed. */
function contentBox(p: Pixels) {
  let top = 0, bottom = p.h - 1, left = 0, right = p.w - 1;
  const maxCut = 0.42;
  const trim = (side: "top" | "bottom" | "left" | "right") => {
    const horizontal = side === "top" || side === "bottom";
    const first = side === "top" ? top : side === "bottom" ? bottom : side === "left" ? left : right;
    const edge = horizontal ? line(p, true, first, left, right + 1) : line(p, false, first, top, bottom + 1);
    const color = mean(edge);
    if (!uniform(edge, color)) return;
    const limit = Math.floor((horizontal ? p.h : p.w) * maxCut);
    let n = 0;
    while (n < limit) {
      const idx = side === "top" ? top + n : side === "bottom" ? bottom - n : side === "left" ? left + n : right - n;
      const l = horizontal ? line(p, true, idx, left, right + 1) : line(p, false, idx, top, bottom + 1);
      if (!uniform(l, color)) break;
      n++;
    }
    if (side === "top") top += n;
    if (side === "bottom") bottom -= n;
    if (side === "left") left += n;
    if (side === "right") right -= n;
  };
  // Two passes: removing side bars can make top/bottom uniform and the other way round.
  for (let pass = 0; pass < 2; pass++) (["left", "right", "top", "bottom"] as const).forEach(trim);
  if (right - left < p.w * 0.2 || bottom - top < p.h * 0.2) return { x: 0, y: 0, w: p.w, h: p.h }; // nothing sensible left
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

/** Background colour around the content, or null if the border is not one even colour (e.g. a photo with a scene). */
function borderColor(p: Pixels, box: { x: number; y: number; w: number; h: number }): RGB | null {
  const edge = [
    ...line(p, true, box.y, box.x, box.x + box.w),
    ...line(p, true, box.y + box.h - 1, box.x, box.x + box.w),
    ...line(p, false, box.x, box.y, box.y + box.h),
    ...line(p, false, box.x + box.w - 1, box.y, box.y + box.h),
  ];
  const color = mean(edge);
  return uniform(edge, color, 0.8) ? (color.map(Math.round) as RGB) : null;
}

/** Trims borders, fits the photo into a 3:4 frame and returns a JPEG. */
export async function prepareProductPhoto(file: Blob, maxEdge = 1800, frame = true): Promise<Blob> {
  const src = await decode(file);
  // Analyse a small copy (fast), apply the result to the full image.
  const aScale = Math.min(1, 600 / Math.max(src.width, src.height));
  const ac = canvasOf(Math.max(1, Math.round(src.width * aScale)), Math.max(1, Math.round(src.height * aScale)));
  const actx = ac.getContext("2d", { willReadFrequently: true })!;
  actx.drawImage(src, 0, 0, ac.width, ac.height);
  const p: Pixels = { data: actx.getImageData(0, 0, ac.width, ac.height).data, w: ac.width, h: ac.height };

  const box = frame ? contentBox(p) : { x: 0, y: 0, w: p.w, h: p.h };
  const bg = frame ? borderColor(p, box) : null;
  const sx = box.x / aScale, sy = box.y / aScale, sw = box.w / aScale, sh = box.h / aScale;

  // Frame size: pad to 3:4 only when the background is an even colour, otherwise keep the photo as it is.
  let fw = sw, fh = sh;
  if (bg) {
    const margin = 1.04; // a little air around the product
    if (sw / sh > RATIO) { fw = sw * margin; fh = fw / RATIO; } else { fh = sh * margin; fw = fh * RATIO; }
  }
  const scale = Math.min(1, maxEdge / Math.max(fw, fh));
  const out = canvasOf(Math.round(fw * scale), Math.round(fh * scale));
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = bg ? `rgb(${bg[0]},${bg[1]},${bg[2]})` : "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  const dw = sw * scale, dh = sh * scale;
  ctx.drawImage(src, sx, sy, sw, sh, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.88));
}

/** Kept for other uploads (e.g. the wide hero image): only scales and converts. */
export const toWebJpeg = (file: File, maxEdge = 1800) => prepareProductPhoto(file, maxEdge, false);

async function sendToServer(jpeg: Blob, name: string): Promise<string> {
  const body = new FormData();
  body.append("file", jpeg, name.replace(/\.[^.]+$/, "") + ".jpg");
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Hochladen fehlgeschlagen.");
  return data.url as string;
}

/** Upload for product photos (frame = true) or other images such as the hero image (frame = false). */
export async function uploadImage(file: File, maxEdge?: number, frame = maxEdge === undefined): Promise<string> {
  let jpeg: Blob;
  try {
    jpeg = await prepareProductPhoto(file, maxEdge ?? 1800, frame);
  } catch {
    throw new Error("Dieses Bildformat kann dein Browser nicht lesen (z. B. HEIC). Speichere das Foto als JPG oder PNG.");
  }
  return sendToServer(jpeg, file.name);
}

/** Re-processes a photo that is already in the shop and uploads the cleaned version. */
export async function reframeExisting(url: string): Promise<string> {
  const res = await fetch(`/api/admin/bild?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("Ein Foto konnte nicht geladen werden.");
  const jpeg = await prepareProductPhoto(await res.blob(), 1800, true);
  return sendToServer(jpeg, url.split("/").pop() || "foto.jpg");
}
