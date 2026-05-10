import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Link from '@mui/material/Link';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

const formatTime = (value) => new Date((value || 0) * 1000).toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit',
});

const Message = ({ message, currentUser, onReply, onEdit, onDelete, canManageMessage }) => {
  const isOwnMessage = currentUser && message.user === currentUser;
  const canEditMessage = canManageMessage || isOwnMessage;
  const canDeleteMessage = canManageMessage || isOwnMessage;
  const hasText = Boolean(message.content);
  const hasFile = Boolean(message.file?.url);
  const replyPreview = message.reply_to;
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleCloseMenu();
    action(message);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        mb: 1.5,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 'min(520px, 85%)',
          px: 2,
          py: 1.25,
          borderRadius: 2.5,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
          bgcolor: isOwnMessage ? 'primary.main' : 'grey.50',
          border: isOwnMessage ? 'none' : '1px solid rgba(15, 23, 42, 0.08)',
          color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
          '& .MuiTypography-root': {
            color: 'inherit',
          },
          '& a': {
            color: isOwnMessage ? 'inherit' : 'primary.main',
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.95 }}>
          {message.user || 'Anonymous'}
        </Typography>
        {replyPreview ? (
          <Box
            sx={{
              mt: 1,
              pl: 1.5,
              borderLeft: '3px solid',
              borderColor: isOwnMessage ? 'rgba(255,255,255,0.5)' : 'divider',
              opacity: 0.95,
            }}
          >
            <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
              Reply to {replyPreview.user || 'Anonymous'}
            </Typography>
            <Typography variant="body2">{replyPreview.content || '[Attachment]'}</Typography>
          </Box>
        ) : null}
        {hasText ? (
          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </Typography>
        ) : null}
        {hasFile ? (
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
                edited
              </Typography>
            ) : null}
          </Typography>
          <IconButton
            size="small"
            aria-label="Message actions"
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
            <MenuItem onClick={() => handleAction(onReply)}>Reply</MenuItem>
            {canEditMessage ? (
              <MenuItem onClick={() => handleAction(onEdit)}>Edit</MenuItem>
            ) : null}
            {canDeleteMessage ? (
              <MenuItem
                onClick={() => handleAction(onDelete)}
                sx={{ color: 'error.main' }}
              >
                Delete
              </MenuItem>
            ) : null}
          </Menu>
        </Box>
      </Paper>
    </Box>
  );
};

export default Message;
