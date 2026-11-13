// ============================================================
// MCP tools: publish finished books to CES Academy. The book is already
// written (PDF + cover + intro video on this machine); these tools only
// upload and publish. Review mode (set in the Academy admin panel) decides
// whether a new book goes live at once or waits as "Chờ duyệt".
// ============================================================

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AcademyApiError,
  academyRequest,
  type AcademyBook,
  type AcademyCategory,
  type AcademyConfig,
  type AcademyMe,
} from './academy-api-client.js';
import { uploadLocalFile } from './upload-local-file-to-academy.js';
import { MCP_VERSION } from './mcp-version.js';

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

function ok(payload: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function fail(err: unknown): ToolResult {
  const message = err instanceof AcademyApiError || err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text: `Lỗi: ${message}` }], isError: true };
}

const fold = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

/** Category id from an id, a name or a slug (accents ignored). */
async function resolveCategoryId(config: AcademyConfig, category: string | undefined): Promise<string | null | undefined> {
  if (category === undefined) return undefined;
  if (!category.trim()) return null;
  const { categories } = await academyRequest<{ categories: AcademyCategory[] }>(config, 'GET', '/categories');
  const wanted = fold(category);
  const match =
    categories.find((c) => c.id === category) ??
    categories.find((c) => fold(c.name) === wanted || c.slug === wanted) ??
    categories.find((c) => fold(c.name).includes(wanted));
  if (!match) {
    throw new AcademyApiError(
      `Không có danh mục "${category}". Danh mục đang có: ${categories.map((c) => c.name).join(', ')}.`,
      0,
      'CATEGORY_NOT_FOUND',
    );
  }
  return match.id;
}

async function videoLimit(config: AcademyConfig): Promise<number> {
  const me = await academyRequest<AcademyMe>(config, 'GET', '/me');
  return me.limits.videoMaxBytes;
}

const accessTierSchema = z
  .enum(['free', 'premium'])
  .describe('free = ai cũng đọc hết (mặc định). premium = người chưa có gói Premium/VIP chỉ đọc thử preview_pages trang đầu.');
const previewPagesSchema = z
  .number()
  .int()
  .min(1)
  .max(500)
  .describe('Số trang đọc thử của sách Premium (mặc định 5). Nên bao trọn bìa + mục lục, phải nhỏ hơn tổng số trang.');

