/** Đuôi phổ biến khi server không gửi content_type đầy đủ */
const IMAGE_NAME_PATTERN = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|heic|heif)$/i;

/**
 * @param {{ url?: string, name?: string, content_type?: string } | null | undefined} file
 */
export const isImageAttachment = (file) => {
  if (!file?.url) {
    return false;
  }
  const ct = String(file.content_type || '').toLowerCase().trim();
  if (ct.startsWith('image/')) {
    return true;
  }
  return IMAGE_NAME_PATTERN.test(String(file.name || ''));
};
