import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { isImageAttachment } from '../utils/fileTypes';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Link from '@mui/material/Link';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PushPinIcon from '@mui/icons-material/PushPin';

const formatTime = (value) => new Date((value || 0) * 1000).toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit',
});

const Message = ({
  message,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  canManageMessage,
  onTogglePin,
}) => {
  const theme = useTheme();
  const isOwnMessage = currentUser && message.user === currentUser;
  const canEditMessage = canManageMessage || isOwnMessage;
  const canDeleteMessage = canManageMessage || isOwnMessage;
  const canPinMessage = canEditMessage && typeof onTogglePin === 'function';
  const hasText = Boolean(message.content);
  const hasFile = Boolean(message.file?.url);
  const showImagePreview = hasFile && isImageAttachment(message.file);
  const replyPreview = message.reply_to;
  const [anchorEl, setAnchorEl] = useState(null);
  const [imageBroken, setImageBroken] = useState(false);
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    setImageBroken(false);
  }, [message.id, message.file?.url]);

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleCloseMenu();
    action(message);
  };

  return (
    <Box
      id={message.id ? `chat-message-${message.id}` : undefined}
      sx={{
        display: 'flex',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        mb: 2,
        px: { xs: 0, sm: 0.25 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 'min(520px, 88%)',
          px: 2,
          py: 1.35,
          borderRadius: 2,
          boxShadow: isOwnMessage
            ? '0 1px 2px rgba(29, 78, 216, 0.2), 0 4px 14px rgba(37, 99, 235, 0.18)'
            : '0 1px 2px rgba(15, 23, 42, 0.06), 0 2px 8px rgba(15, 23, 42, 0.04)',
          bgcolor: isOwnMessage ? 'transparent' : 'grey.50',
          backgroundImage: isOwnMessage
            ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 45%, ${theme.palette.primary.light} 100%)`
            : 'none',
          border: isOwnMessage ? 'none' : '1px solid rgba(15, 23, 42, 0.08)',
          ...(message.pinned
            ? {
              borderLeft: '4px solid',
              borderLeftColor: isOwnMessage ? 'rgba(255,255,255,0.85)' : 'primary.main',
            }
            : {}),
          color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
          '& .MuiTypography-root': {
            color: 'inherit',
          },
          '& a': {
            color: isOwnMessage ? 'inherit' : 'primary.main',
          },
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.95 }}>
            {message.user || 'Anonymous'}
          </Typography>
          {message.pinned ? (
            <PushPinIcon sx={{ fontSize: '1rem', opacity: 0.9, flexShrink: 0 }} aria-label="Đã ghim" />
          ) : null}
        </Stack>
        {replyPreview ? (
          <Box
            component="blockquote"
            sx={{
              mt: 1,
              mx: 0,
              py: 1,
              px: 1.25,
              borderRadius: 1,
              borderLeft: '4px solid',
              borderColor: isOwnMessage ? 'rgba(255,255,255,0.65)' : 'primary.main',
              bgcolor: isOwnMessage ? 'rgba(0,0,0,0.12)' : 'action.hover',
              opacity: 0.98,
            }}
          >
            <Typography variant="caption" display="block" sx={{ fontWeight: 700, opacity: 0.92 }}>
              Trích dẫn · {replyPreview.user || 'Ẩn danh'}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                opacity: 0.95,
              }}
            >
              {replyPreview.content || '[Đính kèm]'}
            </Typography>
          </Box>
        ) : null}
        {hasText ? (
          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </Typography>
        ) : null}
        {hasFile ? (
          showImagePreview && !imageBroken ? (
            <Box sx={{ mt: 1 }}>
              <Box
                component="img"
                src={message.file.url}
                alt={message.file.name || 'Ảnh đính kèm'}
                loading="lazy"
                onError={() => setImageBroken(true)}
                sx={{
                  display: 'block',
                  maxWidth: '100%',
                  width: 'auto',
                  height: 'auto',
                  maxHeight: { xs: 280, sm: 360 },
                  borderRadius: 1,
                  objectFit: 'contain',
                  bgcolor: isOwnMessage ? 'rgba(0,0,0,0.1)' : 'grey.100',
                }}
              />
            </Box>
          ) : (
            <Link
              href={message.file.url}
              target="_blank"
              rel="noreferrer"
              underline="always"
              sx={{ mt: 1, display: 'inline-block' }}
            >
              <Typography variant="body2" component="span">
                {message.file.name}
                {message.file.size ? ` (${message.file.size} bytes)` : ''}
              </Typography>
            </Link>
          )
        ) : null}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mt: 1,
            opacity: 0.9,
          }}
        >
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {formatTime(message.created)}
            {message.edited ? (
              <Typography component="span" variant="caption" sx={{ ml: 0.75, fontStyle: 'italic' }}>
                đã sửa
              </Typography>
            ) : null}
          </Typography>
          <IconButton
            size="small"
            aria-label="Thao tác tin nhắn"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? `message-actions-${message.id}` : undefined}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            sx={{
              color: 'inherit',
              opacity: 0.85,
              '&:hover': { opacity: 1 },
            }}
          >
            <MoreHorizIcon fontSize="small" />
          </IconButton>
          <Menu
            id={`message-actions-${message.id}`}
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => handleAction(onReply)}>Trả lời</MenuItem>
            {canPinMessage ? (
              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  onTogglePin();
                }}
              >
                {message.pinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
              </MenuItem>
            ) : null}
            {canEditMessage ? (
              <MenuItem onClick={() => handleAction(onEdit)}>Sửa</MenuItem>
            ) : null}
            {canDeleteMessage ? (
              <MenuItem
                onClick={() => handleAction(onDelete)}
                sx={{ color: 'error.main' }}
              >
                Xóa
              </MenuItem>
            ) : null}
          </Menu>
        </Box>
      </Paper>
    </Box>
  );
};

export default Message;
