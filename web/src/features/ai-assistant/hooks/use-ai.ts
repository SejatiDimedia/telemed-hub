import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '../api/ai-api';
import type { PostMessageRequest } from '../types';

export const aiKeys = {
  all: ['ai-sessions'] as const,
  lists: () => [...aiKeys.all, 'list'] as const,
  list: (page: number) => [...aiKeys.lists(), page] as const,
  details: () => [...aiKeys.all, 'detail'] as const,
  detail: (id: string) => [...aiKeys.details(), id] as const,
};

export const useAISessions = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: aiKeys.list(page),
    queryFn: () => aiApi.listSessions(page, limit),
  });
};

export const useAISession = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: aiKeys.detail(id),
    queryFn: () => aiApi.getSession(id),
    enabled: options?.enabled ?? true,
  });
};

export const useCreateAISession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => aiApi.createSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: PostMessageRequest }) =>
      aiApi.sendMessage(id, req),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
    },
  });
};
