import { useEffect, useRef, useState } from "react";
import { PhotographicRenderer } from "./photographicRenderer";
import type { State } from "./types";
export function Stage({
  state,
  speaking = false,
}: {
  state: State;
  speaking?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(state),
    talk = useRef(speaking);
  latest.current = state;
  talk.current = speaking;
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now());
  const clock = useRef(state.server_time - Date.now() / 1000);
  useEffect(() => {
    clock.current = state.server_time - Date.now() / 1000;
  }, [state.server_time]);
  const key = JSON.stringify(state.visuals);
  useEffect(() => {
    let active = true;
    const renderer = new PhotographicRenderer();
    setReady(false);
    setError("");
    void renderer
      .init(
        host.current!,
        () => latest.current,
        () => talk.current,
      )
      .then(() => {
        if (active) setReady(true);
      })
      .catch((e) => {
        if (active) setError("Không nạp được ảnh sân khấu: " + String(e));
      });
    return () => {
      active = false;
      renderer.destroy();
    };
  }, [key]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(
    0,
    Math.ceil(state.curtain_until - now / 1000 - clock.current),
  );
  const [curtainVisible, setCurtainVisible] = useState(remaining > 0),
    [curtainOpen, setCurtainOpen] = useState(false);
  useEffect(() => {
    if (remaining > 0) {
      setCurtainVisible(true);
      setCurtainOpen(false);
    } else if (curtainVisible) {
      setCurtainOpen(true);
      const t = setTimeout(() => setCurtainVisible(false), 1300);
      return () => clearTimeout(t);
    }
  }, [remaining, curtainVisible]);
  const event = state.effects
    .slice()
    .reverse()
    .find(
      (e) =>
        e.until > now / 1000 + clock.current &&
        !["join", "male", "female"].includes(e.kind),
    );
  const captions: Record<string, string> = {
    gift: "Một món quà, ngàn lời chúc",
    toast: "Cùng nâng ly chúc phúc",
    celebrate: "Chúc mừng hạnh phúc",
    dance: "Giai điệu ngày chung đôi",
    heart: "Gửi trọn yêu thương",
    fireworks: "Khoảnh khắc rực rỡ",
    milestone: "Chạm mốc yêu thương",
    bride: "Xin chào cô dâu",
    groom: "Xin chào chú rể",
  };
  return (
    <div
      className={
        "stage photographic-stage quality-" +
        state.visuals.quality +
        (state.visuals.reduced_effects ? " reduced-effects" : "")
      }
      aria-label="Sân khấu tiệc cưới chân thực"
    >
      <div className="canvas-host" ref={host} />
      {(!ready || error) && (
        <div className="stage-asset-status" role="status">
          {error || "Đang chuẩn bị sảnh cưới…"}
        </div>
      )}
      <div className="photo-vignette" />
      <div className="photo-header">
        <div className="photo-wordmark">
          MARRY <span>LIVE</span>
        </div>
        <h2>{state.config.title}</h2>
        <p>{state.config.announcement}</p>
      </div>
      <div className="photo-score">
        <div>
          <small>SỔ VÀNG</small>
          <b>
            {state.total.toLocaleString("vi")} <em>chỉ vàng</em>
          </b>
        </div>
        <div className="photo-goal">
          <span>
            MỤC TIÊU CỘNG ĐỒNG{" "}
            <b>
              {state.total % state.config.goal}/{state.config.goal}
            </b>
          </span>
          <div className="goal-track">
            <i
              style={{
                width: `${((state.total % state.config.goal) / state.config.goal) * 100}%`,
              }}
            />
          </div>
          <small>
            Mốc tiếp theo{" "}
            {(Math.floor(state.total / state.config.goal) + 1) *
              state.config.goal}{" "}
            · điểm ảo
          </small>
        </div>
      </div>
      <div className="photo-leaders">
        <small>NHỮNG TẤM LÒNG VÀNG</small>
        {state.leaders
          .filter((u) => u.points > 0)
          .slice(0, 3)
          .map((u, i) => (
            <div key={u.id}>
              <i>{i + 1}</i>
              <span>{u.name}</span>
              <b>{u.points}</b>
            </div>
          ))}
      </div>
      <div className="photo-stage-title">
        <small>TRÂN TRỌNG CHÚC PHÚC</small>
        <strong>Lễ Thành Hôn</strong>
      </div>
      {event && captions[event.kind] && (
        <div className="photo-event" key={event.id}>
          <small>KHOẢNH KHẮC YÊU THƯƠNG</small>
          <strong>{captions[event.kind]}</strong>
          <span>
            {state.users[event.user]?.name || "Cảm ơn cả nhà đã chung vui"}
          </span>
        </div>
      )}
      {curtainVisible && (
        <div className={"photo-curtain " + (curtainOpen ? "is-opening" : "")}>
          <div className="fabric-panel left" />
          <div className="fabric-panel right" />
          <div className="curtain-copy">
            <small>KHOẢNH KHẮC RIÊNG TƯ</small>
            <h3>
              Động phòng
              <br />
              hoa chúc
            </h3>
            <span className="curtain-line" />
            <b>{remaining || "♥"}</b>
            <p>Trăm năm hạnh phúc · Một đời bên nhau</p>
          </div>
        </div>
      )}
      <div className="stage-ribbon photo-ribbon">
        {Object.entries(state.config.gifts)
          .slice(0, 3)
          .map(([id, g]) => (
            <div key={id}>
              <b>{g.name}</b>
              <span>
                {g.action === "bride"
                  ? "Đăng ký cô dâu"
                  : g.action === "groom"
                    ? "Đăng ký chú rể"
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
