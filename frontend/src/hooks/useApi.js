import { useState, useEffect, useCallback, useRef } from 'react';

// Generic hook for API calls with caching
export function useApi(fetchFn, deps = [], options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { enabled = true, cacheKey = null, cacheDuration = 5 * 60 * 1000 } = options;
  
  // Use ref to avoid fetchFn causing infinite loops
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  
  const refetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    
    // Check cache first
    if (cacheKey) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < cacheDuration) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Invalid cache, continue with fetch
        }
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFnRef.current();
      setData(result);
      
      // Cache the result
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled, cacheKey, cacheDuration, ...deps]);
  
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  return { data, loading, error, refetch };
}

// Hook for lazy loading with manual trigger
export function useLazyApi(fetchFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);
  
  return { data, loading, error, execute };
}
