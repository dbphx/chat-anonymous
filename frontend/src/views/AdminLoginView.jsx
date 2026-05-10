import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import SectionCard from '../components/SectionCard';

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
            <Button variant="outlined" size="small" onClick={onBackHome} disabled={isLoading}>
              Về trang chủ
            </Button>
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
              <Button type="submit" variant="contained" size="large" disabled={isLoading}>
                Đăng nhập
              </Button>
            </Stack>
          </Stack>
        </SectionCard>
      </Container>
    </Box>
  );
};

export default AdminLoginView;
