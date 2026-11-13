# ces-academy-mcp

Plugin Claude Code `ces-academy` (kèm MCP server stdio): đăng sách đã viết xong (PDF, ảnh bìa, video giới thiệu) lên CES Academy qua API `/api/academy-mcp` của be-crm-cesglobal. Repo này cũng là marketplace `ces-global`.

Hướng dẫn cài cho người dùng: [huong-dan-cai-dat.md](huong-dan-cai-dat.md) (bản phát hành nằm ở `https://academy.cesglobal.com.vn/mcp/huong-dan-cai-dat.md`).

## Cấu trúc

```
.claude-plugin/marketplace.json            marketplace "ces-global" (1 plugin)
plugins/ces-academy/.claude-plugin/plugin.json   plugin: phiên bản, ô cấu hình (khóa ẩn), MCP server
plugins/ces-academy/dist/ces-academy-mcp.mjs     bản build 1 file (commit vào git, máy cài không build)
plugins/ces-academy/skills/dang-sach-ces-academy/SKILL.md   quy trình đăng sách cho Claude
src/                                       mã nguồn MCP (TypeScript)
```

## Phát triển và phát hành

```bash
pnpm install
pnpm run typecheck
pnpm run build              # -> plugins/ces-academy/dist/ces-academy-mcp.mjs
claude plugin validate . --strict
claude plugin validate plugins/ces-academy --strict
pnpm run release-to-academy # chép hướng dẫn + bản build (cho Claude Desktop) sang ces-academy/public/mcp/
```

Phát hành bản mới: tăng `version` ở **cả** `package.json` và `plugins/ces-academy/.claude-plugin/plugin.json` (build dừng nếu 2 số khác nhau), build, commit cả file `dist`, push. Máy đã cài chạy `claude plugin update ces-academy@ces-global` (Claude Code so số phiên bản để biết có bản mới). Deploy ces-academy nếu hướng dẫn đổi.

Thử plugin trên máy dev mà không đụng cấu hình chính: trong một thư mục trống, `claude plugin marketplace add <đường dẫn repo> --scope local` rồi `claude plugin install ces-academy@ces-global --scope local --config api_url=http://127.0.0.1:4000/api`.

## Cấu hình

Plugin tự điền 2 biến môi trường cho MCP từ ô cấu hình:

| Ô cấu hình | Biến | Mặc định |
|---|---|---|
| `api_key` (ẩn, bắt buộc) | `CES_ACADEMY_API_KEY` | (tạo ở trang quản trị Academy > Kết nối MCP) |
| `api_url` | `CES_ACADEMY_API_URL` | `https://lms-api.cesglobal.com.vn/api` |

Chưa có khóa thì Claude Code không chạy MCP. Lúc khởi động MCP ghi 1 dòng vào nhật ký MCP: phiên bản, địa chỉ API, 12 ký tự đầu của khóa (giống trang quản trị đang hiện).

## Luồng

1. `POST /academy-mcp/uploads` lấy link PUT ký sẵn cho từng file (PDF -> bucket riêng tư, bìa + video -> bucket public). R2 chỉ kiểm hạn link lúc bắt đầu tải (đã thử 13/11/2026), nên video tải lâu hơn hạn link vẫn xong.
2. PUT file thẳng lên R2.
3. `POST /academy-mcp/books` (hoặc `PATCH /books/:id`) với `pdf_key`, `cover_key`, `video_key`. Máy chủ kiểm file có thật, đúng thư mục, không dùng chung với sách khác, rồi tạo sách theo đúng luật của trang quản trị (Premium, mục lục, bản đọc thử).

Chế độ duyệt (bật / đăng luôn) và khóa API quản lý trên trang quản trị Academy, không cấu hình trong file.
