import { useEffect, useRef, useState } from 'react';
import { readOrders, saveOrders } from '@/lib/order-storage';
import type { Order } from '@/lib/orders';

export function useSavedOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const lastSaved = useRef('[]');
  useEffect(() => {
    try {
      const saved = readOrders();
      lastSaved.current = JSON.stringify(saved);
      setOrders(saved);
    } catch { setStorageError('Saved orders could not be read from this device. They have not been overwritten.'); }
    setLoaded(true);
  }, []);
  useEffect(() => {
    const serialized = JSON.stringify(orders);
    if (!loaded || serialized === lastSaved.current) return;
    try {
      saveOrders(orders);
      lastSaved.current = serialized;
      setStorageError('');
    } catch { setStorageError('Orders could not be saved on this device. Keep this page open to avoid losing changes.'); }
  }, [loaded, orders]);
  function clearOrders() {
    try {
      saveOrders([]);
      lastSaved.current = '[]';
      setOrders([]);
      setStorageError('');
      return true;
    } catch { setStorageError('Orders could not be cleared from this device. Please try again.'); return false; }
  }
  return { orders, setOrders, loaded, storageError, clearOrders };
}