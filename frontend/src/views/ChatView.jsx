import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Chat from '../components/Chat';
import ChatMediaSummary from '../components/ChatMediaSummary';
import ChatRoomSidebar from '../components/ChatRoomSidebar';
import { parseJsonResponse } from '../utils/parseJsonResponse';
import { roomUserCount } from '../utils/roomMeta';
import { chipAccentColor, chipBesideLabelSx, chipFilledIdentitySx, chipNameColor, labelBesideChipSx, labelChipRowSx } from '../utils/chipInlineSx';
import { iconOutlinedSoft, iconPrimaryFilled, iconPrimaryFilledDisabled } from '../utils/iconSx';

const POLL_INTERVAL_MS = 3000;
const ROOM_SECRET_HEADER = 'X-Room-Secret';

const roomHeaderStorageKey = (roomId) => `chat-anonymous:room-header-open:${roomId || ''}`;

const readHeaderExpanded = (roomId) => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const v = window.sessionStorage.getItem(roomHeaderStorageKey(roomId));
    if (v === '0') {
      return false;
    }
    if (v === '1') {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};

const normalizeMessages = (apiBaseUrl, items) => {
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems.map((message) => ({
    ...message,
    pinned: Boolean(message.pinned),
    reply_to: message.reply_to ? {
      ...message.reply_to,
      content: message.reply_to.content || '',
    } : null,
    file: message.file ? {
      ...message.file,
      url: !message.file.url
        ? ''
        : (message.file.url.startsWith('http://') || message.file.url.startsWith('https://')
          ? message.file.url
          : `${apiBaseUrl}${message.file.url}`),
    } : null,
  }));
};

const toReplyBannerMessage = (message) => ({
  id: message.id,
  user: message.user,
  content: message.content || (message.file?.name ? `[File] ${message.file.name}` : ''),
});

