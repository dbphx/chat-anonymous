import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PushPinIcon from '@mui/icons-material/PushPin';
import ChatInput from './ChatInput';
import Message from './Message';

const NEAR_BOTTOM_PX = 80;

const pinPreviewText = (m) => {
  const t = (m.content || '').trim();
  if (t) {
    return t.length > 140 ? `${t.slice(0, 137)}…` : t;
  }
  if (m.file?.name) {
    return `[Tệp] ${m.file.name}`;
  }
  return '(Không có nội dung)';
};

const Chat = ({
  messages,
  onSendMessage,
  onUpdateMessage,
  onDeleteMessage,
  onReply,
  onEdit,
  onCancelReply,
  onCancelEdit,
  replyTarget,
  editingMessage,
  isLoading,
  user,
  draftStorageKey,
  canManageMessage,
  /** (message, pinned) => Promise / void */
  onSetMessagePinned,
}) => {
  const listRef = useRef(null);
  const listContentRef = useRef(null);
  const didInitialScrollRef = useRef(false);
  const safeMessages = Array.isArray(messages) ? messages : [];
  const [atBottom, setAtBottom] = useState(true);

  const pinnedMessages = useMemo(
    () => safeMessages.filter((m) => m.pinned).sort((a, b) => (a.created || 0) - (b.created || 0)),
    [safeMessages],
  );

  const scrollToMessageId = useCallback((messageId) => {
    const el = typeof document !== 'undefined' ? document.getElementById(`chat-message-${messageId}`) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const updateAtBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = el;
    const distance = scrollHeight - scrollTop - clientHeight;
    setAtBottom(distance <= NEAR_BOTTOM_PX);
  }, []);

  const scrollListToBottom = useCallback((behavior = 'smooth') => {
    const el = listRef.current;
    if (!el) {
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    const inner = listContentRef.current;
    if (!el) {
      return undefined;
    }
    updateAtBottom();
    el.addEventListener('scroll', updateAtBottom, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' && inner
      ? new ResizeObserver(() => updateAtBottom())
      : null;
    if (inner) {
      ro?.observe(inner);
    }
    return () => {
      el.removeEventListener('scroll', updateAtBottom);
      ro?.disconnect();
    };
  }, [updateAtBottom]);

  useEffect(() => {
    if (safeMessages.length === 0) {
      didInitialScrollRef.current = false;
      return;
    }
    if (didInitialScrollRef.current) {
      return;
    }
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      scrollListToBottom('auto');
      setAtBottom(true);
    });
  }, [safeMessages.length, scrollListToBottom]);

  useEffect(() => {
    updateAtBottom();
  }, [messages, updateAtBottom]);

  const handleJumpToLatest = () => {
    scrollListToBottom('smooth');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
      }}
    >
      {pinnedMessages.length > 0 ? (
        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 1.5, sm: 2 },
            py: 1.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(37, 99, 235, 0.05)',
          }}
        >
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
            <PushPinIcon sx={{ fontSize: '1rem', color: 'primary.main' }} aria-hidden />
            <Typography variant="caption" fontWeight={800} letterSpacing={0.06} color="primary.dark">
              TIN ĐÃ GHIM
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {pinnedMessages.map((m) => (
              <Paper
                key={m.id}
                variant="outlined"
                onClick={() => scrollToMessageId(m.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    scrollToMessageId(m.id);
                  }
                }}
                role="button"
                tabIndex={0}
                sx={{
                  p: 1.25,
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  borderColor: 'primary.light',
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                  {m.user || 'Ẩn danh'}
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ mt: 0.25, lineHeight: 1.45 }}>
                  {pinPreviewText(m)}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      ) : null}

      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          ref={listRef}
          component="section"
          aria-label="Danh sách tin nhắn"
          sx={{
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
            overscrollBehavior: 'contain',
            px: { xs: 1.5, sm: 2 },
            py: 2,
            pr: { xs: 1.5, sm: 2.5 },
          }}
        >
          <Box ref={listContentRef}>
            {safeMessages.map((msg) => (
              <Message
                key={msg.id}
                message={msg}
                currentUser={user}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDeleteMessage}
                canManageMessage={canManageMessage}
                onTogglePin={
                  onSetMessagePinned
                    ? () => onSetMessagePinned(msg, !msg.pinned)
                    : undefined
                }
              />
            ))}
          </Box>
        </Box>
        {!atBottom ? (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 12,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <Button
              variant="contained"
              size="small"
              onClick={handleJumpToLatest}
              startIcon={<KeyboardArrowDownIcon />}
              sx={{
                pointerEvents: 'auto',
                borderRadius: 10,
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.18)',
              }}
            >
              Xuống tin mới nhất
            </Button>
          </Box>
        ) : null}
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          px: { xs: 1.5, sm: 2 },
          py: 2,
          boxShadow: '0 -4px 24px rgba(15, 23, 42, 0.06)',
        }}
      >
        <ChatInput
          onSendMessage={onSendMessage}
          onUpdateMessage={onUpdateMessage}
          isLoading={isLoading}
          replyTarget={replyTarget}
          editingMessage={editingMessage}
          onCancelReply={onCancelReply}
          onCancelEdit={onCancelEdit}
          draftStorageKey={draftStorageKey}
        />
      </Box>
    </Box>
  );
};

export default Chat;
