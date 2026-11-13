# Cài plugin "CES Academy" cho Claude Code

Plugin này giúp Claude đăng sách đã viết xong (file PDF, ảnh bìa, video giới thiệu) lên CES Academy. Plugin không viết sách.

> **Dành cho Claude:** làm theo mục 1 và 2. Khóa MCP là bí mật: **không xin khóa trong khung chat, không ghi khóa vào lệnh hay file.** Tới bước dán khóa thì dừng lại và chỉ người dùng tự làm mục 3.

## 1. Chuẩn bị

- Máy có **Node.js 20 trở lên** (kiểm tra: `node --version`; chưa có thì cài bản LTS tại nodejs.org).
- Có **Claude Code** (kiểm tra: `claude --version`).
- Có **khóa MCP**: người quản trị vào trang quản trị CES Academy, tab **Kết nối MCP**, bấm **Tạo khóa**. Khóa bắt đầu bằng `cesak_` và chỉ hiện một lần.

## 2. Cài plugin

Chạy trong terminal (2 lệnh, không có khóa trong lệnh):

```bash
claude plugin marketplace add cesglobal-vn/ces-academy-mcp
```

```bash
claude plugin install ces-academy@ces-global
```

Lệnh cài báo "1 userConfig option not yet set" là đúng: khóa chưa được dán, làm tiếp mục 3.

Nếu lệnh đầu báo không tải được kho (kho trên GitHub để riêng tư), đăng nhập GitHub trên máy bằng `gh auth login` rồi `gh auth setup-git`, sau đó chạy lại.

Máy từng cài MCP này theo cách cũ (tải file `.mjs` rồi `claude mcp add`) thì gỡ bản cũ trước để khỏi chạy 2 bản: `claude mcp remove ces-academy --scope user`.

## 3. Dán khóa (người dùng tự làm)

1. Mở Claude Code, gõ `/plugin configure ces-academy@ces-global` (hoặc gõ `/plugin`, chọn **Installed** > **ces-academy** > **Configure options**).
2. Dán khóa vào ô **Khóa MCP** (ô che chữ, khóa được cất vào kho bảo mật của máy), lưu lại.
3. Khởi động lại Claude Code.

Ô **Địa chỉ API của CES** để nguyên mặc định. Chưa dán khóa thì plugin chưa chạy, Claude sẽ không thấy các công cụ `academy_*`.

## 4. Kiểm tra

Nhờ Claude: "Kiểm tra kết nối CES Academy". Claude gọi `academy_status` và báo: khóa đang đăng thay cho ai, chế độ đăng (bật duyệt / đăng luôn), phiên bản plugin (`mcpVersion`).

## 5. Cách dùng

Ví dụ câu nhờ Claude:

- "Đăng sách lên CES Academy: file D:/sach/ke-toan-claude.pdf, bìa D:/sach/ke-toan-claude.png, video D:/sach/ke-toan-claude.mp4, danh mục Kinh Doanh, tác giả CES Global, mô tả: ..."
- "Đặt sách đó là Premium, cho đọc thử 5 trang."
- "Thay file PDF của sách ... bằng D:/sach/ke-toan-claude-v2.pdf."

Plugin có sẵn hướng dẫn đăng sách cho Claude (skill `dang-sach-ces-academy`) và các công cụ:

| Công cụ | Việc |
|---|---|
| `academy_status` | Kiểm tra khóa, đang đăng thay ai, chế độ đăng, phiên bản |
| `academy_list_categories` | Danh mục sách |
| `academy_list_books` | Tìm sách đã có (tránh đăng trùng, lấy id để sửa) |
| `academy_get_book` | Xem một sách |
| `academy_publish_book` | Đăng sách mới (tải PDF, bìa, video từ máy) |
| `academy_update_book` | Sửa sách do MCP đăng |

## 6. Cập nhật bản mới

```bash
claude plugin update ces-academy@ces-global
```

Rồi khởi động lại Claude Code. Muốn tự cập nhật: `/plugin` > **Marketplaces** > **ces-global** > bật tự cập nhật.

## 7. Quy tắc

- **Chế độ đăng** do người quản trị chọn ở tab Kết nối MCP:
  - **Bật duyệt** (mặc định): sách gửi lên nằm ở "Chờ duyệt", người quản trị bấm **Duyệt & công khai** mới hiện trên web. Sửa sách lúc đang bật duyệt thì sách quay về Chờ duyệt.
  - **Đăng luôn**: sách hiện trên web ngay.
- Sách mặc định **miễn phí**. Premium: người chưa có gói chỉ đọc thử N trang đầu.
- File chấp nhận: PDF; ảnh bìa JPG / PNG / WebP (khuyến nghị 400x600 px); video MP4 / WebM tối đa 500 MB (lưu trên kho của CES, không qua YouTube).
- MCP chỉ sửa được sách do MCP đăng, không xóa được sách nào. Mỗi sách tải file riêng, không dùng chung file với sách khác.
- Khóa đăng sách thay cho người tạo khóa. Người đó nghỉ hoặc mất quyền quản lý CES Academy thì khóa tự ngừng. Lỡ lộ khóa thì thu hồi ở tab Kết nối MCP, tạo khóa mới và dán lại theo mục 3.

## Cách khác: Claude Desktop (không có Claude Code)

Claude Desktop chưa dùng được plugin của Claude Code, phải cài tay và khóa nằm trong file cấu hình (kém an toàn hơn plugin, chỉ dùng khi không có Claude Code).

1. Tải `https://academy.cesglobal.com.vn/mcp/ces-academy-mcp.mjs`, lưu vào `C:/ces-academy-mcp/`.
2. Mở Claude Desktop > Settings > Developer > Edit Config, thêm vào mục `mcpServers` (thay `cesak_...` bằng khóa thật):

```json
{
  "mcpServers": {
    "ces-academy": {
      "command": "node",
      "args": ["C:/ces-academy-mcp/ces-academy-mcp.mjs"],
      "env": { "CES_ACADEMY_API_KEY": "cesak_..." }
    }
  }
}
```

3. Khởi động lại Claude Desktop. Bản cài tay không tự cập nhật: có bản mới thì tải lại file.
