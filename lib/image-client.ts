/** Converts any image the browser can read into a JPEG (max edge in px), so photos load fast on phones. */
export async function toWebJpeg(file: File, maxEdge = 1800): Promise<Blob> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file);
  } catch {
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.86),
  );
}

export async function uploadImage(file: File, maxEdge?: number): Promise<string> {
  let jpeg: Blob;
  try {
    jpeg = await toWebJpeg(file, maxEdge);
  } catch {
    throw new Error("Dieses Bildformat kann dein Browser nicht lesen (z. B. HEIC). Speichere das Foto als JPG oder PNG.");
  }
  const body = new FormData();
  body.append("file", jpeg, file.name.replace(/\.[^.]+$/, "") + ".jpg");
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Hochladen fehlgeschlagen.");
  return data.url as string;
}
