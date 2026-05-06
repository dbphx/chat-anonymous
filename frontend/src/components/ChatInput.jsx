import React, { useState, useRef, useEffect } from 'react';

const EMOJI_PRESETS = ['🙂', '😂', '👍', '❤️', '🔥'];

const ChatInput = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Focus input after sending message
  useEffect(() => {
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() && !selectedFile) {
      return;
    }

    const didSend = await onSendMessage({
      content: message,
      file: selectedFile,
    });

    if (didSend) {
      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessage((currentMessage) => `${currentMessage}${emoji}`);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-tools">
        <div className="emoji-row">
          {EMOJI_PRESETS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-button"
              onClick={() => handleEmojiClick(emoji)}
              disabled={isLoading}
            >
              {emoji}
            </button>
          ))}
        </div>
        <label className="file-picker" htmlFor="chat-file-input">
          <span>{selectedFile ? selectedFile.name : 'Attach file'}</span>
          <input
            id="chat-file-input"
            ref={fileInputRef}
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            disabled={isLoading}
          />
        </label>
      </div>
      <textarea
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tin nhắn của bạn..."
        className="chat-input"
        rows="1"
        disabled={isLoading}
      />
      <button
        type="button"
        className="chat-send-button"
        onClick={handleSubmit}
        disabled={isLoading || (!message.trim() && !selectedFile)}
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput;
