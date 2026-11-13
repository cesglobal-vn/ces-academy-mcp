// ============================================================
// Upload one local file (PDF / cover image / intro video) to CES storage:
// ask the API for a presigned PUT, then PUT the bytes straight to R2.
// Returns the object_key the book create / update call expects.
// ============================================================

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { AcademyApiError, academyRequest, type AcademyConfig, type AcademyUploadTicket } from './academy-api-client.js';

export type UploadKind = 'pdf' | 'cover' | 'video';

const CONTENT_TYPES: Record<UploadKind, Record<string, string>> = {
  pdf: { '.pdf': 'application/pdf' },
  cover: { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' },
  video: { '.mp4': 'video/mp4', '.webm': 'video/webm' },
};

const LABEL: Record<UploadKind, string> = { pdf: 'File PDF', cover: 'Ảnh bìa', video: 'Video' };
const LABEL_IN_SENTENCE: Record<UploadKind, string> = { pdf: 'file PDF', cover: 'ảnh bìa', video: 'video' };

/** Big files on a slow office line: allow up to 30 minutes per upload. */
const UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;

export async function uploadLocalFile(
  config: AcademyConfig,
  kind: UploadKind,
  filePath: string,
  maxBytes?: number,
): Promise<string> {
  const absolute = path.resolve(filePath);
  const ext = path.extname(absolute).toLowerCase();
  const contentType = CONTENT_TYPES[kind][ext];
  if (!contentType) {
    throw new AcademyApiError(
      `${LABEL[kind]} "${absolute}" có đuôi "${ext || '(không có)'}" không hợp lệ. Chấp nhận: ${Object.keys(CONTENT_TYPES[kind]).join(', ')}.`,
      0,
      'LOCAL_FILE_TYPE_INVALID',
    );
  }

  let size: number;
  try {
    const info = await stat(absolute);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    throw new AcademyApiError(`Không tìm thấy ${LABEL_IN_SENTENCE[kind]} "${absolute}" trên máy.`, 0, 'LOCAL_FILE_NOT_FOUND');
  }
  if (size === 0) throw new AcademyApiError(`${LABEL[kind]} "${absolute}" rỗng (0 byte).`, 0, 'LOCAL_FILE_EMPTY');
  if (maxBytes && size > maxBytes) {
    throw new AcademyApiError(
      `${LABEL[kind]} nặng ${(size / 1024 / 1024).toFixed(0)} MB, vượt giới hạn ${(maxBytes / 1024 / 1024).toFixed(0)} MB. Nén lại (ví dụ 1080p, H.264) rồi thử lại.`,
      0,
      'LOCAL_FILE_TOO_LARGE',
    );
  }

  const ticket = await academyRequest<AcademyUploadTicket>(config, 'POST', '/uploads', {
    kind,
    filename: path.basename(absolute),
    content_type: contentType,
  });

  const bytes = await readFile(absolute);
  let res: Response;
  try {
    res = await fetch(ticket.upload_url, {
      method: 'PUT',
      // fetch sets Content-Length itself for a Buffer body (R2 needs it: no chunked PUT).
      headers: ticket.headers,
      body: bytes,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new AcademyApiError(`Tải ${LABEL_IN_SENTENCE[kind]} lên kho bị lỗi mạng: ${reason}. Thử lại.`, 0, 'UPLOAD_NETWORK_ERROR');
  }
  if (!res.ok) {
    throw new AcademyApiError(`Kho lưu trữ từ chối ${LABEL_IN_SENTENCE[kind]} (HTTP ${res.status}). Thử lại.`, res.status, 'UPLOAD_REJECTED');
  }
  return ticket.object_key;
}
