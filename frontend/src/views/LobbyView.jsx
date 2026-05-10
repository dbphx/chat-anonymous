import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LoginIcon from '@mui/icons-material/Login';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import CloseIcon from '@mui/icons-material/Close';
import MainNavbar from '../components/MainNavbar';
import DataTable from '../components/DataTable';
import SectionCard from '../components/SectionCard';
import { totalPages as computeTotalPages } from '../utils/pagedList';
import { roomUserCount } from '../utils/roomMeta';
import { iconPrimaryFilled, iconPrimaryFilledDisabled, iconOutlinedSoft, tableActionPrimary, tableActionCellInnerSx } from '../utils/iconSx';

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
  onOpenEditUserName,
  onClearUserSession,
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
          <Tooltip title="Admin">
            <Button fullWidth variant="outlined" size="small" onClick={onAdminLogin} aria-label="Admin">
              <AdminPanelSettingsIcon fontSize="small" />
            </Button>
          </Tooltip>
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
                <Tooltip title="Tiếp tục">
                  <Button
                    type="submit"
                    variant="contained"
                    aria-label="Tiếp tục"
                    sx={{ minWidth: 48, minHeight: 44, px: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <LoginIcon />
                  </Button>
                </Tooltip>
              </Stack>
            </SectionCard>
          ) : null}

          {userName ? (
            <SectionCard title="Phiên làm việc" subheader="Thông tin người dùng hiện tại">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Typography variant="body1" sx={{ minWidth: 0 }}>
                  <strong>Người dùng:</strong> {userName}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Tooltip title="Sửa tên">
                    <IconButton size="small" onClick={onOpenEditUserName} aria-label="Sửa tên" sx={iconOutlinedSoft}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Thoát phiên">
                    <IconButton size="small" color="inherit" onClick={onClearUserSession} aria-label="Thoát phiên">
                      <LogoutIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </SectionCard>
          ) : null}

          {userName ? (
            <Stack spacing={4} role="tabpanel" aria-labelledby="lobby-rooms">
              <SectionCard compactHeader title="Tìm kiếm phòng" subheader="Theo tên phòng">
                <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" onSubmit={handleRoomSearchSubmit}>
                  <TextField
                    label="Từ khóa"
                    id="lobby-room-search"
                    type="search"
                    size="small"
                    fullWidth
                    value={roomSearchInput}
                    onChange={(event) => setRoomSearchInput(event.target.value)}
                    placeholder="Theo tên phòng…"
                    autoComplete="off"
                    disabled={userBusy}
                  />
                  <Tooltip title="Tìm kiếm">
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <IconButton
                        type="submit"
                        color="primary"
                        disabled={userBusy}
                        aria-label="Tìm kiếm"
                        size="small"
                        sx={{ ...iconPrimaryFilled, ...iconPrimaryFilledDisabled, width: 40, height: 40 }}
                      >
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </SectionCard>

              <SectionCard
                id="lobby-rooms"
                title="Danh sách phòng"
                subheader="Chọn phòng để vào chat"
                titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                headerAction={(
                  <Tooltip title="Tạo phòng">
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => setCreateRoomOpen(true)}
                        disabled={userBusy}
                        aria-label="Tạo phòng"
                        sx={{ ...iconPrimaryFilled, width: 36, height: 36 }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              >
                <DataTable sx={{ mt: 0 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1.5 }}>Tên phòng</TableCell>
                      <TableCell align="center" sx={{ py: 1.5, width: 88 }}>
                        Người tham gia
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5, width: 148 }}>
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
                        <TableCell align="center" sx={{ py: 1.5, width: 148 }}>
                          <Box sx={tableActionCellInnerSx}>
                            <Tooltip title="Vào phòng">
                              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => onSelectRoom(room)}
                                  aria-label="Vào phòng"
                                  sx={tableActionPrimary}
                                >
                                  <MeetingRoomIcon fontSize="small" />
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
            <Tooltip title="Hủy">
              <IconButton type="button" size="small" onClick={() => !userBusy && setCreateRoomOpen(false)} disabled={userBusy} aria-label="Hủy" sx={iconOutlinedSoft}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Tạo phòng">
              <IconButton type="submit" color="primary" size="small" disabled={userBusy} aria-label="Tạo phòng" sx={{ ...iconPrimaryFilled, ...iconPrimaryFilledDisabled }}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default LobbyView;
