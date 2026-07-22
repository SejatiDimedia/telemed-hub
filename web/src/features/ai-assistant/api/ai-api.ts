import { apiClient } from '@/lib/api-client';
import type {
  AISession,
  CreateSessionResponse,
  PostMessageRequest,
  TriageResponse,
} from '../types';

export const aiApi = {
  listSessions: async (
    page: number = 1,
    limit: number = 20
  ): Promise<AISession[]> => {
    // API client extracts the 'data' field from the response envelope.
    // For pagination we can use apiClient.getWithPagination, but for now we just return the array.
    const query = new URLSearchParams({ page: page.toString(), page_size: limit.toString() });
    return apiClient.get(`/ai/sessions?${query.toString()}`);
  },

  getSession: async (id: string): Promise<AISession> => {
    return apiClient.get(`/ai/sessions/${id}`);
  },

  createSession: async (): Promise<CreateSessionResponse> => {
    return apiClient.post('/ai/sessions');
  },

  sendMessage: async (
    id: string,
    req: PostMessageRequest
  ): Promise<TriageResponse> => {
    return apiClient.post(`/ai/sessions/${id}/messages`, req);
  },
};
