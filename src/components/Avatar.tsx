'use client';

import { useState } from 'react';
import { assetUrl } from '../lib/api';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

// عکس پروفایل؛ اگر نبود (یا بارگذاری نشد) حرف اول نام با رنگی ثابت برای هر کاربر
export default function Avatar({ name, src, size = 42 }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = assetUrl(src);
  const dims = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  if (url && url !== failedUrl) {
    return <img className="avatar" src={url} alt="" width={size} height={size} style={dims} onError={() => setFailedUrl(url)} />;
  }

  let hue = 0;
  for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span className="avatar" style={{ ...dims, background: `hsl(${hue} 52% 48%)` }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
