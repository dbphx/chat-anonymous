import React, { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChatView from './views/ChatView';
import AdminLoginView from './views/AdminLoginView';
import AdminDashboardView from './views/AdminDashboardView';
import LobbyView from './views/LobbyView';
import RoomAccessView from './views/RoomAccessView';
import { parseJsonResponse } from './utils/parseJsonResponse';
import { normalizePagedResponse } from './utils/pagedList';

function AdminSessionLoading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Stack alignItems="center" spacing={2}>
        <CircularProgress />
        <Typography color="text.secondary">Đang kiểm tra phiên đăng nhập…</Typography>
      </Stack>
    </Box>
  );
}

const DEFAULT_ROOM_PAGE_LIMIT = 20;

const resolveApiBaseUrl = () => {
  const fromEnv = process.env.REACT_APP_BACKEND_URL;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  return 'http://localhost:8081';
};

const API_BASE_URL = resolveApiBaseUrl();
const APP_STORAGE_KEY = 'chat-anonymous:app-state';
const ADMIN_STORAGE_KEY = 'chat-anonymous:admin-auth';

const parsePathname = (pathname) => {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'admin') {
    if (segments[1] === 'login') {
      return { view: 'admin-login', roomId: null };
    }

    if (segments[1] === 'rooms' && segments[2]) {
      return { view: 'admin-room', roomId: segments[2] };
    }

    return { view: 'admin-dashboard', roomId: null };
  }

  if (segments[0] === 'room' && segments[1]) {
    return { view: 'room', roomId: segments[1] };
  }

  if (segments[0] === 'chat' && segments[1]) {
    return { view: 'chat', roomId: segments[1] };
  }

  return { view: 'home', roomId: null };
};

const getRoomById = (rooms, roomId) => rooms.find((room) => room && room.id === roomId) || null;

