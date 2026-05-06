import React, { useEffect, useState } from 'react';
import ChatView from './views/ChatView';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8081';

function App() {
  const [userName, setUserName] = useState('');
  const [draftUserName, setDraftUserName] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [joinSecret, setJoinSecret] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomSecret, setNewRoomSecret] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(null);
  const [roomSecret, setRoomSecret] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const loadRooms = async () => {
    const response = await fetch(`${API_BASE_URL}/api/rooms`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load rooms');
    }

    setRooms(data);
  };

  useEffect(() => {
    loadRooms().catch((loadError) => {
      setError(loadError.message);
    });
  }, []);

  const handleRefreshRooms = async () => {
    setIsBusy(true);

    try {
      await loadRooms();
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetUserName = (event) => {
    event.preventDefault();
    const trimmedName = draftUserName.trim();

    if (!trimmedName) {
      setError('User name is required');
      return;
    }

    setUserName(trimmedName);
    setError('');
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();

    if (!newRoomName.trim() || !newRoomSecret.trim()) {
      setError('Room name and secret are required');
      return;
    }

    setIsBusy(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim(),
          password: newRoomSecret.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      setNewRoomName('');
      setNewRoomSecret('');
      setRooms((currentRooms) => [...currentRooms, data]);
      setSelectedRoom(data);
    } catch (createError) {
      setError(createError.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoinRoom = async (event) => {
    event.preventDefault();

    if (!selectedRoom) {
      setError('Select a room first');
      return;
    }

    if (!joinSecret.trim()) {
      setError('Room secret is required');
      return;
    }

    setIsBusy(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${selectedRoom.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: joinSecret.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      setJoinedRoom(data);
      setRoomSecret(joinSecret.trim());
      setJoinSecret('');
    } catch (joinError) {
      setError(joinError.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleLeaveRoom = () => {
    setJoinedRoom(null);
    setSelectedRoom(null);
    setJoinSecret('');
    setRoomSecret('');
    setError('');
  };

  const handleBackToLobby = () => {
    setSelectedRoom(null);
    setJoinSecret('');
    setError('');
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setJoinSecret('');
    setError('');
  };

  if (joinedRoom) {
    return (
      <div className="app-shell">
        <ChatView
          apiBaseUrl={API_BASE_URL}
          room={joinedRoom}
          secret={roomSecret}
          userName={userName}
          onLeave={handleLeaveRoom}
        />
      </div>
    );
  }

  const isInLobby = Boolean(userName) && !selectedRoom;
  const isInRoomAccess = Boolean(userName) && Boolean(selectedRoom);

  return (
    <div className="app-shell">
      <div className="lobby-card">
        <h1>Anonymous Chat</h1>
        <p className="subtitle">Choose a room first, then enter its secret to access the chat.</p>
        {error ? <div className="error-banner">{error}</div> : null}

        {!userName ? (
          <form className="panel" onSubmit={handleSetUserName}>
            <h2>Your Name</h2>
            <input
              value={draftUserName}
              onChange={(event) => setDraftUserName(event.target.value)}
              placeholder="Enter your name"
            />
            <button type="submit">Continue</button>
          </form>
        ) : null}

        {isInLobby ? (
          <>
            <div className="panel panel-inline">
              <div>
                <strong>User:</strong> {userName}
              </div>
              <button type="button" onClick={() => setUserName('')}>Change name</button>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>Rooms</h2>
                <button type="button" onClick={handleRefreshRooms} disabled={isBusy}>
                  Refresh rooms
                </button>
              </div>
              <div className="room-list">
                {rooms.map((room) => (
                  <button
                    className="room-option"
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room)}
                  >
                    <span className="room-option-content">
                      <strong>{room.name}</strong>
                      <code>{room.id}</code>
                    </span>
                    <span className="room-option-action">Enter room</span>
                  </button>
                ))}
                {rooms.length === 0 ? <div className="empty-state">No rooms yet.</div> : null}
              </div>
            </div>

            <form className="panel" onSubmit={handleCreateRoom}>
              <h2>Create Room</h2>
              <input
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                placeholder="Room name"
                disabled={isBusy}
              />
              <input
                value={newRoomSecret}
                onChange={(event) => setNewRoomSecret(event.target.value)}
                placeholder="Secret"
                type="password"
                disabled={isBusy}
              />
              <button type="submit" disabled={isBusy}>Create room</button>
            </form>
          </>
        ) : null}

        {isInRoomAccess ? (
          <>
            <div className="panel panel-inline">
              <div>
                <strong>User:</strong> {userName}
              </div>
              <button type="button" onClick={() => setUserName('')}>Change name</button>
            </div>

            <form className="panel" onSubmit={handleJoinRoom}>
              <h2>Enter Room</h2>
              <div className="room-access-summary">
                <div><strong>Room:</strong> {selectedRoom.name}</div>
                <div><strong>Room ID:</strong> <code>{selectedRoom.id}</code></div>
              </div>
              <input
                value={joinSecret}
                onChange={(event) => setJoinSecret(event.target.value)}
                placeholder="Enter room secret"
                type="password"
                disabled={isBusy}
              />
              <div className="action-row">
                <button type="button" className="button-secondary" onClick={handleBackToLobby} disabled={isBusy}>
                  Back to room list
                </button>
                <button type="submit" disabled={isBusy}>Enter chat</button>
              </div>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default App;
