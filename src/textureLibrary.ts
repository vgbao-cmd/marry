import { Texture, Rectangle } from "pixi.js";
import type { PoseAsset, Visuals } from "./types";
/** Owned by one stage instance. Frame textures share one decoded source per URL. */
export type AlphaGeometry = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  headX: number;
  height: number;
};
export class TextureLibrary {
  private pixels = new Map<
    string,
    { width: number; height: number; data: Uint8ClampedArray }
  >();
  private geometryCache = new Map<string, AlphaGeometry>();
  private sources = new Map<string, Texture>();
  private frames = new Map<string, Texture>();
  private disposed = false;
  async load(v: Visuals) {
    const urls = new Set([
      v.backdrop.url,
      ...Object.values(v.characters).flatMap((c) => [
        c.url,
        ...Object.values(c.poses).map((p) => p!.url),
      ]),
    ]);
    await Promise.all(
      [...urls].map(async (url) => {
        const im = new Image();
        im.decoding = "async";
        im.src = url;
        await im.decode();
        if (!this.disposed) this.sources.set(url, Texture.from(im));
      }),
    );
  }
  texture(p: PoseAsset, index = 0): Texture {
    const base = this.sources.get(p.url);
    if (!base) throw new Error("Chưa nạp ảnh " + p.url);
    if (!p.frames.length) return base;
    const f = p.frames[index % p.frames.length],
      key = p.url + ":" + f.join(",");
    let t = this.frames.get(key);
    if (!t) {
      if (f[0] + f[2] > base.width || f[1] + f[3] > base.height)
        throw new Error("Khung sprite vượt ảnh");
      t = new Texture({ source: base.source, frame: new Rectangle(...f) });
      this.frames.set(key, t);
    }
    return t;
  }
  geometry(p: PoseAsset, index = 0): AlphaGeometry {
    const frame = p.frames.length ? p.frames[index % p.frames.length] : null,
      key = p.url + ":" + (frame?.join(",") || "full");
    const cached = this.geometryCache.get(key);
    if (cached) return cached;
    let image = this.pixels.get(p.url);
    if (!image) {
      const source = this.sources.get(p.url)!.source
        .resource as HTMLImageElement;
      const c = document.createElement("canvas");
      c.width = source.naturalWidth;
      c.height = source.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(source, 0, 0);
      image = {
        width: c.width,
        height: c.height,
        data: ctx.getImageData(0, 0, c.width, c.height).data,
      };
      this.pixels.set(p.url, image);
    }
    const [fx, fy, w, h] = frame || [0, 0, image.width, image.height];
    let left = w,
      top = h,
      right = 0,
      bottom = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (image.data[((fy + y) * image.width + fx + x) * 4 + 3] >= 32) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x + 1);
          bottom = Math.max(bottom, y + 1);
        }
    if (bottom <= top)
      throw new Error("Khung nhân vật không có vùng alpha nhìn thấy");
    let mass = 0,
      center = 0;
    const limit = Math.min(bottom, top + Math.ceil((bottom - top) * 0.12));
    for (let y = top; y < limit; y++)
      for (let x = left; x < right; x++) {
        const alpha = image.data[((fy + y) * image.width + fx + x) * 4 + 3];
        if (alpha >= 32) {
          mass += alpha;
          center += (x + 0.5) * alpha;
        }
      }
    const result = {
      left,
      top,
      right,
      bottom,
      headX: mass ? center / mass : (left + right) / 2,
      height: bottom - top,
    };
    this.geometryCache.set(key, result);
    return result;
  }
  get geometryCount() {
    return this.geometryCache.size;
  }
  get frameCount() {
    return this.frames.size;
  }
  destroy() {
    this.disposed = true;
    for (const t of this.frames.values()) t.destroy(false);
    for (const t of this.sources.values()) t.destroy(true);
    this.pixels.clear();
    this.geometryCache.clear();
    this.frames.clear();
    this.sources.clear();
  }
}
