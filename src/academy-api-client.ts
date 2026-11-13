// ============================================================
// HTTP client of the CES Academy MCP API (/api/academy-mcp on the CES
// backend). The key is created in the Academy admin panel, tab "Kết nối MCP".
// Errors carry the server's Vietnamese message so Claude can relay it as is.
// ============================================================

export const DEFAULT_API_URL = 'https://lms-api.cesglobal.com.vn/api';

export class AcademyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export interface AcademyConfig {
  apiUrl: string;
  apiKey: string;
}

/**
 * Env value or '' when unset. The plugin fills env from its options; an option
 * left empty can arrive as '' or as the raw "${user_config.x}" text, both mean unset.
 */
function envValue(name: string): string {
  const value = (process.env[name] ?? '').trim();
  return value.startsWith('${') ? '' : value;
}

export function readConfigFromEnv(): AcademyConfig {
  const apiKey = envValue('CES_ACADEMY_API_KEY');
  const apiUrl = (envValue('CES_ACADEMY_API_URL') || DEFAULT_API_URL).replace(/\/+$/, '');
  return { apiKey, apiUrl };
}

const REQUEST_TIMEOUT_MS = 2 * 60 * 1000; // a Premium book makes the server cut the preview (a few seconds)

export async function academyRequest<T>(
  config: AcademyConfig,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<T> {
  if (!config.apiKey) {
    throw new AcademyApiError(
      'Chưa có khóa MCP. Người dùng tạo khóa ở trang quản trị CES Academy > Kết nối MCP, rồi trong Claude Code gõ '
        + '/plugin configure ces-academy@ces-global và dán khóa vào ô "Khóa MCP" (khóa không được dán vào khung chat). '
        + 'Dán xong thì khởi động lại Claude Code.',
      0,
      'MCP_KEY_MISSING',
    );
  }
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}/academy-mcp${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new AcademyApiError(`Không kết nối được máy chủ CES (${config.apiUrl}): ${reason}`, 0, 'NETWORK_ERROR');
  }

  const text = await res.text();
  let json: { success?: boolean; data?: T; error?: { code?: string; message?: string; details?: unknown } } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // non-JSON (proxy error page): fall through with the status line
  }
  if (!res.ok || json.success === false) {
    const details = json.error?.details ? ` Chi tiết: ${JSON.stringify(json.error.details).slice(0, 600)}` : '';
    throw new AcademyApiError(
      (json.error?.message ?? `Máy chủ trả lỗi HTTP ${res.status}`) + details,
      res.status,
      json.error?.code ?? `HTTP_${res.status}`,
    );
  }
  return json.data as T;
}

// ── Response shapes ───────────────────────────────────────────

export interface AcademyMe {
  key: { name: string };
  actingAs: { name: string | null; email: string };
  requireReview: boolean;
  limits: { videoMaxBytes: number };
}

export interface AcademyCategory {
  id: string;
  name: string;
  slug: string;
}

export interface AcademyBook {
  id: string;
  title: string;
  slug: string;
  url: string;
  status: 'published' | 'pending_review' | 'draft';
  author: string | null;
  description: string | null;
  categoryId: string | null;
  accessTier: 'free' | 'premium';
  previewPages: number | null;
  pagesCount: number | null;
  coverUrl: string | null;
  introVideoUrl: string | null;
  editableByMcp: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyUploadTicket {
  upload_url: string;
  object_key: string;
  method: 'PUT';
  headers: Record<string, string>;
}
