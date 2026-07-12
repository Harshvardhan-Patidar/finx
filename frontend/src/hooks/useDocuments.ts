import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Document, UploadResponse } from '@shared/types';

export function useDocuments() {
  const queryClient = useQueryClient();

  const query = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => api.get<Document[]>('/api/documents'),
    // Poll every 10 seconds while any document is in "indexing" state
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (!docs) return false;
      const hasIndexing = docs.some((d) => d.sync_status === 'indexing' || d.sync_status === 'pending');
      return hasIndexing ? 10_000 : false;
    },
    staleTime: 5_000,
  });

  const uploadMutation = useMutation<UploadResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.uploadFile<UploadResponse>('/api/documents/upload', formData);
    },
    onSuccess: () => {
      // Immediately refetch to show the new indexing document
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const deleteMutation = useMutation<unknown, Error, string>({
    mutationFn: (documentId: string) => api.delete(`/api/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return {
    documents: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    upload: uploadMutation.mutateAsync,
    uploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    deleteDocument: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
  };
}

export function useDriveStatus() {
  return useQuery<{ connected: boolean }>({
    queryKey: ['drive-status'],
    queryFn: () => api.get('/api/auth/drive/status'),
    staleTime: 60_000,
  });
}
