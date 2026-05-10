import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import ChatInput from './ChatInput';
import Message from './Message';

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
}) => {
  const messagesEndRef = useRef(null);
  const safeMessages = Array.isArray(messages) ? messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
          pr: { xs: 0, sm: 1 },
        }}
      >
        {safeMessages.map((msg) => (
          <Message
            key={msg.id}
            message={msg}
            currentUser={user}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDeleteMessage}
            canManageMessage={canManageMessage}
          />
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box sx={{ pt: 2, flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', mt: 'auto' }}>
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
