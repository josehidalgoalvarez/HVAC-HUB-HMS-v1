import { useState, useEffect, useCallback, useRef } from 'react';
import { appCache } from './cache';

export interface UseSWRDataOptions<T> {
  initialData?: T;
  ttlMs?: number;
  onSuccess?: (data: T) => void;
}

export interface UseSWRDataResult<T> {
  data: T | null;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  isLoading: boolean;
  isRevalidating: boolean;
  isUpdated: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook providing Stale-While-Revalidate (SWR) data fetching with IndexedDB caching.
 * - Instantly returns cached data (<10ms).
 * - Skeleton displayed ONLY on true first load with empty cache.
 * - Revalidates in background on mount.
 * - Flags `isUpdated` for 2.5s when background data differs from cached data.
 * - Listens for global 'hvachome:refresh' events.
 */
export function useSWRData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseSWRDataOptions<T>
): UseSWRDataResult<T> {
  const [data, setData] = useState<T | null>(() => {
    return appCache.getSync<T>(key) || options?.initialData || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => !data);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [isUpdated, setIsUpdated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const onSuccessRef = useRef(options?.onSuccess);
  onSuccessRef.current = options?.onSuccess;

  const revalidate = useCallback(
    async (force = false) => {
      setIsRevalidating(true);
      try {
        const fresh = await fetcherRef.current();
        if (fresh !== undefined && fresh !== null) {
          setData((prev) => {
            if (prev !== null && JSON.stringify(prev) !== JSON.stringify(fresh)) {
              setIsUpdated(true);
              setTimeout(() => setIsUpdated(false), 2500);
            }
            return fresh;
          });
          await appCache.set(key, fresh);
          onSuccessRef.current?.(fresh);
        }
        setError(null);
      } catch (err: unknown) {
        if (!data) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
        }
      } finally {
        setIsLoading(false);
        setIsRevalidating(false);
      }
    },
    [key, data]
  );

  useEffect(() => {
    let mounted = true;

    // Check IndexedDB if memory cache was empty
    if (!data) {
      appCache.get<T>(key).then((cached) => {
        if (mounted && cached) {
          setData(cached);
          setIsLoading(false);
        }
      });
    }

    // Background revalidate
    revalidate();

    // Listen for manual full refresh
    const handleGlobalRefresh = () => {
      revalidate(true);
    };

    window.addEventListener('hvachome:refresh', handleGlobalRefresh);

    return () => {
      mounted = false;
      window.removeEventListener('hvachome:refresh', handleGlobalRefresh);
    };
  }, [key]);

  return {
    data,
    setData,
    isLoading,
    isRevalidating,
    isUpdated,
    error,
    refresh: () => revalidate(true),
  };
}
