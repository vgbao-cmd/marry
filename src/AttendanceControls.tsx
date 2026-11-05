import { useState } from "react";
import type { State } from "./types";
export function AttendanceControls({
  state,
  users,
  authed,
  onControl,
}: {
  state: State;
  users: { id: string; name: string }[];
  authed: boolean;
  onControl: (action: string, extra?: Record<string, string>) => Promise<void>;
}) {
  const [leaver, setLeaver] = useState(""),
    [waiting, setWaiting] = useState("");
  const name = (id: string) =>
    state.users[id]?.name || users.find((u) => u.id === id)?.name || id;
  const seats = Object.entries(state.guest_slots).sort((a, b) => a[1] - b[1]);
  return (
    <section className="panel attendance-panel">
      <div className="panel-heading">
        <h2>Khách mời & danh sách chờ</h2>
        <span className="badge">
          {state.seated_count}/{state.config.max_guests} KHÁCH ·{" "}
          {state.waiting_count} CHỜ
        </span>
      </div>
      <div className="panel-body">
        <p className="helper">
          Sức chứa không tính MC, cô dâu và chú rể. Cho khách rời sẽ tự mời
          người đầu hàng chờ vào đúng ô trống. Điểm và lịch sử của khách vẫn
          được giữ.
        </p>
        <div className="attendance-swap">
          <label>
            Khách rời
            <select
              aria-label="Khách rời"
              value={leaver}
              onChange={(e) => setLeaver(e.target.value)}
            >
              <option value="">Chọn khách đang đứng…</option>
              {seats.map(([id, slot]) => (
                <option key={id} value={id}>
                  #{slot + 1} · {name(id)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Khách đang chờ
            <select
              aria-label="Khách đang chờ"
              value={waiting}
              onChange={(e) => setWaiting(e.target.value)}
            >
              <option value="">Chọn người muốn mời vào…</option>
              {state.guest_waiting.map((id) => (
                <option key={id} value={id}>
                  {name(id)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button primary"
            disabled={
              !authed ||
              !Object.hasOwn(state.guest_slots, leaver) ||
              !state.guest_waiting.includes(waiting)
            }
            onClick={() =>
              onControl("guest_admit", {
                user_id: waiting,
                replace_user_id: leaver,
              })
            }
          >
            Thay khách đã chọn
          </button>
        </div>
        <details>
          <summary>
            {state.seated_count} khách đang đứng · {state.waiting_count} người
            đang chờ
          </summary>
          <div className="attendance-list">
            {seats.map(([id, slot]) => (
              <div key={id}>
                <small>#{slot + 1}</small>
                <span>{name(id)}</span>
                <button
                  className="text-button"
                  disabled={!authed}
                  onClick={() => onControl("guest_leave", { user_id: id })}
                >
                  Cho rời tiệc
                </button>
              </div>
            ))}
          </div>
          <div className="waiting-list">
            {state.guest_waiting.map((id, i) => (
              <span key={id}>
                {i + 1}. {name(id)}
              </span>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
