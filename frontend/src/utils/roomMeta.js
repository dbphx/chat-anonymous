/** Server sends user_count (distinct authors with messages). Handle number or numeric string. */
export function roomUserCount(room) {
  if (room == null || room.user_count == null) {
    return 0;
  }
  const n = Number(room.user_count);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Unix seconds → nhãn thời gian ngắn (sidebar) */
export function formatShortRelativeTime(createdSec) {
  const t = Number(createdSec);
  if (!Number.isFinite(t) || t <= 0) {
    return '';
  }
  const now = Date.now() / 1000;
  const diff = Math.max(0, now - t);
  if (diff < 45) {
    return 'vừa xong';
  }
  if (diff < 3600) {
    return `${Math.floor(diff / 60)} phút`;
  }
  if (diff < 86400) {
    return `${Math.floor(diff / 3600)} giờ`;
  }
  if (diff < 86400 * 7) {
    return `${Math.floor(diff / 86400)} ngày`;
  }
  try {
    return new Date(t * 1000).toLocaleDateString('vi-VN');
  } catch {
    return '';
  }
}
