'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SETTINGS_KEY } from './theme-script';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export type Accent = 'indigo' | 'violet' | 'rose' | 'emerald' | 'amber' | 'sky';
export type Wallpaper = 'none' | 'aurora' | 'dusk' | 'mint' | 'dots' | 'waves';
export type TextSize = 'sm' | 'md' | 'lg';

export interface Settings {
  theme: ThemeSetting;
  accent: Accent;
  wallpaper: Wallpaper;
  size: TextSize;
  enterToSend: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: 'indigo',
  wallpaper: 'aurora',
  size: 'md',
  enterToSend: true,
};

// رنگ هر accent در globals.css هم تعریف شده؛ اینجا فقط برای نمایش دایره‌ی انتخاب است
export const ACCENTS: ReadonlyArray<{ id: Accent; label: string; color: string }> = [
  { id: 'indigo', label: 'نیلی', color: '#4f46e5' },
  { id: 'violet', label: 'بنفش', color: '#7c3aed' },
  { id: 'rose', label: 'سرخابی', color: '#be123c' },
  { id: 'emerald', label: 'سبز', color: '#047857' },
  { id: 'amber', label: 'نارنجی', color: '#c2410c' },
  { id: 'sky', label: 'آبی', color: '#0369a1' },
];

export const WALLPAPERS: ReadonlyArray<{ id: Wallpaper; label: string }> = [
  { id: 'none', label: 'ساده' },
  { id: 'aurora', label: 'شفق' },
  { id: 'dusk', label: 'غروب' },
  { id: 'mint', label: 'نعناع' },
  { id: 'dots', label: 'نقطه‌چین' },
  { id: 'waves', label: 'موج' },
];

export const SIZES: ReadonlyArray<{ id: TextSize; label: string }> = [
  { id: 'sm', label: 'کوچک' },
  { id: 'md', label: 'متوسط' },
  { id: 'lg', label: 'بزرگ' },
];

const isOneOf = <T extends string>(list: ReadonlyArray<{ id: T }>, value: unknown): value is T =>
  list.some((item) => item.id === value);

/** هر مقداری از localStorage را به یک تنظیمات معتبر تبدیل می‌کند (داده‌ی خراب یا قدیمی نباید برنامه را خراب کند) */
function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    theme: r.theme === 'light' || r.theme === 'dark' || r.theme === 'system' ? r.theme : DEFAULT_SETTINGS.theme,
    accent: isOneOf(ACCENTS, r.accent) ? r.accent : DEFAULT_SETTINGS.accent,
    wallpaper: isOneOf(WALLPAPERS, r.wallpaper) ? r.wallpaper : DEFAULT_SETTINGS.wallpaper,
    size: isOneOf(SIZES, r.size) ? r.size : DEFAULT_SETTINGS.size,
    enterToSend: typeof r.enterToSend === 'boolean' ? r.enterToSend : DEFAULT_SETTINGS.enterToSend,
  };
}

function readStored(): Settings {
  try {
    return sanitize(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function resolveTheme(theme: ThemeSetting): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyToDocument(settings: Settings): ResolvedTheme {
  const resolved = resolveTheme(settings.theme);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.accent = settings.accent;
  root.dataset.size = settings.size;
  return resolved;
}

interface SettingsContextValue {
  settings: Settings;
  /** تم واقعی در حال نمایش (وقتی انتخاب «سیستم» است، همان چیزی که سیستم‌عامل می‌خواهد) */
  resolvedTheme: ResolvedTheme;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // روی سرور و اولین رندر کلاینت مقدار پیش‌فرض است (تا hydration یکسان باشد)؛ بعد از mount از localStorage خوانده می‌شود
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(readStored());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return; // قبل از خواندن، مقدار پیش‌فرض را روی تنظیمات ذخیره‌شده ننویس
    setResolvedTheme(applyToDocument(settings));
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // حالت private یا بسته بودن storage: تنظیمات فقط تا بستن صفحه می‌مانند
    }

    if (settings.theme !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(applyToDocument(settings));
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [settings, ready]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(() => ({ settings, resolvedTheme, update }), [settings, resolvedTheme, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
