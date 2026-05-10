import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { chipAccentColor } from '../utils/chipInlineSx';
import Link from '@mui/material/Link';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import { isImageAttachment } from '../utils/fileTypes';

const ChatMediaSummary = ({ messages, onOpenAttachment }) => {
  const attachments = useMemo(() => {
    const safe = Array.isArray(messages) ? messages : [];
    const list = [];
    safe.forEach((m) => {
      if (!m?.file?.url) {
        return;
      }
      list.push({
        messageId: m.id,
        user: m.user,
        file: m.file,
        created: m.created || 0,
        isImage: isImageAttachment(m.file),
      });
    });
    list.sort((a, b) => (b.created || 0) - (a.created || 0));
    return list;
  }, [messages]);

  const imageItems = attachments.filter((a) => a.isImage);
  const fileItems = attachments.filter((a) => !a.isImage);

  const handleActivate = (messageId) => {
    if (typeof onOpenAttachment === 'function') {
      onOpenAttachment(messageId);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, pt: 2, pb: 1.25 }}>
        <ImageIcon sx={{ fontSize: '1.15rem', color: 'primary.main' }} aria-hidden />
        <Typography variant="subtitle2" fontWeight={800} color="primary.dark" sx={{ letterSpacing: 0.02 }}>
          Ảnh và tệp
        </Typography>
      </Stack>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ px: 2, pb: 1.5 }}>
        <Chip size="small" icon={<ImageIcon sx={{ fontSize: '1rem !important' }} />} label={`${imageItems.length} ảnh`} variant="outlined" color={chipAccentColor} />
        <Chip size="small" icon={<AttachFileIcon sx={{ fontSize: '1rem !important' }} />} label={`${fileItems.length} tệp`} variant="outlined" color={chipAccentColor} />
      </Stack>

      {attachments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
          Chưa có tệp đính kèm trong cuộc trò chuyện này.
        </Typography>
      ) : null}

      {imageItems.length > 0 ? (
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 2, pb: 1, display: 'block' }}>
          Ảnh
        </Typography>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0.75,
          px: 2,
          pb: 1.5,
        }}
      >
        {imageItems.map((item) => (
          <Box
            key={`${item.messageId}-${item.file.url}`}
            component="button"
            type="button"
            onClick={() => handleActivate(item.messageId)}
            sx={{
              position: 'relative',
              width: '100%',
              padding: 0,
              border: 'none',
              borderRadius: 1,
              overflow: 'hidden',
              cursor: 'pointer',
              bgcolor: 'grey.100',
              aspectRatio: '1',
              display: 'block',
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
            }}
            aria-label={`Xem tin nhắn có ảnh ${item.file.name || ''}`}
          >
            <Box
              component="img"
              src={item.file.url}
              alt=""
              loading="lazy"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </Box>
        ))}
      </Box>

      {fileItems.length > 0 ? (
        <>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 2, pb: 1, pt: 0.5, display: 'block' }}>
            Tệp khác
          </Typography>
          <Stack spacing={0.5} sx={{ px: 2, pb: 2, overflow: 'auto' }}>
            {fileItems.map((item) => (
              <Link
                key={`${item.messageId}-${item.file.name}`}
                component="button"
                type="button"
                variant="body2"
                onClick={() => handleActivate(item.messageId)}
                underline="hover"
                sx={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'block',
                  wordBreak: 'break-word',
                  color: 'primary.main',
                  fontWeight: 600,
                  border: 'none',
                  background: 'none',
                  p: 0,
                  font: 'inherit',
                }}
              >
                {item.file.name || 'Tệp đính kèm'}
              </Link>
            ))}
          </Stack>
        </>
      ) : null}
    </Box>
  );
};

export default ChatMediaSummary;
