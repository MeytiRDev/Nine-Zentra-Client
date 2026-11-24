export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** پیام قابل نمایش از هر خطایی */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'خطای ناشناخته';
}

/** آدرس کامل فایل‌های سرور (مثل آواتار) */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

const TOKEN_KEY = 'token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSession(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // مرورگر اجازه‌ی دسترسی به localStorage نمی‌دهد؛ کاری نمی‌شود کرد
  }
}

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function toApiError(res: Response): Promise<ApiError> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return new ApiError(data.error || 'خطا در ارتباط با سرور', res.status);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError('ارتباط با سرور برقرار نشد', 0);
  }
  if (!res.ok) throw await toApiError(res);
  return res;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** درخواست JSON */
export async function api<T = unknown>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const res = await send(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as T;
}

/** آپلود فایل خام (عکس پروفایل، ویس): بدنه‌ی درخواست خود فایل است */
export async function apiUpload<T = unknown>(
  path: string,
  blob: Blob,
  contentType: string,
  method: 'POST' | 'PUT' = 'POST'
): Promise<T> {
  const res = await send(path, {
    method,
    headers: { 'Content-Type': contentType, ...authHeader() },
    body: blob,
  });
  return (await res.json().catch(() => ({}))) as T;
}

/** دانلود فایل محافظت‌شده (ویس) به صورت Blob */
export async function apiBlob(path: string): Promise<Blob> {
  const res = await send(path, { headers: authHeader() });
  return res.blob();
}
