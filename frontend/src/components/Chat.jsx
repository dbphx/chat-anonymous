import React, { useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import Message from './Message';

const Chat = ({ messages, onSendMessage, isLoading, user }) => {
  const messagesEndRef = useRef(null);
  const safeMessages = Array.isArray(messages) ? messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {safeMessages.map((msg) => (
          <Message
            key={msg.id}
            message={msg}
            currentUser={user}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-wrapper">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default Chat;
