'use client';

import { useSettings } from '../lib/settings';
import { MoonIcon, SunIcon } from './Icons';

// میان‌بر تم برای صفحه‌های ورود/ثبت‌نام (داخل برنامه، تم در پنل تنظیمات عوض می‌شود)
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, update } = useSettings();
  const dark = resolvedTheme === 'dark';
  const label = dark ? 'تغییر به تم روشن' : 'تغییر به تم تاریک';

  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      onClick={() => update({ theme: dark ? 'light' : 'dark' })}
      aria-label={label}
      title={label}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
