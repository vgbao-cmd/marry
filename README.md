# Marry Live

Game tiệc cưới tương tác 9:16 cho OBS, React + TypeScript + PixiJS 8, FastAPI + WebSocket + SQLite. Repository ban đầu chỉ có README; ứng dụng được khởi tạo mới. Demo không cần tài khoản TikTok hay API key. Sân khấu dùng ảnh sảnh cưới chân thực do AI tạo, MC vest xanh, cặp đôi và tám mẫu khách ảnh toàn thân alpha. Có 18 khách dữ liệu mẫu khi database mới; nút **Mời 30 khách** thử cảnh đông người.

## Chạy trên Windows (PowerShell)

Cài **Node.js 24 LTS** (22 LTS cũng được), **Python 3.12** và Git. Mở PowerShell, tải nhánh chứa ứng dụng (chưa merge vào `main`):

```powershell
git clone --branch codex/marry-live-demo --single-branch https://github.com/vgbao-cmd/marry.git
cd marry
node --version
npm --version
py -3.12 --version
```

Nếu đã clone repository, giữ các thay đổi riêng của bạn, sau đó `git fetch origin codex/marry-live-demo` và `git switch codex/marry-live-demo` (tạo nhánh tracking từ `FETCH_HEAD` nếu local chưa có nhánh). Tiếp tục cài đặt và chạy tại thư mục `marry`:

```powershell
npm ci
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock.txt
npm run build
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Mở trình duyệt tại `http://127.0.0.1:8000/demo` hoặc `/admin`. `/stage` là sân khấu sạch. Lần chạy đầu backend tạo mật khẩu ngẫu nhiên trong **`backend/data/admin-password.txt`** (chỉ đọc cục bộ). Mở file này trên máy của bạn rồi nhập vào ô quản trị. Không chia sẻ file, database hoặc mật khẩu. Có thể đặt `$env:MARRY_ADMIN_PASSWORD` trước khi khởi động thay cho mật khẩu tự tạo. Phiên đăng nhập có hạn 12 giờ và mất khi backend khởi động lại. Demo chỉ yêu cầu mật khẩu quản trị cục bộ để ngăn khách xem stage thay đổi game.

Trong phát triển, giữ backend ở terminal đầu; terminal thứ hai chạy:

```powershell
npm run dev
```

Mở `http://127.0.0.1:5173/admin`. Vite proxy `/api` và `/ws` sang backend; hot reload frontend. Sau khi sửa Python, chạy backend với `--reload`. Chạy tại checkout hiện có; mỗi cloud task đã được cô lập, không cần tạo worktree.

### Linux / cloud

```bash
npm ci
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.lock.txt
npm run build
.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
# terminal khác nếu cần hot reload:
npm run dev
```

Chỉ bind `0.0.0.0` trong môi trường có kiểm soát truy cập. Khi công khai, đặt reverse proxy HTTPS/WSS; không công khai thư mục `backend/data`. Backend cùng origin với frontend, cookie HttpOnly + SameSite Strict, Secure khi qua HTTPS. Các API thay đổi trạng thái, cấu hình, demo và TTS yêu cầu đăng nhập; mật khẩu có giới hạn số lần thử. Không nhúng thông tin quản trị vào URL stage.

`.env.example` mô tả các biến. Backend **không tự nạp `.env`**: đặt biến trong process/thiết lập môi trường. Không commit giá trị thật. `MARRY_DB` chọn đường dẫn SQLite; mặc định `backend/data/marry.sqlite3`.

## Thử demo

1. Đăng nhập quản trị, chọn **Chế độ Demo**. Khách/cặp đôi mẫu chỉ khởi tạo khi database mới.
2. **Mời 12 khách**, chọn ID ổn định và gửi `chúc mừng`, `dzô`, `nhảy`, `hôn đi`, `nam`, `nữ`. Chữ thường/hoa và khoảng trắng được chuẩn hóa; từ khóa có ranh giới từ. Có thể chỉnh bí danh có/không dấu ở cấu hình.
3. Chọn quà, số lượng và **Tặng quà**. Chọn **Combo** với tổng 2, sau đó 5: chỉ cộng 2 + 3. Bấm **Bắt đầu combo mới** để tạo chuỗi khác. Gửi lại tổng cũ không tăng điểm.
4. `demo-clover` → cô dâu, `demo-pig` → chú rể, `demo-rose` → mừng cưới. Đây là mapping demo, **không xác nhận danh mục TikTok hiện hành**. Vai đã có người thì xếp hàng; người đó không được ở hai vai/hai hàng đợi. Nút mũi tên bỏ lượt và gọi người kế tiếp; dropdown cho phép chỉ định trực tiếp.
5. Thử nâng ly, nhảy, tim, pháo hoa, rèm có đếm ngược. Dải quà không bị rèm che. Mỗi quà tăng điểm ảo, không đổi/rút thành tiền. Gửi số lượng lớn để vượt nhiều mốc; từng mốc được ghi nhận đúng một lần.
6. **Reset mục tiêu** chỉ xóa tiến độ cộng đồng, giữ điểm cá nhân. **Kết thúc vòng** xóa vai/hàng đợi, giữ điểm; **Reset** xóa cả điểm, vai, hàng đợi và tăng số vòng, vẫn giữ khách. Sự kiện cũ vẫn được chống phát lại sau reset.
7. **Giả lập mất kết nối** ngắt WebSocket thật trên trang này. Bấm **Kết nối lại**: tải snapshot chính thức. Các trang stage khác vẫn nhận sự kiện. Reload stage cũng tải snapshot mới; không phát lại hiệu ứng đã hết hạn.
8. **MC & âm thanh** → Bật âm thanh, chọn giọng nếu thiết bị có tiếng Việt, lưu cấu hình rồi nghe thử. Trang OBS riêng cần được bật âm thanh riêng do chính sách autoplay.

