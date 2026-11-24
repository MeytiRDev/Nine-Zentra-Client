// لوگوی Zentra: حرف Z با گوشه‌های گرد روی یک مربع گرد.
// رنگ‌ها از CSS می‌آیند (.logo-bg / .logo-glyph) تا در تم روشن و تاریک خودکار وارونه شوند.
// فایل app/icon.svg همین طرح با رنگ ثابت برای favicon است.

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Zentra">
      <rect className="logo-bg" width="48" height="48" rx="14" />
      <path
        className="logo-glyph"
        d="M16 15h16L16 33h16"
        fill="none"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ size = 30, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      {withText && (
        <span className="logo-text" dir="ltr">
          Zentra
        </span>
      )}
    </span>
  );
}