const ChatView = ({
  apiBaseUrl,
  room,
  secret,
  userName,
  onLeave,
  onEditDisplayName,
  mode = 'user',
  adminToken,
  onUnauthorized,
  adminUser,
  lobbyRooms,
  onRefreshLobbyRooms,
  onNavigateToSidebarRoom,
  onJoinRoomSubmit,
  joinRoomError,
  joinRoomBusy,
  onClearJoinRoomError,
}) => {
  const theme = useTheme();
  const [headerExpanded, setHeaderExpanded] = useState(() => readHeaderExpanded(room?.id));
  const [messages, setMessages] = useState([]);
  const [joinDialogRoom, setJoinDialogRoom] = useState(null);
  const [joinSecretInput, setJoinSecretInput] = useState('');
  const [adminLobbyRooms, setAdminLobbyRooms] = useState([]);
  const [adminLobbyLoading, setAdminLobbyLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const isAdminMode = mode === 'admin';
  const currentUser = isAdminMode ? (adminUser?.username || adminUser?.userName || 'admin') : userName;

  const participantCount = useMemo(() => {
    const names = new Set();
    messages.forEach((message) => {
      const name = typeof message.user === 'string' ? message.user.trim() : '';
      if (name) {
        names.add(name);
      }
    });
    return names.size;
  }, [messages]);

  useEffect(() => {
    setHeaderExpanded(readHeaderExpanded(room?.id));
  }, [room?.id]);

  useEffect(() => {
    if (!joinDialogRoom) {
      setJoinSecretInput('');
      return;
    }
    setJoinSecretInput('');
    if (typeof onClearJoinRoomError === 'function') {
      onClearJoinRoomError();
    }
  }, [joinDialogRoom, onClearJoinRoomError]);

  useEffect(() => {
    if (!isAdminMode || !adminToken || apiBaseUrl == null || String(apiBaseUrl).trim() === '') {
      return undefined;
    }

    let cancelled = false;
    const base = String(apiBaseUrl).replace(/\/$/, '');
    setAdminLobbyLoading(true);

    fetch(`${base}/api/admin/rooms?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then(parseJsonResponse)
      .then((data) => {
        if (!cancelled && Array.isArray(data.items)) {
          setAdminLobbyRooms(data.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdminLobbyRooms([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAdminLobbyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAdminMode, adminToken, apiBaseUrl, room?.id]);

  useEffect(() => {
    if (isAdminMode || typeof onRefreshLobbyRooms !== 'function') {
      return undefined;
    }
    onRefreshLobbyRooms();
    return undefined;
  }, [isAdminMode, room?.id, onRefreshLobbyRooms]);

  useEffect(() => {
    if (typeof window === 'undefined' || room?.id == null) {
      return;
    }
    try {
      window.sessionStorage.setItem(roomHeaderStorageKey(room.id), headerExpanded ? '1' : '0');
    } catch {
      // ignore
    }
  }, [headerExpanded, room?.id]);

  const getMessageHeaders = () => {
    if (isAdminMode) {
      return { Authorization: `Bearer ${adminToken}` };
    }

    return { [ROOM_SECRET_HEADER]: secret };
  };

  const refreshMessages = async () => {
    const response = await fetch(`${apiBaseUrl}${isAdminMode ? `/api/admin/rooms/${room.id}/messages` : `/api/rooms/${room.id}/messages`}`, {
      headers: getMessageHeaders(),
    });
    const data = await parseJsonResponse(response);

    if (!response.ok) {
      if (response.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
      throw new Error(data.error || 'Failed to load messages');
    }

    setMessages(normalizeMessages(apiBaseUrl, data));
    setError('');
  };

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}${isAdminMode ? `/api/admin/rooms/${room.id}/messages` : `/api/rooms/${room.id}/messages`}`, {
          headers: getMessageHeaders(),
        });
        const data = await parseJsonResponse(response);

        if (!response.ok) {
          if (response.status === 401 && onUnauthorized) {
            onUnauthorized();
          }
          throw new Error(data.error || 'Failed to load messages');
        }

        if (isMounted) {
          setMessages(normalizeMessages(apiBaseUrl, data));
          setError('');
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      }
    };

    loadMessages();
    const intervalId = window.setInterval(loadMessages, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [apiBaseUrl, adminToken, isAdminMode, onUnauthorized, room.id, secret]);

  useEffect(() => {
    setReplyTarget((currentReplyTarget) => {
      if (!currentReplyTarget) {
        return currentReplyTarget;
      }

      const nextReplyTarget = messages.find((message) => message.id === currentReplyTarget.id);
      return nextReplyTarget ? toReplyBannerMessage(nextReplyTarget) : null;
    });

    setEditingMessage((currentEditingMessage) => {
      if (!currentEditingMessage) {
        return currentEditingMessage;
      }

      return messages.find((message) => message.id === currentEditingMessage.id) || null;
    });
  }, [messages]);

  const handleSendMessage = async ({ content, file, replyToId }) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      if (!isAdminMode) {
        formData.append('user', userName);
        formData.append('secret', secret);
      }
      if (replyToId) {
        formData.append('reply_to_id', replyToId);
      }
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(`${apiBaseUrl}${isAdminMode ? `/api/admin/rooms/${room.id}/messages` : `/api/rooms/${room.id}/messages`}`, {
        method: 'POST',
        body: formData,
        headers: isAdminMode ? { Authorization: `Bearer ${adminToken}` } : undefined,
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      await refreshMessages();
      setReplyTarget(null);
      return true;
    } catch (sendError) {
      setError(sendError.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMessage = async ({ messageId, content }) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}${isAdminMode ? `/api/admin/rooms/${room.id}/messages/${messageId}` : `/api/rooms/${room.id}/messages/${messageId}`}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isAdminMode ? { content: content.trim() } : { user: userName, content: content.trim(), secret }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update message');
      }

      await refreshMessages();
      setEditingMessage(null);
      return true;
    } catch (updateError) {
      setError(updateError.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!window.confirm('Delete this message?')) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}${isAdminMode ? `/api/admin/rooms/${room.id}/messages/${message.id}` : `/api/rooms/${room.id}/messages/${message.id}`}`, {
        method: 'DELETE',
        headers: isAdminMode
          ? { Authorization: `Bearer ${adminToken}` }
          : { 'Content-Type': 'application/json' },
        body: isAdminMode ? undefined : JSON.stringify({ user: userName, secret }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete message');
      }

      await refreshMessages();
      if (replyTarget?.id === message.id) {
        setReplyTarget(null);
      }
      if (editingMessage?.id === message.id) {
        setEditingMessage(null);
      }
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPinned = async (message, pinned) => {
    setIsLoading(true);
    try {
      const pinPath = isAdminMode
        ? `/api/admin/rooms/${room.id}/messages/${message.id}/pin`
        : `/api/rooms/${room.id}/messages/${message.id}/pin`;
      const base = typeof apiBaseUrl === 'string' ? apiBaseUrl.replace(/\/$/, '') : '';
      const url = `${base}${pinPath}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(isAdminMode ? { Authorization: `Bearer ${adminToken}` } : {}),
      };
      const body = JSON.stringify(isAdminMode ? { pinned } : { user: userName, secret, pinned });

      let response = await fetch(url, { method: 'PATCH', headers, body });
      if (response.status === 404) {
        response = await fetch(url, { method: 'POST', headers, body });
      }

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error((data && data.error) || 'Không cập nhật được ghim tin');
      }

      await refreshMessages();
    } catch (pinError) {
      setError(pinError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sidebarRoomsList = isAdminMode ? adminLobbyRooms : (lobbyRooms || []);
  const sidebarBusy = isAdminMode && adminLobbyLoading;

  const scrollToMessageById = useCallback((messageId) => {
    if (!messageId || typeof document === 'undefined') {
      return;
    }
    const el = document.getElementById(`chat-message-${messageId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleSidebarRoomClick = (nextRoom) => {
    if (!nextRoom?.id || nextRoom.id === room?.id) {
      return;
    }
    if (isAdminMode) {
      if (typeof onNavigateToSidebarRoom === 'function') {
        onNavigateToSidebarRoom(nextRoom);
      }
      return;
    }
    setJoinDialogRoom(nextRoom);
  };

  const handleJoinDialogSubmit = async (event) => {
    event.preventDefault();
    if (!joinDialogRoom || joinRoomBusy || typeof onJoinRoomSubmit !== 'function') {
      return;
    }
    const ok = await onJoinRoomSubmit(joinDialogRoom, joinSecretInput);
    if (ok) {
      setJoinDialogRoom(null);
    }
  };

  const busyJoin = Boolean(joinRoomBusy);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        width: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: 'stretch',
        boxSizing: 'border-box',
      }}
    >
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          width: { lg: 280 },
          flexShrink: 0,
          borderRadius: { xs: 0, lg: 2 },
          borderColor: 'divider',
          minHeight: { lg: '100vh' },
          maxHeight: { lg: '100vh' },
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        <ChatRoomSidebar
          rooms={sidebarRoomsList}
          currentRoomId={room?.id}
          onRoomClick={handleSidebarRoomClick}
          loading={sidebarBusy}
          title={isAdminMode ? 'Phòng (admin)' : 'Phòng có sẵn'}
        />
      </Paper>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          justifyContent: 'center',
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          boxSizing: 'border-box',
        }}
      >
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 920,
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: 'calc(100vh - 32px)', sm: 'calc(100vh - 56px)' },
          maxHeight: { xs: 'calc(100vh - 32px)', sm: 'calc(100vh - 56px)' },
          overflow: 'hidden',
          borderRadius: 2,
          borderColor: 'rgba(15, 23, 42, 0.1)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* Tiêu đề phòng — luôn có thanh tóm tắt; phần chi tiết có thể thu gọn */}
        <Box
          sx={{
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.25, sm: 1.5 } }}
          >
            <Tooltip title={headerExpanded ? 'Thu gọn tiêu đề phòng' : 'Mở rộng tiêu đề phòng'}>
              <IconButton
                size="small"
                onClick={() => setHeaderExpanded((open) => !open)}
                aria-expanded={headerExpanded}
                aria-label={headerExpanded ? 'Thu gọn tiêu đề phòng' : 'Mở rộng tiêu đề phòng'}
                sx={iconOutlinedSoft}
              >
                {headerExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: '0.14em',
                  fontWeight: 800,
                  fontSize: '0.65rem',
                  color: 'primary.main',
                  display: 'block',
                  lineHeight: 1.2,
                }}
              >
                Phòng chat
              </Typography>
              <Typography
                variant="subtitle1"
                component="h1"
                noWrap
                sx={{
                  fontWeight: 800,
                  mt: 0.25,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                  color: 'text.primary',
                }}
              >
                {room.name}
              </Typography>
            </Box>
            <Tooltip title="Về danh sách phòng">
              <IconButton
                size="small"
                onClick={onLeave}
                aria-label="Về danh sách phòng"
                sx={{ flexShrink: 0, ...iconOutlinedSoft }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Collapse in={headerExpanded} timeout="auto">
            <Box
              sx={{
                flexShrink: 0,
                px: { xs: 2, sm: 2.5 },
                py: 1.75,
                borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.06),
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.04, display: 'block', mb: 1.25 }}>
                Bạn đang gửi tin nhắn với tên
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 1.5, sm: 2 }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="nowrap"
                  useFlexGap
                  sx={{ minWidth: 0, width: 'fit-content', maxWidth: '100%', flexShrink: 1 }}
                >
                  <Chip label={currentUser} title={currentUser} color={chipNameColor} variant="filled" size="medium" sx={chipFilledIdentitySx} />
                  {!isAdminMode && typeof onEditDisplayName === 'function' ? (
                    <Tooltip title="Đổi tên hiển thị">
                      <IconButton size="small" onClick={onEditDisplayName} aria-label="Đổi tên hiển thị" sx={{ flexShrink: 0, ...iconOutlinedSoft }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
                <Box
                  sx={{
                    pl: { xs: 0, sm: 2 },
                    borderLeft: { xs: 'none', sm: '1px solid' },
                    borderColor: { sm: 'divider' },
                    alignSelf: { xs: 'stretch', sm: 'center' },
                    py: { xs: 1.25, sm: 0 },
                    borderTop: { xs: '1px dashed', sm: 'none' },
                    borderTopColor: { xs: 'divider' },
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                    Người tham gia (ước lượng theo tin nhắn)
                  </Typography>
                  <Typography variant="h6" component="p" sx={{ m: 0, mt: 0.25, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                    {participantCount}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Collapse>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ flexShrink: 0, borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}>
            {error}
          </Alert>
        ) : null}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'grey.50',
          }}
        >
          <Chat
            key={room.id}
            onSetMessagePinned={handleSetPinned}
            messages={messages}
            onSendMessage={handleSendMessage}
            onUpdateMessage={handleUpdateMessage}
            onDeleteMessage={handleDeleteMessage}
            onReply={(message) => {
              setReplyTarget(toReplyBannerMessage(message));
              setEditingMessage(null);
            }}
            onEdit={(message) => {
              setEditingMessage(message);
              setReplyTarget(null);
            }}
            onCancelReply={() => setReplyTarget(null)}
            onCancelEdit={() => setEditingMessage(null)}
            replyTarget={replyTarget}
            editingMessage={editingMessage}
            isLoading={isLoading}
            user={currentUser}
            draftStorageKey={`chat-anonymous:composer:${room.id}:${currentUser}`}
            canManageMessage={isAdminMode}
          />
        </Box>
      </Paper>
      </Box>

      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          width: { lg: 300 },
          flexShrink: 0,
          borderRadius: { xs: 0, lg: 2 },
          borderColor: 'divider',
          minHeight: { lg: '100vh' },
          maxHeight: { lg: '100vh' },
          overflow: 'hidden',
          bgcolor: 'grey.50',
        }}
      >
        <ChatMediaSummary messages={messages} onOpenAttachment={scrollToMessageById} />
      </Paper>

      {!isAdminMode ? (
        <Dialog
          open={Boolean(joinDialogRoom)}
          onClose={() => !busyJoin && setJoinDialogRoom(null)}
          maxWidth="sm"
          fullWidth
          aria-labelledby="chat-join-room-dialog-title"
        >
          <form onSubmit={handleJoinDialogSubmit}>
            <DialogTitle id="chat-join-room-dialog-title">Chuyển phòng</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 0.5 }}>
                {joinRoomError ? (
                  <Alert severity="error" onClose={typeof onClearJoinRoomError === 'function' ? onClearJoinRoomError : undefined}>
                    {joinRoomError}
                  </Alert>
                ) : null}
                {joinDialogRoom ? (
                  <Stack spacing={1}>
                    <Box sx={labelChipRowSx}>
                      <Typography component="span" variant="body2" color="text.secondary" sx={labelBesideChipSx}>
                        Phòng
                      </Typography>
                      <Chip
                        label={joinDialogRoom.name || joinDialogRoom.id}
                        title={joinDialogRoom.name || joinDialogRoom.id}
                        color={chipAccentColor}
                        variant="outlined"
                        size="medium"
                        sx={chipBesideLabelSx}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Người tham gia (ước lượng): {roomUserCount(joinDialogRoom)}
                    </Typography>
                  </Stack>
                ) : null}
                <TextField
                  label="Mật khẩu phòng"
                  type="password"
                  value={joinSecretInput}
                  onChange={(event) => setJoinSecretInput(event.target.value)}
                  disabled={busyJoin}
                  fullWidth
                  autoFocus
                  autoComplete="off"
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
              <Button type="button" variant="outlined" size="small" onClick={() => !busyJoin && setJoinDialogRoom(null)} disabled={busyJoin}>
                Hủy
              </Button>
              <Button type="submit" variant="contained" size="small" disabled={busyJoin} sx={{ ...iconPrimaryFilled, ...iconPrimaryFilledDisabled }}>
                Vào phòng
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      ) : null}
    </Box>
  );
};

export default ChatView;
