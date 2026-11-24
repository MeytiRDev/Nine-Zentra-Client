'use client';

import { useEffect, useRef, useState } from 'react';
import { apiBlob } from '../lib/api';
import { formatDuration } from '../lib/format';
import type { Message } from '../lib/types';
import { PauseIcon, PlayIcon } from './Icons';

const BARS = 28;
type PlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

// ارتفاع میله‌ها از روی شناسه‌ی پیام ساخته می‌شود: برای هر ویس ثابت است و تصادفی به نظر می‌رسد
const barHeight = (seed: number, i: number): number => 28 + ((seed * 37 + i * 53) % 72);

// هم‌زمان فقط یک ویس پخش شود
let currentAudio: HTMLAudioElement | null = null;

export default function VoiceMessage({ message }: { message: Message }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [state, setState] = useState<PlayState>('idle');
  const [elapsed, setElapsed] = useState(0); // ثانیه
  const total = (message.duration ?? 0) / 1000;

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  // فایل ویس محافظت‌شده است (نیاز به توکن)، پس با fetch گرفته و از Blob پخش می‌شود. اولین بار که پخش را می‌زنید دانلود می‌شود.
  async function load(): Promise<HTMLAudioElement> {
    const blob = await apiBlob(`/api/voice/${message.id}`);
    const url = URL.createObjectURL(blob);
    urlRef.current = url;

    const el = new Audio(url);
    el.addEventListener('timeupdate', () => setElapsed(el.currentTime));
    el.addEventListener('play', () => {
      if (currentAudio && currentAudio !== el) currentAudio.pause();
      currentAudio = el;
      setState('playing');
    });
    el.addEventListener('pause', () => setState((s) => (s === 'playing' ? 'paused' : s)));
    el.addEventListener('ended', () => {
      setState('idle');
      setElapsed(0);
      el.currentTime = 0;
    });
    audioRef.current = el;
    return el;
  }

  async function toggle() {
    if (state === 'loading') return;
    try {
      let el = audioRef.current;
      if (!el) {
        setState('loading');
        el = await load();
      }
      if (el.paused) await el.play();
      else el.pause();
    } catch {
      setState('error');
    }
  }

  // مدت ویس را از سرور داریم (فایل webm مرورگر metadata مدت ندارد، پس audio.duration قابل اعتماد نیست)
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;
  const filled = Math.round(progress * BARS);
  const showElapsed = state === 'playing' || state === 'paused';

  return (
    <div className="voice">
      <button
        type="button"
        className="voice-play"
        onClick={toggle}
        disabled={state === 'loading'}
        aria-label={state === 'playing' ? 'توقف' : 'پخش'}
      >
        {state === 'playing' ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
      </button>
      <div className="voice-bars" aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <i key={i} className={i < filled ? 'bar on' : 'bar'} style={{ height: `${barHeight(message.id, i)}%` }} />
        ))}
      </div>
      <span className="voice-time" dir="ltr" title={state === 'error' ? 'پخش ویس ناموفق بود' : undefined}>
        {state === 'error' ? 'خطا' : formatDuration(showElapsed ? elapsed * 1000 : (message.duration ?? 0))}
      </span>
    </div>
  );
}
