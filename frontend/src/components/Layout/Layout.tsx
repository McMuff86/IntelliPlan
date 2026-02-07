import type { ReactNode } from 'react';
import { useState } from 'react';
import { NavLink, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SettingsIcon from '@mui/icons-material/Settings';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import { useHotkeys } from '../../hooks/useHotkeys';
import KeyboardShortcutsHelp from '../KeyboardShortcutsHelp';
import GlobalSearchBar from '../GlobalSearchBar';
import { useLayoutPreference } from '../../hooks/useLayoutPreference';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: <HomeIcon /> },
  { label: 'Appointments', path: '/appointments', icon: <EventIcon /> },
  { label: 'Projects', path: '/projects', icon: <AccountTreeIcon /> },
  { label: 'Wochenplan', path: '/wochenplan', icon: <ViewWeekIcon /> },
  { label: 'Kapazität', path: '/capacity', icon: <AssessmentIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

const Layout = ({ children }: LayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const { layout } = useLayoutPreference();
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState<null | HTMLElement>(null);
  const containerWidth = layout === 'wide' ? 'xl' : 'lg';

  useHotkeys([
    { key: 'n', handler: () => navigate('/appointments/new') },
    { key: '?', shiftKey: true, handler: () => setShortcutsHelpOpen(true) },
    { key: 'Escape', handler: () => setShortcutsHelpOpen(false), disabled: !shortcutsHelpOpen },
  ]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleAuthClick = async () => {
    if (isAuthenticated) {
      await logout();
    } else {
      navigate('/auth');
    }
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => handleNavClick(item.path)}
              sx={{
                '&.active': {
                  bgcolor: 'action.selected',
                },
              }}
              component={NavLink}
              to={item.path}
              end={item.path === '/'}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={handleAuthClick}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary={isAuthenticated ? 'Sign Out' : 'Sign In'} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 64, md: 72 } }}>
          <Container maxWidth={containerWidth} disableGutters sx={{ display: 'flex', alignItems: 'center' }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open menu"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box
              onClick={handleLogoClick}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                mr: 4,
                gap: 1,
              }}
            >
              <CalendarMonthIcon />
              <Typography variant="h6" component="div">
                IntelliPlan
              </Typography>
            </Box>
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                    end={item.path === '/'}
                    color="inherit"
                    startIcon={item.icon}
                    sx={{
                      borderRadius: 999,
                      px: 2,
                      '&.active': {
                        bgcolor: 'rgba(255, 255, 255, 0.16)',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}
            {!isMobile && isAuthenticated && <GlobalSearchBar />}
            {!isMobile && !isAuthenticated && <Box sx={{ flexGrow: 1 }} />}
            {!isMobile && isAuthenticated && (
              <>
                <IconButton
                  onClick={(e) => setAvatarMenuAnchor(e.currentTarget)}
                  sx={{ ml: 1 }}
                  aria-label="Account menu"
                >
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: 'rgba(255,255,255,0.24)',
                      color: 'inherit',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                    }}
                  >
                    {user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={avatarMenuAnchor}
                  open={Boolean(avatarMenuAnchor)}
                  onClose={() => setAvatarMenuAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem disabled sx={{ opacity: '1 !important' }}>
                    <Typography variant="body2" fontWeight={600}>
                      {user?.name}
                    </Typography>
                  </MenuItem>
                  <MenuItem disabled sx={{ opacity: '0.7 !important', mt: -0.5 }}>
                    <Typography variant="caption">{user?.email}</Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setAvatarMenuAnchor(null);
                      navigate('/settings');
                    }}
                  >
                    <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                    Settings
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setAvatarMenuAnchor(null);
                      handleAuthClick();
                    }}
                  >
                    <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            )}
            {!isMobile && !isAuthenticated && (
              <Button
                color="inherit"
                variant="outlined"
                onClick={handleAuthClick}
                sx={{ borderColor: 'rgba(255, 255, 255, 0.35)' }}
              >
                Sign In
              </Button>
            )}
          </Container>
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>
      <Container
        component="main"
        maxWidth={containerWidth}
        sx={{ flexGrow: 1, py: { xs: 3, md: 4 }, animation: 'ip-fade-up 0.4s ease both' }}
      >
        {children}
      </Container>
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          bgcolor: 'var(--ip-surface-elevated)',
          borderTop: '1px solid var(--ip-outline)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Container maxWidth={containerWidth}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'center', sm: 'flex-start' },
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                component={RouterLink}
                to="/projects"
                color="inherit"
                size="small"
              >
                Projects
              </Button>
              <Button
                component={RouterLink}
                to="/appointments"
                color="inherit"
                size="small"
              >
                Appointments
              </Button>
              <Button
                component={RouterLink}
                to="/appointments/calendar"
                color="inherit"
                size="small"
              >
                Calendar
              </Button>
              <Button
                component={RouterLink}
                to="/settings"
                color="inherit"
                size="small"
              >
                Settings
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              (c) {new Date().getFullYear()} IntelliPlan. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
      <KeyboardShortcutsHelp
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />
    </Box>
  );
};

export default Layout;


