import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  InputBase,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popper,
  ClickAwayListener,
  CircularProgress,
  Divider,
  Fade,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TaskIcon from '@mui/icons-material/Assignment';
import { searchService } from '../../services/searchService';
import type { GlobalSearchResult } from '../../types';

export default function GlobalSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const data = await searchService.globalSearch(q.trim());
      setResults(data);
      const hasResults =
        data.appointments.length > 0 ||
        data.projects.length > 0 ||
        data.tasks.length > 0;
      setOpen(hasResults || q.trim().length > 0);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  const handleNavigate = (path: string) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    navigate(path);
  };

  const getFirstResultPath = (): string | null => {
    if (!results) return null;
    if (results.appointments.length > 0) return `/appointments/${results.appointments[0].id}`;
    if (results.projects.length > 0) return `/projects/${results.projects[0].id}`;
    if (results.tasks.length > 0) return `/tasks/${results.tasks[0].id}`;
    return null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Enter') {
      const firstPath = getFirstResultPath();
      if (firstPath) {
        handleNavigate(firstPath);
      }
    }
  };

  const totalResults = results
    ? results.appointments.length + results.projects.length + results.tasks.length
    : 0;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', flexGrow: 1, maxWidth: 480, mx: 2 }} ref={anchorRef}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            transition: 'background-color 0.2s',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.18)',
            },
            '&:focus-within': {
              bgcolor: 'rgba(255, 255, 255, 0.22)',
            },
          }}
        >
          <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 1 }} />
          <InputBase
            placeholder="Search appointments, projects, tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results && totalResults > 0) setOpen(true);
            }}
            sx={{
              color: 'inherit',
              flexGrow: 1,
              '& .MuiInputBase-input': {
                py: 0.75,
                fontSize: '0.875rem',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.5)',
                opacity: 1,
              },
            }}
          />
          {loading && <CircularProgress size={18} sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}
        </Box>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          transition
          sx={{ zIndex: 1300, width: anchorRef.current?.offsetWidth || 480 }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={200}>
              <Paper
                elevation={8}
                sx={{
                  mt: 1,
                  maxHeight: 400,
                  overflow: 'auto',
                  borderRadius: 2,
                }}
              >
                {totalResults === 0 && !loading && query.trim() && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No results found for &quot;{query}&quot;
                    </Typography>
                  </Box>
                )}

                {results && results.appointments.length > 0 && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', fontWeight: 600 }}
                    >
                      Appointments ({results.appointments.length})
                    </Typography>
                    <List dense disablePadding>
                      {results.appointments.map((apt) => (
                        <ListItemButton
                          key={apt.id}
                          onClick={() => handleNavigate(`/appointments/${apt.id}`)}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <EventIcon fontSize="small" color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={apt.title}
                            secondary={new Date(apt.startTime).toLocaleDateString()}
                            primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </>
                )}

                {results &&
                  results.appointments.length > 0 &&
                  (results.projects.length > 0 || results.tasks.length > 0) && <Divider />}

                {results && results.projects.length > 0 && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', fontWeight: 600 }}
                    >
                      Projects ({results.projects.length})
                    </Typography>
                    <List dense disablePadding>
                      {results.projects.map((proj) => (
                        <ListItemButton
                          key={proj.id}
                          onClick={() => handleNavigate(`/projects/${proj.id}`)}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <AccountTreeIcon fontSize="small" color="secondary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={proj.name}
                            secondary={proj.description || 'No description'}
                            primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                            secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </>
                )}

                {results &&
                  results.projects.length > 0 &&
                  results.tasks.length > 0 && <Divider />}

                {results && results.tasks.length > 0 && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', fontWeight: 600 }}
                    >
                      Tasks ({results.tasks.length})
                    </Typography>
                    <List dense disablePadding>
                      {results.tasks.map((task) => (
                        <ListItemButton
                          key={task.id}
                          onClick={() => handleNavigate(`/tasks/${task.id}`)}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <TaskIcon fontSize="small" color="action" />
                          </ListItemIcon>
                          <ListItemText
                            primary={task.title}
                            secondary={task.status}
                            primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </>
                )}
              </Paper>
            </Fade>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
