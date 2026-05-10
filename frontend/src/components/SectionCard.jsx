import React from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

/**
 * Khối nội dung có tiêu đề rõ (header nền nhạt + đường kẻ), dùng cho từng phân vùng trên trang.
 */
const SectionCard = ({
  id,
  title,
  subheader,
  headerAction,
  children,
  cardSx,
  contentSx,
  titleTypographyProps,
  /** Header + chữ nhỏ (dùng cho vùng tìm kiếm). */
  compactHeader,
}) => (
  <Card
    id={id}
    variant="outlined"
    elevation={0}
    sx={{
      borderRadius: 2,
      overflow: 'hidden',
      borderColor: 'rgba(15, 23, 42, 0.1)',
      bgcolor: 'background.paper',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
      ...cardSx,
    }}
  >
    <CardHeader
      title={title}
      subheader={subheader || undefined}
      action={headerAction}
      titleTypographyProps={{
        variant: compactHeader ? 'body2' : 'subtitle1',
        fontWeight: compactHeader ? 600 : 700,
        fontSize: compactHeader ? '0.8125rem' : undefined,
        component: compactHeader ? 'div' : 'h2',
        letterSpacing: compactHeader ? 0.01 : undefined,
        color: compactHeader ? 'text.secondary' : undefined,
        ...titleTypographyProps,
      }}
      subheaderTypographyProps={{
        variant: 'caption',
        sx: {
          color: 'text.secondary',
          mt: compactHeader ? 0.25 : 0.25,
          display: subheader ? 'block' : 'none',
          lineHeight: 1.45,
          maxWidth: 'min(52ch, 100%)',
          fontSize: compactHeader ? '0.7rem' : undefined,
          opacity: compactHeader ? 0.92 : 1,
        },
      }}
      sx={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        ...(compactHeader
          ? { py: 1.25, px: 2 }
          : { py: 2, px: 2.5 }),
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        '& .MuiCardHeader-action': {
          alignSelf: compactHeader ? 'center' : 'flex-start',
          m: 0,
          mr: -0.5,
          pt: compactHeader ? 0 : 0.25,
        },
      }}
    />
    <CardContent
      sx={{
        ...(compactHeader
          ? { p: 2, '&:last-child': { pb: 2 } }
          : { p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }),
        ...contentSx,
      }}
    >
      {children}
    </CardContent>
  </Card>
);

export default SectionCard;
