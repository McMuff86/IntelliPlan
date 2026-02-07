import type {
  CreatePendenzDTO,
  UpdatePendenzDTO,
  PendenzResponse,
  PendenzHistorieResponse,
  PendenzenListParams,
  PendenzenListResponse,
} from '../types';
import api from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export const pendenzService = {
  async listByProject(
    projectId: string,
    params?: PendenzenListParams
  ): Promise<PendenzenListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.bereich) queryParams.set('bereich', params.bereich);
    if (params?.verantwortlich) queryParams.set('verantwortlich', params.verantwortlich);
    if (params?.ueberfaellig) queryParams.set('ueberfaellig', 'true');
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));

    const qs = queryParams.toString();
    const url = `/projects/${projectId}/pendenzen${qs ? `?${qs}` : ''}`;
    const response = await api.get<PaginatedApiResponse<PendenzResponse>>(url);
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getById(id: string): Promise<PendenzResponse> {
    const response = await api.get<ApiResponse<PendenzResponse>>(`/pendenzen/${id}`);
    return response.data.data;
  },

  async createInProject(
    projectId: string,
    data: CreatePendenzDTO
  ): Promise<PendenzResponse> {
    const response = await api.post<ApiResponse<PendenzResponse>>(
      `/projects/${projectId}/pendenzen`,
      data
    );
    return response.data.data;
  },

  async update(id: string, data: UpdatePendenzDTO): Promise<PendenzResponse> {
    const response = await api.patch<ApiResponse<PendenzResponse>>(
      `/pendenzen/${id}`,
      data
    );
    return response.data.data;
  },

  async archive(id: string): Promise<void> {
    await api.delete(`/pendenzen/${id}`);
  },

  async getHistorie(id: string): Promise<PendenzHistorieResponse[]> {
    const response = await api.get<ApiResponse<PendenzHistorieResponse[]>>(
      `/pendenzen/${id}/historie`
    );
    return response.data.data;
  },

  async updateStatus(
    id: string,
    status: 'offen' | 'in_arbeit' | 'erledigt'
  ): Promise<PendenzResponse> {
    const data: UpdatePendenzDTO = { status };
    if (status === 'erledigt') {
      data.erledigtAm = new Date().toISOString().split('T')[0];
    }
    return pendenzService.update(id, data);
  },
};
