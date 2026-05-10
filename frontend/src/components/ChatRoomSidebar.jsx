import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { formatShortRelativeTime } from '../utils/roomMeta';

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
      <Box sx={{ px: 2, pt: 2, pb: 1.25, textAlign: 'left' }}>
        <Typography variant="subtitle2" fontWeight={800} color="primary.dark" sx={{ letterSpacing: 0.02 }}>
          {title}
        </Typography>
      </Box>

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

      <List dense={false} disablePadding sx={{ flex: 1, overflow: 'auto', px: 0, pb: 2 }}>
        {safeRooms.map((room) => {
          const selected = room?.id === currentRoomId;
          const last = room?.last_message;
          const rel = last?.created ? formatShortRelativeTime(last.created) : '';
          const metaLine = last
            ? [`Tin nhắn của ${last.user || '?'}`, rel].filter(Boolean).join(' · ')
            : '';

          const secondary = (
            <Box>
              {last ? (
                <Typography
                  component="div"
                  variant="body2"
                  noWrap
                  sx={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.35,
                    fontWeight: 400,
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    opacity: selected ? 0.95 : 0.92,
                    color: selected ? 'inherit' : 'text.primary',
                  }}
                >
                  {last.preview || '…'}
                </Typography>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.8125rem',
                    textAlign: 'left',
                    opacity: selected ? 0.9 : 0.75,
                    color: selected ? 'inherit' : 'text.secondary',
                  }}
                >
                  Chưa có tin
                </Typography>
              )}
              {metaLine ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.35,
                    fontSize: '0.7rem',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    opacity: selected ? 0.82 : 0.62,
                    color: selected ? 'inherit' : 'text.secondary',
                  }}
                >
                  {metaLine}
                </Typography>
              ) : null}
            </Box>
          );

          return (
            <ListItemButton
              key={room.id}
              selected={selected}
              onClick={() => onRoomClick(room)}
              alignItems="stretch"
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderRadius: 0,
                mb: 0,
                py: 1.15,
                px: 2,
                flexDirection: 'column',
                gap: 0,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-of-type': { borderBottom: 'none' },
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderColor: 'primary.dark',
                  '& .MuiTypography-root': { color: 'inherit' },
                  '& .MuiSvgIcon-root': { color: 'inherit' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '24px minmax(0, 1fr)',
                  columnGap: 1,
                  rowGap: 0.45,
                  alignItems: 'center',
                  justifyItems: 'start',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <Box
                  sx={{
                    gridColumn: 1,
                    gridRow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: 24,
                    height: 24,
                    alignSelf: 'center',
                  }}
                >
                  <ForumOutlinedIcon
                    sx={{
                      fontSize: 20,
                      display: 'block',
                      color: selected ? 'inherit' : 'primary.main',
                    }}
                    aria-hidden
                  />
                </Box>
                <Typography
                  component="div"
                  title={String(room.name || room.id)}
                  sx={{
                    gridColumn: 2,
                    gridRow: 1,
                    minWidth: 0,
                    maxWidth: '100%',
                    fontWeight: 900,
                    fontSize: '1.125rem',
                    lineHeight: 1.3,
                    letterSpacing: '-0.02em',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {room.name || room.id}
                </Typography>
                <Box
                  sx={{
                    gridColumn: 2,
                    gridRow: 2,
                    minWidth: 0,
                    maxWidth: '100%',
                    textAlign: 'left',
                  }}
                >
                  {secondary}
                </Box>
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
};

export default ChatRoomSidebar;
