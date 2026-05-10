import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import { roomUserCount } from '../utils/roomMeta';

const ChatRoomSidebar = ({
  rooms,
  currentRoomId,
  onRoomClick,
  loading,
  title = 'Phòng có sẵn',
}) => {
  const safeRooms = Array.isArray(rooms) ? rooms : [];

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, pt: 2, pb: 1.25 }}>
        <MeetingRoomIcon sx={{ fontSize: '1.15rem', color: 'primary.main' }} aria-hidden />
        <Typography variant="subtitle2" fontWeight={800} color="primary.dark" sx={{ letterSpacing: 0.02 }}>
          {title}
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {!loading && safeRooms.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
          Không có phòng nào.
        </Typography>
      ) : null}

      <List dense disablePadding sx={{ flex: 1, overflow: 'auto', px: 1, pb: 2 }}>
        {safeRooms.map((room) => {
          const selected = room?.id === currentRoomId;
          const uc = roomUserCount(room);
          return (
            <ListItemButton
              key={room.id}
              selected={selected}
              onClick={() => onRoomClick(room)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiTypography-root': { color: 'inherit' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ListItemText
                primary={room.name || room.id}
                secondary={uc > 0 ? `${uc} người (ước lượng)` : 'Chưa có tin'}
                primaryTypographyProps={{ noWrap: true, variant: 'body2', fontWeight: selected ? 700 : 600 }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: {
                    opacity: selected ? 0.85 : 1,
                    color: selected ? 'inherit' : 'text.secondary',
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
};

export default ChatRoomSidebar;
