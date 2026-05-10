import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import AddIcon from '@mui/icons-material/Add';
import MainNavbar from '../components/MainNavbar';
import DataTable from '../components/DataTable';
import SectionCard from '../components/SectionCard';
import { parseJsonResponse } from '../utils/parseJsonResponse';
import { normalizePagedResponse, totalPages as computeTotalPages } from '../utils/pagedList';

const DEFAULT_PAGE_LIMIT = 20;

const AdminDashboardView = ({ apiBaseUrl, authToken, adminUser, onOpenRoom, onLogout, onUnauthorized }) => {
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [roomPageMeta, setRoomPageMeta] = useState({ total: 0, page: 1, limit: DEFAULT_PAGE_LIMIT });
  const [userPageMeta, setUserPageMeta] = useState({ total: 0, page: 1, limit: DEFAULT_PAGE_LIMIT });
  const [roomSearchInput, setRoomSearchInput] = useState('');
  const [roomSubmittedQuery, setRoomSubmittedQuery] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSubmittedQuery, setUserSubmittedQuery] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('mod');
  const [segment, setSegment] = useState('rooms');
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const userSubmittedQueryRef = useRef('');
  const userPageRef = useRef(1);
  userSubmittedQueryRef.current = userSubmittedQuery;
  userPageRef.current = userPageMeta.page;

  const requestHeaders = useMemo(() => ({ Authorization: `Bearer ${authToken}` }), [authToken]);
  const canManageUsers = adminUser?.role === 'admin';
  const adminTabs = canManageUsers
    ? [
        { id: 'rooms', label: 'Phòng', shortLabel: 'Ph' },
        { id: 'users', label: 'Người dùng', shortLabel: 'ND' },
      ]
    : null;

  const fetchRoomsPage = useCallback(
    async ({ q, page }) => {
      setListBusy(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_PAGE_LIMIT),
        });
        const trimmed = String(q ?? '').trim();
        if (trimmed) {
          params.set('q', trimmed);
        }
        const response = await fetch(`${apiBaseUrl}/api/admin/rooms?${params.toString()}`, {
          headers: requestHeaders,
        });
        const data = await parseJsonResponse(response);

        if (response.status === 401) {
          onUnauthorized?.();
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load rooms');
        }

        const norm = normalizePagedResponse(data);
        setRooms(norm.items);
        setRoomPageMeta({ total: norm.total, page: norm.page, limit: norm.limit });
        setError('');
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setListBusy(false);
      }
    },
    [apiBaseUrl, onUnauthorized, requestHeaders],
  );

  const fetchUsersPage = useCallback(
    async ({ q, page }) => {
      setListBusy(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_PAGE_LIMIT),
        });
        const trimmed = String(q ?? '').trim();
        if (trimmed) {
          params.set('q', trimmed);
        }
        const response = await fetch(`${apiBaseUrl}/api/admin/users?${params.toString()}`, {
          headers: requestHeaders,
        });
        const data = await parseJsonResponse(response);

        if (response.status === 401) {
          onUnauthorized?.();
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load users');
        }

        const norm = normalizePagedResponse(data);
        setUsers(norm.items);
        setUserPageMeta({ total: norm.total, page: norm.page, limit: norm.limit });
        setError('');
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setListBusy(false);
      }
    },
    [apiBaseUrl, onUnauthorized, requestHeaders],
  );

  useEffect(() => {
    setRoomSubmittedQuery('');
    fetchRoomsPage({ q: '', page: 1 });
  }, [fetchRoomsPage]);

  useEffect(() => {
    if (segment !== 'users' || !canManageUsers) {
      return;
    }
    fetchUsersPage({
      q: userSubmittedQueryRef.current,
      page: userPageRef.current,
    });
  }, [segment, canManageUsers, fetchUsersPage]);

  const handleRoomSearchSubmit = (event) => {
    event.preventDefault();
    const q = roomSearchInput.trim();
    setRoomSubmittedQuery(q);
    fetchRoomsPage({ q, page: 1 });
  };

  const goRoomPage = (_e, nextPage) => {
    fetchRoomsPage({ q: roomSubmittedQuery, page: nextPage });
  };

  const handleUserSearchSubmit = (event) => {
    event.preventDefault();
    const q = userSearchInput.trim();
    setUserSubmittedQuery(q);
    fetchUsersPage({ q, page: 1 });
  };

  const goUserPage = (_e, nextPage) => {
    fetchUsersPage({ q: userSubmittedQuery, page: nextPage });
  };

  const roomPages = computeTotalPages(roomPageMeta.total, roomPageMeta.limit);
  const userPages = computeTotalPages(userPageMeta.total, userPageMeta.limit);

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Delete room ${room.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/rooms/${room.id}`, {
        method: 'DELETE',
        headers: requestHeaders,
      });
      const data = await parseJsonResponse(response);

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete room');
      }

      await fetchRoomsPage({ q: roomSubmittedQuery, page: roomPageMeta.page });
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
        method: 'POST',
        headers: { ...requestHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await parseJsonResponse(response);

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setNewUsername('');
      setNewPassword('');
      setNewRole('mod');
      await fetchUsersPage({ q: userSubmittedQuery, page: 1 });
      setCreateUserOpen(false);
    } catch (createError) {
      setError(createError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.username}?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: requestHeaders,
      });
      const data = await parseJsonResponse(response);

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      await fetchUsersPage({ q: userSubmittedQuery, page: userPageMeta.page });
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  useEffect(() => {
    if (!canManageUsers && segment === 'users') {
      setSegment('rooms');
    }
  }, [canManageUsers, segment]);

  const subtitleChips = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography variant="caption" color="text.secondary">Đăng nhập</Typography>
      <Chip size="small" label={adminUser?.username || '—'} color="primary" variant="outlined" />
      <Chip size="small" label={adminUser?.role || '—'} variant="outlined" />
    </Stack>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <MainNavbar
        title="Admin"
        collapsedSubtitleHint={[adminUser?.username, adminUser?.role].filter(Boolean).join(' · ')}
        subtitle={subtitleChips}
        tabs={adminTabs}
        activeTab={segment}
        onTabChange={setSegment}
        mainClassName="admin-dashboard-layout"
        right={(
          <Button fullWidth variant="outlined" size="small" onClick={onLogout}>
            Đăng xuất
          </Button>
        )}
      >
        <Stack spacing={4}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {segment === 'rooms' ? (
            <Stack spacing={4} role="tabpanel">
              <SectionCard compactHeader title="Tìm kiếm phòng" subheader="Theo tên hoặc ID phòng">
                <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} onSubmit={handleRoomSearchSubmit}>
                  <TextField
                    label="Từ khóa"
                    id="admin-room-search"
                    type="search"
                    fullWidth
                    value={roomSearchInput}
                    onChange={(event) => setRoomSearchInput(event.target.value)}
                    placeholder="Theo tên hoặc ID phòng…"
                    autoComplete="off"
                    disabled={listBusy}
                  />
                  <Button type="submit" variant="contained" disabled={listBusy} sx={{ flexShrink: 0 }}>
                    Tìm kiếm
                  </Button>
                </Stack>
              </SectionCard>

              <SectionCard title="Danh sách phòng" subheader="Thao tác trên từng phòng" titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}>
                <DataTable sx={{ mt: 0 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên phòng</TableCell>
                      <TableCell>Room ID</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell><strong>{room.name}</strong></TableCell>
                        <TableCell><Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>{room.id}</Typography></TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                            <Button size="small" variant="outlined" onClick={() => onOpenRoom(room)}>
                              Vào phòng
                            </Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => handleDeleteRoom(room)}>
                              Xóa
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
                {rooms.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {roomPageMeta.total === 0 && !roomSubmittedQuery
                      ? 'Chưa có phòng.'
                      : 'Không có phòng trên trang này. Hãy tìm kiếm hoặc đổi trang.'}
                  </Typography>
                ) : null}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary">
                    Trang {roomPageMeta.page} / {roomPages}
                    {' · '}
                    {roomPageMeta.total} phòng
                  </Typography>
                  <Pagination
                    count={roomPages}
                    page={roomPageMeta.page}
                    onChange={goRoomPage}
                    disabled={listBusy}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Stack>
              </SectionCard>
            </Stack>
          ) : null}

          {segment === 'users' && canManageUsers ? (
            <Stack spacing={4} role="tabpanel">
              <SectionCard compactHeader title="Tìm kiếm người dùng" subheader="Username, role hoặc ID">
                <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} onSubmit={handleUserSearchSubmit}>
                  <TextField
                    label="Từ khóa"
                    id="admin-user-search"
                    type="search"
                    fullWidth
                    value={userSearchInput}
                    onChange={(event) => setUserSearchInput(event.target.value)}
                    placeholder="Theo username, role hoặc ID…"
                    autoComplete="off"
                    disabled={listBusy}
                  />
                  <Button type="submit" variant="contained" disabled={listBusy} sx={{ flexShrink: 0 }}>
                    Tìm kiếm
                  </Button>
                </Stack>
              </SectionCard>

              <SectionCard
                title="Danh sách người dùng"
                subheader="Tài khoản quản trị (mod / admin)"
                titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                headerAction={(
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateUserOpen(true)}
                    disabled={listBusy}
                  >
                    Tạo user
                  </Button>
                )}
              >
                <DataTable sx={{ mt: 0 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell><strong>{user.username}</strong></TableCell>
                        <TableCell><Chip size="small" label={user.role} color="success" variant="outlined" /></TableCell>
                        <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{user.id}</Typography></TableCell>
                        <TableCell align="right">
                          {user.id !== adminUser?.id ? (
                            <Button size="small" variant="outlined" color="error" onClick={() => handleDeleteUser(user)}>
                              Xóa
                            </Button>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
                {users.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {userPageMeta.total === 0 && !userSubmittedQuery
                      ? 'Chưa có user quản trị.'
                      : 'Không có user trên trang này. Hãy tìm kiếm hoặc đổi trang.'}
                  </Typography>
                ) : null}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary">
                    Trang {userPageMeta.page} / {userPages}
                    {' · '}
                    {userPageMeta.total} user
                  </Typography>
                  <Pagination
                    count={userPages}
                    page={userPageMeta.page}
                    onChange={goUserPage}
                    disabled={listBusy}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Stack>
              </SectionCard>
            </Stack>
          ) : null}
        </Stack>
      </MainNavbar>

      <Dialog
        open={createUserOpen}
        onClose={() => !isLoading && setCreateUserOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="create-user-dialog-title"
      >
        <form onSubmit={handleCreateUser}>
          <DialogTitle id="create-user-dialog-title">Tạo tài khoản quản trị</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Username" value={newUsername} onChange={(event) => setNewUsername(event.target.value)} disabled={isLoading} fullWidth autoFocus />
              <TextField label="Password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isLoading} fullWidth />
              <TextField select label="Role" value={newRole} onChange={(event) => setNewRole(event.target.value)} disabled={isLoading} fullWidth>
                <MenuItem value="mod">mod</MenuItem>
                <MenuItem value="admin">admin</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button type="button" onClick={() => !isLoading && setCreateUserOpen(false)} disabled={isLoading}>
              Hủy
            </Button>
            <Button type="submit" variant="contained" disabled={isLoading}>
              Tạo user
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AdminDashboardView;
