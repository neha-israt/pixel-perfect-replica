import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { probeStorage, storageRead, storageWrite, StorageUnavailableError } from '@/lib/browser-storage';

const metadataKey = 'orderclean-workspaces-v1';
type WorkspaceContextValue = {
  active: string; names: string[]; ready: boolean; unavailable: boolean;
  switchWorkspace: (name: string) => void;
  createWorkspace: (name: string) => string;
  reportStorageError: (error: unknown) => void;
};
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ active: 'Default', names: ['Default'] });
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const reportStorageError = useCallback((error: unknown) => {
    if (error instanceof StorageUnavailableError) setUnavailable(true);
  }, []);
  useEffect(() => {
    try {
      probeStorage();
      const saved: unknown = JSON.parse(storageRead(metadataKey) || 'null');
      if (saved && typeof saved === 'object' && 'names' in saved && Array.isArray(saved.names)) {
        const names = [...new Set(['Default', ...saved.names.filter((name: unknown): name is string => typeof name === 'string' && Boolean(name.trim()))])];
        const active = 'active' in saved && typeof saved.active === 'string' && names.includes(saved.active) ? saved.active : 'Default';
        setState({ names, active });
      }
    } catch (error) { reportStorageError(error); }
    setReady(true);
  }, [reportStorageError]);
  function persist(next: typeof state) {
    setState(next);
    try { storageWrite(metadataKey, JSON.stringify(next)); }
    catch (error) { reportStorageError(error); }
  }
  function switchWorkspace(name: string) {
    if (state.names.includes(name)) persist({ ...state, active: name });
  }
  function createWorkspace(value: string) {
    const name = value.trim();
    if (!name) return 'Enter a workspace name.';
    if (name.length > 60) return 'Use 60 characters or fewer.';
    if (state.names.some(existing => existing.toLocaleLowerCase() === name.toLocaleLowerCase())) return 'This workspace already exists.';
    persist({ names: [...state.names, name], active: name });
    return '';
  }
  return <WorkspaceContext.Provider value={{ ...state, ready, unavailable, switchWorkspace, createWorkspace, reportStorageError }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider is required');
  return context;
}