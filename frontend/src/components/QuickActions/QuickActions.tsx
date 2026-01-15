import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ListIcon from '@mui/icons-material/List';
import FlashOnIcon from '@mui/icons-material/FlashOn';

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader
        avatar={<FlashOnIcon color="primary" />}
        title="Quick Actions"
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
            sx={{ justifyContent: 'flex-start' }}
          >
            View Calendar
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ListIcon />}
            onClick={() => navigate('/appointments/list')}
            fullWidth
            sx={{ justifyContent: 'flex-start' }}
          >
            View List
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
