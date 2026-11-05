# Kiểm chứng Marry Live

Môi trường: Linux cloud, Node 24.22.1, npm 11.9.0, Python 3.12.14; Chromium hệ thống chạy headless, WebGL phần mềm khi cần. Không dùng tài khoản TikTok, dịch vụ TTS trả phí hoặc OBS trong kiểm tra này.

- `scripts/setup.sh`: thực thi thành công; `npm ci`, cài Python từ lock, TypeScript + Vite build và kiểm thử backend.
- `npm run build`: đạt.
- `.venv/bin/python -m pytest backend/tests -q`: **9 passed**. Bao gồm trùng sự kiện; combo tổng 3→5→4; nhiều mốc một lần; tranh vai/hàng đợi; ranh giới từ khóa; 250 khách; reset/stop; xác thực; mapping/config validation; ingest live bằng token kiểm thử; snapshot WebSocket/reconnect; SQLite; phục hồi ID/combo trong process mới; provider TTS ném lỗi.
- `npm run test:e2e`: **2 passed** trên Chromium. Studio và stage render canvas thật, đăng nhập, thêm khách, gửi quà, nâng ly, đóng rèm, giữ dải quà, mất/kết nối lại WebSocket, lưu cấu hình và màn hình 390px. Kịch bản âm thanh giả lập SpeechSynthesis kiểm tra tối đa một câu cùng lúc, tiếp tục sau lỗi và gain nhạc giảm/tăng trở lại. Đây là kiểm thử điều phối, **không xác nhận chất lượng giọng nghe thực tế**.
- Backend `/api/health`: ok, `tiktok_connected: false`, TTS `browser-fallback`.
- Ảnh đã tạo: `artifacts/studio.png`, `artifacts/stage.png` (1080×1920), `artifacts/mobile.png`. Ảnh là output cục bộ được gitignore.

Có một cảnh báo deprecation từ Starlette/TestClient với AnyIO; kiểm thử vẫn đạt. Lần kiểm tra giao diện đầu tiên timeout khi đợi font tải ngoài; đã thay bằng font đóng gói cục bộ và chạy lại đạt.

## Chưa xác minh / giới hạn

- Livestream TikTok thật chưa tích hợp. API ingest đã thử với dữ liệu kiểm thử, không phải nguồn TikTok.
- Giọng MC nam dịch vụ chưa có; không có API key. SpeechSynthesis phụ thuộc hệ điều hành; môi trường này chưa nghe trực tiếp âm thanh. Việc phát file từ provider thay thế có đường triển khai nhưng chưa kiểm thử nhà cung cấp thực.
- Chưa thử trên Windows và OBS thực. Các lệnh Windows và quy trình OBS được ghi ở README để người dùng xác minh trên máy.
- Chưa đo FPS/GPU thực, không cam kết đã đạt 60 FPS. Đồ họa tự vẽ bằng mã; không có sprite thủ công hoặc object pool particle hoàn chỉnh.
- Chưa stress test sự kiện livestream qua Internet, nhiều process hoặc phát nhiều ngày. Dùng một worker Uvicorn; database và lịch sử chống trùng cần backup/giám sát dung lượng.
- Đã lưu `install_script` và `start_skill` vào bản nháp cấu hình cloud. Chưa publish, chưa xác minh khôi phục trên task mới. Review, Save và Publish thuộc giao diện thiết lập môi trường.
