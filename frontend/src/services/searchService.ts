import type {
  Appointment,
  Project,
  Task,
  SearchAppointmentsParams,
  SearchProjectsParams,
  SearchTasksParams,
  GlobalSearchResult,
} from '../types';
import api from './api';

interface SearchAppointmentsResponse {
  success: boolean;
  data: {
    appointments: Appointment[];
    total: number;
    page: number;
    totalPages: number;
  };
}

interface SearchProjectsResponse {
  success: boolean;
  data: {
    projects: Project[];
    total: number;
    page: number;
    totalPages: number;
  };
}

interface SearchTasksResponse {
  success: boolean;
  data: {
    tasks: Task[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export const searchService = {
  async searchAppointments(params: SearchAppointmentsParams) {
    const response = await api.get<SearchAppointmentsResponse>('/appointments/search', { params });
    return response.data.data;
  },

  async searchProjects(params: SearchProjectsParams) {
    const response = await api.get<SearchProjectsResponse>('/projects/search', { params });
    return response.data.data;
  },

  async searchTasks(params: SearchTasksParams) {
    const response = await api.get<SearchTasksResponse>('/tasks/search', { params });
    return response.data.data;
  },

  async globalSearch(q: string, limit = 5): Promise<GlobalSearchResult> {
    const [appointmentsRes, projectsRes, tasksRes] = await Promise.allSettled([
      searchService.searchAppointments({ q, limit }),
      searchService.searchProjects({ q, limit }),
      searchService.searchTasks({ q, limit }),
    ]);

    return {
      appointments: appointmentsRes.status === 'fulfilled' ? appointmentsRes.value.appointments : [],
      projects: projectsRes.status === 'fulfilled' ? projectsRes.value.projects : [],
      tasks: tasksRes.status === 'fulfilled' ? tasksRes.value.tasks : [],
    };
  },
};
