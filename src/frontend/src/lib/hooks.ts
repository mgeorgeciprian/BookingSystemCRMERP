/**
 * Custom hooks for data fetching with API-first, mock-data fallback.
 */

import { useEffect, useState, useCallback } from "react";

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isUsingMockData: boolean;
  refetch: () => void;
}

/**
 * Fetch data from the API. If the API call fails, fall back to mock data.
 * This allows the frontend to work both with and without a running backend.
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  mockData: T,
  dependencies: unknown[] = []
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      setIsUsingMockData(false);
    } catch (fetchError: any) {
      console.warn("API unavailable, using mock data:", fetchError.message);
      setData(mockData);
      setIsUsingMockData(true);
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isUsingMockData, refetch: fetchData };
}
