import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import MainNavbar from '../components/MainNavbar';
import SectionCard from '../components/SectionCard';

const RoomAccessView = ({
  userName,
  selectedRoom,
  joinSecret,
  setJoinSecret,
  userBusy,
  userError,
  onJoinRoom,
  onBackToLobby,
  onChangeName,
  onAdminLogin,
}) => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <MainNavbar
      title={selectedRoom ? `Phòng: ${selectedRoom.name}` : 'Phòng'}
      subtitle={selectedRoom ? (
        <Typography component="span" variant="body2">
          Room ID:{' '}
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
            {selectedRoom.id}
          </Typography>
        </Typography>
      ) : null}
      mainClassName="lobby-layout"
      right={(
        <Stack spacing={1} width="100%">
          <Button fullWidth variant="outlined" size="small" onClick={onBackToLobby}>
            Về danh sách
          </Button>
          <Button fullWidth variant="outlined" size="small" onClick={onAdminLogin}>
            Admin
          </Button>
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
            <Button variant="outlined" size="small" onClick={onChangeName}>
              Đổi tên
            </Button>
          </Stack>
        </SectionCard>

        <SectionCard title="Vào phòng" subheader="Nhập mật khẩu phòng để mở chat">
          <Stack component="form" spacing={2} onSubmit={onJoinRoom}>
            {selectedRoom ? (
              <Stack spacing={0.5} sx={{ pb: 1 }}>
                <Typography variant="body2"><strong>Phòng:</strong> {selectedRoom.name}</Typography>
                <Typography variant="body2">
                  <strong>Room ID:</strong>{' '}
                  <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedRoom.id}
                  </Typography>
                </Typography>
              </Stack>
            ) : null}
            <TextField
              label="Mật khẩu phòng"
              type="password"
              fullWidth
              value={joinSecret}
              onChange={(event) => setJoinSecret(event.target.value)}
              disabled={userBusy}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button type="button" variant="outlined" onClick={onBackToLobby} disabled={userBusy} fullWidth>
                Quay lại
              </Button>
              <Button type="submit" variant="contained" disabled={userBusy} fullWidth>
                Vào chat
              </Button>
            </Stack>
          </Stack>
        </SectionCard>
      </Stack>
    </MainNavbar>
  </Box>
);

export default RoomAccessView;
