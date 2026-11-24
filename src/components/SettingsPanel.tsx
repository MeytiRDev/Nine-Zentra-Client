'use client';

import type { ReactNode } from 'react';
import {
  ACCENTS,
  SIZES,
  WALLPAPERS,
  useSettings,
  type TextSize,
  type ThemeSetting,
} from '../lib/settings';
import Drawer from './Drawer';
import { CheckIcon, LogoutIcon, MonitorIcon, MoonIcon, SunIcon } from './Icons';

interface Option<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (value: T) => void;
}

function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={value === o.id ? 'on' : ''}
          onClick={() => onChange(o.id)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

const THEME_OPTIONS: ReadonlyArray<Option<ThemeSetting>> = [
  { id: 'light', label: 'روشن', icon: <SunIcon width={16} height={16} /> },
  { id: 'dark', label: 'تاریک', icon: <MoonIcon width={16} height={16} /> },
  { id: 'system', label: 'سیستم', icon: <MonitorIcon width={16} height={16} /> },
];

const SIZE_OPTIONS: ReadonlyArray<Option<TextSize>> = SIZES.map((s) => ({ id: s.id, label: s.label }));

interface SettingsPanelProps {
  onClose: () => void;
  onLogout: () => void;
}

export default function SettingsPanel({ onClose, onLogout }: SettingsPanelProps) {
  const { settings, update } = useSettings();

  return (
    <Drawer title="تنظیمات" onClose={onClose}>
      <section className="set-section">
        <h3>ظاهر</h3>

        <div className="set-row stack">
          <span className="set-label">تم</span>
          <Segmented label="تم" value={settings.theme} options={THEME_OPTIONS} onChange={(theme) => update({ theme })} />
        </div>

        <div className="set-row stack">
          <span className="set-label">رنگ تأکید</span>
          <div className="swatches" role="radiogroup" aria-label="رنگ تأکید">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={settings.accent === a.id}
                aria-label={a.label}
                title={a.label}
                className={`swatch ${settings.accent === a.id ? 'on' : ''}`}
                style={{ background: a.color }}
                onClick={() => update({ accent: a.id })}
              >
                {settings.accent === a.id && <CheckIcon width={16} height={16} />}
              </button>
            ))}
          </div>
        </div>

        <div className="set-row stack">
          <span className="set-label">اندازه‌ی متن</span>
          <Segmented label="اندازه‌ی متن" value={settings.size} options={SIZE_OPTIONS} onChange={(size) => update({ size })} />
        </div>
      </section>

      <section className="set-section">
        <h3>پس‌زمینه‌ی گفتگو</h3>
        <div className="wp-grid" role="radiogroup" aria-label="پس‌زمینه‌ی گفتگو">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={settings.wallpaper === w.id}
              className={`wp-tile wp-${w.id} ${settings.wallpaper === w.id ? 'on' : ''}`}
              onClick={() => update({ wallpaper: w.id })}
            >
              {settings.wallpaper === w.id && (
                <span className="wp-check">
                  <CheckIcon width={14} height={14} />
                </span>
              )}
              <span className="wp-label">{w.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="set-section">
        <h3>گفتگو</h3>
        <div className="set-row">
          <span className="set-label">
            ارسال با Enter
            <small>اگر خاموش باشد، با Ctrl+Enter ارسال می‌شود</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enterToSend}
            aria-label="ارسال با Enter"
            className={`switch ${settings.enterToSend ? 'on' : ''}`}
            onClick={() => update({ enterToSend: !settings.enterToSend })}
          >
            <i />
          </button>
        </div>
      </section>

      <section className="set-section">
        <h3>حساب</h3>
        <button className="btn block" onClick={onLogout}>
          <LogoutIcon width={18} height={18} />
          خروج از حساب
        </button>
      </section>

      <p className="about">Zentra · نسخه‌ی ۱٫۰</p>
    </Drawer>
  );
}
