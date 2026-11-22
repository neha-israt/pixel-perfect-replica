import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { readOrders, saveOrders } from '@/lib/order-storage';
import type { Order } from '@/lib/orders';

export function useSavedOrders(workspace = 'Default', ready = true, reportStorageError?: (error: unknown) => void) {
  const [state, setState] = useState({ workspace: '', orders: [] as Order[], storageError: '' });
  const cache = useRef(new Map<string, typeof state>());
  const lastSaved = useRef(new Map<string, string>());
  const report = useRef(reportStorageError);
  report.current = reportStorageError;
  const loaded = ready && state.workspace === workspace;
  const orders = loaded ? state.orders : [];
  const storageError = loaded ? state.storageError : '';
  useEffect(() => {
    if (!ready) return;
    const cached = cache.current.get(workspace);
    if (cached) { setState(cached); return; }
    let restored = { workspace, orders: [] as Order[], storageError: '' };
    try {
      const saved = readOrders(workspace);
      lastSaved.current.set(workspace, JSON.stringify(saved));
      restored = { ...restored, orders: saved };
    } catch (error) {
      report.current?.(error);
      restored.storageError = 'Saved orders could not be read from this device. They have not been overwritten.';
      lastSaved.current.set(workspace, '[]');
    }
    cache.current.set(workspace, restored);
    setState(restored);
  }, [workspace, ready]);
  useEffect(() => {
    if (!loaded) return;
    cache.current.set(workspace, state);
    const serialized = JSON.stringify(state.orders);
    if (serialized === lastSaved.current.get(workspace)) return;
    try {
      saveOrders(state.orders, workspace);
      lastSaved.current.set(workspace, serialized);
      if (state.storageError) setState(previous => ({ ...previous, storageError: '' }));
    } catch (error) {
      report.current?.(error);
      const message = 'Orders could not be saved on this device. Keep this page open to avoid losing changes.';
      if (state.storageError !== message) setState(previous => ({ ...previous, storageError: message }));
    }
  }, [loaded, state, workspace]);
  function setOrders(value: SetStateAction<Order[]>) {
    setState(previous => previous.workspace !== workspace ? previous : { ...previous, orders: typeof value === 'function' ? value(previous.orders) : value });
  }
  function clearOrders() {
    try {
      saveOrders([], workspace);
      lastSaved.current.set(workspace, '[]');
      setState({ workspace, orders: [], storageError: '' });
      return true;
    } catch (error) { report.current?.(error); setState(previous => ({ ...previous, storageError: 'Orders could not be cleared from this device. Please try again.' })); return false; }
  }
  return { orders, setOrders, loaded, storageError, clearOrders };
}