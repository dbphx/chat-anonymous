/** Đuôi phổ biến khi server không gửi content_type đầy đủ */
const IMAGE_NAME_PATTERN = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|heic|heif)$/i;
const VIDEO_NAME_PATTERN = /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i;

/**
 * Loại tệp không phải ảnh — dùng để chọn icon trong UI.
 * @typedef {'pdf'|'spreadsheet'|'presentation'|'document'|'archive'|'video'|'audio'|'code'|'text'|'generic'} NonImageAttachmentKind
 */

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

/**
 * @param {{ url?: string, name?: string, content_type?: string } | null | undefined} file
 */
export const isPdfAttachment = (file) => {
  if (!file?.url) {
    return false;
  }
  const ct = String(file.content_type || '').toLowerCase().trim();
  if (ct.includes('pdf')) {
    return true;
  }
  return /\.pdf$/i.test(String(file.name || ''));
};

/**
 * @param {{ url?: string, name?: string, content_type?: string } | null | undefined} file
 */
export const isVideoAttachment = (file) => {
  if (!file?.url) {
    return false;
  }
  const ct = String(file.content_type || '').toLowerCase().trim();
  if (ct.startsWith('video/')) {
    return true;
  }
  return VIDEO_NAME_PATTERN.test(String(file.name || ''));
};

/**
 * @param {{ url?: string, name?: string, content_type?: string } | null | undefined} file
 * @returns {NonImageAttachmentKind}
 */
export const getNonImageAttachmentKind = (file) => {
  const ct = String(file?.content_type || '').toLowerCase().trim();
  const name = String(file?.name || '');

  if (ct.includes('pdf') || /\.pdf$/i.test(name)) {
    return 'pdf';
  }
  if (
    ct.includes('spreadsheet')
    || ct.includes('excel')
    || ct.includes('csv')
    || /\.(xlsx?|csv|ods|numbers?)$/i.test(name)
  ) {
    return 'spreadsheet';
  }
  if (
    ct.includes('presentation')
    || ct.includes('powerpoint')
    || /\.(pptx?|key|odp)$/i.test(name)
  ) {
    return 'presentation';
  }
  if (
    ct.includes('zip')
    || ct.includes('compressed')
    || ct.includes('tar')
    || ct.includes('gzip')
    || ct.includes('rar')
    || ct.includes('7z')
    || /\.(zip|rar|7z|tar|gz|tgz|bz2|xz)$/i.test(name)
  ) {
    return 'archive';
  }
  if (ct.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(name)) {
    return 'video';
  }
  if (ct.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|opus)$/i.test(name)) {
    return 'audio';
  }
  if (
    ct.includes('javascript')
    || ct.includes('typescript')
    || ct.includes('json')
    || ct.includes('xml')
    || ct.includes('/html')
    || /\.(js|jsx|mjs|cjs|ts|tsx|json|xml|html?|css|scss|py|go|rs|java|php|c|cpp|h|rb|swift|kt|sql|yaml|yml|sh|bash)$/i.test(name)
  ) {
    return 'code';
  }
  if (
    ct === 'text/plain'
    || ct.includes('markdown')
    || /\.(txt|md|markdown)$/i.test(name)
  ) {
    return 'text';
  }
  if (ct.includes('wordprocessing') || ct.includes('msword') || /\.(docx?|odt|rtf)$/i.test(name)) {
    return 'document';
  }
  if (ct.startsWith('text/')) {
    return 'document';
  }
  return 'generic';
};
