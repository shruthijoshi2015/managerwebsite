"use client";

// ────────────────────────────────────────────────────────────────────────────
// storageProvider.ts — IndexedDB persistence + File System Access API sync
// ────────────────────────────────────────────────────────────────────────────

export type StorageMode = 'indexedDB' | 'fileSystem' | 'cloud' | 'server';

export interface StorageConfig {
  mode: StorageMode;
  cloudUrl?: string;
  cloudKey?: string;
  cloudProvider?: 'supabase' | 'firebase';
  isConfigured: boolean;
}

const DB_NAME = 'ManagerOS_DB';
const DB_VERSION = 1;
const STORE_NAME = 'store';
const DATA_KEY = 'database';
const STORAGE_KEY = 'manager_storage_config';

// ─── Storage Config helpers ──────────────────────────────────────────────────

export function getStorageConfig(): StorageConfig {
  if (typeof window === 'undefined') {
    return { mode: 'server', isConfigured: true };
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* ignore */ }
  }
  return { mode: 'server', isConfigured: false };
}

export function saveStorageConfig(config: StorageConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

// ─── IndexedDB core ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event: any) => resolve(event.target.result as IDBDatabase);
    request.onerror = () => reject(request.error);
  });
}

export async function getIndexedDBData(): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(DATA_KEY);
    getReq.onsuccess = () => resolve(getReq.result || null);
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function saveIndexedDBData(data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putReq = store.put(data, DATA_KEY);
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });
}

/** Returns a timestamp string of the last save, or null */
export async function getLastSyncTimestamp(): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get('lastSync');
    getReq.onsuccess = () => resolve(getReq.result || null);
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function setLastSyncTimestamp(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putReq = store.put(new Date().toISOString(), 'lastSync');
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });
}

/**
 * Seed IndexedDB from the server if empty.
 * Returns the database object (either from IndexedDB or freshly seeded).
 */
export async function seedIndexedDB(force = false): Promise<any> {
  let data = await getIndexedDBData();
  if (!data || force) {
    // Fetch from server and seed
    const res = await fetch('/api/sync-db');
    if (res.ok) {
      data = await res.json();
      await saveIndexedDBData(data);
      await setLastSyncTimestamp();
      console.log('[ManagerOS] IndexedDB synced from server');
    }
  }
  return data;
}

// ─── File System Access API (Live OneDrive sync) ─────────────────────────────

let _fileHandle: FileSystemFileHandle | null = null;
let _autoSyncInterval: ReturnType<typeof setInterval> | null = null;

export function getFileHandle(): FileSystemFileHandle | null {
  return _fileHandle;
}

export function isFileConnected(): boolean {
  return _fileHandle !== null;
}

/**
 * Opens a file picker for the user to choose/create a .json file.
 * Typically inside their OneDrive folder for automatic cloud sync.
 */
export async function connectLiveFile(): Promise<FileSystemFileHandle | null> {
  if (typeof window === 'undefined') return null;
  // Check browser support
  if (!('showSaveFilePicker' in window)) {
    alert('Your browser does not support the File System Access API. Please use Chrome or Edge.');
    return null;
  }
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: 'manager-os-data.json',
      types: [{
        description: 'JSON Database',
        accept: { 'application/json': ['.json'] },
      }],
    });
    _fileHandle = handle;
    // Initial write
    const data = await getIndexedDBData();
    if (data) {
      await writeToFileHandle(handle, data);
    }
    // Start auto-sync
    startAutoSync();
    return handle;
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.error('[ManagerOS] File picker error:', e);
    }
    return null;
  }
}

/**
 * Opens a file picker to load data FROM a .json file into IndexedDB.
 */
export async function restoreFromFile(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('showOpenFilePicker' in window)) {
    alert('Your browser does not support the File System Access API. Please use Chrome or Edge.');
    return false;
  }
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{
        description: 'JSON Database',
        accept: { 'application/json': ['.json'] },
      }],
    });
    const file = await handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || !data.team) {
      alert('Invalid backup file. Must contain a "team" array.');
      return false;
    }
    await saveIndexedDBData(data);
    await setLastSyncTimestamp();
    _fileHandle = handle;
    startAutoSync();
    return true;
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.error('[ManagerOS] File restore error:', e);
    }
    return false;
  }
}

async function writeToFileHandle(handle: FileSystemFileHandle, data: any) {
  try {
    const writable = await (handle as any).createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (e) {
    console.error('[ManagerOS] File write error:', e);
  }
}

/**
 * Start polling every 5s to auto-save IndexedDB → file handle
 */
function startAutoSync() {
  if (_autoSyncInterval) clearInterval(_autoSyncInterval);
  _autoSyncInterval = setInterval(async () => {
    if (!_fileHandle) return;
    const data = await getIndexedDBData();
    if (data) {
      await writeToFileHandle(_fileHandle, data);
    }
  }, 5000);
}

export function stopAutoSync() {
  if (_autoSyncInterval) {
    clearInterval(_autoSyncInterval);
    _autoSyncInterval = null;
  }
  _fileHandle = null;
}

/**
 * Export current IndexedDB data as a downloadable JSON file.
 */
export async function exportSnapshot(): Promise<void> {
  const data = await getIndexedDBData();
  if (!data) { alert('No data to export.'); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `manager-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Get count of team members (for status display)
 */
export async function getIndexedDBStats(): Promise<{ teamCount: number; goalCount: number; taskCount: number; noteCount: number }> {
  const data = await getIndexedDBData();
  if (!data || !data.team) return { teamCount: 0, goalCount: 0, taskCount: 0, noteCount: 0 };
  let goalCount = 0, taskCount = 0, noteCount = 0;
  for (const m of data.team) {
    goalCount += (m.goals?.length || 0);
    taskCount += (m.tasks?.length || 0);
    noteCount += (m.notes?.length || 0);
  }
  return { teamCount: data.team.length, goalCount, taskCount, noteCount };
}
