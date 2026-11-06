# Crowd v2 — kích thước và nhãn theo alpha

## Khôi phục và bảo toàn

Workspace cũ đã truy cập lại được. Trước khi sửa/rerun kiểm thử: đọc `git status`/`git diff`, sao lưu 23 file sửa/mới cùng binary patch vào ZIP ngoài checkout, xác minh ZIP đọc được, commit checkpoint `6d5fe17` và đẩy lên `codex/marry-live-demo`. Không reset, clean, xóa hay tạo lại checkout. Checkpoint ghi rõ browser validation còn thiếu tại thời điểm lưu.

## Nguyên nhân và thay đổi

- Tám frame khách mặc định có khoảng alpha trống trên đầu 5–11 px, không phải khoảng trống lớn. Code cũ vẫn dùng tỉ lệ ước lượng đầu cố định; các hàng thẳng, người chỉ cao khoảng 98–145 px, biển rộng cố định 108 px làm liên hệ tên–người khó nhìn. Không có thuật toán chống trùng nhãn đang đẩy tên lên cao.
- Renderer đọc alpha một lần cho mỗi frame, ngưỡng 32/255, cache vùng nhìn thấy và tâm vùng đầu phía trên. Tính đầu trong hệ tọa độ frame rồi dùng đúng anchor/scale/offset của sprite để chuyển ra tọa độ sân khấu. Nhãn không đi qua bộ sắp hàng hoặc tránh va chạm riêng.
- Chiều cao khách tính theo phần ảnh có alpha, khoảng 141–220 px ở cấu hình mặc định, giữ tỉ lệ ngang/dọc. Hàng sau nhỏ hơn; hàng trước lớn hơn. Ô đứng so le có độ lệch cố định, lối đi hẹp dần về phía trước. Không đổi vị trí vì bình luận/quà hoặc vì thêm người.
- Nhãn dạng viên thuốc rộng theo chữ thực tế, giới hạn theo cấu hình; chữ mặc định 18–21 px theo chiều sâu, cao 26–29 px. Gap mặc định 6 px. Rút gọn theo bề rộng và grapheme, giữ emoji ghép. Vai MC/cô dâu/chú rể có màu và dòng vai riêng.
- Nếu tài nguyên có tay/đạo cụ nằm cao hơn đầu, quản trị có thể đặt `head_x`/`head_y` theo frame thay cho tự đo. Tự đo alpha không phải nhận diện khuôn mặt; với sprite nhiều pose, các anchor cần được căn nhất quán.
- Thông báo nằm ở dock gọn phía trên đám đông, tự hết hạn sau 3,5 giây. Không phủ dải quà hoặc phụ đề MC. Không kéo dài thời gian thông báo để làm kiểm thử qua.
- Cấu hình tiệc có `guest_scale`, `crowd_density`, `aisle_width`, font/chiều rộng/chiều cao/gap nhãn. Nút làm mới tên demo dùng 100 tên mẫu đa dạng; không đổi ID, ô đứng hay tên người xem thật. Test churn giữ nguyên tên thay vì đổi hàng loạt thành “Khách trở lại…”.

## Kiểm tra thực tế sau khôi phục

- Production build: đạt.
- Backend: **25 passed**, có migration cấu hình, kiểm tra giới hạn và bảo toàn tên/ô người thật.
- Chromium hồi quy: **3 passed** (`tests/studio.spec.ts`, `tests/visuals.spec.ts`): demo/quà, quản trị, WebSocket/reconnect, MC queue/ducking và upload/căn ảnh.
- `npm run test:crowd`: **1 passed** trên database demo riêng, không reset database hiện tại. Kiểm tra 30, 60, 100 khách; 33, 63, 103 bảng tên; không mất ô khi tăng sức chứa; giữ ô khi bình luận/reload; cache alpha giữ nguyên khi có sự kiện; thông báo có kích thước/vị trí thật và tự biến mất; ảnh thêm 300 px alpha trên đầu; thấp vẫn 100 khách/103 nhãn.
- Hai lỗi trong kiểm thử đã được sửa: giữ nhầm node thông báo cũ khi React thay thế/hết hạn; đọc số liệu scene cũ trước khi texture upload mới sẵn sàng. Kiểm thử nay ghi geometry từ DOM insertion thực và chờ đúng URL asset mới, không nới assertion hoặc giả lập kết quả.
- Không đo lại FPS hay bộ nhớ GPU/OBS. Phép đo JS heap 40 vòng trong báo cáo trước thuộc bản trước, không coi là benchmark mới cho cache alpha.

Số liệu đầy đủ: [crowd-v2-measurements.json](crowd-v2-measurements.json).

| Khách | Toàn cảnh | Cận cảnh |
|---|---|---|
| 30 | [Ảnh](screenshots/crowd-v2-30-full.png) | [Ảnh](screenshots/crowd-v2-30-close.png) |
| 60 | [Ảnh](screenshots/crowd-v2-60-full.png) | [Ảnh](screenshots/crowd-v2-60-close.png) |
| 100 | [Ảnh](screenshots/crowd-v2-100-full.png) | [Ảnh](screenshots/crowd-v2-100-close.png) |

[Ảnh kiểm tra padding alpha 300 px](screenshots/crowd-v2-padded-alpha-close.png). Các ảnh là screenshot trình duyệt thật, không phải mockup.
