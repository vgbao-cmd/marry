import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  Rectangle,
} from "pixi.js";
import { TextureLibrary } from "./textureLibrary";
import type { CharacterAsset, PoseAsset, State } from "./types";
const gold = 0xeac987;
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,240,207,.9)");
  g.addColorStop(0.25, "rgba(255,211,136,.3)");
  g.addColorStop(1, "rgba(255,205,116,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return Texture.from(c);
}
function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 40;
  const ctx = c.getContext("2d")!;
  ctx.scale(1, 0.3);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(38,24,15,.4)");
  g.addColorStop(1, "rgba(38,24,15,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 134);
  return Texture.from(c);
}
type Actor = {
  root: Container;
  image: Sprite;
  reflection: Sprite;
  mask: Graphics;
  shadow: Sprite;
  plate: Graphics;
  name: Text;
  definition: CharacterAsset;
  pose: string;
  fade: number;
};
type Particle = {
  node: Sprite | Graphics;
  vx: number;
  vy: number;
  life: number;
  max: number;
  spin: number;
  gravity: number;
};
/** Still-photo animation deliberately never distorts bodies or invents limb poses. */
export class PhotographicRenderer {
  app = new Application();
  library = new TextureLibrary();
  actors = new Map<string, Actor>();
  private particles: Particle[] = [];
  private pool: Array<Sprite | Graphics> = [];
  private textures: Texture[] = [];
  private disposed = false;
  private tick = 0;
  private host?:HTMLElement;
  private seen = new Set<string>();
  private bodies = new Container();
  private fx = new Container();
  private lights = new Container();
  private glint!: Texture;
  private shadow!: Texture;
  private foregroundTexture?: Texture;
  private cap = 90;
  async init(
    host: HTMLElement,
    getState: () => State,
    isSpeaking: () => boolean,
  ) {
    this.host=host;host.dataset.ready="false";
    const initial = getState(),
      v = initial.visuals;
    this.cap = v.reduced_effects
      ? 18
      : v.quality === "low"
        ? 35
        : v.quality === "high"
          ? 160
          : 85;
    await this.app.init({
      width: 1080,
      height: 1920,
      resolution: v.quality === "low" ? 0.65 : v.quality === "high" ? 1.25 : 1,
      antialias: v.quality !== "low",
      background: 0x352617,
      preference: "webgl",
    });
    if (this.disposed) {
      this.app.destroy(true, { children: true });
      return;
    }
    try {
      await this.library.load(v);
    } catch (e) {
      this.destroy();
      throw e;
    }
    if (this.disposed) return;
    host.appendChild(this.app.canvas);
    const background = new Sprite(this.library.texture(v.backdrop));
    background.width = 1080;
    background.height = 1920;
    this.app.stage.addChild(background);
    // Separate lighting, foot-sorted actors, foreground image strip and effects.
    this.app.stage.addChild(this.lights);
    this.app.stage.addChild(this.bodies);
    this.bodies.sortableChildren = true;
    this.glint = glowTexture();
    this.shadow = shadowTexture();
    this.textures.push(this.glint, this.shadow);
    for (const x of [160, 920]) {
      const beam = new Graphics()
        .poly([x, 390, x - 150, 1120, x + 150, 1120])
        .fill({ color: 0xffe5b4, alpha: 0.025 });
      beam.blendMode = "add";
      this.lights.addChild(beam);
    }
    const backdrop = this.library.texture(v.backdrop);
    const foregroundTexture = new Texture({
      source: backdrop.source,
      frame: new Rectangle(
        0,
        backdrop.height * 0.9,
        backdrop.width,
        backdrop.height * 0.1,
      ),
    });
    this.foregroundTexture = foregroundTexture;
    const foreground = new Sprite(foregroundTexture);
    foreground.position.set(0, 1728);
    foreground.width = 1080;
    foreground.height = 192;
    this.app.stage.addChild(foreground);
    this.app.stage.addChild(this.fx);
    // Noninteractive diagnostic numbers are useful for meaningful browser checks.
    host.dataset.renderer = "photographic";
    host.dataset.ready = "true";
    this.app.ticker.maxFPS = v.quality === "low" ? 30 : 60;
    let sample = initial.server_time,
      offset = sample - Date.now() / 1000;
    this.app.ticker.add((t) => {
      const dt = Math.min(t.deltaTime, 3),
        s = getState();
      this.tick += dt;
      if (sample !== s.server_time) {
        sample = s.server_time;
        offset = sample - Date.now() / 1000;
      }
      const clock = Date.now() / 1000 + offset;
      const mainIds = Object.values(s.roles);
      const guestLimit=v.quality==='low'?24:v.quality==='high'?40:30;
      const guests = Object.values(s.users)
        .filter((u) => !mainIds.includes(u.id))
        .sort((a,b)=>b.active-a.active).slice(0,guestLimit)
        .sort((a, b) => a.id.localeCompare(b.id));
      const cols = guests.length > 24 ? 8 : 6,
        rows = Math.ceil(guests.length / cols);
      const gap = rows > 1 ? 385 / (rows - 1) : 0;
      const active = new Set(["mc"]);
      const defs = v.characters;
      this.place(
        "mc",
        defs.mc,
        defs.mc.x,
        defs.mc.y,
        defs.mc.height,
        defs.mc.label,
        isSpeaking() ? "talk" : "idle",
        dt,
        clock,
      );
      for (const [role, id] of Object.entries(s.roles)) {
        if (!id || !s.users[id]) continue;
        active.add("user:"+id);
        const d = defs[role];
        this.place(
          "user:"+id,
          d,
          d.x,
          d.y,
          d.height,
          s.users[id].name,
          s.users[id].action_until>clock?s.users[id].action:"idle",
          dt,
          clock,
        );
      }
      guests.forEach((u, i) => {
        const choices = Object.entries(defs).filter(
          ([id, d]) => id.startsWith("guest-") && d.style === u.style,
        );
        const hash = Array.from(u.id).reduce((a, c) => a + c.charCodeAt(0), 0);
        const d = choices[hash % choices.length]?.[1];
        if (!d) return;
        const row = Math.floor(i / cols),
          col = Math.floor(i / 2) % (cols / 2),
          depth = rows <= 1 ? 0.5 : row / (rows - 1),
          y = 1225 + row * gap;
        const columnsPerSide = cols / 2;
        const spacing = columnsPerSide === 4 ? 86 : 115;
        const x = i % 2 ? 704 + col * spacing : 110 + col * spacing;
        // Smaller figures at the back; ensure each row leaves room for the next label.
        const height =
          Math.min(d.height, rows > 1 ? gap * 0.72 : 185) *
          (0.78 + depth * 0.22);
        active.add("user:"+u.id);
        this.place(
          "user:"+u.id,
          d,
          x,
          y,
          height,
          u.name,
          u.action_until > clock ? u.action : "idle",
          dt,
          clock,
        );
      });
      for (const [id, a] of this.actors)
        if (!active.has(id)) {
          a.root.destroy({ children: true });
          this.actors.delete(id);
        }
      for (const e of s.effects)
        if (e.until > clock && !this.seen.has(e.id)) {
          this.seen.add(e.id);
          this.emit(e.kind);
        }
      if (this.seen.size > 1500)
        this.seen = new Set(s.effects.map((e) => e.id));
      if (
        !s.visuals.reduced_effects &&
        this.tick % 7 < dt &&
        this.particles.length < this.cap * 0.4
      )
        this.sparkle();
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        p.node.x += p.vx * dt;
        p.node.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.node.rotation += p.spin * dt;
        p.node.alpha = Math.min(0.85, p.life / 30, (p.max - p.life) / 12);
        if (p.life <= 0) {
          p.node.visible = false;
          this.fx.removeChild(p.node);
          this.pool.push(p.node);
          this.particles.splice(i, 1);
        }
      }
      host.dataset.actors = String(this.actors.size);
      host.dataset.guests = String(guests.length);
      host.dataset.particles = String(this.particles.length);
    });
  }
  private place(
    id: string,
    d: CharacterAsset,
    x: number,
    y: number,
    h: number,
    name: string,
    action: string,
    dt: number,
    time: number,
  ) {
    let a = this.actors.get(id);
    if (a && a.definition !== d) {
      a.definition = d;
      a.fade = 0;
    }
    const wanted = action === "join" || action === "gift" ? "idle" : action;
    const moving = a
      ? Math.abs(a.root.x - x - d.offset_x) > 2 || Math.abs(a.root.y - y - d.offset_y) > 2
      : id !== "mc";
    const pose: PoseAsset =
      d.poses[moving ? "walk" : (wanted as keyof CharacterAsset["poses"])] ||
      d.poses.idle ||
      d;
    const frame = Math.floor((this.tick / 60) * pose.fps);
    const texture = this.library.texture(pose, frame);
    if (!a) {
      const root = new Container(),
        image = new Sprite(texture),
        reflection = new Sprite(texture),
        shadow = new Sprite(this.shadow),
        mask = new Graphics().rect(-300, 0, 600, 45).fill(0xffffff);
      shadow.anchor.set(0.5);
      shadow.width = h * 0.44;
      shadow.height = h * 0.08;
      shadow.y = 3;
      image.anchor.set(d.foot_x, d.foot_y);
      reflection.anchor.copyFrom(image.anchor);
      reflection.alpha = 0.065;
      reflection.mask = mask;
      root.addChild(shadow, reflection, mask, image);
      const tag = new Text({
        text: "",
        style: {
          fontFamily: "Be Vietnam Pro",
          fontSize: id === "mc" ? 18 : 16,
          fill: 0xfff2d6,
          dropShadow: { color: 0x251b11, blur: 4, distance: 0 },
        },
      });
      tag.anchor.set(0.5, 0);
      tag.position.set(0, 10);
      const plate = new Graphics();
      plate.y = 7;
      root.addChild(plate, tag);
      root.position.set(id === "mc" ? x : 540, id === "mc" ? y : 1660);
      this.bodies.addChild(root);
      a = {
        root,
        image,
        reflection,
        mask,
        shadow,
        plate,
        name: tag,
        definition: d,
        pose: "",
        fade: 0,
      };
      this.actors.set(id, a);
    }
    const desiredX = x + d.offset_x,
      desiredY = y + d.offset_y;
    a.root.x += (desiredX - a.root.x) * Math.min(1, 0.09 * dt);
    a.root.y += (desiredY - a.root.y) * Math.min(1, 0.09 * dt);
    a.root.zIndex = a.root.y;
    a.image.texture = texture;
    a.reflection.texture = texture;
    a.image.anchor.set(d.foot_x, d.foot_y);
    a.reflection.anchor.copyFrom(a.image.anchor);
    const scale = h / texture.height;
    a.image.scale.set(scale);
    a.reflection.scale.set(scale, -scale);
    a.reflection.visible = this.app.renderer.resolution >= 1;
    a.fade = Math.min(1, a.fade + dt * 0.06);
    a.image.alpha = a.fade;
    a.root.alpha = 0.995 + Math.sin(this.tick * 0.018 + x) * 0.005; // Lighting only; no body deformation.
    const nameLimit = h > 300 ? 20 : 7;
    const displayName =
      name.length > nameLimit ? name.slice(0, nameLimit - 1) + "…" : name;
    const fontSize = h > 300 ? 20 : h<90?13:16;
    a.name.y=h>300?10:7;a.plate.y=h>300?7:5;
    if (a.name.text !== displayName || a.name.style.fontSize !== fontSize) {
      a.name.style.fontSize = fontSize;
      a.name.text = displayName;
      const width = a.name.width + 16;
      a.plate
        .clear()
        .roundRect(-width / 2, 0, width, fontSize + 8, 4)
        .fill({ color: 0x352417, alpha: 0.65 });
    }
    a.shadow.width = h * 0.5;
    a.shadow.height = Math.max(9, h * 0.065);
    a.shadow.alpha = a.fade;
    a.pose = wanted;
  }
  private particle(
    kind: "glow" | "petal" | "confetti" | "heart",
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    gravity = 0,
  ) {
    if (this.particles.length >= this.cap) return;
    let node = this.pool.find((p) => p.label === kind);
    if (node) this.pool.splice(this.pool.indexOf(node), 1);
    if (!node) {
      if (kind === "glow") {
        const s = new Sprite(this.glint);
        s.anchor.set(0.5);
        s.blendMode = "add";
        node = s;
      } else {
        const g = new Graphics();
        if (kind === "petal") g.ellipse(0, 0, 6, 12).fill(0xf7e7d8);
        else if (kind === "heart")
          g.moveTo(0, 9)
            .bezierCurveTo(-22, -7, -15, -24, 0, -12)
            .bezierCurveTo(15, -24, 22, -7, 0, 9)
            .fill({ color: 0xe0aa8c, alpha: 0.6 });
        else
          g.rect(-3, -7, 6, 14).fill(
            [0xd8b76e, 0xfff3d8, 0xb79c66][Math.floor(Math.random() * 3)],
          );
        node = g;
      }
      node.label = kind;
    }
    node.visible = true;
    node.alpha = 0;
    node.position.set(x, y);
    node.rotation = Math.random() * 6;
    node.scale.set(
      kind === "glow" ? 0.2 + Math.random() * 0.4 : 0.7 + Math.random() * 0.6,
    );
    this.fx.addChild(node);
    this.particles.push({
      node,
      vx,
      vy,
      life,
      max: life,
      spin: (Math.random() - 0.5) * 0.07,
      gravity,
    });
  }
  private sparkle() {
    this.particle(
      "glow",
      80 + Math.random() * 920,
      300 + Math.random() * 1300,
      (Math.random() - 0.5) * 0.2,
      -0.15,
      140,
    );
  }
  private emit(kind: string) {
    const n = Math.min(
      this.cap,
      kind === "fireworks" || kind === "milestone" ? 80 : 34,
    );
    if (["join", "male", "female", "open", "end"].includes(kind)) return;
    for (let i = 0; i < n; i++) {
      if (kind === "fireworks") {
        const angle = (i / n) * Math.PI * 2;
        this.particle(
          "glow",
          540,
          570,
          Math.cos(angle) * (2 + Math.random() * 4),
          Math.sin(angle) * (2 + Math.random() * 4),
          95,
          0.015,
        );
      } else if (["heart", "curtain", "bride", "groom"].includes(kind))
        this.particle(
          "heart",
          350 + Math.random() * 380,
          1000,
          Math.random() - 0.5,
          -1 - Math.random(),
          170,
        );
      else
        this.particle(
          kind === "celebrate" || kind === "toast" ? "petal" : "confetti",
          100 + Math.random() * 880,
          350 + Math.random() * 350,
          (Math.random() - 0.5) * 2,
          1 + Math.random() * 2,
          220,
          0.012,
        );
    }
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    if(this.host)this.host.dataset.ready="false";
    this.foregroundTexture?.destroy(false);
    this.library.destroy();
    for (const n of this.pool) n.destroy();
    this.pool = [];
    if (this.app.renderer) {
      this.app.destroy(true, { children: true });
      for (const t of this.textures) t.destroy(true);
    }
    this.actors.clear();
    this.particles = [];
  }
}
