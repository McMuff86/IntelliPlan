import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, Button, Stack, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ListIcon from '@mui/icons-material/List';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import TimelineIcon from '@mui/icons-material/Timeline';

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        background: 'var(--ip-surface-elevated)',
        border: '1px solid var(--ip-outline)',
        boxShadow: 'var(--ip-shadow)',
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'rgba(15, 118, 110, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
            }}
          >
            <FlashOnIcon />
          </Box>
        }
        title="Quick Actions"
        subheader="Jump into your most used actions"
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        <Stack spacing={2}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/appointments/new')}
            fullWidth
            sx={{ justifyContent: 'flex-start' }}
          >
            New Appointment
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<CalendarMonthIcon />}
            onClick={() => navigate('/appointments/calendar')}
            fullWidth
            sx={{ justifyContent: 'flex-start', borderWidth: 2 }}
          >
            View Calendar
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ListIcon />}
            onClick={() => navigate('/appointments/list')}
            fullWidth
            sx={{ justifyContent: 'flex-start', borderWidth: 2 }}
          >
            View List
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<TimelineIcon />}
            onClick={() => navigate('/projects?view=calendar')}
            fullWidth
            sx={{ justifyContent: 'flex-start', borderWidth: 2 }}
          >
            Project Calendar
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
