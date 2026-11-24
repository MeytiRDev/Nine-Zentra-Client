"use client";

import { useEffect, useRef } from "react";
import { formatTime } from "../lib/format";
import { useSettings } from "../lib/settings";
import type {
  Message,
  PublicUser,
  SendResult,
  TypingSignal,
  TypingState,
} from "../lib/types";
import Avatar from "./Avatar";
import Composer from "./Composer";
import { BackIcon } from "./Icons";
import { LogoMark } from "./Logo";
import VoiceMessage from "./VoiceMessage";

interface ChatWindowProps {
  me: PublicUser;
  contact: PublicUser | null;
  messages: Message[];
  hasMore: boolean;
  error: string;
  connected: boolean;
  typing: TypingState | undefined;
  onLoadOlder: () => void;
  onSend: (text: string) => Promise<SendResult>;
  onSendVoice: (blob: Blob, durationMs: number) => Promise<SendResult>;
  onTyping: (to: number, state: TypingSignal) => void;
  onBack: () => void;
  onOpenContact: () => void;
}

export default function ChatWindow({
  me,
  contact,
  messages,
  hasMore,
  error,
  connected,
  typing,
  onLoadOlder,
  onSend,
  onSendVoice,
  onTyping,
  onBack,
  onOpenContact,
}: ChatWindowProps) {
  const { settings } = useSettings();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<number | null>(null);
  const wallpaper = `wp-${settings.wallpaper}`;

  // با عوض شدن مخاطب، اولین بارگذاری دوباره به انتها اسکرول می‌کند
  const contactId = contact?.id;
  useEffect(() => {
    lastIdRef.current = null;
  }, [contactId]);

  // فقط وقتی پیام جدید (آخرین id تغییر کرد) آمد پایین برو؛ نه هنگام بارگذاری پیام‌های قدیمی
  useEffect(() => {
    const lastId = messages.length ? messages[messages.length - 1].id : null;
    if (lastId !== lastIdRef.current) {
      lastIdRef.current = lastId;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  // وقتی مخاطب شروع به نوشتن می‌کند، حباب «در حال نوشتن» دیده شود
  useEffect(() => {
    if (typing) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [typing]);

  if (!contact) {
    return (
      <main className={`chat empty ${wallpaper}`}>
        <LogoMark size={64} />
        <h2>گفتگو را شروع کنید</h2>
        <p>
          یک گفتگو را انتخاب کنید، یا با جستجوی نام کاربری یک درخواست چت
          بفرستید.
        </p>
      </main>
    );
  }

  return (
    <main className={`chat ${wallpaper}`}>
      <header className="chat-header">
        <button
          className="icon-btn back"
          onClick={onBack}
          aria-label="بازگشت"
          title="بازگشت"
        >
          <BackIcon />
        </button>
        <button
          className="header-main"
          onClick={onOpenContact}
          aria-label="مشاهده‌ی پروفایل"
        >
          <Avatar name={contact.username} src={contact.avatarUrl} size={40} />
          <span className="chat-title">
            <strong dir="ltr">{contact.username}</strong>
            {typing ? (
              <span className="sub typing-text">
                {typing === "recording" ? "در حال ضبط ویس" : "در حال نوشتن"}
                <i className="dots">
                  <b />
                  <b />
                  <b />
                </i>
              </span>
            ) : (
              contact.bio && (
                <span className="sub" dir="auto">
                  {contact.bio}
                </span>
              )
            )}
          </span>
        </button>
      </header>

      <div className="messages">
        {hasMore && (
          <button className="btn small older" onClick={onLoadOlder}>
            پیام‌های قبلی
          </button>
        )}
        {error && <p className="error box">{error}</p>}
        {!error && messages.length === 0 && !hasMore && (
          <p className="hint center-text first">اولین پیام را بفرستید</p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.senderId === me.id ? "bg-red" : "theirs"}`}
          >
            {m.kind === "voice" ? (
              <VoiceMessage message={m} />
            ) : (
              <span className="text">{m.body}</span>
            )}
            <span className="time">{formatTime(m.createdAt)}</span>
          </div>
        ))}

        {typing && (
          <div
            className="bubble theirs typing-bubble"
            aria-label="در حال نوشتن"
          >
            <i className="dots">
              <b />
              <b />
              <b />
            </i>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <Composer
        key={contact.id}
        toId={contact.id}
        connected={connected}
        enterToSend={settings.enterToSend}
        onSend={onSend}
        onSendVoice={onSendVoice}
        onTyping={onTyping}
      />
    </main>
  );
}
