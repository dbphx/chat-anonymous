import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';

const STORAGE_KEY = 'chat-anonymous:side-nav-collapsed';
const DRAWER_EXPANDED = 260;
const DRAWER_COLLAPSED = 76;

function readCollapsed() {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const MainNavbar = ({
  title,
  subtitle,
  collapsedSubtitleHint,
  tabs,
  activeTab,
  onTabChange,
  right,
  children,
  mainClassName = '',
}) => {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [collapsed]);

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED;
  const collapsedHint = collapsedSubtitleHint || (typeof subtitle === 'string' ? subtitle : '');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box
          sx={{
            px: collapsed ? 1 : 2,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          {!collapsed ? (
            <>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary' }}>
                {title}
              </Typography>
              {subtitle ? (
                typeof subtitle === 'string' ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {subtitle}
                  </Typography>
                ) : (
                  <Box sx={{ mt: 0.5 }}>{subtitle}</Box>
                )
              ) : null}
            </>
          ) : (
            <Tooltip title={[title, collapsedHint].filter(Boolean).join(' — ')}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  textAlign: 'center',
                  letterSpacing: 0.5,
                  cursor: 'default',
                }}
              >
                {(title || '·').replace(/\s+/g, '').slice(0, 2).toUpperCase()}
              </Typography>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          {tabs?.length ? (
            <List component="nav" aria-label="Mục chính" sx={{ px: 0.5 }}>
              {tabs.map((tab) => (
                <Tooltip key={tab.id} title={collapsed ? tab.label : ''} placement="right">
                  <ListItemButton
                    selected={activeTab === tab.id}
                    onClick={() => onTabChange(tab.id)}
                    id={`tab-${tab.id}`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: collapsed ? 1 : 2,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed ? 0 : 40,
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} aria-hidden>
                        {tab.shortLabel || tab.label.slice(0, 2)}
                      </Typography>
                    </ListItemIcon>
                    {!collapsed ? <ListItemText primary={tab.label} /> : null}
                  </ListItemButton>
                </Tooltip>
              ))}
            </List>
          ) : null}
        </Box>

        {right ? (
          <Box
            sx={{
              px: 1,
              py: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              alignItems: 'stretch',
              justifyContent: 'center',
              '& .MuiButton-root': collapsed ? { minWidth: 0, px: 1 } : {},
              '& .MuiButton-root, & .MuiIconButton-root': {
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 36,
              },
            }}
          >
            {right}
          </Box>
        ) : null}

        <Box
          sx={{
            p: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <IconButton
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            size="small"
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Box>
      </Drawer>

      <Box
        component="main"
        className={mainClassName}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, sm: 3.5 },
          maxWidth: { lg: 1200 },
          mx: { lg: 'auto' },
          width: '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainNavbar;
