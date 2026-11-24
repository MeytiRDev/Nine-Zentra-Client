/**
 * تصویر انتخاب‌شده را از وسط مربع می‌برد، به size×size کوچک می‌کند و JPEG برمی‌گرداند.
 * به این ترتیب حجم آپلود کم است و سرور همیشه یک فرمت ساده می‌گیرد.
 */
export async function resizeToJpeg(file: File, size = 320): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('فایل انتخاب‌شده تصویر نیست');

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('خواندن تصویر ممکن نشد (فرمت پشتیبانی نمی‌شود)'));
      el.src = url;
    });

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('پردازش تصویر در این مرورگر ممکن نیست');
    ctx.fillStyle = '#fff'; // پس‌زمینه‌ی PNG های شفاف
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) throw new Error('پردازش تصویر ناموفق بود');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