Tất cả người tham gia/điểm được lưu trong SQLite. Snapshot chỉ gửi số khách được chọn theo tương tác gần nhất (mặc định 36, tối đa 48), vai chính và top 5. Vị trí khách ổn định theo ID trong tập đang render; tên rút gọn, bố trí dưới sân khấu. Khi đổi tập hiển thị khách có thể chuyển chỗ. Renderer dùng sprite ảnh toàn thân, chân neo vào sàn, bóng và phản chiếu ngắn, z-order theo vị trí chân. Ảnh không bị kéo giãn/bẻ khớp. Bộ mặc định chỉ có tư thế đứng: vào chỗ bằng nội suy/crossfade; nâng ly/nhảy hiện phát thông báo và hiệu ứng, chỉ đổi pose khi có tài nguyên tương ứng. Xem [nguồn tài nguyên và giới hạn](design/ASSETS.md).

## OBS

Browser Source → URL `http://127.0.0.1:8000/stage`, **Width 1080, Height 1920**, FPS 60 nếu máy hỗ trợ. Bật điều khiển âm thanh trong OBS, dùng Interact để bấm **Bật âm thanh**. Canvas thiết kế 1080×1920, co theo 9:16; xem trước trong studio có cùng renderer. Không đưa token/mật khẩu vào URL. Trong live, chừa lớp giao diện nền tảng ở vùng rìa và kiểm tra crop thực tế trước khi phát.

## MC và TTS

- MC có phụ đề, animation và nhiều mẫu câu cho mở tiệc, chào, cảm ơn, gọi vai, nâng ly, nhảy, mốc, rèm, kết thúc.
- Chào/cảm ơn được gom bằng cửa sổ cooldown 10 giây. Lời dẫn có ưu tiên, thời hạn 25 giây, phát tuần tự, có thời gian nghỉ; hàng đợi tối đa 15. Câu cũ được bỏ qua.
- **Chưa có dịch vụ TTS chất lượng cao**. `TTSProvider` trong `backend/main.py` là điểm thay thế phía server; `/api/tts` trả provider dự phòng và không có file audio. Hiện dùng SpeechSynthesis trình duyệt khi có giọng `vi`, không đảm bảo giọng nam, chất lượng hay tính sẵn có. Không có giọng thì chỉ phụ đề/animation.
- Nhạc là hợp âm sine tổng hợp tự tạo bằng Web Audio, không dùng bản thu có bản quyền. Ba âm lượng độc lập; nhạc giảm còn 20% mức cài đặt trong lúc MC nói. Timeout/callback lỗi giải phóng hàng đợi. Bản hiện tại chưa tích hợp nhà cung cấp TTS hay API key; khi chọn nhà cung cấp phải đọc tài liệu hiện hành và giữ key ở backend.

## Live: hợp đồng adapter, chưa tích hợp TikTok

Ứng dụng **chưa kết nối trực tiếp TikTok**, không dùng SDK không chính thức và không yêu cầu mật khẩu TikTok. Có API tiếp nhận sự kiện chuẩn hóa; cần adapter ngoài có quyền truy cập hợp lệ từ nguồn bạn chọn. Chưa kiểm thử livestream thật.

Đặt `MARRY_INGEST_TOKEN` phía backend và adapter, chọn chế độ Live trong quản trị. Adapter gửi HTTPS `POST /api/live/events`, header `Authorization: Bearer <token>` (không đưa token vào frontend). Schema cũng có trong `/docs`:

```json
{"id":"provider-event-unique-id","type":"gift","user_id":"provider-stable-user-id","name":"Ngọc Hân","gift_id":"provider-real-gift-id","combo_id":"provider-combo-id","count":5}
```

