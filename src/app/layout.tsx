import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { SettingsProvider } from '../lib/settings';
import { themeScript } from '../lib/theme-script';
import './globals.css';

// سه وزن فونت دانا: Regular / Medium / Bold
const dana = localFont({
  src: [
    { path: '../fonts/DanaFaNum-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/DanaFaNum-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/DanaFaNum-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-dana',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Zentra',
  description: 'Zentra — چت ساده، لحظه‌ای و خصوصی بین دو نفر',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c0e' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={dana.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
