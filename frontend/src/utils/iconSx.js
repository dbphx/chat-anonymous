/** Dùng chung để nút icon đồng bộ kích thước & màu */
export const iconPrimaryFilled = {
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  '&:hover': { bgcolor: 'primary.dark' },
};

export const iconPrimaryFilledDisabled = {
  '&.Mui-disabled': {
    bgcolor: 'action.disabledBackground',
    color: 'action.disabled',
  },
};

export const iconOutlinedSoft = {
  border: '1px solid',
  borderColor: 'divider',
};

/** Khung cố định cột Thao tác — border-box để viền không đẩy lệch */
export const tableActionIconBox = {
  width: 36,
  height: 36,
  minWidth: 36,
  maxWidth: 36,
  maxHeight: 36,
  flexShrink: 0,
  boxSizing: 'border-box',
  /** size="small" mặc định padding 8px → lệch trong ô 36×36 */
  padding: 0,
  margin: 0,
};

/** Outlined + danger dùng cùng “độ dày” viền → icon thẳng hàng */
export const tableActionOutlined = {
  ...tableActionIconBox,
  ...iconOutlinedSoft,
};

export const tableActionPrimary = {
  ...tableActionIconBox,
  ...iconPrimaryFilled,
};

/** Viền trong suốt trùng độ dày với outlined */
export const tableActionDanger = {
  ...tableActionIconBox,
  border: '1px solid transparent',
};

/** Icon trong ô Thao tác bảng — cùng baseline chiều cao */
export const tableActionIconProps = {
  size: 'small',
  sx: {
    ...tableActionIconBox,
  },
};

/** Căn giữa nhóm nút trong ô Thao tác (tránh baseline/inline-flex lệch trong td) */
export const tableActionCellInnerSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  flexWrap: 'wrap',
  gap: 1,
  lineHeight: 0,
};
