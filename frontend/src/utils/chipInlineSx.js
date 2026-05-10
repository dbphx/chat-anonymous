/** Màu chip phòng / đếm media — giữ tách khỏi chip tên người dùng */
export const chipAccentColor = 'secondary';

/** Chip hiển thị tên người dùng */
export const chipNameColor = 'primary';

/** Hàng nhãn + chip: một dòng, chip co/giữ ellipsis khi hẹp. Trong hàng `flex` (vd. cạnh nút), thêm `flex: 1` + `minWidth: 0` trên Box bọc. */
export const labelChipRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  flexWrap: 'nowrap',
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
};

/** Chip outlined/filled đặt cạnh Typography — rộng vừa chữ, không kéo giãn; chỉ co khi thiếu chỗ */
export const chipBesideLabelSx = {
  fontWeight: 700,
  height: 32,
  width: 'fit-content',
  maxWidth: '100%',
  minWidth: 0,
  flex: '0 1 auto',
  boxSizing: 'border-box',
  '& .MuiChip-label': {
    px: 1.5,
    fontSize: '0.875rem',
    lineHeight: 1.35,
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
};

/** Typography body2 làm nhãn trước chip (cùng chiều cao chip, không margin paragraph) */
export const labelBesideChipSx = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'center',
  flexShrink: 0,
  lineHeight: 1.35,
  margin: 0,
  mt: 0,
  mb: 0,
  py: 0,
  minHeight: 32,
  height: 32,
  boxSizing: 'border-box',
};

/** Chip filled trong header chat — rộng vừa chữ */
export const chipFilledIdentitySx = {
  fontWeight: 700,
  height: 40,
  width: 'fit-content',
  maxWidth: '100%',
  minWidth: 0,
  flex: '0 1 auto',
  boxSizing: 'border-box',
  '& .MuiChip-label': {
    px: 1.75,
    fontSize: '0.9375rem',
    lineHeight: 1.4,
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
};
