import { Typography, Box, Paper } from '@mui/material';

const Home = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to IntelliPlan
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Your intelligent calendar and scheduling application.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Home;