export function registerAcademyBookTools(server: McpServer, config: AcademyConfig): void {
  server.registerTool(
    'academy_status',
    {
      title: 'Kiểm tra kết nối CES Academy',
      description:
        'Kiểm tra khóa MCP còn dùng được không, đang đăng thay cho ai, chế độ đăng hiện tại (bật duyệt hay đăng luôn) '
        + 'và phiên bản MCP đang chạy (mcpVersion). Gọi đầu tiên nếu chưa chắc kết nối.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const me = await academyRequest<AcademyMe>(config, 'GET', '/me');
        return ok({
          mcpVersion: MCP_VERSION,
          ...me,
          mode: me.requireReview
            ? 'Bật duyệt: sách gửi lên nằm ở Chờ duyệt, người quản trị duyệt mới hiện trên web.'
            : 'Đăng luôn: sách gửi lên hiện trên web ngay.',
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'academy_list_categories',
    {
      title: 'Danh mục sách CES Academy',
      description: 'Liệt kê các danh mục đang hiện trên CES Academy (id, tên) để xếp sách vào.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        return ok(await academyRequest<{ categories: AcademyCategory[] }>(config, 'GET', '/categories'));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'academy_list_books',
    {
      title: 'Danh sách sách CES Academy',
      description:
        'Tìm sách đã có (mới nhất trước), để tránh đăng trùng hoặc lấy id sách cần sửa. editableByMcp = true là sách do MCP đăng (sửa được bằng academy_update_book).',
      inputSchema: {
        search: z.string().max(200).optional().describe('Tìm theo tên sách'),
        only_mcp: z.boolean().optional().describe('true = chỉ sách do MCP đăng'),
        limit: z.number().int().min(1).max(100).optional().describe('Số sách tối đa (mặc định 20)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ search, only_mcp, limit }) => {
      try {
        const qs = new URLSearchParams();
        if (search) qs.set('search', search);
        if (only_mcp) qs.set('only_mcp', '1');
        if (limit) qs.set('limit', String(limit));
        return ok(await academyRequest<{ books: AcademyBook[] }>(config, 'GET', `/books${qs.size ? `?${qs}` : ''}`));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'academy_get_book',
    {
      title: 'Xem một sách CES Academy',
      description: 'Xem thông tin và trạng thái (published / pending_review / draft) của một sách theo id.',
      inputSchema: { book_id: z.string().uuid().describe('id sách (từ academy_list_books)') },
      annotations: { readOnlyHint: true },
    },
    async ({ book_id }) => {
      try {
        return ok(await academyRequest<{ book: AcademyBook }>(config, 'GET', `/books/${book_id}`));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'academy_publish_book',
    {
      title: 'Đăng sách mới lên CES Academy',
      description:
        'Đăng một cuốn sách ĐÃ VIẾT XONG: tải file PDF, ảnh bìa, video giới thiệu từ máy này lên kho của CES rồi tạo sách. '
        + 'Đang bật duyệt thì sách vào trạng thái Chờ duyệt; đang đăng luôn thì hiện trên web ngay (trừ khi publish = false). '
        + 'Gọi academy_list_books trước để tránh đăng trùng. Trả về link trang sách.',
      inputSchema: {
        title: z.string().min(1).max(200).describe('Tên sách, tiếng Việt có dấu'),
        pdf_path: z.string().min(1).describe('Đường dẫn file PDF trên máy, ví dụ D:/sach/ten-sach.pdf'),
        cover_path: z.string().optional().describe('Ảnh bìa JPG / PNG / WebP (khuyến nghị 400x600 px)'),
        video_path: z.string().optional().describe('Video giới thiệu MP4 / WebM, tối đa 500 MB'),
        description: z.string().max(5000).optional().describe('Mô tả sách hiện trên trang chi tiết'),
        author: z.string().max(200).optional().describe('Tác giả, ví dụ CES Global'),
        category: z.string().optional().describe('Tên hoặc id danh mục (xem academy_list_categories)'),
        access_tier: accessTierSchema.optional(),
        preview_pages: previewPagesSchema.optional(),
        slug: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(200)
          .optional()
          .describe('Đường dẫn tùy chọn (a-z, 0-9, gạch ngang). Bỏ trống để tự tạo từ tên sách.'),
        publish: z.boolean().optional().describe('Chỉ có tác dụng khi đang đăng luôn: false = lưu nháp. Mặc định true.'),
      },
    },
    async (args) => {
      try {
        const categoryId = await resolveCategoryId(config, args.category);
        const pdfKey = await uploadLocalFile(config, 'pdf', args.pdf_path);
        const coverKey = args.cover_path ? await uploadLocalFile(config, 'cover', args.cover_path) : undefined;
        const videoKey = args.video_path
          ? await uploadLocalFile(config, 'video', args.video_path, await videoLimit(config))
          : undefined;
        const out = await academyRequest<{ book: AcademyBook; message: string }>(config, 'POST', '/books', {
          title: args.title,
          pdf_key: pdfKey,
          cover_key: coverKey,
          video_key: videoKey,
          description: args.description,
          author: args.author,
          category_id: categoryId ?? undefined,
          access_tier: args.access_tier,
          preview_pages: args.preview_pages,
          slug: args.slug,
          publish: args.publish,
        });
        return ok(out);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'academy_update_book',
    {
      title: 'Sửa sách đã đăng qua MCP',
      description:
        'Sửa một sách do MCP đăng (sửa theo góp ý: thay PDF, bìa, video, đổi tên, mô tả, danh mục, Premium). Chỉ gửi trường cần đổi. '
        + 'Đang bật duyệt thì sách quay về Chờ duyệt (ẩn tới khi duyệt lại). Không xóa được sách.',
      inputSchema: {
        book_id: z.string().uuid().describe('id sách (từ academy_list_books, editableByMcp = true)'),
        title: z.string().min(1).max(200).optional(),
        pdf_path: z.string().optional().describe('File PDF mới thay cho file cũ'),
        cover_path: z.string().optional().describe('Ảnh bìa mới'),
        video_path: z.string().optional().describe('Video giới thiệu mới'),
        remove_video: z.boolean().optional().describe('true = gỡ video giới thiệu'),
        description: z.string().max(5000).optional(),
        author: z.string().max(200).optional(),
        category: z.string().optional().describe('Tên hoặc id danh mục, chuỗi rỗng = bỏ danh mục'),
        access_tier: accessTierSchema.optional(),
        preview_pages: previewPagesSchema.optional(),
        publish: z.boolean().optional().describe('Chỉ có tác dụng khi đang đăng luôn: true = công khai, false = ẩn'),
      },
    },
    async (args) => {
      try {
        const body: Record<string, unknown> = {};
        if (args.title !== undefined) body.title = args.title;
        if (args.description !== undefined) body.description = args.description;
        if (args.author !== undefined) body.author = args.author;
        if (args.access_tier !== undefined) body.access_tier = args.access_tier;
        if (args.preview_pages !== undefined) body.preview_pages = args.preview_pages;
        if (args.publish !== undefined) body.publish = args.publish;
        const categoryId = await resolveCategoryId(config, args.category);
        if (categoryId !== undefined) body.category_id = categoryId;
        if (args.pdf_path) body.pdf_key = await uploadLocalFile(config, 'pdf', args.pdf_path);
        if (args.cover_path) body.cover_key = await uploadLocalFile(config, 'cover', args.cover_path);
        if (args.video_path) {
          body.video_key = await uploadLocalFile(config, 'video', args.video_path, await videoLimit(config));
        } else if (args.remove_video) {
          body.video_key = null;
        }
        return ok(await academyRequest<{ book: AcademyBook; message: string }>(config, 'PATCH', `/books/${args.book_id}`, body));
      } catch (err) {
        return fail(err);
      }
    },
  );
}
