/** Slot geometry never depends on current population or interaction order. */
export function crowdPosition(slot: number) {
  const row = Math.floor(slot / 10),
    pair = Math.floor((slot % 10) / 2),
    side = slot % 2;
  // First 100 occupy ten dense rows. Higher configured capacities interleave rows.
  const band = row % 10,
    layer = Math.floor(row / 10),
    depth = band / 9;
  const y = 1180 + band * 48 + layer * 19;
  const centerward = band >= 7 ? (band - 6) * 12 : 0;
  const x =
    (side ? 710 + pair * 66 : 92 + pair * 66) +
    (side ? -centerward : centerward) +
    layer * (side ? -12 : 12);
  return { x, y, height: 98 + depth * 47, depth };
}
const segmenter = new Intl.Segmenter("vi", { granularity: "grapheme" });
let measuring: CanvasRenderingContext2D | null = null;
export function fitName(text: string, width: number, size: number) {
  measuring ??= document.createElement("canvas").getContext("2d");
  const ctx = measuring!;
  ctx.font = `${size}px "Be Vietnam Pro", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  if (ctx.measureText(text).width <= width) return text;
  const letters = [...segmenter.segment(text)].map((x) => x.segment);
  let lo = 0,
    hi = letters.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(letters.slice(0, mid).join("") + "…").width <= width)
      lo = mid;
    else hi = mid - 1;
  }
  return letters.slice(0, lo).join("") + "…";
}
