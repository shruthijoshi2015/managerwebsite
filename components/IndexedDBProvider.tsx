"use client";
import { useEffect, useState, createContext, useContext, useCallback, ReactNode } from "react";
import {
  seedIndexedDB,
  saveIndexedDBData,
  getIndexedDBData,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  isFileConnected,
  connectLiveFile,
  restoreFromFile,
  stopAutoSync,
  exportSnapshot,
  getIndexedDBStats,
} from "@/lib/storageProvider";

// ─── Context ─────────────────────────────────────────────────────────────────

interface IndexedDBContextType {
  isReady: boolean;
  lastSync: string | null;
  stats: { teamCount: number; goalCount: number; taskCount: number; noteCount: number };
  isFileSynced: boolean;
  connectFile: () => Promise<boolean>;
  disconnectFile: () => void;
  restoreFile: () => Promise<boolean>;
  exportData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  /** Call after any mutation to persist to IndexedDB + sync file */
  persistAfterMutation: () => Promise<void>;
}

const IndexedDBContext = createContext<IndexedDBContextType>({
  isReady: false,
  lastSync: null,
  stats: { teamCount: 0, goalCount: 0, taskCount: 0, noteCount: 0 },
  isFileSynced: false,
  connectFile: async () => false,
  disconnectFile: () => {},
  restoreFile: async () => false,
  exportData: async () => {},
  refreshStats: async () => {},
  persistAfterMutation: async () => {},
});

export const useIndexedDB = () => useContext(IndexedDBContext);

// ─── Provider ────────────────────────────────────────────────────────────────

export function IndexedDBProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [stats, setStats] = useState({ teamCount: 0, goalCount: 0, taskCount: 0, noteCount: 0 });
  const [isFileSynced, setIsFileSynced] = useState(false);

  // Seed on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await seedIndexedDB(true);
        if (cancelled) return;
        const ts = await getLastSyncTimestamp();
        setLastSync(ts);
        const s = await getIndexedDBStats();
        setStats(s);
        setIsFileSynced(isFileConnected());
        setIsReady(true);
        console.log("[ManagerOS] IndexedDB ready", s);
      } catch (e) {
        console.error("[ManagerOS] IndexedDB init error:", e);
        setIsReady(true); // still allow app to render
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshStats = useCallback(async () => {
    const s = await getIndexedDBStats();
    setStats(s);
    const ts = await getLastSyncTimestamp();
    setLastSync(ts);
    setIsFileSynced(isFileConnected());
  }, []);

  const connectFile = useCallback(async () => {
    const handle = await connectLiveFile();
    if (handle) {
      setIsFileSynced(true);
      return true;
    }
    return false;
  }, []);

  const disconnectFile = useCallback(() => {
    stopAutoSync();
    setIsFileSynced(false);
  }, []);

  const restoreFile = useCallback(async () => {
    const ok = await restoreFromFile();
    if (ok) {
      setIsFileSynced(true);
      await refreshStats();
      window.location.reload();
    }
    return ok;
  }, [refreshStats]);

  const exportData = useCallback(async () => {
    await exportSnapshot();
  }, []);

  const persistAfterMutation = useCallback(async () => {
    // Re-fetch from server and save to IndexedDB
    try {
      const res = await fetch('/api/sync-db');
      if (res.ok) {
        const data = await res.json();
        await saveIndexedDBData(data);
        await setLastSyncTimestamp();
        await refreshStats();
      }
    } catch (e) {
      console.error("[ManagerOS] Persist after mutation error:", e);
    }
  }, [refreshStats]);

  return (
    <IndexedDBContext.Provider value={{
      isReady,
      lastSync,
      stats,
      isFileSynced,
      connectFile,
      disconnectFile,
      restoreFile,
      exportData,
      refreshStats,
      persistAfterMutation,
    }}>
      {children}
    </IndexedDBContext.Provider>
  );
}
