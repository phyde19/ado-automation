import { useState, useEffect, useCallback, useRef } from 'react';

// Generic hook for API calls (no localStorage caching - it was causing quota issues)
export function useApi(fetchFn, deps = [], options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { enabled = true } = options;
  
  // Use ref to avoid fetchFn causing infinite loops
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  
  // Create stable key from deps
  const depsKey = JSON.stringify(deps);
  
  const refetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled, depsKey]);
  
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  return { data, loading, error, refetch };
}

// Hook for lazy loading with manual trigger
// Can be used two ways:
// 1. useLazyApi(fetchFn) then call execute(...args)
// 2. useLazyApi() then call execute(fetchFn)
export function useLazyApi(defaultFetchFn = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (fnOrArg, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      // If first arg is a function, use it. Otherwise use default fetchFn with all args.
      const result = typeof fnOrArg === 'function' 
        ? await fnOrArg(...args)
        : await defaultFetchFn(fnOrArg, ...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [defaultFetchFn]);
  
  return { data, loading, error, execute };
}