`type`: `join`, `comment` (thêm `text`), `like`, `gift`, `disconnect`, `reconnect`. `count` là **tổng tích lũy** trong combo, tối đa 10000. `combo_id` phải duy nhất cho một chuỗi trong suốt lịch sử nguồn; không có combo thì mỗi ID là một món quà độc lập. Cấu hình mapping theo gift ID thật trước khi sử dụng. Nguồn trạng thái hiển thị `waiting_adapter`, `adapter`, `disconnected`; `adapter` chỉ có nghĩa nhận dữ liệu qua cổng, không chứng minh kết nối TikTok. Thời điểm sự kiện cuối và lỗi hiển thị trong nhật ký.

Backend lưu ID sự kiện không giới hạn thời gian trong bảng `events`, phục hồi chống trùng và combo sau restart. Adapter phải tự nối lại nguồn, giữ ID ổn định; WS frontend tự nối lại sau 2 giây và heartbeat/snapshot mỗi 3 giây. Nếu nguồn thiếu ID: adapter có thể hash nguồn + user ID + loại + payload + timestamp nguồn; chỉ là dự phòng, có thể bỏ sót/trùng khi timestamp không đủ chính xác. Không tuyên bố chống trùng tuyệt đối cho nguồn đó. Nếu nguồn gửi số lượng tăng thêm thay vì tổng combo, adapter phải đổi sang hợp đồng trên.

## Cấu trúc và kiểm thử

