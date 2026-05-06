import React, { useEffect, useState } from 'react';
import Chat from '../components/Chat';

const POLL_INTERVAL_MS = 3000;
const ROOM_SECRET_HEADER = 'X-Room-Secret';

const normalizeMessages = (apiBaseUrl, items) => {
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems.map((message) => ({
    ...message,
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

const ChatView = ({ apiBaseUrl, room, secret, userName, onLeave }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/rooms/${room.id}/messages`, {
          headers: { [ROOM_SECRET_HEADER]: secret },
        });
        const data = await response.json();

        if (!response.ok) {
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
  }, [apiBaseUrl, room.id, secret]);

  const handleSendMessage = async ({ content, file }) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('user', userName);
      formData.append('content', content.trim());
      formData.append('secret', secret);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(`${apiBaseUrl}/api/rooms/${room.id}/messages`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      const messagesResponse = await fetch(`${apiBaseUrl}/api/rooms/${room.id}/messages`, {
        headers: { [ROOM_SECRET_HEADER]: secret },
      });
      const nextMessages = await messagesResponse.json();

      if (!messagesResponse.ok) {
        throw new Error(nextMessages.error || 'Failed to refresh messages');
      }

      setMessages(normalizeMessages(apiBaseUrl, nextMessages));
      setError('');
      return true;
    } catch (sendError) {
      setError(sendError.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-view">
      <div className="chat-header">
        <div>
          <div><strong>Room:</strong> {room.name}</div>
          <div><strong>Room ID:</strong> <code>{room.id}</code></div>
          <div><strong>User:</strong> {userName}</div>
        </div>
        <button type="button" onClick={onLeave}>Back to rooms</button>
      </div>
      {error ? <div className="error-banner chat-error">{error}</div> : null}
      <Chat
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        user={userName}
      />
    </div>
  );
};

export default ChatView;
