import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Heart,
  Radio,
  LayoutDashboard,
  Settings2,
  Volume2,
  Users,
  Gift,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Copy,
  ChevronRight,
  Check,
  Wifi,
  WifiOff,
  Sparkles,
  GlassWater,
  Music2,
  Flower2,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import { Stage } from "./Stage";
import { AssetEditor } from "./AssetEditor";
import { AttendanceControls } from "./AttendanceControls";
import { useAudio } from "./audio";
import type { State, Config } from "./types";
import "./style.css";
async function api(path: string, body?: unknown, method = "POST") {
  const r = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) {
    let d;
    try {
      d = await r.json();
    } catch {
      d = { detail: r.statusText };
    }
    throw new Error(
      typeof d.detail === "string"
        ? d.detail
        : "Cấu hình không hợp lệ; kiểm tra các giá trị.",
    );
  }
  return r.json();
}
const names = [
  "Linh Chi",
  "Tuấn Anh",
  "Ngọc Hân",
  "Đức Minh",
  "Thảo Vy",
  "Quỳnh Anh",
  "Gia Bảo",
  "Mai Phương",
  "Hải Đăng",
  "Khánh Linh",
  "Bảo Ngọc",
  "Thanh Tùng",
];
function App() {
  const [state, setState] = useState<State | null>(null),
    [connected, setConnected] = useState(false),
    [tab, setTab] = useState("studio"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [authed, setAuthed] = useState(false),
    [password, setPassword] = useState(""),
    [admin, setAdmin] = useState<{
      logs: { at: number; message: string }[];
      users: { id: string; name: string }[];
    } | null>(null),
    [draft, setDraft] = useState<Config | null>(null),
    [rules, setRules] = useState(""),
    [gifts, setGifts] = useState(""),
    [nick, setNick] = useState("Linh Chi"),
    [uid, setUid] = useState("demo-linh-chi"),
    [comment, setComment] = useState("chúc mừng"),
    [count, setCount] = useState(1),
    [giftId, setGiftId] = useState("demo-rose"),
    [simDrop, setSimDrop] = useState(false);
  const combo = useRef(crypto.randomUUID()),
    audio = useAudio(state),
    clean = location.pathname === "/stage";
  useEffect(() => {
    let stopped = false,
      ws: WebSocket,
      timer: ReturnType<typeof setTimeout>,
      heartbeat: ReturnType<typeof setInterval>;
    const connect = () => {
      if (stopped || simDrop) return;
      ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
      );
      ws.onopen = () => {
        setConnected(true);
        heartbeat = setInterval(
          () => ws.readyState === 1 && ws.send("sync"),
          3000,
        );
      };
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.type === "snapshot") setState(d.state);
        } catch {
          setError("Dữ liệu sân khấu không hợp lệ");
        }
      };
      ws.onclose = () => {
        setConnected(false);
        clearInterval(heartbeat);
        if (!stopped) timer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(heartbeat);
      ws?.close();
      setConnected(false);
    };
  }, [simDrop]);
  const refresh = async () => {
    const d = await api("/admin", undefined, "GET");
    setAdmin(d);
    setAuthed(true);
    if (!draft) {
      setDraft(d.config);
      setRules(JSON.stringify(d.config.keywords, null, 2));
      setGifts(JSON.stringify(d.config.gifts, null, 2));
    }
  };
  useEffect(() => {
    void refresh().catch(() => {});
  }, []);
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(
      () => void refresh().catch(() => setAuthed(false)),
      4000,
    );
    return () => clearInterval(t);
  }, [authed, draft]);
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const control = (action: string, extra = {}) =>
    run(() => api("/control", { action, ...extra }));
  const event = (type: string, extra = {}) =>
    run(() =>
      api("/demo/events", {
        id: crypto.randomUUID(),
        type,
        user_id: uid,
        name: nick,
        ...extra,
      }),
    );
  const addGuests = () =>
    run(async () => {
      for (let i = 0; i < 12; i++)
        await api("/demo/events", {
          id: crypto.randomUUID(),
          type: "join",
          user_id: "demo-" + i,
          name: names[i],
        });
      setNotice("Đã mời thêm 12 khách vào tiệc");
    });
  const addCrowd = () =>
    run(async () => {
      for (let i = 0; i < 30; i++)
        await api("/demo/events", {
          id: crypto.randomUUID(),
          type: "join",
          user_id: "crowd-" + i,
          name: names[i % names.length] + " " + (i + 1),
        });
      setNotice("Đã mời 30 khách vào tiệc");
    });
  const fillHundred = () =>
    run(async () => {
      const result = await api("/demo/fill");
      setNotice(
        `Đã có ${result.seated_count} khách đang đứng; ${result.waiting_count} người chờ`,
      );
    });
  const copy = () =>
    run(async () => {
      await navigator.clipboard.writeText(location.origin + "/stage");
      setNotice("Đã sao chép URL sân khấu");
    });
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  if (!state)
    return (
      <div className="loading">
        <Heart size={36} />
        <h1>Marry Live</h1>
        <p>
          {connected ? "Đang chuẩn bị tiệc cưới…" : "Đang kết nối sân khấu…"}
        </p>
        <small>Backend cần chạy ở cổng 8000.</small>
      </div>
    );
  const stage = <Stage state={state} speaking={audio.speaking} />;
  if (clean)
    return (
      <main className="obs">
        {stage}
        <div className="obs-caption">{audio.caption}</div>
        {!audio.enabled && (
          <button className="obs-audio" onClick={audio.enable}>
            <Volume2 size={16} /> Bật âm thanh
          </button>
        )}
        {!connected && <span className="obs-offline">Đang kết nối lại…</span>}
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/demo">
          <span className="brand-icon">
            <Heart size={22} />
          </span>
          <span>
            marry<span className="brand-live">live</span>
          </span>
        </a>
        <span className="workspace-label">WEDDING STUDIO</span>
        <nav>
          <button
            className={tab === "studio" ? "active" : ""}
            onClick={() => setTab("studio")}
          >
            <LayoutDashboard size={19} />
            Phòng tiệc
            <span className="nav-dot" />
          </button>
          <button
            className={tab === "settings" ? "active" : ""}
            onClick={() => setTab("settings")}
          >
            <Settings2 size={19} />
            Cấu hình tiệc
          </button>
          <button
            className={tab === "sound" ? "active" : ""}
            onClick={() => setTab("sound")}
          >
            <Volume2 size={19} />
            MC & âm thanh
          </button>
          <button
            className={tab === "logs" ? "active" : ""}
            onClick={() => setTab("logs")}
          >
            <Radio size={19} />
            Nhật ký sự kiện
          </button>
          <button
            className={tab === "visuals" ? "active" : ""}
            onClick={() => setTab("visuals")}
          >
            <Flower2 size={19} />
            Hình ảnh & nhân vật
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="small-flower">✧</div>
          <h3>
            Ngày vui của bạn.
            <br />
            Kỷ niệm của mọi người.
          </h3>
          <p>Mỗi lời chúc, một chút yêu thương.</p>
          <span className="version">MARRY LIVE · STUDIO 1.0</span>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div className="breadcrumb">
            Không gian làm việc <ChevronRight size={14} />
            <b>
              {tab === "visuals"
                ? "Hình ảnh & nhân vật"
                : tab === "studio"
                  ? "Phòng tiệc"
                  : tab === "settings"
                    ? "Cấu hình tiệc"
                    : tab === "sound"
                      ? "MC & âm thanh"
                      : "Nhật ký"}
            </b>
          </div>
          <div className="header-right">
            <span className={"connection " + (connected ? "" : "bad")}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}{" "}
              {connected ? "Đã đồng bộ" : "Kết nối lại"}
            </span>
            <span className="avatar">ML</span>
          </div>
        </header>
        <main className="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">LET LOVE GO LIVE</div>
              <h1>
                {tab === "visuals"
                  ? "Diện mạo của ngày chung đôi."
                  : tab === "studio"
                    ? "Một tiệc cưới, ngàn lời chúc."
                    : tab === "settings"
                      ? "Thiết kế ngày vui."
                      : tab === "sound"
                        ? "Thanh âm hạnh phúc."
                        : "Từng khoảnh khắc đáng nhớ."}
              </h1>
              <p>
                Sân khấu của bạn đã sẵn sàng. Cùng tạo nên một buổi tiệc thật
                đặc biệt.
              </p>
            </div>
            <a
              className="button outline"
              href="/stage"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              Mở sân khấu
            </a>
          </div>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {notice && (
            <div className="alert success">
              <Check size={16} />
              {notice}
            </div>
          )}
          {!authed && (
            <form
              className="login-card"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api("/login", { password });
                  await refresh();
                  setPassword("");
                });
              }}
            >
              <div>
                <b>Mở khóa bàn điều khiển</b>
                <p>
                  Nhập mật khẩu quản trị. Sân khấu vẫn xem được mà không cần
                  đăng nhập.
                </p>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu quản trị"
                required
              />
              <button className="button primary">Đăng nhập</button>
            </form>
          )}
          {tab === "studio" ? (
            <>
              <div className="metrics">
                <div>
                  <span className="metric-icon">
                    <Users />
                  </span>
                  <div>
                    <small>KHÁCH DỰ TIỆC</small>
                    <b>
                      {state.seated_count.toString().padStart(2, "0")}
                      <em>người</em>
                    </b>
                  </div>
                  <span className="metric-tag">Chờ {state.waiting_count}</span>
                </div>
                <div>
                  <span className="metric-icon">
                    <Gift />
                  </span>
                  <div>
                    <small>SỔ VÀNG MỪNG CƯỚI</small>
                    <b>
                      {state.total.toLocaleString("vi")}
                      <em>chỉ vàng</em>
                    </b>
                  </div>
                  <span className="metric-note">Điểm ảo trong game</span>
                </div>
                <div>
                  <span className="metric-icon">
                    <Heart />
                  </span>
                  <div>
                    <small>VÒNG TIỆC HIỆN TẠI</small>
                    <b>
                      {state.round.toString().padStart(2, "0")}
                      <em>{state.running ? "đang diễn ra" : "tạm dừng"}</em>
                    </b>
                  </div>
                  <span className="live-dot" />
                </div>
              </div>
              <div className="studio-grid">
                <section className="preview-card">
                  <div className="panel-heading">
                    <div>
                      <span className="live-dot" />
                      <b>Sân khấu trực tiếp</b>
                      <span className="badge">
                        {state.mode === "demo" ? "DEMO" : "LIVE · ADAPTER"}
                      </span>
                    </div>
                    <button
                      className="icon-button"
                      title="Sao chép URL"
                      onClick={copy}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="preview-well">
                    <div className="preview-label">
                      <span>PREVIEW</span>
                      <span>1080 × 1920 · 9:16</span>
                    </div>
                    <div className="stage-frame">{stage}</div>
                    <div className="preview-footer">
                      <span>
                        <span className="live-dot" />{" "}
                        {connected ? "Đồng bộ thời gian thực" : "Đang nối lại"}
                      </span>
                      <span>
                        OBS READY <ArrowUpRight size={12} />
                      </span>
                    </div>
                  </div>
                  <div className="mc-caption">
                    <span
                      className={
                        "mic-badge " + (audio.speaking ? "speaking" : "")
                      }
                    >
                      <Volume2 size={18} />
                    </span>
                    <div>
                      <small>MC MINH · PHỤ ĐỀ / GIỌNG DỰ PHÒNG</small>
                      <p>“{audio.caption}”</p>
                    </div>
                    <button
                      className="icon-button"
                      onClick={audio.enable}
                      title="Bật âm thanh"
                    >
                      <Volume2 size={17} />
                    </button>
                  </div>
                </section>
                <div className="controls-column">
                  <section className="panel session-panel">
                    <div className="panel-heading">
                      <h2>Điều khiển buổi tiệc</h2>
                      <span className="badge green">
                        {state.running ? "ĐANG MỞ TIỆC" : "TẠM DỪNG"}
                      </span>
                    </div>
                    <div className="panel-body">
                      <div className="mode-switch">
                        <button
                          disabled={!authed}
                          onClick={() => control("mode", { mode: "demo" })}
                          className={state.mode === "demo" ? "selected" : ""}
                        >
                          Chế độ Demo
                        </button>
                        <button
                          disabled={!authed}
                          onClick={() => control("mode", { mode: "live" })}
                          className={state.mode === "live" ? "selected" : ""}
                        >
                          Kết nối Live
                        </button>
                      </div>
                      <p className="helper">
                        {state.mode === "demo"
                          ? "Trải nghiệm trọn vẹn, không cần tài khoản TikTok."
                          : "Chưa kết nối TikTok. Chờ adapter được xác thực gửi sự kiện."}
                      </p>
                      <div className="session-buttons">
                        <button
                          disabled={!authed}
                          className="button primary"
                          onClick={() =>
                            control(state.running ? "stop" : "start")
                          }
                        >
                          {state.running ? (
                            <Pause size={15} />
                          ) : (
                            <Play size={15} />
                          )}{" "}
                          {state.running ? "Tạm dừng tiệc" : "Bắt đầu tiệc"}
                        </button>
                        <button
                          disabled={!authed}
                          className="button outline"
                          onClick={() => {
                            if (
                              confirm(
                                "Reset điểm, vai và hàng đợi? Khách vẫn được giữ lại.",
                              )
                            )
                              void control("reset");
                          }}
                        >
                          <RotateCcw size={15} />
                          Reset
                        </button>
                      </div>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Mời cả nhà chung vui</h2>
                      <Sparkles size={17} />
                    </div>
                    <div className="panel-body">
                      <p className="section-description">
                        Chạm một chút, sân khấu thêm rộn ràng.
                      </p>
                      <div className="effects-grid">
                        {[
                          ["toast", "Nâng ly", GlassWater],
                          ["celebrate", "Chúc mừng", Flower2],
                          ["dance", "Cùng nhảy", Music2],
                          ["heart", "Gửi yêu thương", Heart],
                          ["fireworks", "Pháo hoa", Sparkles],
                          ["curtain", "Rèm hoa chúc", Heart],
                        ].map(([id, title, Icon]) => {
                          const I = Icon as typeof Heart;
                          return (
                            <button
                              disabled={!authed}
                              key={id as string}
                              onClick={() => control(id as string)}
                            >
                              <I size={24} />
                              <span>{title as string}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                  <section className="panel couple-panel">
                    <div className="panel-heading">
                      <h2>Cặp đôi tối nay</h2>
                      <Heart size={17} />
                    </div>
                    <div className="panel-body">
                      {["bride", "groom"].map((role) => (
                        <div className="role-row" key={role}>
                          <div className={"role-avatar " + role}>
                            <Heart size={19} />
                          </div>
                          <div>
                            <small>
                              {role === "bride" ? "CÔ DÂU" : "CHÚ RỂ"}
                            </small>
                            <b>
                              {state.roles[role]
                                ? state.users[state.roles[role]!]?.name
                                : "Đang chờ nhân vật chính"}
                            </b>
                            <span>
                              {state.queues[role].length
                                ? "Lượt sau: " +
                                  (admin?.users.find(
                                    (u) => u.id === state.queues[role][0],
                                  )?.name || state.queues[role][0])
                                : "Chưa có khách trong hàng đợi"}
                            </span>
                          </div>
                          <button
                            disabled={!authed}
                            className="icon-button"
                            title="Bỏ lượt / người kế tiếp"
                            onClick={() => control("next", { role })}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      ))}
                      {authed && (
                        <div className="assign-row">
                          {["bride", "groom"].map((role) => (
                            <select
                              key={role}
                              aria-label={"Chọn " + role}
                              value=""
                              onChange={(e) =>
                                control("assign", {
                                  role,
                                  user_id: e.target.value,
                                })
                              }
                            >
                              <option value="">
                                Chọn {role === "bride" ? "cô dâu" : "chú rể"}…
                              </option>
                              {admin?.users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>
                      )}
                      <button
                        disabled={!authed}
                        className="text-button"
                        onClick={() => control("end")}
                      >
                        Kết thúc vòng tiệc <ChevronRight size={13} />
                      </button>
                    </div>
                  </section>
                </div>
              </div>
              <section className="panel demo-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Thử một chút phép màu</h2>
                    <span className="badge">DEMO PLAYGROUND</span>
                  </div>
                  <button
                    disabled={!authed || state.mode !== "demo"}
                    className="text-button"
                    onClick={addGuests}
                  >
                    <Users size={15} />
                    Mời 12 khách
                  </button>
                </div>
                <div className="demo-crowd">
                  <button
                    className="button primary"
                    disabled={
                      !authed ||
                      state.mode !== "demo" ||
                      state.config.max_guests < 100
                    }
                    onClick={fillHundred}
                  >
                    Tạo đủ 100 khách demo
                  </button>
                  <button
                    className="button outline"
                    disabled={!authed || state.mode !== "demo"}
                    onClick={addCrowd}
                  >
                    Mời 30 khách
                  </button>
                  <span>
                    Kiểm tra bố cục đông khách · dữ liệu vẫn giữ khi vượt giới
                    hạn render
                  </span>
                </div>
                <div className="panel-body demo-grid">
                  <div>
                    <label>TÊN KHÁCH</label>
                    <input
                      value={nick}
                      onChange={(e) => setNick(e.target.value)}
                    />
                    <label>ID ỔN ĐỊNH</label>
                    <input
                      value={uid}
                      onChange={(e) => setUid(e.target.value)}
                    />
                    <button
                      className="button outline"
                      disabled={!authed || state.mode !== "demo"}
                      onClick={() => event("join")}
                    >
                      Vào tiệc <ChevronRight size={15} />
                    </button>
                  </div>
                  <div>
                    <label>GỬI LỜI CHÚC</label>
                    <div className="input-action">
                      <input
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            void event("comment", { text: comment });
                        }}
                      />
                      <button
                        disabled={!authed || state.mode !== "demo"}
                        onClick={() => event("comment", { text: comment })}
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                    <div className="chips">
                      {["chúc mừng", "dzô", "nhảy", "hôn đi", "nam", "nữ"].map(
                        (x) => (
                          <button
                            key={x}
                            disabled={!authed || state.mode !== "demo"}
                            onClick={() => event("comment", { text: x })}
                          >
                            {x}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSimDrop((x) => !x);
                        setNotice(
                          simDrop
                            ? "Đang kết nối lại và tải snapshot"
                            : "Đã ngắt WebSocket trên thiết bị này",
                        );
                      }}
                    >
                      {simDrop ? <Wifi size={14} /> : <WifiOff size={14} />}{" "}
                      {simDrop ? "Kết nối lại" : "Giả lập mất kết nối"}
                    </button>
                  </div>
                  <div>
                    <label>QUÀ TẶNG THỬ NGHIỆM</label>
                    <div className="gift-inputs">
                      <select
                        value={giftId}
                        onChange={(e) => {
                          setGiftId(e.target.value);
                          combo.current = crypto.randomUUID();
                        }}
                      >
                        {Object.entries(state.config.gifts).map(([id, g]) => (
                          <option value={id} key={id}>
                            {g.name} · {g.points} điểm
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Số lượng combo"
                        type="number"
                        min="1"
                        max="10000"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                      />
                    </div>
                    <div className="session-buttons">
                      <button
                        className="button primary"
                        disabled={!authed || state.mode !== "demo"}
                        onClick={() =>
                          event("gift", { gift_id: giftId, count })
                        }
                      >
                        <Gift size={14} />
                        Tặng quà
                      </button>
                      <button
                        className="button outline"
                        disabled={!authed || state.mode !== "demo"}
                        onClick={() =>
                          event("gift", {
                            gift_id: giftId,
                            count,
                            combo_id: combo.current,
                          })
                        }
                      >
                        Combo: {count}
                      </button>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        combo.current = crypto.randomUUID();
                        setNotice("Đã tạo combo mới");
                      }}
                    >
                      Bắt đầu combo mới
                    </button>
                    <small className="helper">
                      Combo gửi tổng tích lũy; máy chủ chỉ cộng phần tăng thêm.
                    </small>
                  </div>
                </div>
              </section>
              <AttendanceControls
                state={state}
                users={admin?.users || []}
                authed={authed}
                onControl={control}
              />
            </>
          ) : tab === "visuals" ? (
            <AssetEditor
              visuals={state.visuals}
              authed={authed}
              onError={setError}
              onSaved={() => setNotice("Đã đồng bộ hình ảnh sân khấu")}
            />
          ) : tab === "logs" ? (
            <section className="panel">
              <div className="panel-heading">
                <h2>Sự kiện gần nhất</h2>
                <span className="badge">{state.source_status}</span>
              </div>
              <div className="panel-body">
                <p className="helper">
                  Sự kiện cuối:{" "}
                  {state.last_event
                    ? new Date(state.last_event * 1000).toLocaleString("vi-VN")
                    : "Chưa có"}
                  . Nhật ký chỉ dành cho quản trị.
                </p>
                {admin?.logs
                  .slice()
                  .reverse()
                  .map((l, i) => (
                    <div className="log-row" key={i}>
                      <time>
                        {new Date(l.at * 1000).toLocaleTimeString("vi-VN")}
                      </time>
                      <span>{l.message}</span>
                    </div>
                  ))}
              </div>
            </section>
          ) : (
            draft && (
              <section className="panel settings-panel">
                <div className="panel-heading">
                  <h2>
                    {tab === "sound"
                      ? "MC & âm thanh"
                      : "Cấu hình được lưu bằng SQLite"}
                  </h2>
                  <Settings2 size={18} />
                </div>
                <div className="panel-body">
                  {tab === "settings" ? (
                    <>
                      <div className="form-grid">
                        {[
                          ["title", "Tên lễ cưới"],
                          ["announcement", "Thông báo"],
                          ["goal", "Mỗi mốc quà (điểm)"],
                          ["curtain_seconds", "Thời gian rèm (giây)"],
                          ["cooldown", "Cooldown bình luận (giây)"],
                          [
                            "max_guests",
                            "Sức chứa khách mời (không tính cặp đôi/MC)",
                          ],
                          ["name_font_size", "Cỡ chữ bảng tên"],
                          ["name_plate_width", "Chiều rộng bảng tên"],
                          ["name_plate_height", "Chiều cao bảng tên"],
                          ["name_head_gap", "Khoảng cách bảng tên trên đầu"],
                        ].map(([key, title]) => (
                          <label key={key}>
                            {title}
                            <input
                              type={
                                typeof draft[key as keyof Config] === "number"
                                  ? "number"
                                  : "text"
                              }
                              value={String(draft[key as keyof Config])}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  [key]:
                                    typeof draft[key as keyof Config] ===
                                    "number"
                                      ? Number(e.target.value)
                                      : e.target.value,
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <label>
                        LUẬT BÌNH LUẬN · JSON
                        <textarea
                          rows={10}
                          value={rules}
                          onChange={(e) => setRules(e.target.value)}
                        />
                      </label>
                      <label>
                        MAPPING QUÀ · GIFT ID → TÊN, ACTION, POINTS
                        <textarea
                          rows={14}
                          value={gifts}
                          onChange={(e) => setGifts(e.target.value)}
                        />
                      </label>
                      <p className="helper">
                        ID bắt đầu demo- chỉ dành cho demo. Với nguồn thật, dùng
                        gift ID do adapter cung cấp. Khi đổi mục tiêu, các mốc
                        cũ được đồng bộ theo tổng hiện tại, không phát lại.
                      </p>
                      <button
                        disabled={!authed}
                        className="button outline"
                        onClick={() => {
                          if (
                            confirm(
                              "Reset tiến độ mục tiêu về 0? Điểm cá nhân vẫn giữ.",
                            )
                          )
                            void control("reset_goal");
                        }}
                      >
                        Reset mục tiêu cộng đồng
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="sound-notice">
                        <Volume2 />
                        <div>
                          <b>Giọng trình duyệt dự phòng</b>
                          <p>
                            Chưa cấu hình dịch vụ TTS. Không đảm bảo giọng nam
                            hoặc có tiếng Việt trên mọi máy. Phụ đề và animation
                            luôn hoạt động.
                          </p>
                        </div>
                      </div>
                      <button className="button primary" onClick={audio.enable}>
                        <Volume2 size={16} />
                        {audio.enabled ? "Âm thanh đã bật" : "Bật âm thanh"}
                      </button>
                      <div className="form-grid">
                        {[
                          ["mc_volume", "Âm lượng MC"],
                          ["music_volume", "Nhạc nền tự tạo"],
                          ["effect_volume", "Hiệu ứng"],
                          ["speech_rate", "Tốc độ nói"],
                          ["speech_pause", "Nghỉ giữa câu (ms)"],
                        ].map(([key, title]) => (
                          <label key={key}>
                            {title}
                            <input
                              type="number"
                              step={key === "speech_pause" ? 100 : 0.05}
                              value={Number(draft[key as keyof Config])}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  [key]: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        ))}
                        <label>
                          Giọng tiếng Việt
                          <select
                            value={draft.voice}
                            onChange={(e) =>
                              setDraft({ ...draft, voice: e.target.value })
                            }
                          >
                            <option value="">Tự chọn giọng có sẵn</option>
                            {window.speechSynthesis
                              ?.getVoices()
                              .filter((v) => v.lang.startsWith("vi"))
                              .map((v) => (
                                <option key={v.name}>{v.name}</option>
                              ))}
                          </select>
                        </label>
                      </div>
                      <button
                        disabled={!authed}
                        className="button outline"
                        onClick={() =>
                          run(async () => {
                            await api("/tts", {
                              text: "Xin kính chào quý vị!",
                            });
                            await api("/control", { action: "open" });
                          })
                        }
                      >
                        Nghe thử lời mở tiệc
                      </button>
                      <p className="helper">
                        Nhạc nền là hợp âm tổng hợp tự tạo. Nhạc tự giảm khi MC
                        nói. Muốn nghe giá trị mới, hãy lưu cấu hình.
                      </p>
                    </>
                  )}
                  <div className="save-row">
                    <button
                      disabled={!authed}
                      className="button primary"
                      onClick={() =>
                        run(async () => {
                          const body = {
                            ...draft,
                            keywords: JSON.parse(rules),
                            gifts: JSON.parse(gifts),
                          };
                          await api("/config", body, "PUT");
                          setDraft(body);
                          setNotice("Đã lưu cấu hình");
                        })
                      }
                    >
                      <Check size={16} />
                      Lưu cấu hình
                    </button>
                  </div>
                  <div className="adapter-note">
                    <b>Kết nối live qua adapter</b>
                    <p>
                      Chưa tích hợp nhà cung cấp TikTok. Backend nhận schema sự
                      kiện tại POST /api/live/events với Bearer token phía
                      server. Không nhập mật khẩu TikTok vào ứng dụng.
                    </p>
                  </div>
                </div>
              </section>
            )
          )}
          <footer>
            <span>
              <Heart size={12} /> Được tạo cho những khoảnh khắc hạnh phúc.
            </span>
            <span>
              {authed ? (
                <button
                  className="text-button"
                  onClick={() =>
                    run(async () => {
                      await api("/logout");
                      setAuthed(false);
                      setAdmin(null);
                    })
                  }
                >
                  <LogOut size={13} />
                  Đăng xuất
                </button>
              ) : (
                "MARRY LIVE"
              )}{" "}
              <i>◆</i> DEMO STUDIO
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
