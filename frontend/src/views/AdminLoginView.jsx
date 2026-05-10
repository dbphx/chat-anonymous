import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import SectionCard from '../components/SectionCard';
import HomeIcon from '@mui/icons-material/Home';
import LoginIcon from '@mui/icons-material/Login';
import { iconPrimaryFilled, iconPrimaryFilledDisabled } from '../utils/iconSx';

const AdminLoginView = ({ onLogin, onBackHome, isLoading, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onLogin({ username, password });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Container maxWidth="sm">
        <SectionCard
          title="Đăng nhập quản trị"
          subheader="Đăng nhập bằng tài khoản admin để quản lý phòng, người dùng và tin nhắn."
          titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
          headerAction={typeof onBackHome === 'function' ? (
            <Tooltip title="Về trang chủ">
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <IconButton variant="outlined" size="small" onClick={onBackHome} disabled={isLoading} aria-label="Về trang chủ">
                  <HomeIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        >
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField
                label="Tên đăng nhập"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={isLoading}
                fullWidth
              />
              <TextField
                label="Mật khẩu"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
                fullWidth
              />
              <Tooltip title="Đăng nhập">
                <IconButton
                  type="submit"
                  disabled={isLoading}
                  aria-label="Đăng nhập"
                  size="small"
                  sx={{ ...iconPrimaryFilled, ...iconPrimaryFilledDisabled, width: 44, height: 44 }}
                >
                  <LoginIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </SectionCard>
      </Container>
    </Box>
  );
};

export default AdminLoginView;