- `src/Stage.tsx`: bố cục/chữ động và chuyển cảnh rèm.
- `src/photographicRenderer.ts`, `textureLibrary.ts`: PixiJS photo sprites, atlas/pose, z-order, preload/giải phóng texture, pool particle.
- `src/AssetEditor.tsx`, `backend/visuals.py`: quản trị tài nguyên, căn chân, upload được xác thực và manifest ảnh.
- `src/main.tsx`: studio, bộ mô phỏng, quản trị và WebSocket sync.
- `src/audio.ts`: điều phối hàng đợi MC, giọng dự phòng, Web Audio và ducking.
- `backend/game.py`: luật, vai, điểm, combo, cooldown, mẫu lời dẫn.
- `backend/main.py`: FastAPI, auth, SQLite, ingest demo/live, snapshot và TTS provider.
- `backend/tests`: luật và API/WebSocket/persistence. `tests`: kiểm thử Chromium thực và ảnh chụp.

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
npm run build
# Giữ backend chạy. Lần đầu cài Chromium cho Playwright:
npx playwright install chromium
npm run test:e2e
```

Trên Linux có Chromium hệ thống dùng `/usr/bin/chromium`; có thể ghi đè bằng `CHROMIUM_PATH`. Trên Windows mặc định dùng Chromium của Playwright. Ảnh được tạo ở `artifacts/studio.png`, `stage.png`, `mobile.png`, không commit. E2E dùng mật khẩu bootstrap cục bộ hoặc biến `MARRY_ADMIN_PASSWORD`; chạy trên database demo, không chạy trên phiên live đang phát.

Kết quả thực tế và giới hạn xem [VALIDATION.md](VALIDATION.md). Chưa đo FPS phần cứng người dùng; mục tiêu 60 FPS, không phải kết quả đảm bảo. Particle có pool dùng lại theo loại và trần số lượng: thấp 35, vừa 85, cao 160; giảm hiệu ứng tối đa 18. Chất lượng thấp giới hạn ticker 30 FPS, vừa/cao 60 FPS mục tiêu; đây không phải số FPS đã đo trên máy người dùng. SQLite/event history cần kế hoạch lưu trữ/backup nếu phát dài ngày. Triển khai hiện tại một process Uvicorn; không chạy nhiều worker vì state/WS/auth trong bộ nhớ.

## Tài nguyên và giấy phép

Nền sảnh, rèm và nhân vật ảnh chân thực được tạo riêng bằng OpenAI image_gen; particle, bóng và ánh đèn được tổng hợp bằng renderer. Không trích logo, watermark, hình hay âm thanh từ video tham khảo. Xem [design/ASSETS.md](design/ASSETS.md) để biết nguồn và phạm vi sử dụng. Video chỉ dùng để hiểu bố cục, không được đưa vào sản phẩm. Font tự host qua `@fontsource/be-vietnam-pro` và `@fontsource/playfair-display` (SIL Open Font License 1.1; giấy phép đi kèm các package); biểu tượng `lucide-react` (ISC); PixiJS (MIT). React, Vite, FastAPI và các dependency giữ giấy phép upstream. Không có nhạc/ảnh stock bên ngoài.


## Tích hợp tiếp theo: trạng thái đã kiểm tra

Mã hiện tại chỉ có cổng ingest `POST /api/live/events`; **chưa có connector TikTok** hoặc SDK TikTok trong dependency. `MARRY_INGEST_TOKEN` là khóa nội bộ do người triển khai tự tạo để bảo vệ cổng ingest, **không phải TikTok API key**. Cần chọn nguồn có quyền đọc sự kiện LIVE, xác minh tài liệu/điều kiện tài khoản, viết adapter kết nối, chuẩn hóa ID người dùng/sự kiện/gift/combo, reconnect và đối chiếu quà thực tế. Sau đó thử một LIVE thật và kiểm tra số điểm trước khi dùng phát sóng. Giải pháp không chính thức phải được ghi rõ nếu lựa chọn sau này; TikTok Login API không tự cấp quyền đọc quà/bình luận LIVE.

`TTSProvider` hiện chỉ trả `browser-fallback` và `audio_url: null`; frontend đã có nhánh phát URL audio, hàng đợi và ducking. Chưa có vendor SDK, voice ID hoặc API key. Để dùng giọng MC nam tiếng Việt, cần chọn dịch vụ có giọng phù hợp, xác minh tài liệu hiện hành, đặt credential phía backend, triển khai tạo/cache/phục vụ audio cùng timeout/retry/quota, và nghe thử thực tế. Ví dụ ứng viên **Azure AI Speech** cần tài khoản Azure, Speech resource, key và region; đây là lựa chọn để đánh giá, **chưa được tích hợp hoặc xác minh giọng hiện hành trong dự án**. Chưa có lý do yêu cầu người dùng cung cấp key trước khi chọn dịch vụ. Giọng trình duyệt không cần API key nhưng không bảo đảm giới tính/chất lượng.

Cả hai tích hợp phải giữ fallback demo, trạng thái lỗi minh bạch và không coi sự kiện mô phỏng là kết nối thật. Không nhập mật khẩu TikTok hoặc API key vào chat/URL stage.


## Ảnh chụp demo

[MC và cặp đôi](docs/screenshots/photographic-couple.png) · [30 khách](docs/screenshots/photographic-30-guests.png) · [Quà/hiệu ứng](docs/screenshots/photographic-gift.png) · [Rèm cưới](docs/screenshots/photographic-curtain.png) · [Quản trị ảnh](docs/screenshots/photographic-admin-assets.png). Ảnh chụp từ ứng dụng đang chạy bằng Chromium, không phải bản thiết kế tĩnh.


## Thay ảnh mà không sửa code

Đăng nhập → **Hình ảnh & nhân vật**. Chọn MC/cô dâu/chú rể hoặc mẫu khách. Xác nhận quyền sử dụng rồi tải PNG/WebP trong suốt (tối đa 8 MB, mỗi chiều 64–4096 px). Backend xác minh nội dung/alpha, loại metadata và lưu WebP tối đa 2048 px trong `backend/data/media/`; tên file ngẫu nhiên. Ảnh đục nền hoặc giả đuôi PNG bị từ chối. Không gửi ảnh/avatar người khác khi chưa có quyền.

Xem trước trên nền ô trong suốt, chỉnh chiều cao, điểm bám chân X/Y theo tỉ lệ 0–1, độ lệch, vị trí X/Y cho vai chính. Không có nút kéo giãn ngang/dọc độc lập. Mẫu khách xếp theo vùng/chiều sâu tự động; điểm chân/chiều cao/offset vẫn áp dụng. **Lưu hình ảnh** lưu SQLite và phát snapshot cho mọi stage. **Bỏ chỉnh sửa** quay về cấu hình đang dùng. Có thể thêm mẫu khách nam/nữ.

Trong **Atlas / chuỗi sprite nâng cao**, chọn pose, tải atlas tương ứng, đặt các frame `[[x,y,width,height],...]` có cùng kích thước, chọn FPS, bấm **Áp dụng khung** rồi lưu. Frame tính theo kích thước ảnh sau chuẩn hóa (tối đa 2048 px); thông báo upload API trả width/height. Điểm chân của các pose phải khớp với tư thế đứng. Nếu thiếu pose, renderer giữ ảnh đứng và chỉ phát hiệu ứng/MC.

Chọn **Thấp / Vừa / Cao**, hoặc **Giảm hiệu ứng** rồi lưu. Các mức đổi độ phân giải canvas, FPS mục tiêu, số khách hiển thị tối đa (24/30/40, còn bị giới hạn bởi backend) và giới hạn particle; không thay luật chơi, điểm hay MC. Ảnh gốc không tải lại theo sự kiện livestream. Muốn mã hóa lại bộ mặc định, cài Chromium cho Playwright và chạy `node scripts/build-visual-assets.mjs`; chỉ cần khi thay nguồn thiết kế.

Backup cả SQLite và thư mục `backend/data/media` khi chuyển máy. Ảnh upload không được commit vì thuộc dữ liệu riêng của từng môi trường; bộ ảnh mặc định và nguồn thiết kế được commit trong dự án. Trong chế độ Vite, `/media` được proxy về backend giống `/api`.
