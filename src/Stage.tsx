import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import type { State, Guest } from "./types";
const C = { gold: 0xd9b66f, cream: 0xfff5df, wine: 0x6c243a, ink: 0x39392e };
function ellipse(
  p: Container,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: number,
  alpha = 1,
) {
  const g = new Graphics().ellipse(x, y, rx, ry).fill({ color, alpha });
  p.addChild(g);
  return g;
}
function rect(
  p: Container,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  r = 0,
) {
  const g = new Graphics().roundRect(x, y, w, h, r).fill(color);
  p.addChild(g);
  return g;
}
function line(p: Container, pts: number[], color: number, width = 3) {
  const g = new Graphics().poly(pts, false).stroke({ color, width });
  p.addChild(g);
  return g;
}
function label(
  p: Container,
  text: string,
  x: number,
  y: number,
  size: number,
  color = C.ink,
) {
  const t = new Text({
    text,
    style: {
      fontFamily: "Georgia, serif",
      fontSize: size,
      fill: color,
      align: "center",
    },
  });
  t.anchor.set(0.5);
  t.position.set(x, y);
  p.addChild(t);
  return t;
}
function flower(p: Container, x: number, y: number, s = 1) {
  for (let j = 0; j < 5; j++) {
    const a = (j * Math.PI * 2) / 5;
    ellipse(
      p,
      x + Math.cos(a) * 13 * s,
      y + Math.sin(a) * 13 * s,
      14 * s,
      13 * s,
      j % 2 ? 0xfff9ee : 0xe9deca,
    );
  }
  ellipse(p, x, y, 7 * s, 7 * s, C.gold);
}
function heart(p: Container, x: number, y: number, s: number, color = C.wine) {
  const g = new Graphics()
    .moveTo(0, 10)
    .bezierCurveTo(-35, -10, -24, -40, 0, -22)
    .bezierCurveTo(24, -40, 35, -10, 0, 10)
    .fill(color);
  g.position.set(x, y);
  g.scale.set(s);
  p.addChild(g);
  return g;
}
function person(style: string, role = "", seed = 0) {
  const p = new Container();
  const shadow = ellipse(p, 0, 8, 37, 10, 0x362c22, 0.16);
  shadow.alpha = 0.4;
  const female = style === "female" || role === "bride";
  const skin = [0xf1c5a0, 0xe5b18d, 0xc99571][seed % 3];
  const suit =
    role === "mc"
      ? 0x244f78
      : role === "groom"
        ? 0x263c3d
        : [0x6a786d, 0x646182, 0x9f6d70, 0x344b63][seed % 4];
  if (role === "bride") {
    const veil = new Graphics()
      .moveTo(-22, -149)
      .lineTo(-69, -18)
      .quadraticCurveTo(0, 10, 69, -18)
      .lineTo(22, -149)
      .fill({ color: 0xffffff, alpha: 0.5 });
    p.addChild(veil);
  }
  rect(p, -20, -35, 14, 39, 0x36312e, 4);
  rect(p, 7, -35, 14, 39, 0x36312e, 4);
  ellipse(p, -16, 3, 13, 6, 0x292b2b);
  ellipse(p, 18, 3, 13, 6, 0x292b2b);
  if (female) {
    const dress = new Graphics()
      .moveTo(-19, -105)
      .quadraticCurveTo(-28, -60, -51, -12)
      .quadraticCurveTo(0, 2, 51, -12)
      .quadraticCurveTo(28, -60, 19, -105)
      .fill(
        role === "bride" ? 0xfffcf3 : [0xac6b73, 0x688a7b, 0xc8a06c][seed % 3],
      );
    p.addChild(dress);
    line(p, [-19, -99, 0, -81, 19, -99], C.gold, 3);
    line(p, [-24, -28, -14, -70], 0xffffff, 2);
  } else {
    rect(p, -27, -106, 54, 77, suit, 12);
    const shirt = new Graphics()
      .poly([-14, -105, 0, -64, 14, -105])
      .fill(0xf8f4e9);
    p.addChild(shirt);
    line(p, [-18, -102, -10, -78, -19, -70, -2, -48], 0xb6bfbd, 2);
    rect(p, -3, -96, 6, 24, C.wine, 1);
    ellipse(p, 3, -47, 2, 2, C.gold);
  }
  const left = new Container();
  left.position.set(-24, -94);
  rect(left, -9, 0, 15, 57, female ? skin : suit, 8);
  ellipse(left, -2, 57, 8, 9, skin);
  p.addChild(left);
  const right = new Container();
  right.position.set(24, -94);
  rect(right, -6, 0, 15, 57, female ? skin : suit, 8);
  ellipse(right, 2, 57, 8, 9, skin);
  p.addChild(right);
  rect(p, -8, -119, 16, 19, skin, 4);
  ellipse(p, 0, -143, 28, 35, 0x352d29);
  if (female) {
    ellipse(p, -22, -126, 11, 28, 0x352d29);
    ellipse(p, 22, -126, 11, 28, 0x352d29);
  }
  ellipse(p, 0, -140, 24, 29, skin);
  const hair = new Graphics()
    .moveTo(-25, -145)
    .quadraticCurveTo(-25, -181, 7, -172)
    .quadraticCurveTo(31, -169, 25, -143)
    .quadraticCurveTo(8, -161, -10, -153)
    .lineTo(-25, -138)
    .fill(0x352d29);
  p.addChild(hair);
  ellipse(p, -9, -141, 2.4, 3, 0x302b28);
  ellipse(p, 9, -141, 2.4, 3, 0x302b28);
  ellipse(p, -14, -130, 5, 2, 0xe2a18d, 0.5);
  ellipse(p, 14, -130, 5, 2, 0xe2a18d, 0.5);
  new Graphics();
  const smile = new Graphics()
    .arc(0, -133, 7, 0.15, Math.PI - 0.15)
    .stroke({ color: 0x9e5e51, width: 2 });
  p.addChild(smile);
  if (role === "bride") {
    for (let i = -2; i <= 2; i++) ellipse(p, i * 9, -171, 5, 5, C.gold);
    for (let i = 0; i < 3; i++) flower(p, -20 + i * 15, -64, 0.4);
  }
  if (role === "mc") {
    right.rotation = -0.8;
    rect(right, -3, 28, 7, 25, 0x292f35, 3);
    ellipse(right, 0, 26, 8, 10, 0x717e85);
  }
  const glass = new Container();
  right.addChild(glass);
  glass.position.set(2, 50);
  glass.addChild(
    new Graphics()
      .poly([-7, -13, 7, -13, 4, -3, -4, -3])
      .fill({ color: 0xf5d289, alpha: 0.9 })
      .stroke({ color: 0xffffff, width: 1 }),
  );
  line(glass, [0, -3, 0, 6, -5, 6, 5, 6], C.gold, 1);
  glass.visible = false;
  return { p, left, right, glass };
}
function scenery(root: Container) {
  rect(root, 0, 0, 1080, 1920, 0xf3ead5);
  rect(root, 0, 0, 1080, 610, 0x263c36);
  for (let i = 0; i < 24; i++) {
    line(root, [i * 48, 0, i * 48, 610], 0x385046, 2);
  }
  // Draped valance and gilded chandelier.
  for (const x of [0, 1080]) {
    const g = new Graphics()
      .moveTo(x, 0)
      .lineTo(x + (x ? -370 : 370), 0)
      .quadraticCurveTo(x + (x ? -120 : 120), 180, x, 520)
      .fill(0x743448);
    root.addChild(g);
  }
  line(root, [540, 0, 540, 110], C.gold, 6);
  ellipse(root, 540, 136, 140, 25, C.gold);
  ellipse(root, 540, 130, 124, 18, 0xf5df9d);
  for (let i = 0; i < 11; i++) {
    const x = 420 + i * 24;
    const len = 40 + Math.sin((i / 10) * Math.PI) * 90;
    line(root, [x, 138, x, 138 + len], C.gold, 2);
    ellipse(root, x, 138 + len, 5, 12, 0xfff0bc);
  }
  // Back wall with three niches and inset moldings.
  rect(root, 0, 560, 1080, 630, 0xe8d8b7);
  for (const [x, w, h] of [
    [30, 260, 480],
    [250, 580, 610],
    [790, 260, 480],
  ]) {
    const g = new Graphics()
      .roundRect(x, 1160 - h, w, h, w / 2)
      .fill(0xf6edda)
      .stroke({ color: C.gold, width: 5 });
    root.addChild(g);
    root.addChild(
      new Graphics()
        .roundRect(x + 15, 1170 - h, w - 30, h - 20, (w - 30) / 2)
        .stroke({ color: 0xdcccac, width: 2 }),
    );
  }
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < 30; i++) {
      const a = (i / 29) * Math.PI;
      const x = 540 + Math.cos(a) * (303 + side * 20),
        y = 842 - Math.sin(a) * 268;
      ellipse(root, x, y, 12, 25, 0x809277);
      flower(root, x + Math.sin(i) * 12, y, 0.75 + (i % 3) * 0.12);
    }
  for (const side of [0, 1])
    for (let i = 0; i < 22; i++) {
      const x = (side ? 830 : 250) + Math.sin(i * 2.1) * 45,
        y = 860 + i * 12;
      ellipse(root, x, y, 13, 24, 0x839075);
      flower(root, x + Math.cos(i) * 20, y, 0.7);
    }
  rect(root, 0, 1130, 1080, 65, 0xd4bd92);
  for (let i = 0; i < 4; i++) {
    rect(
      root,
      80 - i * 24,
      1190 + i * 26,
      920 + i * 48,
      26,
      i % 2 ? 0xe5d7ba : 0xf7edda,
    );
    line(
      root,
      [80 - i * 24, 1190 + i * 26, 1000 + i * 24, 1190 + i * 26],
      0xc3a369,
      2,
    );
  }
  // Cake, candles and champagne pyramid.
  for (let i = 0; i < 3; i++) {
    rect(root, 105 + i * 17, 1070 - i * 46, 160 - i * 34, 44, 0xfffbec, 5);
    line(
      root,
      [108 + i * 17, 1080 - i * 46, 262 - i * 17, 1080 - i * 46],
      C.gold,
      3,
    );
    flower(root, 187, 1066 - i * 46, 0.35);
  }
  rect(root, 80, 1120, 205, 12, C.gold, 4);
  rect(root, 175, 1130, 15, 55, C.gold, 3);
  rect(root, 839, 1121, 160, 12, C.gold, 3);
  for (let r = 0; r < 3; r++)
    for (let j = 0; j < 3 - r; j++) {
      const x = 862 + r * 22 + j * 44,
        y = 1105 - r * 45;
      root.addChild(
        new Graphics()
          .poly([x - 15, y - 35, x + 15, y - 35, x + 8, y - 12, x - 8, y - 12])
          .fill({ color: 0xf3da93, alpha: 0.65 })
          .stroke({ color: 0xfffbeb, width: 2 }),
      );
      line(root, [x, y - 12, x, y, x - 10, y, x + 10, y], C.gold, 2);
    }
  // Aisle and banquet seating.
  rect(root, 0, 1320, 1080, 600, 0xded2b9);
  root.addChild(
    new Graphics()
      .poly([470, 1320, 610, 1320, 770, 1920, 310, 1920])
      .fill(0x87364a),
  );
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < 4; i++) {
      const x = side ? 900 : 180,
        y = 1390 + i * 115;
      ellipse(root, x, y, 125, 35, 0xb7a88a, 0.3);
      ellipse(root, x, y - 12, 115, 35, 0xfff9ec);
      ellipse(root, x, y - 12, 79, 23, 0xeee1c5);
      flower(root, x, y - 22, 0.65);
    }
  for (let i = 0; i < 14; i++) {
    const x = 395 + i * 23;
    flower(root, x, 1850 + Math.sin(i) * 10, 0.55);
  }
}
export function Stage({
  state,
  speaking = false,
}: {
  state: State;
  speaking?: boolean;
}) {
  const clock = useRef(state.server_time - Date.now() / 1000);
  useEffect(() => {
    clock.current = state.server_time - Date.now() / 1000;
  }, [state.server_time]);
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(state),
    talk = useRef(speaking);
  latest.current = state;
  talk.current = speaking;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    let disposed = false;
    const app = new Application();
    const people = new Map<
      string,
      ReturnType<typeof person> & { tx: number; ty: number; name: Text }
    >();
    void (async () => {
      await app.init({
        width: 1080,
        height: 1920,
        backgroundAlpha: 0,
        antialias: true,
        resolution: 1,
        autoDensity: true,
        preference: "webgl",
      });
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      host.current?.appendChild(app.canvas);
      scenery(app.stage);
      const bodies = new Container();
      app.stage.addChild(bodies);
      const fx = new Container();
      app.stage.addChild(fx);
      const mc = person("male", "mc");
      mc.p.position.set(175, 1140);
      mc.p.scale.set(1.25);
      bodies.addChild(mc.p);
      const particles: Array<{
        g: Graphics;
        vx: number;
        vy: number;
        life: number;
      }> = [];
      const seen = new Set<string>();
      let t = 0;
      app.ticker.add((tick) => {
        const dt = Math.min(tick.deltaTime, 3);
        t += dt * 0.025;
        const s = latest.current,
          tm = Date.now() / 1000 + clock.current;
        const roleIds = Object.values(s.roles);
        const guests = Object.values(s.users)
          .filter((u) => !roleIds.includes(u.id))
          .sort((a, b) => a.id.localeCompare(b.id));
        const columns = guests.length > 24 ? 8 : 6;
        const rows = Math.ceil(guests.length / columns);
        const rowGap = 260 / Math.max(1, rows - 1);
        const guestScale = Math.min(.68, (rowGap - 22) / 180);
        const targets: Array<{ u: Guest; x: number; y: number; role: string }> =
          guests.map((u, i) => ({
            u,
            x:
              i % 2
                ? 745 + (Math.floor(i / 2) % (columns / 2)) * (columns === 8 ? 78 : 102)
                : 105 + (Math.floor(i / 2) % (columns / 2)) * (columns === 8 ? 78 : 102),
            y: 1400 + Math.floor(i / columns) * rowGap,
            role: "",
          }));
        for (const [role, uid] of Object.entries(s.roles))
          if (uid && s.users[uid])
            targets.push({
              u: s.users[uid],
              x: role === "bride" ? 650 : 430,
              y: 1136,
              role,
            });
        const ids = new Set(targets.map((o) => o.u.id));
        for (const [id, p] of people)
          if (!ids.has(id)) {
            p.p.destroy({ children: true });
            people.delete(id);
          }
        for (const { u, x, y, role } of targets) {
          let p = people.get(u.id);
          const tag = u.style + role;
          if (p && p.p.label !== tag) {
            p.p.destroy({ children: true });
            people.delete(u.id);
            p = undefined;
          }
          if (!p) {
            const obj = person(
              u.style,
              role,
              Array.from(u.id).reduce((a, c) => a + c.charCodeAt(0), 0),
            );
            obj.p.label = tag;
            obj.p.position.set(540, 1810);
            obj.p.scale.set(role ? 1.48 : guestScale);
            const name = label(
              obj.p,
              u.name.length > 12 ? u.name.slice(0, 11) + "…" : u.name,
              0,
              28,
              role ? 15 : 20,
              role ? C.wine : C.ink,
            );
            p = { ...obj, tx: x, ty: y, name };
            people.set(u.id, p);
            bodies.addChild(p.p);
          }
          p.p.scale.set(role ? 1.48 : guestScale);
          p.tx = x;
          p.ty = y;
          const walking = Math.abs(p.p.x - x) > 2 || Math.abs(p.p.y - y) > 2;
          p.p.x += (x - p.p.x) * Math.min(0.07 * dt, 1);
          p.p.y += (y - p.p.y) * Math.min(0.07 * dt, 1);
          p.p.rotation = Math.sin(t * 2 + x) * 0.014;
          const action = u.action_until > tm ? u.action : "idle";
          p.glass.visible = action === "toast";
          p.left.rotation = walking
            ? Math.sin(t * 9) * 0.35
            : action === "dance"
              ? Math.sin(t * 8) * 1
              : action === "celebrate"
                ? -0.9
                : 0;
          p.right.rotation =
            action === "toast"
              ? -2
              : action === "heart"
                ? -1.3
                : action === "dance"
                  ? -Math.sin(t * 8)
                  : walking
                    ? -Math.sin(t * 9) * 0.35
                    : 0;
          if (action === "dance") p.p.y += Math.sin(t * 10) * 3;
        }
        bodies.sortableChildren = true;
        for (const obj of bodies.children) obj.zIndex = obj.y;
        mc.p.rotation = Math.sin(t) * 0.018;
        mc.left.rotation = talk.current
          ? -0.5 + Math.sin(t * 5) * 0.15
          : Math.sin(t) * 0.08;
        for (const e of s.effects)
          if (
            e.until > tm &&
            !seen.has(e.id) &&
            [
              "heart",
              "curtain",
              "bride",
              "groom",
              "fireworks",
              "milestone",
              "celebrate",
              "gift",
              "toast",
              "dance",
            ].includes(e.kind)
          ) {
            seen.add(e.id);
            const hearts = ["heart", "curtain", "bride", "groom"].includes(
              e.kind,
            );
            for (
              let i = 0;
              i < (e.kind === "fireworks" || e.kind === "milestone" ? 90 : 25);
              i++
            ) {
              const g = hearts
                ? heart(fx, 540, 950, 0.3 + Math.random() * 0.5)
                : rect(
                    fx,
                    0,
                    0,
                    5 + Math.random() * 7,
                    12,
                    [C.gold, C.wine, 0xffffff, 0x7b9b83][i % 4],
                    2,
                  );
              g.position.set(
                200 + Math.random() * 680,
                700 + Math.random() * 500,
              );
              particles.push({
                g,
                vx: (Math.random() - 0.5) * 6,
                vy: hearts ? -2 - Math.random() * 3 : Math.random() * 3,
                life: 180,
              });
            }
          }
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.g.x += p.vx * dt;
          p.g.y += p.vy * dt;
          p.g.rotation += 0.02 * dt;
          p.life -= dt;
          p.g.alpha = Math.min(1, p.life / 45);
          if (p.life <= 0) {
            p.g.destroy();
            particles.splice(i, 1);
          }
        }
      });
    })();
    return () => {
      disposed = true;
      if (app.renderer) app.destroy(true, { children: true });
    };
  }, []);
  const curtain = Math.max(
    0,
    Math.ceil(state.curtain_until - now / 1000 - clock.current),
  );
  return (
    <div className="stage" aria-label="Sân khấu tiệc cưới tương tác">
      <div className="canvas-host" ref={host} />
      <div className="stage-top">
        <div className="stage-monogram">
          M<span>◆</span>L
        </div>
        <div className="stage-kicker">THE WEDDING CELEBRATION</div>
        <h2>{state.config.title}</h2>
        <p>{state.config.announcement}</p>
        <div className="couple-pills">
          <span>
            {state.roles.bride
              ? state.users[state.roles.bride]?.name
              : "Chờ cô dâu"}
            <small>CÔ DÂU · {state.queues.bride.length} chờ</small>
          </span>
          <i>&</i>
          <span>
            {state.roles.groom
              ? state.users[state.roles.groom]?.name
              : "Chờ chú rể"}
            <small>CHÚ RỂ · {state.queues.groom.length} chờ</small>
          </span>
        </div>
      </div>
      <div className="stage-score">
        <div>
          <span>SỔ VÀNG YÊU THƯƠNG</span>
          <b>
            {state.total.toLocaleString("vi")} <small>chỉ vàng</small>
          </b>
        </div>
        <div className="goal-track">
          <i
            style={{
              width: `${((state.total % state.config.goal) / state.config.goal) * 100}%`,
            }}
          />
        </div>
        <p>
          Mốc tiếp theo{" "}
          {(
            (Math.floor(state.total / state.config.goal) + 1) *
            state.config.goal
          ).toLocaleString("vi")}{" "}
          · điểm ảo trong game
        </p>
      </div>
      <div className="arch-title">
        <small>TRÂN TRỌNG KÍNH MỜI</small>
        <strong>Lễ Thành Hôn</strong>
        <span>TOGETHER, FOREVER</span>
      </div>
      <div className="stage-leaders">
        {state.leaders
          .filter((x) => x.points > 0)
          .slice(0, 3)
          .map((u, i) => (
            <div key={u.id}>
              <em>0{i + 1}</em>
              <span>{u.name}</span>
              <b>{u.points}</b>
            </div>
          ))}
      </div>
      {!state.roles.bride && !state.roles.groom && (
        <div className="waiting-couple">
          Cặp đôi của tối nay
          <br />
          <small>Tặng quà để bước lên sân khấu</small>
        </div>
      )}
      {curtain > 0 && (
        <div className="curtain">
          <div className="curtain-fabric" />
          <small>KHOẢNH KHẮC YÊU THƯƠNG</small>
          <h3>
            Động phòng
            <br />
            hoa chúc
          </h3>
          <div className="silhouettes">
            <span />
            <span />
          </div>
          <b>{curtain}</b>
          <p>Trăm năm hạnh phúc</p>
        </div>
      )}
      <div className="stage-ribbon">
        {Object.entries(state.config.gifts)
          .slice(0, 3)
          .map(([id, g]) => (
            <div key={id}>
              <b>{g.name}</b>
              <span>
                {g.action === "bride"
                  ? "Trở thành cô dâu"
                  : g.action === "groom"
                    ? "Trở thành chú rể"
                    : g.points + " chỉ vàng / quà"}
              </span>
            </div>
          ))}
      </div>
      <span className="safe-note">
        MARRY LIVE · {state.mode.toUpperCase()} · CHỈ VÀNG KHÔNG QUY ĐỔI TIỀN
      </span>
    </div>
  );
}
