# Marry Live — bộ ảnh sảnh cưới và nhân vật

Bộ ảnh được tạo mới bằng công cụ **OpenAI image_gen** cho yêu cầu nâng cấp Marry Live trong phiên làm việc này. Không tải ảnh người thật hoặc ảnh stock bất kỳ từ Internet; không trích logo, watermark, khung hình hay âm thanh từ video tham khảo. Nhân vật là người hư cấu do AI tạo, không chủ ý mô phỏng cá nhân cụ thể.

| File nguồn trong `design/source/` | File chạy trong `public/assets/wedding/` | Nội dung |
|---|---|---|
| ballroom.png | ballroom.webp | Sảnh cưới khách sạn, hoa trắng, đèn chùm, sàn đá, bánh và tháp ly; không chữ/không người |
| principals.png | principals.webp | Atlas ảnh alpha: MC Việt vest xanh, chú rể tuxedo đen, cô dâu váy trắng/voan/hoa |
| guests.png | guests.webp | Atlas alpha 4×2: tám mẫu nam/nữ Việt hư cấu, nhiều tóc/trang phục |
| fabric.png | fabric.webp | Chất liệu rèm lụa champagne/đỏ rượu có nếp và đường thêu |

Nguồn: ảnh AI tạo riêng, dùng trong dự án theo điều khoản của dịch vụ tạo ảnh; không gán nhầm giấy phép stock/OFL/public-domain cho ảnh. Font và thư viện vẫn giữ giấy phép riêng tại `public/assets/licenses/`. Người quản trị phải có quyền sử dụng ảnh bổ sung và xác nhận khi tải lên. Không có ảnh người dùng hoặc dữ liệu nhận dạng thật đi kèm bộ mặc định.

Ảnh nguồn được giữ nguyên để đối chiếu, không đưa vào thư mục phân phối web. `scripts/build-visual-assets.mjs` dùng Chromium mã hóa WebP chất lượng 0.9, giữ alpha; đây là bước mã hóa định dạng, không chỉnh sửa khuôn mặt/cơ thể. Cả bốn file WebP tổng khoảng **1.14 MiB**, thay cho khoảng 9 MiB PNG nguồn. Kiểm tra số byte thực bằng `ls -l public/assets/wedding`.

Atlas được cắt bằng `Texture.frame` tại runtime, nhiều nhân vật dùng chung texture gốc. MC/chú rể/cô dâu có frame riêng; khách dùng ô 384×512. Backend xác minh frame nằm trong ảnh. Texture được preload trước khi đánh dấu sân khấu sẵn sàng, không tải lại theo sự kiện/heartbeat. Khi đổi manifest/chất lượng hoặc rời màn hình, renderer giải phóng texture/source do chính nó sở hữu. Texture của các trang độc lập không chia sẻ quyền sở hữu.

## Chất lượng và giới hạn trung thực

- Nền, rèm, ba vai chính và cả tám mẫu khách đều là ảnh AI theo phong cách nhiếp ảnh, **không còn dùng nhân vật vector đầu tròn**.
- Mỗi mẫu mặc định hiện có **một tư thế đứng**, không có chuỗi bước chân, vẫy tay, nhảy hay nâng ly thật. Di chuyển vào chỗ là nội suy vị trí/crossfade của ảnh toàn thân. Đứng chờ dùng biến thiên ánh sáng rất nhẹ, chân giữ cố định; không kéo giãn/biến dạng cơ thể, không bẻ khớp giả.
- Các hành động game vẫn có thông báo/MC/particle tương ứng. Khi quản trị tải pose hay atlas đúng hành động (`walk`, `talk`, `toast`, `dance`, `celebrate`, `heart`), renderer sẽ dùng pose đó. Khi thiếu, giữ tư thế đứng. Các frame cùng một pose phải có cùng kích thước và cùng điểm chân.
- Không biến avatar người xem thành ảnh toàn thân. ID người xem chỉ chọn một mẫu trong bộ khách theo kiểu đã chọn; avatar không phải nguồn ảnh nhân vật.
- Đổ bóng, phản chiếu chân ngắn, spotlight và particle là các lớp renderer tổng hợp; không phải mô phỏng vật lý hay 3D. Rèm dùng ảnh lụa thật theo phong cách nhiếp ảnh trên hai panel trượt, chữ/countdown là HTML động.
- Không khẳng định ảnh AI hoàn hảo về giải phẫu/chất liệu hoặc nhân vật là người thật. Nên xem ở độ phân giải phát sóng trước khi dùng trong sự kiện.


## Cập nhật sức chứa và bảng tên

Renderer hiện giữ đủ mọi người được backend nhận vào (mặc định 100 khách, ngoài ba vai). Chất lượng thấp không còn cắt bớt xuống 24/30/40 khách như phiên bản đầu. Chỉ giảm độ phân giải/ticker/particle. Vị trí lấy từ số ô lưu trong SQLite, không theo thứ tự tương tác hay tổng số người đang render. Hỗ trợ chen chúc/che nhau và thứ tự theo bàn chân.

Bảng tên được vẽ bằng lớp riêng trên ảnh/hiệu ứng, nền tím/xanh đậm, chữ trắng, có dòng vai cho MC/cô dâu/chú rể. Có thể chồng một phần; không tự giấu người hoặc bảng tên khi đông. Tên dài được rút theo grapheme để không bẻ emoji ghép; đầu/viền được giữ trong khung 1080×1920. Sửa cỡ chữ/kích thước/khoảng cách trên đầu ở Cấu hình tiệc. Các khung ảnh vẫn chia sẻ texture nguồn; actor rời được dùng lại qua pool hữu hạn.
