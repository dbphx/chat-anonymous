import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { iconOutlinedSoft, iconPrimaryFilled, iconPrimaryFilledDisabled } from '../utils/iconSx';

const EMOJI_PRESETS = ['🙂', '😂', '👍', '❤️', '🔥'];

const readDraftMessage = (storageKey) => {
  if (!storageKey || typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
};

const ChatInput = ({
  onSendMessage,
  onUpdateMessage,
  isLoading,
  replyTarget,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  draftStorageKey,
}) => {
  const [message, setMessage] = useState(() => readDraftMessage(draftStorageKey));
  const [selectedFile, setSelectedFile] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const composerRef = useRef(null);
  const isEditing = Boolean(editingMessage);

  useEffect(() => {
    setMessage(readDraftMessage(draftStorageKey));
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || typeof window === 'undefined') {
      return;
    }

    try {
      if (message) {
        window.localStorage.setItem(draftStorageKey, message);
      } else {
        window.localStorage.removeItem(draftStorageKey);
      }
    } catch {
      // Ignore storage errors and keep the composer functional.
    }
  }, [draftStorageKey, message]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    setMessage(editingMessage?.content || '');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [editingMessage]);

  const resetComposer = () => {
    setMessage('');
    setSelectedFile(null);
    setEmojiAnchor(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (isEditing) {
      if (!message.trim()) {
        return;
      }

      const didUpdate = await onUpdateMessage({
        messageId: editingMessage.id,
        content: message,
      });

      if (didUpdate) {
        resetComposer();
        onCancelEdit();
      }
      return;
    }

    if (!message.trim() && !selectedFile) {
      return;
    }

    const didSend = await onSendMessage({
      content: message,
      file: selectedFile,
      replyToId: replyTarget?.id || '',
    });

    if (didSend) {
      resetComposer();
      onCancelReply();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }

    if (event.key === 'Escape') {
      if (isEditing) {
        resetComposer();
        onCancelEdit();
      } else if (replyTarget) {
        onCancelReply();
      }
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessage((currentMessage) => `${currentMessage}${emoji}`);
    setEmojiAnchor(null);
    inputRef.current?.focus();
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const emojiOpen = Boolean(emojiAnchor);

  return (
    <Box ref={composerRef}>
      <Popover
        open={emojiOpen}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 220 }} role="dialog" aria-label="Emoji picker">
          {EMOJI_PRESETS.map((emoji) => (
            <IconButton
              key={emoji}
              size="small"
              onClick={() => handleEmojiClick(emoji)}
              disabled={isLoading}
              aria-label={`emoji ${emoji}`}
            >
              <Typography component="span" sx={{ fontSize: '1.25rem' }}>{emoji}</Typography>
            </IconButton>
          ))}
        </Box>
      </Popover>

      <Stack spacing={1.25}>
        {replyTarget ? (
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={1}
            sx={{
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Trả lời {replyTarget.user || 'Ẩn danh'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                {replyTarget.content || '[Đính kèm]'}
              </Typography>
            </Box>
            <Tooltip title="Hủy trả lời">
              <IconButton size="small" onClick={onCancelReply} disabled={isLoading} aria-label="Hủy trả lời" sx={iconOutlinedSoft}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}

        {isEditing ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{
              p: 1.5,
              bgcolor: 'warning.light',
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'warning.dark',
              opacity: 0.98,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="warning.dark">
              Đang chỉnh sửa tin nhắn
            </Typography>
            <Tooltip title="Hủy chỉnh sửa">
              <IconButton
                size="small"
                onClick={() => {
                  resetComposer();
                  onCancelEdit();
                }}
                disabled={isLoading}
                aria-label="Hủy chỉnh sửa"
                sx={iconOutlinedSoft}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}

        <Stack direction="row" spacing={{ xs: 0.75, sm: 1 }} alignItems="flex-end">
          <IconButton
            color="primary"
            size="small"
            aria-label="Chọn emoji"
            aria-expanded={emojiOpen}
            onClick={(event) => setEmojiAnchor(event.currentTarget)}
            disabled={isLoading}
          >
            <EmojiEmotionsIcon fontSize="small" />
          </IconButton>
          <IconButton
            color="primary"
            size="small"
            aria-label="Đính kèm tệp"
            onClick={handleFileButtonClick}
            disabled={isLoading || isEditing}
          >
            <AttachFileIcon fontSize="small" />
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleFileChange}
            disabled={isLoading || isEditing}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {selectedFile ? (
              <Chip
                label={selectedFile.name}
                onDelete={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={isLoading}
                sx={{ mb: 1, maxWidth: '100%' }}
              />
            ) : null}
            <TextField
              inputRef={inputRef}
              multiline
              maxRows={6}
              fullWidth
              size="small"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isEditing ? 'Sửa nội dung tin nhắn…' : 'Nhập tin nhắn…'}
              disabled={isLoading}
            />
          </Box>
          <Tooltip title={isEditing ? 'Lưu' : 'Gửi'}>
            <span>
              <IconButton
                color="primary"
                size="small"
                onClick={handleSubmit}
                disabled={isLoading || (!message.trim() && !selectedFile)}
                aria-label={isEditing ? 'Lưu tin nhắn' : 'Gửi tin nhắn'}
                sx={{ ...iconPrimaryFilled, ...iconPrimaryFilledDisabled, width: 40, height: 40 }}
              >
                {isEditing ? <SaveIcon fontSize="small" /> : <SendIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ChatInput;
