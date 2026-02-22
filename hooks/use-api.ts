/**
 * Custom React hooks for API calls with loading and error states
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for making API calls with automatic loading/error states
 */
export function useApi<T = any>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      const message =
        (err as any)?.error ||
        (err instanceof Error ? err.message : null) ||
        'An error occurred';
      setError(message);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for making API mutations (POST, PUT, PATCH, DELETE)
 */
export function useMutation<TData = any, TVariables = any>() {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (
      apiCall: (variables: TVariables) => Promise<TData>,
      variables: TVariables
    ): Promise<TData | null> => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiCall(variables);
        setData(result);
        return result;
      } catch (err) {
        const message =
          (err as any)?.error ||
          (err instanceof Error ? err.message : null) ||
          'An error occurred';
        setError(message);
        console.error('Mutation Error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    mutate,
    reset,
  };
}

/**
 * Hook for paginated API calls
 */
export function usePaginatedApi<T = any>(
  apiCall: (page: number, limit: number) => Promise<{ data: T[]; total: number }>,
  limit: number = 10
) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall(page, limit);
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      const message =
        (err as any)?.error ||
        (err instanceof Error ? err.message : null) ||
        'An error occurred';
      setError(message);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nextPage = useCallback(() => {
    if (page * limit < total) {
      setPage(p => p + 1);
    }
  }, [page, limit, total]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }, [page]);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    data,
    total,
    page,
    loading,
    error,
    nextPage,
    prevPage,
    goToPage,
    refetch: fetchData,
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
    totalPages: Math.ceil(total / limit),
  };
}