const readStoredAppState = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(APP_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const readStoredAdminAuth = () => {
  if (typeof window === 'undefined') {
    return { token: '', user: null };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ADMIN_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object'
      ? { token: parsed.token || '', user: parsed.user || null }
      : { token: '', user: null };
  } catch {
    return { token: '', user: null };
  }
};

const getStoredUserRoute = (storedState) => {
  if (storedState.joinedRoom?.id) {
    return `/chat/${storedState.joinedRoom.id}`;
  }

  if (storedState.selectedRoom?.id) {
    return `/room/${storedState.selectedRoom.id}`;
  }

  return '/';
};

const getInitialPathname = () => {
  if (typeof window === 'undefined') {
    return '/';
  }

  const currentPath = window.location.pathname;
  const currentRoute = parsePathname(currentPath);
  if (currentRoute.view !== 'home') {
    return currentPath;
  }

  return getStoredUserRoute(readStoredAppState());
};

const getInitialAppState = (pathname) => {
  const storedState = readStoredAppState();
  const pathnameRoute = parsePathname(pathname);
  const storedRooms = Array.isArray(storedState.rooms) ? storedState.rooms : [];
  const storedSelectedRoom = storedState.selectedRoom || null;
  const storedJoinedRoom = storedState.joinedRoom || null;
  const route = pathnameRoute.view === 'home'
    ? (storedJoinedRoom
      ? { view: 'chat', roomId: storedJoinedRoom.id }
      : storedSelectedRoom
        ? { view: 'room', roomId: storedSelectedRoom.id }
        : { view: 'home', roomId: null })
    : pathnameRoute;
  const candidateRooms = [storedJoinedRoom, storedSelectedRoom, ...storedRooms];
  const resolveRoom = (roomId) => getRoomById(candidateRooms, roomId) || (roomId ? { id: roomId, name: roomId } : null);
  const resolvedRoom = route.roomId ? resolveRoom(route.roomId) : null;

  return {
    userName: storedState.userName || '',
    draftUserName: storedState.draftUserName || '',
    rooms: storedRooms,
    selectedRoom: route.view === 'home' ? null : resolvedRoom,
    joinSecret: route.view === 'room' ? (storedState.joinSecret || '') : '',
    newRoomName: storedState.newRoomName || '',
    newRoomSecret: storedState.newRoomSecret || '',
    joinedRoom: route.view === 'chat' ? resolvedRoom : null,
    roomSecret: route.view === 'chat' ? (storedState.roomSecret || '') : '',
  };
};

function App() {
  const [pathname, setPathname] = useState(() => getInitialPathname());
  const [initialState] = useState(() => getInitialAppState(pathname));
  const [userName, setUserName] = useState(initialState.userName);
  const [draftUserName, setDraftUserName] = useState(initialState.draftUserName);
  const [rooms, setRooms] = useState(initialState.rooms);
  const [selectedRoom, setSelectedRoom] = useState(initialState.selectedRoom);
  const [joinSecret, setJoinSecret] = useState(initialState.joinSecret);
  const [newRoomName, setNewRoomName] = useState(initialState.newRoomName);
  const [newRoomSecret, setNewRoomSecret] = useState(initialState.newRoomSecret);
  const [joinedRoom, setJoinedRoom] = useState(initialState.joinedRoom);
  const [roomSecret, setRoomSecret] = useState(initialState.roomSecret);
  const [userError, setUserError] = useState('');
  const [userBusy, setUserBusy] = useState(false);
  const [roomPageMeta, setRoomPageMeta] = useState({
    total: 0,
    page: 1,
    limit: DEFAULT_ROOM_PAGE_LIMIT,
  });
  const [adminAuth, setAdminAuth] = useState(() => readStoredAdminAuth());
  const [adminUser, setAdminUser] = useState(() => readStoredAdminAuth().user);
  const [isAdminChecking, setIsAdminChecking] = useState(Boolean(readStoredAdminAuth().token));

  const route = parsePathname(pathname);

  const navigate = (nextPath, replace = false) => {
    if (typeof window === 'undefined' || window.location.pathname === nextPath) {
      return;
    }

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', nextPath);
    setPathname(nextPath);
  };

  const clearAdminAuth = (redirect = true) => {
    setAdminAuth({ token: '', user: null });
    setAdminUser(null);
    try {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
    if (redirect) {
      navigate('/admin/login', true);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({
        userName,
        draftUserName,
        rooms,
        selectedRoom,
        joinSecret,
        newRoomName,
        newRoomSecret,
        joinedRoom,
        roomSecret,
      }));
    } catch {
      // Ignore storage quota or privacy mode failures.
    }
  }, [
    userName,
    draftUserName,
    rooms,
    selectedRoom,
    joinSecret,
    newRoomName,
    newRoomSecret,
    joinedRoom,
    roomSecret,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminAuth));
    } catch {
      // Ignore storage failures.
    }
  }, [adminAuth]);

  const fetchRoomsPage = useCallback(async ({ q = '', page = 1, limit = DEFAULT_ROOM_PAGE_LIMIT }) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const trimmed = String(q).trim();
    if (trimmed) {
      params.set('q', trimmed);
    }

    const response = await fetch(`${API_BASE_URL}/api/rooms?${params.toString()}`);
    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error((data && data.error) || 'Failed to load rooms');
    }

    const normalized = normalizePagedResponse(data);
    setRooms(normalized.items);
    setRoomPageMeta({
      total: normalized.total,
      page: normalized.page,
      limit: normalized.limit,
    });
  }, []);

  useEffect(() => {
    const view = parsePathname(pathname).view;
    if (view !== 'home') {
      return undefined;
    }

    let cancelled = false;
    setUserBusy(true);
    fetchRoomsPage({ q: '', page: 1, limit: DEFAULT_ROOM_PAGE_LIMIT })
      .then(() => {
        if (!cancelled) {
          setUserError('');
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setUserError(loadError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setUserBusy(false);
        }
      });

    return () => {
      cancelled = true;
      setUserBusy(false);
    };
  }, [pathname, fetchRoomsPage]);

  useEffect(() => {
    setSelectedRoom((currentRoom) => {
      if (!currentRoom) {
        return currentRoom;
      }

      return getRoomById(rooms, currentRoom.id) || currentRoom;
    });

    setJoinedRoom((currentRoom) => {
      if (!currentRoom) {
        return currentRoom;
      }

      return getRoomById(rooms, currentRoom.id) || currentRoom;
    });
  }, [rooms]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handlePopState = () => {
      const nextPath = window.location.pathname;
      const nextRoute = parsePathname(nextPath);
      const storedState = readStoredAppState();
      setPathname(nextPath);

      if (nextRoute.view === 'home') {
        setSelectedRoom(null);
        setJoinedRoom(null);
        setJoinSecret('');
        setUserError('');
        return;
      }

      if (nextRoute.view === 'room' || nextRoute.view === 'chat') {
        const roomCandidates = [
          ...rooms,
          selectedRoom,
          joinedRoom,
          storedState.selectedRoom,
          storedState.joinedRoom,
        ];
        const resolveRoom = (roomId) => getRoomById(roomCandidates, roomId) || (roomId ? { id: roomId, name: roomId } : null);
        const room = resolveRoom(nextRoute.roomId);

        setSelectedRoom(room);
        setJoinSecret('');
        setUserError('');

        if (nextRoute.view === 'chat') {
          setJoinedRoom(room);
          setRoomSecret(storedState.roomSecret || roomSecret);
        } else {
          setJoinedRoom(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [joinedRoom, roomSecret, rooms, selectedRoom]);

  useEffect(() => {
    const validateAdminSession = async () => {
      if (!adminAuth.token) {
        setIsAdminChecking(false);
        return;
      }

      setIsAdminChecking(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/me`, {
          headers: { Authorization: `Bearer ${adminAuth.token}` },
        });
        const data = await parseJsonResponse(response);

        if (!response.ok) {
          throw new Error(data.error || 'Invalid session');
        }

        setAdminUser(data);
        setAdminAuth((currentAuth) => ({ ...currentAuth, user: data }));
      } catch {
        clearAdminAuth(route.view.startsWith('admin'));
      } finally {
        setIsAdminChecking(false);
      }
    };

    validateAdminSession();
  }, []);

  useEffect(() => {
    if (!route.view.startsWith('admin')) {
      return;
    }

    if (!adminAuth.token && route.view !== 'admin-login') {
      navigate('/admin/login', true);
    }

    if (adminAuth.token && route.view === 'admin-login' && !isAdminChecking) {
      navigate('/admin', true);
    }
  }, [adminAuth.token, isAdminChecking, pathname, route.view]);

  const handleFetchRoomsPage = async (opts) => {
    setUserBusy(true);
    try {
      await fetchRoomsPage({
        q: opts.q ?? '',
        page: opts.page ?? 1,
        limit: opts.limit ?? roomPageMeta.limit,
      });
      setUserError('');
    } catch (loadError) {
      setUserError(loadError.message);
    } finally {
      setUserBusy(false);
    }
  };

  const handleSetUserName = (event) => {
    event.preventDefault();
    const trimmedName = draftUserName.trim();

    if (!trimmedName) {
      setUserError('User name is required');
      return;
    }

    setUserName(trimmedName);
    setUserError('');
  };

  const handleChangeName = () => {
    setUserName('');
    setSelectedRoom(null);
    setJoinedRoom(null);
    setJoinSecret('');
    setUserError('');
    navigate('/');
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();

    if (!newRoomName.trim() || !newRoomSecret.trim()) {
      setUserError('Room name and secret are required');
      return;
    }

    setUserBusy(true);
    setUserError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim(),
          password: newRoomSecret.trim(),
        }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      setNewRoomName('');
      setNewRoomSecret('');
      setSelectedRoom(data);
      setJoinedRoom(null);
      setJoinSecret('');
      navigate(`/room/${data.id}`);
    } catch (createError) {
      setUserError(createError.message);
    } finally {
      setUserBusy(false);
    }
  };

  const handleJoinRoom = async (event) => {
    event.preventDefault();

    if (!selectedRoom) {
      setUserError('Select a room first');
      return;
    }

    if (!joinSecret.trim()) {
      setUserError('Room secret is required');
      return;
    }

    setUserBusy(true);
    setUserError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${selectedRoom.id}/join_room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: joinSecret.trim() }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      setJoinedRoom(data);
      setRoomSecret(joinSecret.trim());
      setJoinSecret('');
      navigate(`/chat/${data.id}`);
    } catch (joinError) {
      setUserError(joinError.message);
    } finally {
      setUserBusy(false);
    }
  };

  const handleLeaveRoom = () => {
    const room = joinedRoom || selectedRoom;

    setJoinedRoom(null);
    setSelectedRoom(room);
    setJoinSecret('');
    setUserError('');

    if (room) {
      navigate(`/room/${room.id}`);
    }
  };

  const handleBackToLobby = () => {
    setSelectedRoom(null);
    setJoinedRoom(null);
    setJoinSecret('');
    setUserError('');
    navigate('/');
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setJoinedRoom(null);
    setJoinSecret('');
    setUserError('');
    navigate(`/room/${room.id}`);
  };

  const handleAdminLogin = async ({ username, password }) => {
    setUserBusy(true);
    setUserError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      setAdminAuth({ token: data.token, user: data.user });
      setAdminUser(data.user);
      navigate('/admin', true);
    } catch (loginError) {
      setUserError(loginError.message);
    } finally {
      setUserBusy(false);
    }
  };

  const handleAdminLogout = () => {
    clearAdminAuth(true);
  };

  const handleAdminUnauthorized = () => {
    clearAdminAuth(true);
  };

  const resolveRoomForRoute = (roomId) => getRoomById(rooms, roomId) || (roomId ? { id: roomId, name: roomId } : null);

  if (route.view === 'admin-login') {
    return (
      <AdminLoginView
        onLogin={handleAdminLogin}
        onBackHome={() => navigate('/')}
        isLoading={userBusy || isAdminChecking}
        error={userError}
      />
    );
  }

  if (route.view === 'admin-dashboard') {
    if (isAdminChecking) {
      return <AdminSessionLoading />;
    }

    if (!adminAuth.token) {
      return (
        <AdminLoginView
          onLogin={handleAdminLogin}
          onBackHome={() => navigate('/')}
          isLoading={userBusy}
          error={userError}
        />
      );
    }

    return (
      <AdminDashboardView
        apiBaseUrl={API_BASE_URL}
        authToken={adminAuth.token}
        adminUser={adminUser}
        onOpenRoom={(room) => navigate(`/admin/rooms/${room.id}`)}
        onLogout={handleAdminLogout}
        onUnauthorized={handleAdminUnauthorized}
      />
    );
  }

  if (route.view === 'admin-room') {
    if (isAdminChecking) {
      return <AdminSessionLoading />;
    }

    if (!adminAuth.token) {
      return (
        <AdminLoginView
          onLogin={handleAdminLogin}
          onBackHome={() => navigate('/')}
          isLoading={userBusy}
          error={userError}
        />
      );
    }

    const room = resolveRoomForRoute(route.roomId);

    return (
      <ChatView
        apiBaseUrl={API_BASE_URL}
        room={room}
        userName={adminUser?.username || 'admin'}
        onLeave={() => navigate('/admin')}
        mode="admin"
        adminToken={adminAuth.token}
        adminUser={adminUser}
        onUnauthorized={handleAdminUnauthorized}
      />
    );
  }

  if (joinedRoom) {
    return (
      <ChatView
        apiBaseUrl={API_BASE_URL}
        room={joinedRoom}
        secret={roomSecret}
        userName={userName}
        onLeave={handleLeaveRoom}
      />
    );
  }

  const lobbyProps = {
    userName,
    draftUserName,
    setDraftUserName,
    onSetUserName: handleSetUserName,
    rooms,
    roomPageMeta,
    onFetchRoomsPage: handleFetchRoomsPage,
    onSelectRoom: handleSelectRoom,
    newRoomName,
    setNewRoomName,
    newRoomSecret,
    setNewRoomSecret,
    onCreateRoom: handleCreateRoom,
    userBusy,
    userError,
    onAdminLogin: () => navigate('/admin/login'),
    onChangeName: handleChangeName,
  };

  if (!userName || !selectedRoom) {
    return <LobbyView {...lobbyProps} />;
  }

  return (
    <RoomAccessView
      userName={userName}
      selectedRoom={selectedRoom}
      joinSecret={joinSecret}
      setJoinSecret={setJoinSecret}
      userBusy={userBusy}
      userError={userError}
      onJoinRoom={handleJoinRoom}
      onBackToLobby={handleBackToLobby}
      onChangeName={handleChangeName}
      onAdminLogin={() => navigate('/admin/login')}
    />
  );
}

export default App;
