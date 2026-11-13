---
name: dang-sach-ces-academy
description: Đăng sách đã viết xong (file PDF, ảnh bìa, video giới thiệu) lên thư viện CES Academy bằng các công cụ academy_* của MCP ces-academy, hoặc sửa sách đã đăng. Dùng khi người dùng nói "đăng sách lên Academy", "đăng ebook lên CES Academy", "up sách", "đăng cuốn này kèm video", "thay file PDF của sách", "đặt sách Premium cho đọc thử", "kiểm tra kết nối Academy", hoặc khi chạy lịch đăng sách hằng ngày.
---

# Đăng sách lên CES Academy

Sách đã được viết xong ở nơi khác. Việc ở đây chỉ là tải file lên và đăng. Không viết hay sửa nội dung sách.

## Quy trình đăng sách mới

1. Gọi `academy_status`.
   - Không thấy công cụ `academy_*` nào: thường là chưa dán khóa (plugin chỉ chạy khi đã có khóa).
   - Báo lỗi khóa (chưa có khóa, khóa sai, khóa bị thu hồi, người tạo khóa mất quyền): dừng lại và báo người dùng. Khóa mới do người quản trị tạo ở trang quản trị CES Academy > Kết nối MCP. Người dùng tự dán khóa: gõ `/plugin configure ces-academy@ces-global`, dán vào ô "Khóa MCP", rồi khởi động lại Claude Code. **Không bao giờ xin khóa trong khung chat** và không ghi khóa vào file hay lệnh.
   - Ghi nhớ chế độ đăng (`requireReview`) để báo đúng kết quả ở bước cuối.
2. Gom đủ thông tin. Bắt buộc: tên sách (tiếng Việt có dấu) và đường dẫn file PDF trên máy. Nên có: ảnh bìa, video giới thiệu, mô tả, tác giả, danh mục. Thiếu tên hoặc PDF thì hỏi người dùng.
   - Không có mô tả: được viết 2-3 câu dựa trên mục lục hoặc lời mở đầu của sách, và nói rõ với người dùng là đã tự viết.
   - Không có tác giả: để "CES Global" nếu người dùng không nói khác.
3. Gọi `academy_list_categories` để chọn danh mục khớp nội dung. Không chắc thì hỏi.
4. Gọi `academy_list_books` với `search` là tên sách để tránh đăng trùng. Đã có sách cùng tên: hỏi người dùng muốn sửa sách cũ (`academy_update_book`, chỉ khi `editableByMcp` = true) hay vẫn đăng cuốn mới.
5. Gọi `academy_publish_book` với đường dẫn file trên máy. Công cụ tự tải file lên kho của CES, video lớn có thể mất vài phút.
6. Báo lại người dùng: tên sách, link trang sách, trạng thái (`pending_review` = Chờ duyệt, người quản trị duyệt mới hiện trên web; `published` = đã hiện trên web; `draft` = nháp), file nào đã tải lên.

## Sửa sách đã đăng

- Chỉ sửa được sách do MCP đăng (`editableByMcp` = true). Lấy `book_id` từ `academy_list_books` với `only_mcp` = true.
- Chỉ gửi trường cần đổi. Đang bật duyệt thì sau khi sửa sách quay về Chờ duyệt, nhớ báo người dùng.
- MCP không xóa được sách. Người dùng muốn xóa thì nhờ người quản trị xóa trên trang quản trị.

## Sách Premium

- Mặc định sách miễn phí (`access_tier` = free). Chỉ đặt `premium` khi người dùng yêu cầu.
- Premium: người chưa có gói chỉ đọc thử `preview_pages` trang đầu (mặc định 5). Số trang đọc thử nên bao trọn bìa và mục lục, và phải nhỏ hơn tổng số trang.

## File

- PDF: bắt buộc, đuôi `.pdf`.
- Ảnh bìa: JPG, PNG hoặc WebP, khuyến nghị 400x600 px.
- Video giới thiệu: MP4 hoặc WebM, tối đa 500 MB, lưu trên kho của CES (không qua YouTube). Quá nặng thì đề nghị người dùng nén lại (1080p, H.264) rồi thử lại.
- Mỗi sách tải file riêng, không dùng chung file đã gắn cho sách khác.

## Khi chạy tự động, không có người trả lời

- Thiếu thông tin bắt buộc hoặc không chắc danh mục / có nguy cơ trùng: bỏ qua cuốn đó, không đoán, và ghi rõ lý do trong báo cáo cuối.
- Lỗi mạng khi tải file: thử lại một lần, vẫn lỗi thì bỏ qua cuốn đó và báo cáo.
