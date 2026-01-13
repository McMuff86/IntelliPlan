export interface Appointment {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'single' | 'team';
  teamId?: string;
  timezone: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}
