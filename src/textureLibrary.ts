import { Texture, Rectangle } from "pixi.js";
import type { PoseAsset, Visuals } from "./types";
/** Owned by one stage instance. Frame textures share one decoded source per URL. */
export class TextureLibrary {
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
  destroy() {
    this.disposed = true;
    for (const t of this.frames.values()) t.destroy(false);
    for (const t of this.sources.values()) t.destroy(true);
    this.frames.clear();
    this.sources.clear();
  }
}
