"use client";

export type StorageMode = 'indexedDB' | 'fileSystem' | 'cloud' | 'server';

export interface StorageConfig {
  mode: StorageMode;
  cloudUrl?: string;
  cloudKey?: string;
  cloudProvider?: 'supabase' | 'firebase';
  isConfigured: boolean;
}

const STORAGE_KEY = 'manager_storage_config';

export function getStorageConfig(): StorageConfig {
  if (typeof window === 'undefined') {
    return { mode: 'server', isConfigured: true };
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
  }
  return { mode: 'server', isConfigured: false };
}

export function saveStorageConfig(config: StorageConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

// Simple IndexedDB wrapper for local-first storage
export async function getIndexedDBData(): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ManagerOS_DB', 1);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('store')) {
        db.createObjectStore('store');
      }
    };
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const tx = db.transaction('store', 'readonly');
      const store = tx.objectStore('store');
      const getReq = store.get('database');
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveIndexedDBData(data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ManagerOS_DB', 1);
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const tx = db.transaction('store', 'readwrite');
      const store = tx.objectStore('store');
      const putReq = store.put(data, 'database');
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}
