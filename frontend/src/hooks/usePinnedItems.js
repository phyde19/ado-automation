import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ado-pinned-items';

/**
 * Hook to manage pinned work items in localStorage.
 * Returns { pinnedIds, isPinned, togglePin, clearPins }
 */
export function usePinnedItems() {
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist to localStorage whenever pinnedIds changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(pinnedIds)));
    } catch (e) {
      console.warn('Failed to save pinned items:', e);
    }
  }, [pinnedIds]);

  const isPinned = useCallback((id) => pinnedIds.has(id), [pinnedIds]);

  const togglePin = useCallback((id) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearPins = useCallback(() => {
    setPinnedIds(new Set());
  }, []);

  return { pinnedIds, isPinned, togglePin, clearPins };
}
