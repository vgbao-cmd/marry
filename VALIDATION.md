# Kiểm chứng Marry Live — nâng cấp ảnh chân thực

Môi trường chạy: Linux cloud, Node 24.22.1, Python 3.12.14, Chromium headless (WebGL phần mềm khi cần). Kiểm tra trên ứng dụng thật qua FastAPI/WebSocket. Không có tài khoản TikTok, vendor TTS trả phí hoặc OBS trong kiểm tra.

## Các kiểm tra đã chạy

- `npm run build`: TypeScript và Vite production build đạt.
- `.venv/bin/python -m pytest backend/tests -q`: **12 passed**. Giữ nguyên kiểm tra luật, sự kiện trùng, combo tăng thêm, nhiều mốc, vai/hàng đợi, từ khóa, 250 khách, reset/stop, auth, ingest, SQLite, cold restart, WebSocket reconnect và lỗi TTS. Thêm upload ảnh yêu cầu auth/quyền sử dụng, kiểm tra PNG/WebP/alpha/kích thước, tên file an toàn, xác minh atlas, căn chân, persist và broadcast manifest.
- `npm run test:e2e`: **3 passed**. Giữ kịch bản quản trị/demo/MC trước đây; thêm renderer ảnh thật, ít nhất 30 khách render, gửi quà/pháo hoa, giữ dải quà khi rèm đóng, upload ảnh MC qua UI, chỉnh offset, lưu và reload stage. Kiểm tra không có tải lại atlas sau sự kiện, không có page error, và particle nằm trong trần cấu hình. Thử chất lượng thấp/giảm hiệu ứng và kích thước canvas tương ứng.
- MC test dùng SpeechSynthesis giả lập để kiểm tra điều phối: tối đa một câu đồng thời, phục hồi lỗi, nhạc tự giảm/tăng. **Không phải kiểm tra chất lượng giọng nghe thật.**
- Một cảnh báo deprecation AnyIO/Starlette trong pytest; không có kiểm thử bị bỏ qua.

## Ảnh chụp thật của bản mới

- [MC và cặp đôi](docs/screenshots/photographic-couple.png).
- [Ít nhất 30 khách](docs/screenshots/photographic-30-guests.png).
- [Thông báo quà và hiệu ứng](docs/screenshots/photographic-gift.png).
- [Rèm lụa và đếm ngược](docs/screenshots/photographic-curtain.png).
- [Quản trị thay/căn ảnh nhân vật](docs/screenshots/photographic-admin-assets.png).

Bộ này là ảnh chụp trình duyệt 1080×1920 cho stage; trang quản trị chụp toàn trang. Các ảnh `stage.png`/`admin.png` cũ chỉ là lịch sử phiên bản vector, không mô tả renderer hiện hành.

## Giới hạn đã xác định

- Ảnh mặc định gồm sảnh, rèm, 3 vai chính và 8 mẫu khách; đều là ảnh AI theo phong cách nhiếp ảnh. Không còn nhân vật vector trong renderer. Xem [ASSETS.md](design/ASSETS.md).
- Bộ mặc định chỉ có tư thế đứng. Đi vào/chuyển vai là trượt nhẹ/crossfade, không phải chuỗi bước chân. Không có ảnh nâng ly/vẫy tay/nhảy thật; khi thiếu pose, chỉ thông báo, MC và hiệu ứng. Hệ thống đã hỗ trợ atlas đa frame và pose để bổ sung mà không đổi renderer. Chưa có lip-sync chân thực.
- Bóng, phản chiếu ngắn, spotlight, confetti/petal/heart/firework là lớp renderer tổng hợp, không phải hiệu ứng vật lý hoặc 3D.
- Chưa đo FPS/GPU phần cứng người dùng, không tuyên bố đã đạt 60 FPS. Các mức là mục tiêu: thấp 30, vừa/cao 60; chất lượng thấp/vừa/cao tối đa lần lượt 24/30/40 khách (còn bị giới hạn bởi cấu hình backend), cộng ba vai chính. Particle tối đa 35/85/160, hoặc 18 khi giảm hiệu ứng.
- TikTok LIVE thật, giọng nam TTS chất lượng cao, Windows/OBS và âm thanh thực chưa được xác minh. Cổng adapter và fallback demo vẫn hoạt động; không có kết nối giả được mô tả là thật.
- Backend một worker; backup SQLite cùng `backend/data/media`. Ảnh upload là dữ liệu cục bộ, không được commit. Bộ ảnh mặc định/WebP/PNG nguồn đã được đưa vào dự án.
