import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chat from '../components/Chat';
import { parseJsonResponse } from '../utils/parseJsonResponse';

const POLL_INTERVAL_MS = 3000;
const ROOM_SECRET_HEADER = 'X-Room-Secret';

const normalizeMessages = (apiBaseUrl, items) => {
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems.map((message) => ({
    ...message,
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

const ChatView = ({ apiBaseUrl, room, secret, userName, onLeave, mode = 'user', adminToken, onUnauthorized, adminUser }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const isAdminMode = mode === 'admin';
  const currentUser = isAdminMode ? (adminUser?.username || adminUser?.userName || 'admin') : userName;

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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
        maxWidth: 920,
        mx: 'auto',
        width: '100%',
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 }, pb: 0 }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderColor: 'rgba(15, 23, 42, 0.1)', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Box>
              <Typography variant="body2">
                <strong>Room:</strong> {room.name}
              </Typography>
              <Typography variant="body2">
                <strong>Room ID:</strong>{' '}
                <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {room.id}
                </Typography>
              </Typography>
              <Typography variant="body2">
                <strong>User:</strong> {currentUser}
              </Typography>
            </Box>
            <Button variant="outlined" onClick={onLeave}>
              Back to rooms
            </Button>
          </Stack>
        </Paper>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, px: { xs: 2, sm: 3 }, pb: 3, pt: 2 }}>
        <Chat
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
    </Box>
  );
};

export default ChatView;
