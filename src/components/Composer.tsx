'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { formatDuration } from '../lib/format';
import type { SendResult, TypingSignal } from '../lib/types';
import { MicIcon, SendIcon, TrashIcon } from './Icons';

const MAX_RECORD_MS = 5 * 60 * 1000; // با سقف سرور (۵ دقیقه) یکی است
const MIN_RECORD_MS = 700;
const TYPING_REPEAT_MS = 2500; // هر چند ثانیه یک‌بار «در حال نوشتن» دوباره فرستاده شود
const TYPING_IDLE_MS = 3000; // بعد از این مدت بی‌حرکتی، «idle» فرستاده می‌شود

interface ComposerProps {
  toId: number;
  connected: boolean;
  enterToSend: boolean;
  onSend: (text: string) => Promise<SendResult>;
  onSendVoice: (blob: Blob, durationMs: number) => Promise<SendResult>;
  onTyping: (to: number, state: TypingSignal) => void;
}

// بهترین فرمتی که مرورگر برای ضبط پشتیبانی می‌کند (Chrome/Edge: webm، Firefox: ogg، Safari: mp4)
function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

interface RecorderState {
  recorder: MediaRecorder | null;
  chunks: Blob[];
  startedAt: number;
  cancelled: boolean;
  tick: ReturnType<typeof setInterval> | null;
  ping: ReturnType<typeof setInterval> | null;
}

// این کامپوننت با key={toId} رندر می‌شود، پس با عوض شدن مخاطب، متن و ضبط ناتمام ریست می‌شوند.
export default function Composer({ toId, connected, enterToSend, onSend, onSendVoice, onTyping }: ComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mounted = useRef(true);
  const typingRef = useRef<{ last: number; timer: ReturnType<typeof setTimeout> | null; active: boolean }>({
    last: 0,
    timer: null,
    active: false,
  });
  const rec = useRef<RecorderState>({ recorder: null, chunks: [], startedAt: 0, cancelled: false, tick: null, ping: null });

  // ---------- «در حال نوشتن» ----------
  function stopTyping() {
    const t = typingRef.current;
    if (t.timer) clearTimeout(t.timer);
    t.timer = null;
    t.last = 0;
    if (t.active) {
      t.active = false;
      onTyping(toId, 'idle');
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setText(value);
    if (!value.trim()) {
      stopTyping();
      return;
    }
    const t = typingRef.current;
    const now = Date.now();
    if (now - t.last > TYPING_REPEAT_MS) {
      t.last = now;
      t.active = true;
      onTyping(toId, 'typing');
    }
    if (t.timer) clearTimeout(t.timer);
    t.timer = setTimeout(stopTyping, TYPING_IDLE_MS);
  }

  // ---------- ارسال متن ----------
  async function submit() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    stopTyping();
    const res = await onSend(body);
    setSending(false);
    if (res.ok) setText('');
    else setError(res.error || 'ارسال نشد');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    const wantsSend = enterToSend ? !e.shiftKey : e.ctrlKey || e.metaKey;
    if (wantsSend) {
      e.preventDefault();
      void submit();
    }
  }

  // ---------- ضبط ویس ----------
  function stopRecording(cancel: boolean) {
    const r = rec.current;
    if (!r.recorder || r.recorder.state === 'inactive') return;
    r.cancelled = cancel;
    r.recorder.stop(); // ادامه‌ی کار در onstop
  }

  async function startRecording() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('این مرورگر از ضبط صدا پشتیبانی نمی‌کند. (ضبط صدا فقط روی HTTPS یا localhost کار می‌کند.)');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('دسترسی به میکروفون داده نشد. اجازه‌ی میکروفون را در مرورگر فعال کنید.');
      return;
    }
    const release = () => stream.getTracks().forEach((track) => track.stop());
    // کاربر در حین پرسیدن اجازه‌ی میکروفون به گفتگوی دیگری رفته است
    if (!mounted.current) {
      release();
      return;
    }

    const mime = pickMime();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      release();
      setError('ضبط صدا در این مرورگر ممکن نیست.');
      return;
    }

    const r = rec.current;
    r.recorder = recorder;
    r.chunks = [];
    r.cancelled = false;
    r.startedAt = Date.now();

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) r.chunks.push(e.data);
    };
    recorder.onstop = async () => {
      if (r.tick) clearInterval(r.tick);
      if (r.ping) clearInterval(r.ping);
      r.tick = r.ping = null;
      release();
      onTyping(toId, 'idle');
      if (mounted.current) setRecording(false);
      if (r.cancelled) return;

      const duration = Math.min(Date.now() - r.startedAt, MAX_RECORD_MS);
      if (duration < MIN_RECORD_MS) {
        if (mounted.current) setError('ویس خیلی کوتاه بود.');
        return;
      }
      const blob = new Blob(r.chunks, { type: recorder.mimeType || mime || 'audio/webm' });
      if (mounted.current) setSending(true);
      const res = await onSendVoice(blob, duration);
      if (!mounted.current) return;
      setSending(false);
      if (!res.ok) setError(res.error || 'ارسال ویس ناموفق بود.');
    };

    recorder.start(250);
    setRecording(true);
    setElapsed(0);
    r.tick = setInterval(() => {
      const ms = Date.now() - r.startedAt;
      setElapsed(ms);
      if (ms >= MAX_RECORD_MS) stopRecording(false);
    }, 200);
    onTyping(toId, 'recording');
    r.ping = setInterval(() => onTyping(toId, 'recording'), TYPING_REPEAT_MS);
  }

  // با بسته شدن کامپوننت (مثلاً رفتن به گفتگوی دیگر) ضبط لغو و میکروفون آزاد می‌شود
  useEffect(() => {
    mounted.current = true;
    const r = rec.current;
    return () => {
      mounted.current = false;
      stopRecording(true);
      stopTyping();
      if (r.tick) clearInterval(r.tick);
      if (r.ping) clearInterval(r.ping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasText = text.trim().length > 0;

  return (
    <div className="composer-wrap">
      {error && <p className="error box">{error}</p>}

      {recording ? (
        <div className="composer recording">
          <button className="icon-btn danger" onClick={() => stopRecording(true)} aria-label="لغو ضبط" title="لغو ضبط">
            <TrashIcon />
          </button>
          <div className="rec-info">
            <i className="rec-dot" />
            <span className="rec-time" dir="ltr">
              {formatDuration(elapsed)}
            </span>
            <span className="rec-label">در حال ضبط...</span>
          </div>
          <button className="send" onClick={() => stopRecording(false)} aria-label="ارسال ویس" title="ارسال ویس">
            <SendIcon className="send-icon" />
          </button>
        </div>
      ) : (
        <div className="composer">
          <textarea
            rows={1}
            placeholder={connected ? 'پیام خود را بنویسید...' : 'در حال اتصال...'}
            value={text}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            maxLength={2000}
          />
          {hasText ? (
            <button className="send" onClick={() => void submit()} disabled={sending || !connected} aria-label="ارسال" title="ارسال">
              <SendIcon className="send-icon" />
            </button>
          ) : (
            <button
              className="send ghost"
              onClick={() => void startRecording()}
              disabled={sending || !connected}
              aria-label="ضبط ویس"
              title="ضبط ویس"
            >
              <MicIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
