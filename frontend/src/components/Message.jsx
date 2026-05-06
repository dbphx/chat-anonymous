import React from 'react';

const Message = ({ message, currentUser }) => {
  const isOwnMessage = currentUser && message.user === currentUser;
  const hasText = Boolean(message.content);
  const hasFile = Boolean(message.file?.url);
  
  return (
    <div className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}>
      <div className="message-user">{message.user || 'Anonymous'}</div>
      {hasText ? <div className="message-content">{message.content}</div> : null}
      {hasFile ? (
        <a
          className="message-file"
          href={message.file.url}
          target="_blank"
          rel="noreferrer"
        >
          <span>{message.file.name}</span>
          <span>{message.file.size ? ` (${message.file.size} bytes)` : ''}</span>
        </a>
      ) : null}
      <div className="message-time">
        {new Date((message.created || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};

export default Message;
