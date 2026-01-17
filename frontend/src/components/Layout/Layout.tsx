import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
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
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SettingsIcon from '@mui/icons-material/Settings';
import { useHotkeys } from '../../hooks/useHotkeys';
import KeyboardShortcutsHelp from '../KeyboardShortcutsHelp';

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
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

const Layout = ({ children }: LayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem('token')));
  const navigate = useNavigate();

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

  useEffect(() => {
    const handleStorage = () => {
      setIsAuthenticated(Boolean(localStorage.getItem('token')));
    };
    const handleAuthChange = () => {
      setIsAuthenticated(Boolean(localStorage.getItem('token')));
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleAuthClick = () => {
    if (isAuthenticated) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      setIsAuthenticated(false);
      window.dispatchEvent(new Event('auth-change'));
      navigate('/');
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
              <SettingsIcon />
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
          <Container maxWidth="lg" disableGutters sx={{ display: 'flex', alignItems: 'center' }}>
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
              <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
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
            {!isMobile && (
              <Button
                color="inherit"
                variant="outlined"
                onClick={handleAuthClick}
                sx={{ borderColor: 'rgba(255, 255, 255, 0.35)' }}
              >
                {isAuthenticated ? 'Sign Out' : 'Sign In'}
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
        maxWidth="lg"
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
        <Container maxWidth="lg">
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


