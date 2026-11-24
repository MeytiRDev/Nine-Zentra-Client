// شکل داده‌هایی که سرور برمی‌گرداند (با server/src/types.ts هماهنگ نگه دارید)

export interface PublicUser {
  id: number;
  username: string;
  bio: string;
  avatarUrl: string | null;
}

export type MessageKind = 'text' | 'voice';

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  kind: MessageKind;
  body: string;
  duration: number | null; // میلی‌ثانیه (فقط ویس)
  createdAt: string;
}

export type Relation =
  | 'none'
  | 'accepted'
  | 'pending_sent'
  | 'pending_received'
  | 'rejected_sent'
  | 'rejected_received';

/** نتیجه‌ی جستجو: کاربر + وضعیت رابطه با من */
export interface SearchUser extends PublicUser {
  relation: Relation;
  requestId: number | null;
}

export interface Contact extends PublicUser {
  lastBody: string | null;
  lastKind: MessageKind | null;
  lastAt: string | null;
}

export interface IncomingRequest {
  id: number;
  createdAt: string;
  from: PublicUser;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

/** وضعیتی که به مخاطب نشان داده می‌شود */
export type TypingState = 'typing' | 'recording';
/** چیزی که کلاینت می‌فرستد؛ idle یعنی «دیگر چیزی نمی‌نویسد» */
export type TypingSignal = TypingState | 'idle';

export interface SendResult {
  ok: boolean;
  error?: string;
}
