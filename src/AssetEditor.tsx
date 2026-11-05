import { useEffect, useRef, useState } from "react";
import type { CharacterAsset, PoseAsset, Visuals } from "./types";
function Preview({ asset, pose }: { asset: CharacterAsset; pose: PoseAsset }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const im = new Image();
    im.src = pose.url;
    void im
      .decode()
      .then(() => {
        if (!active) return;
        setError("");
        const ctx = canvas.current!.getContext("2d")!;
        ctx.clearRect(0, 0, 440, 520);
        const f = pose.frames[0] || [0, 0, im.width, im.height];
        const scale = (asset.height * 0.62) / f[3],
          w = f[2] * scale,
          h = f[3] * scale,
          x = 220 + asset.offset_x * 0.62,
          y = 440 + asset.offset_y * 0.62;
        ctx.fillStyle = "rgba(44,30,15,.13)";
        ctx.beginPath();
        ctx.ellipse(x, y + 4, 50, 8, 0, 0, 7);
        ctx.fill();
        ctx.drawImage(
          im,
          ...f,
          x - w * asset.foot_x,
          y - h * asset.foot_y,
          w,
          h,
        );
        ctx.strokeStyle = "#b56a48";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(440, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "#9e6749";
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
      })
      .catch(() => {
        if (active) setError("Không đọc được ảnh");
      });
    return () => {
      active = false;
    };
  }, [asset, pose]);
  return (
    <div className="asset-preview">
      <canvas ref={canvas} width={440} height={520} />
      <span>{error || "Dấu + là điểm bám chân · Không kéo giãn cơ thể"}</span>
    </div>
  );
}
export function AssetEditor({
  visuals,
  authed,
  onError,
  onSaved,
}: {
  visuals: Visuals;
  authed: boolean;
  onError: (m: string) => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Visuals>(() => structuredClone(visuals)),
    [slot, setSlot] = useState("mc"),
    [pose, setPose] = useState("idle"),
    [rights, setRights] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [atlas, setAtlas] = useState("");
  const asset = draft.characters[slot];
  const selected =
    pose === "idle"
      ? asset
      : asset.poses[pose as keyof CharacterAsset["poses"]] || asset;
  useEffect(() => {
    setAtlas(JSON.stringify(selected.frames));
  }, [slot, pose, selected.frames]);
  const patch = (changes: Partial<CharacterAsset>) =>
    setDraft((d) => ({
      ...d,
      characters: {
        ...d.characters,
        [slot]: { ...d.characters[slot], ...changes },
      },
    }));
  const applyPose = (p: PoseAsset) => {
    if (pose === "idle") patch({ url: p.url, frames: p.frames, fps: p.fps });
    else patch({ poses: { ...asset.poses, [pose]: p } });
  };
  const upload = async (file: File) => {
    onError("");
    setStatus("");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("rights", String(rights));
      const r = await fetch("/api/assets", { method: "POST", body });
      const data = await r.json();
      if (!r.ok)
        throw Error(
          typeof data.detail === "string" ? data.detail : "Không tải được ảnh",
        );
      applyPose({ url: data.url, frames: [], fps: 8 });
      setStatus("Đã tải ảnh. Kiểm tra chân rồi bấm Lưu hình ảnh.");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    onError("");
    setStatus("");
    setBusy(true);
    try {
      const r = await fetch("/api/visuals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await r.json();
      if (!r.ok)
        throw Error(
          typeof d.detail === "string" ? d.detail : "Cấu hình ảnh không hợp lệ",
        );
      setStatus("Đã lưu hình ảnh; sân khấu đã đồng bộ.");
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel visual-editor">
      <div className="panel-heading">
        <h2>Hình ảnh & nhân vật</h2>
        <span className="badge">PHOTO STUDIO</span>
      </div>
      <div className="panel-body">
        <p className="visual-intro">
          Bộ ảnh hư cấu chân thực được tạo riêng cho Marry Live. Ảnh toàn thân
          và avatar người xem là hai loại tài nguyên riêng biệt.
        </p>
        <div className="visual-toolbar">
          <label>
            Chất lượng
            <select
              aria-label="Chất lượng hình ảnh"
              value={draft.quality}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  quality: e.target.value as Visuals["quality"],
                })
              }
            >
              <option value="low">Thấp · 30 FPS mục tiêu</option>
              <option value="medium">Vừa · 60 FPS mục tiêu</option>
              <option value="high">Cao · 60 FPS mục tiêu</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={draft.reduced_effects}
              onChange={(e) =>
                setDraft({ ...draft, reduced_effects: e.target.checked })
              }
            />
            Giảm hiệu ứng
          </label>
          <button
            className="button outline"
            disabled={!authed || busy}
            onClick={() => {
              const id = "guest-" + crypto.randomUUID().slice(0, 8);
              setDraft({
                ...draft,
                characters: {
                  ...draft.characters,
                  [id]: {
                    ...structuredClone(asset),
                    label: "Khách mới",
                    poses: {},
                  },
                },
              });
              setSlot(id);
              setPose("idle");
            }}
          >
            Thêm mẫu khách
          </button>
        </div>
        <div className="visual-layout">
          <div className="asset-list" role="list" aria-label="Bộ nhân vật">
            {Object.entries(draft.characters).map(([id, a]) => (
              <button
                key={id}
                className={id === slot ? "selected" : ""}
                onClick={() => {
                  setSlot(id);
                  setPose("idle");
                  setStatus("");
                }}
              >
                <span>{a.label}</span>
                <small>{id}</small>
              </button>
            ))}
          </div>
          <div className="asset-controls">
            <div className="form-grid">
              <label>
                Tên tài nguyên
                <input
                  value={asset.label}
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </label>
              <label>
                Tư thế
                <select
                  aria-label="Tư thế"
                  value={pose}
                  onChange={(e) => setPose(e.target.value)}
                >
                  {[
                    "idle",
                    "walk",
                    "talk",
                    "celebrate",
                    "toast",
                    "dance",
                    "heart",
                  ].map((p) => (
                    <option key={p} value={p}>
                      {p}
                      {p !== "idle" &&
                      !asset.poses[p as keyof CharacterAsset["poses"]]
                        ? " · chưa có ảnh"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Preview asset={asset} pose={selected} />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rights}
                onChange={(e) => setRights(e.target.checked)}
              />
              Tôi có quyền sử dụng ảnh tải lên
            </label>
            <label className="upload-box">
              Tải PNG / WebP trong suốt
              <input
                aria-label="Tải ảnh nhân vật"
                type="file"
                accept="image/png,image/webp"
                disabled={!authed || !rights || busy}
                onChange={(e) => {
                  if (e.target.files?.[0]) void upload(e.target.files[0]);
                  e.target.value = "";
                }}
              />
              <small>8 MB · tối đa 4096 px · lưu tối đa 2048 px</small>
            </label>
            <div className="form-grid">
              {[
                ["height", "Chiều cao (đơn vị sân khấu)", 50, 700, 1],
                ["foot_x", "Điểm chân X (0–1)", 0, 1, 0.01],
                ["foot_y", "Điểm chân Y (0–1)", 0.2, 1, 0.01],
                ["offset_x", "Lệch ngang", -300, 300, 1],
                ["offset_y", "Lệch dọc", -300, 300, 1],
                ["x", "Vị trí X vai chính", 0, 1080, 1],
                ["y", "Vị trí chân Y vai chính", 0, 1800, 1],
              ].map(([id, title, min, max, step]) => (
                <label key={String(id)}>
                  {title}
                  <input
                    aria-label={String(title)}
                    type="number"
                    min={Number(min)}
                    max={Number(max)}
                    step={Number(step)}
                    value={Number(asset[id as keyof CharacterAsset])}
                    onChange={(e) => patch({ [id]: Number(e.target.value) })}
                  />
                </label>
              ))}
              <label>
                Kiểu khách
                <select
                  value={asset.style}
                  onChange={(e) =>
                    patch({ style: e.target.value as "male" | "female" })
                  }
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </label>
            </div>
            <details>
              <summary>Atlas / chuỗi sprite nâng cao</summary>
              <p className="helper">
                Mỗi khung [x,y,rộng,cao] tính bằng pixel, cùng kích thước và
                điểm chân. Bộ mặc định chỉ có tư thế đứng. Chưa có pose thì giữ
                ảnh đứng và phát hiệu ứng, không bẻ khớp giả.
              </p>
              <label>
                Khung sprite JSON
                <textarea
                  rows={3}
                  value={atlas}
                  onChange={(e) => setAtlas(e.target.value)}
                />
              </label>
              <label>
                FPS chuỗi
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={selected.fps}
                  onChange={(e) =>
                    applyPose({ ...selected, fps: Number(e.target.value) })
                  }
                />
              </label>
              <button
                className="button outline"
                onClick={() => {
                  try {
                    const frames = JSON.parse(atlas);
                    if (
                      !Array.isArray(frames) ||
                      frames.some(
                        (f) =>
                          !Array.isArray(f) ||
                          f.length !== 4 ||
                          f.some((n: unknown) => typeof n !== "number"),
                      )
                    )
                      throw Error();
                    applyPose({ ...selected, frames });
                  } catch {
                    onError("Khung sprite phải là danh sách các bộ 4 số");
                  }
                }}
              >
                Áp dụng khung
              </button>
              {pose !== "idle" &&
                asset.poses[pose as keyof CharacterAsset["poses"]] && (
                  <button
                    className="text-button"
                    onClick={() => {
                      const poses = { ...asset.poses };
                      delete poses[pose as keyof typeof poses];
                      patch({ poses });
                    }}
                  >
                    Bỏ tư thế này
                  </button>
                )}
            </details>
            <p className="helper">
              Khách tự xếp theo vùng và chiều sâu; X/Y của mẫu khách không ghi
              đè bố cục. Height, điểm chân và độ lệch vẫn được áp dụng.
            </p>
            <div className="save-row">
              <button
                className="button primary"
                disabled={!authed || busy}
                onClick={save}
              >
                {busy ? "Đang xử lý…" : "Lưu hình ảnh"}
              </button>
              <button
                className="button outline"
                disabled={busy}
                onClick={() => {
                  setDraft(structuredClone(visuals));
                  setSlot("mc");
                  setPose("idle");
                  setStatus("Đã khôi phục cấu hình đang dùng");
                }}
              >
                Bỏ chỉnh sửa
              </button>
            </div>
            {status && (
              <p role="status" className="visual-save-status">
                {status}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
