import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
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
import SearchIcon from '@mui/icons-material/Search';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MainNavbar from '../components/MainNavbar';
import DataTable from '../components/DataTable';
import SectionCard from '../components/SectionCard';
import { parseJsonResponse } from '../utils/parseJsonResponse';
import { normalizePagedResponse, totalPages as computeTotalPages } from '../utils/pagedList';
import { roomUserCount } from '../utils/roomMeta';
import {
  iconPrimaryFilled,
  iconPrimaryFilledDisabled,
  iconOutlinedSoft,
  tableActionOutlined,
  tableActionDanger,
  tableActionIconBox,
  tableActionCellInnerSx,
} from '../utils/iconSx';

const DEFAULT_PAGE_LIMIT = 20;

const primarySubmitIconSx = { ...iconPrimaryFilled, ...iconPrimaryFilledDisabled };

const PLACEHOLDER_ICON = { ...tableActionIconBox, visibility: 'hidden', pointerEvents: 'none' };

const AdminDashboardView = ({
  apiBaseUrl,
  authToken,
  adminUser,
  activeTab,
  onNavigateTab,
  onOpenRoom,
  onLogout,
  onUnauthorized,
  onAdminUserUpdated,
}) => {
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
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('mod');

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
    if (activeTab !== 'users' || !canManageUsers) {
      return;
    }
    fetchUsersPage({
      q: userSubmittedQueryRef.current,
      page: userPageRef.current,
    });
  }, [activeTab, canManageUsers, fetchUsersPage]);

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

  const openEditUser = (user) => {
    setEditUserId(user.id);
    setEditUsername(user.username);
    setEditPassword('');
    setEditRole(user.role);
    setEditUserOpen(true);
    setError('');
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!editUsername.trim()) {
      setError('Cần có username');
      return;
    }

    setIsLoading(true);

    try {
      const passwordChanged = Boolean(editPassword.trim());
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${editUserId}`, {
        method: 'PATCH',
        headers: { ...requestHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editUsername.trim(),
          password: editPassword,
          role: editRole,
        }),
      });
      const data = await parseJsonResponse(response);

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setEditUserOpen(false);
      setError('');

      if (passwordChanged && editUserId === adminUser?.id) {
        onLogout?.();
        return;
      }

      await fetchUsersPage({ q: userSubmittedQuery, page: userPageMeta.page });
      if (data.id === adminUser?.id) {
        onAdminUserUpdated?.(data);
      }
    } catch (updateError) {
      setError(updateError.message);
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
        activeTab={activeTab}
        onTabChange={onNavigateTab}
        mainClassName="admin-dashboard-layout"
        right={(
          <Tooltip title="Đăng xuất">
            <IconButton size="small" onClick={onLogout} aria-label="Đăng xuất" sx={{ ...iconOutlinedSoft, width: '100%', borderRadius: 1 }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      >
        <Stack spacing={4}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {activeTab === 'rooms' ? (
            <Stack spacing={4} role="tabpanel">
              <SectionCard compactHeader title="Tìm kiếm phòng" subheader="Theo tên phòng">
                <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" onSubmit={handleRoomSearchSubmit}>
                  <TextField
                    label="Từ khóa"
                    id="admin-room-search"
                    type="search"
                    size="small"
                    fullWidth
                    value={roomSearchInput}
                    onChange={(event) => setRoomSearchInput(event.target.value)}
                    placeholder="Theo tên phòng…"
                    autoComplete="off"
                    disabled={listBusy}
                  />
                  <Tooltip title="Tìm kiếm">
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <IconButton type="submit" size="small" disabled={listBusy} aria-label="Tìm kiếm" sx={{ ...primarySubmitIconSx, width: 40, height: 40 }}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </SectionCard>

              <SectionCard title="Danh sách phòng" subheader="Thao tác trên từng phòng" titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}>
                <DataTable sx={{ mt: 0 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1.5 }}>Tên phòng</TableCell>
                      <TableCell align="center" sx={{ py: 1.5, width: 88 }}>
                        Người tham gia
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5, width: 228 }}>
                        Thao tác
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id} hover>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.5 }}>
                          <strong>{room.name}</strong>
                        </TableCell>
                        <TableCell align="center" sx={{ verticalAlign: 'middle', py: 1.5, width: 88 }}>
                          <Typography variant="body2" fontWeight={600} component="span">
                            {roomUserCount(room)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.5, width: 228 }}>
                          <Box sx={tableActionCellInnerSx}>
                            <Tooltip title="Vào phòng">
                              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                <IconButton size="small" onClick={() => onOpenRoom(room)} aria-label="Vào phòng" sx={tableActionOutlined}>
                                  <MeetingRoomIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Tooltip>
                            <Tooltip title="Xóa phòng">
                              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                <IconButton size="small" color="error" onClick={() => handleDeleteRoom(room)} aria-label="Xóa phòng" sx={tableActionDanger}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Tooltip>
                          </Box>
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

          {activeTab === 'users' && canManageUsers ? (
            <Stack spacing={4} role="tabpanel">
              <SectionCard compactHeader title="Tìm kiếm người dùng" subheader="Username, role hoặc ID">
                <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" onSubmit={handleUserSearchSubmit}>
                  <TextField
                    label="Từ khóa"
                    id="admin-user-search"
                    type="search"
                    size="small"
                    fullWidth
                    value={userSearchInput}
                    onChange={(event) => setUserSearchInput(event.target.value)}
                    placeholder="Theo username, role hoặc ID…"
                    autoComplete="off"
                    disabled={listBusy}
                  />
                  <Tooltip title="Tìm kiếm">
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <IconButton type="submit" size="small" disabled={listBusy} aria-label="Tìm kiếm" sx={{ ...primarySubmitIconSx, width: 40, height: 40 }}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </SectionCard>

              <SectionCard
                title="Danh sách người dùng"
                subheader="Tài khoản quản trị (mod / admin)"
                titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                headerAction={(
                  <Tooltip title="Tạo user">
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => setCreateUserOpen(true)}
                        disabled={listBusy}
                        aria-label="Tạo user"
                        sx={{ ...primarySubmitIconSx, width: 36, height: 36 }}
                      >
                        <PersonAddIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              >
                <DataTable sx={{ mt: 0 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell align="center" sx={{ py: 1.5, width: 228 }}>Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell><strong>{user.username}</strong></TableCell>
                        <TableCell><Chip size="small" label={user.role} color="success" variant="outlined" /></TableCell>
                        <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{user.id}</Typography></TableCell>
                        <TableCell align="center" sx={{ py: 1.5, width: 228 }}>
                          <Box sx={tableActionCellInnerSx}>
                            <Tooltip title="Sửa">
                              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                <IconButton size="small" onClick={() => openEditUser(user)} aria-label="Sửa" sx={tableActionOutlined}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Tooltip>
                            {user.id !== adminUser?.id ? (
                              <Tooltip title="Xóa user">
                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteUser(user)} aria-label="Xóa user" sx={tableActionDanger}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Tooltip>
                            ) : (
                              <Box sx={PLACEHOLDER_ICON} aria-hidden />
                            )}
                          </Box>
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
            <Tooltip title="Hủy">
              <IconButton type="button" size="small" onClick={() => !isLoading && setCreateUserOpen(false)} disabled={isLoading} aria-label="Hủy" sx={iconOutlinedSoft}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Tạo user">
              <IconButton type="submit" size="small" disabled={isLoading} aria-label="Tạo user" sx={primarySubmitIconSx}>
                <PersonAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={editUserOpen}
        onClose={() => !isLoading && setEditUserOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="edit-user-dialog-title"
      >
        <form onSubmit={handleUpdateUser}>
          <DialogTitle id="edit-user-dialog-title">Sửa tài khoản quản trị</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Username"
                value={editUsername}
                onChange={(event) => setEditUsername(event.target.value)}
                disabled={isLoading}
                fullWidth
                autoFocus
              />
              <TextField
                label="Mật khẩu mới"
                type="password"
                value={editPassword}
                onChange={(event) => setEditPassword(event.target.value)}
                disabled={isLoading}
                fullWidth
                autoComplete="new-password"
                helperText="Để trống để giữ mật khẩu hiện tại. Nếu đổi mật khẩu tài khoản đang đăng nhập, bạn sẽ cần đăng nhập lại."
              />
              <TextField select label="Role" value={editRole} onChange={(event) => setEditRole(event.target.value)} disabled={isLoading} fullWidth>
                <MenuItem value="mod">mod</MenuItem>
                <MenuItem value="admin">admin</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Tooltip title="Hủy">
              <IconButton type="button" size="small" onClick={() => !isLoading && setEditUserOpen(false)} disabled={isLoading} aria-label="Hủy" sx={iconOutlinedSoft}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Lưu">
              <IconButton type="submit" size="small" disabled={isLoading} aria-label="Lưu" sx={primarySubmitIconSx}>
                <CheckIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AdminDashboardView;
