'use client';

import { useEffect, type ReactNode } from 'react';
import { CloseIcon } from './Icons';

interface DrawerProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// پنل کشویی: روی دسکتاپ جای سایدبار را می‌گیرد و روی موبایل تمام‌صفحه است. با Esc یا کلیک روی پس‌زمینه بسته می‌شود.
export default function Drawer({ title, onClose, children }: DrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="drawer-layer">
      <div className="backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="بستن" title="بستن">
            <CloseIcon />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
