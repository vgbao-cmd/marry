import type { Config } from "./types";
export type CrowdSettings = Pick<
  Config,
  "guest_scale" | "crowd_density" | "aisle_width"
>;
const rowOrder = [0, 4, 8, 2, 6, 1, 5, 9, 3, 7];
/** Stable staggered slots. New arrivals fill the gaps without moving existing people. */
export function crowdPosition(
  slot: number,
  settings: CrowdSettings = {
    guest_scale: 1,
    crowd_density: 1,
    aisle_width: 54,
  },
) {
  const group = Math.floor(slot / 10),
    band = rowOrder[group % 10],
    layer = Math.floor(group / 10),
    depth = band / 9;
  const side = slot % 2,
    pair = Math.floor((slot % 10) / 2),
    span = Math.min(500, 480 / settings.crowd_density);
  const aisle = settings.aisle_width * (1 - depth * 0.5) + (1 - depth) * 150,
    inner = 540 - aisle / 2 - 34,
    outer = 100;
  const stagger = (((slot * 19) % 23) - 11) * 0.85;
  const left =
    inner - (pair * (inner - outer)) / 4 + (band % 2 ? 10 : -10) + stagger;
  const x = side ? 1080 - left : left;
  const y = Math.min(
    1622,
    1120 + depth * span + (((slot * 13) % 19) - 9) * 1.1 + layer * 17,
  );
  const height =
    (148 + depth * 66 + (((slot * 17) % 13) - 6)) * settings.guest_scale;
  return { x, y, height, depth };
}
const segmenter = new Intl.Segmenter("vi", { granularity: "grapheme" });
let measuring: CanvasRenderingContext2D | null = null;
export function nameWidth(text: string, size: number) {
  measuring ??= document.createElement("canvas").getContext("2d");
  measuring!.font = `${size}px "Be Vietnam Pro", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  return measuring!.measureText(text).width;
}
export function fitName(text: string, width: number, size: number) {
  if (nameWidth(text, size) <= width) return text;
  const letters = [...segmenter.segment(text)].map((x) => x.segment);
  let lo = 0,
    hi = letters.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (nameWidth(letters.slice(0, mid).join("") + "…", size) <= width)
      lo = mid;
    else hi = mid - 1;
  }
  return letters.slice(0, lo).join("") + "…";
}
