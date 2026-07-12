import { useState, useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Chat, Message, ChatResponse } from '@shared/types';

export type ChatAction = 'draft_rti' | 'gst_summary' | 'tax_deductions' | null;

export function useChatList() {
  return useQuery<Chat[]>({
    queryKey: ['chats'],
    queryFn: () => api.get<Chat[]>('/api/chats'),
    staleTime: 30_000,
  });
}

export function useChatMessages(chatId: string | null) {
  return useQuery<Message[]>({
    queryKey: ['messages', chatId],
    queryFn: () => api.get<Message[]>(`/api/chats/${chatId}/messages`),
    enabled: !!chatId,
    staleTime: 10_000,
  });
}

interface SendMessageParams {
  chatId: string | null;
  message: string;
  action?: ChatAction;
}

export function useSendMessage(onNewChat?: (chatId: string) => void) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);

  const mutation = useMutation<ChatResponse, Error, SendMessageParams>({
    mutationFn: ({ chatId, message, action }) =>
      api.post<ChatResponse>('/api/chat', { chatId, message, action: action ?? null }),

    onMutate: async ({ chatId, message }) => {
      // Optimistic update: add user message immediately
      if (chatId) {
        const optimisticMsg: Message = {
          id: `optimistic-${Date.now()}`,
          chat_id: chatId,
          role: 'user',
          content: message,
          sources: [],
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData<Message[]>(['messages', chatId], (old) => [
          ...(old ?? []),
          optimisticMsg,
        ]);
      }
      setIsStreaming(true);
    },

    onSuccess: (data, { chatId: inputChatId }) => {
      // If a new chat was created, navigate to it
      if (!inputChatId && data.chatId && onNewChat) {
        onNewChat(data.chatId);
      }

      // Invalidate to refetch with real data (including assistant message)
      queryClient.invalidateQueries({ queryKey: ['messages', data.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setIsStreaming(false);
    },

    onError: () => {
      setIsStreaming(false);
    },
  });

  return { ...mutation, isStreaming };
}

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => api.delete(`/api/chats/${chatId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ id: string; title: string }>('/api/chats'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}
