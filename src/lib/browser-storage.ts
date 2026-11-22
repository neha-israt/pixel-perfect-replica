export const storageWarning = 'Browser storage is unavailable in this session. Export your CSV before closing or refreshing.';

export class StorageUnavailableError extends Error {}

export function storageRead(key: string): string | null {
  try { return localStorage.getItem(key); }
  catch (error) { throw new StorageUnavailableError(error instanceof Error ? error.message : 'Storage unavailable'); }
}

export function storageWrite(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (error) { throw new StorageUnavailableError(error instanceof Error ? error.message : 'Storage unavailable'); }
}

export function workspaceKey(key: string, workspace = 'Default') {
  return `${key}:workspace:${encodeURIComponent(workspace)}`;
}

export function readWorkspaceStorage(key: string, workspace = 'Default') {
  return storageRead(workspaceKey(key, workspace)) ?? (workspace === 'Default' ? storageRead(key) : null);
}

export function writeWorkspaceStorage(key: string, value: string | null, workspace = 'Default') {
  storageWrite(workspaceKey(key, workspace), value);
  // Retire legacy data only after the scoped write succeeds, including explicit clear.
  if (workspace === 'Default') storageWrite(key, null);
}

export function probeStorage() {
  const key = 'orderclean-storage-probe';
  storageWrite(key, '1');
  storageWrite(key, null);
}