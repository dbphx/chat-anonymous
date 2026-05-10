/** Server sends user_count (distinct authors with messages). Handle number or numeric string. */
export function roomUserCount(room) {
  if (room == null || room.user_count == null) {
    return 0;
  }
  const n = Number(room.user_count);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
