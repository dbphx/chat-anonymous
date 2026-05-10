import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
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
import { totalPages as computeTotalPages } from '../utils/pagedList';

const LobbyView = ({
  userName,
  draftUserName,
  setDraftUserName,
  onSetUserName,
  rooms,
  roomPageMeta,
  onFetchRoomsPage,
  onSelectRoom,
  newRoomName,
  setNewRoomName,
  newRoomSecret,
  setNewRoomSecret,
  onCreateRoom,
  userBusy,
  userError,
  onAdminLogin,
  onChangeName,
}) => {
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [roomSearchInput, setRoomSearchInput] = useState('');
  const [submittedRoomQuery, setSubmittedRoomQuery] = useState('');

  const handleRoomSearchSubmit = (event) => {
    event.preventDefault();
    const q = roomSearchInput.trim();
    setSubmittedRoomQuery(q);
    onFetchRoomsPage({ q, page: 1 });
  };

  const goRoomPage = (_e, nextPage) => {
    onFetchRoomsPage({ q: submittedRoomQuery, page: nextPage });
  };

  const roomPages = computeTotalPages(roomPageMeta.total, roomPageMeta.limit);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <MainNavbar
        title="Anonymous Chat"
        subtitle={userName ? `Xin chào, ${userName}` : 'Đăng nhập tên để tiếp tục'}
        tabs={[]}
        activeTab="rooms"
        onTabChange={() => {}}
        mainClassName="lobby-layout"
        right={(
          <Button fullWidth variant="outlined" size="small" onClick={onAdminLogin}>
            Admin
          </Button>
        )}
      >
        <Stack spacing={4}>
          {userError ? <Alert severity="error">{userError}</Alert> : null}

          {!userName ? (
            <SectionCard title="Đăng nhập" subheader="Nhập tên hiển thị để vào lobby">
              <Stack component="form" spacing={2} onSubmit={onSetUserName}>
                <TextField
                  fullWidth
                  label="Tên hiển thị"
                  value={draftUserName}
                  onChange={(event) => setDraftUserName(event.target.value)}
                  placeholder="Nhập tên hiển thị"
                />
                <Button type="submit" variant="contained">Tiếp tục</Button>
              </Stack>
            </SectionCard>
          ) : null}

          {userName ? (
            <SectionCard title="Phiên làm việc" subheader="Thông tin người dùng hiện tại">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                <Typography variant="body1">
                  <strong>Người dùng:</strong> {userName}
                </Typography>
                <Button variant="outlined" size="small" onClick={onChangeName}>
                  Đổi tên
                </Button>
              </Stack>
            </SectionCard>
          ) : null}

          {userName ? (
            <Stack spacing={4} role="tabpanel" aria-labelledby="lobby-rooms">
              <SectionCard compactHeader title="Tìm kiếm phòng" subheader="Theo tên hoặc ID phòng">
                <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} onSubmit={handleRoomSearchSubmit}>
                  <TextField
                    label="Từ khóa"
                    id="lobby-room-search"
                    type="search"
                    fullWidth
                    value={roomSearchInput}
                    onChange={(event) => setRoomSearchInput(event.target.value)}
                    placeholder="Theo tên hoặc ID phòng…"
                    autoComplete="off"
                    disabled={userBusy}
                  />
                  <Button type="submit" variant="contained" disabled={userBusy} sx={{ flexShrink: 0 }}>
                    Tìm kiếm
                  </Button>
                </Stack>
              </SectionCard>

              <SectionCard
                id="lobby-rooms"
                title="Danh sách phòng"
                subheader="Chọn phòng để vào chat"
                titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                headerAction={(
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateRoomOpen(true)}
                    disabled={userBusy}
                  >
                    Tạo phòng
                  </Button>
                )}
              >
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
                          <Button size="small" variant="contained" onClick={() => onSelectRoom(room)}>
                            Vào phòng
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
                {rooms.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Không có phòng trên trang này. Hãy tìm kiếm hoặc đổi trang.
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
                    disabled={userBusy}
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
        open={createRoomOpen}
        onClose={() => !userBusy && setCreateRoomOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="create-room-dialog-title"
      >
        <form onSubmit={onCreateRoom}>
          <DialogTitle id="create-room-dialog-title">Tạo phòng</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Tên phòng"
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                disabled={userBusy}
                fullWidth
                autoFocus
              />
              <TextField
                label="Mật khẩu phòng"
                type="password"
                value={newRoomSecret}
                onChange={(event) => setNewRoomSecret(event.target.value)}
                disabled={userBusy}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button type="button" onClick={() => !userBusy && setCreateRoomOpen(false)} disabled={userBusy}>
              Hủy
            </Button>
            <Button type="submit" variant="contained" disabled={userBusy}>
              Tạo phòng
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default LobbyView;
