import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import MainNavbar from '../components/MainNavbar';
import SectionCard from '../components/SectionCard';
import { roomUserCount } from '../utils/roomMeta';
import ViewListIcon from '@mui/icons-material/ViewList';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import { iconPrimaryFilled, iconPrimaryFilledDisabled, iconOutlinedSoft } from '../utils/iconSx';

const RoomAccessView = ({
  userName,
  selectedRoom,
  joinSecret,
  setJoinSecret,
  userBusy,
  userError,
  onJoinRoom,
  onBackToLobby,
  onOpenEditUserName,
  onAdminLogin,
}) => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <MainNavbar
      title={selectedRoom ? `Phòng: ${selectedRoom.name}` : 'Phòng'}
      subtitle={userName ? (
        <Typography component="span" variant="body2" color="text.secondary">
          Người dùng hiện tại: <strong>{userName}</strong>
        </Typography>
      ) : null}
      mainClassName="lobby-layout"
      right={(
        <Stack spacing={1} width="100%">
          <Tooltip title="Về danh sách">
            <Button fullWidth variant="outlined" size="small" onClick={onBackToLobby} aria-label="Về danh sách">
              <ViewListIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Admin">
            <Button fullWidth variant="outlined" size="small" onClick={onAdminLogin} aria-label="Admin">
              <AdminPanelSettingsIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Stack>
      )}
    >
      <Stack spacing={4}>
        {userError ? <Alert severity="error">{userError}</Alert> : null}

        <SectionCard title="Phiên làm việc" subheader="Người dùng đang dùng để vào phòng">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Typography variant="body1">
              <strong>Người dùng:</strong> {userName}
            </Typography>
            <Tooltip title="Sửa tên">
              <IconButton size="small" onClick={onOpenEditUserName} aria-label="Sửa tên" sx={iconOutlinedSoft}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </SectionCard>

        <SectionCard title="Vào phòng" subheader="Nhập mật khẩu phòng để mở chat">
          <Stack component="form" spacing={2} onSubmit={onJoinRoom}>
            {selectedRoom ? (
              <Stack spacing={0.5} sx={{ pb: 1 }}>
                <Typography variant="body2">
                  <strong>Phòng:</strong> {selectedRoom.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Người tham gia (đã có tin nhắn):{' '}
                  <strong>{roomUserCount(selectedRoom)}</strong>
                </Typography>
              </Stack>
            ) : null}
            <TextField
              label="Mật khẩu phòng"
              type="password"
              size="small"
              fullWidth
              value={joinSecret}
              onChange={(event) => setJoinSecret(event.target.value)}
              disabled={userBusy}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Tooltip title="Quay lại">
                <Button type="button" variant="outlined" size="small" onClick={onBackToLobby} disabled={userBusy} fullWidth aria-label="Quay lại" sx={{ minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowBackIcon fontSize="small" />
                </Button>
              </Tooltip>
              <Tooltip title="Vào chat">
                <Button type="submit" variant="contained" size="small" disabled={userBusy} fullWidth sx={{ ...iconPrimaryFilled, ...iconPrimaryFilledDisabled, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Vào chat">
                  <ChatIcon fontSize="small" />
                </Button>
              </Tooltip>
            </Stack>
          </Stack>
        </SectionCard>
      </Stack>
    </MainNavbar>
  </Box>
);

export default RoomAccessView;
