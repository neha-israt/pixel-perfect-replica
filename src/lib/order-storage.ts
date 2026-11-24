import type { Order } from './orders';
import { readWorkspaceStorage, writeWorkspaceStorage } from './browser-storage';

export const ordersStorageKey = 'orderclean_orders';
const fields = ['id', 'invoice', 'name', 'phone', 'address', 'product', 'delivery', 'cod', 'note'] as const;

export function readOrders(workspace = 'Default'): Order[] {
  const data: unknown = JSON.parse(readWorkspaceStorage(ordersStorageKey, workspace) || '[]');
  if (!Array.isArray(data)) throw new Error('Invalid saved orders');
  return data.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid saved order');
    const order = value as Partial<Order>;
    if (!fields.every(field => typeof order[field] === 'string') || (order.zone !== 'inside' && order.zone !== 'outside')) throw new Error('Invalid saved order');
    return { ...order, item: typeof order.item === 'string' ? order.item : '', qty: typeof order.qty === 'string' ? order.qty : '1' } as Order;
  });
}

export function saveOrders(orders: Order[], workspace = 'Default') {
  writeWorkspaceStorage(ordersStorageKey, orders.length ? JSON.stringify(orders) : null, workspace);
}

export function nextInvoiceNumber(orders: Order[], workspace = 'Default'): number {
  // The caller's queue covers unsaved in-memory edits; the persisted queue
  // protects continuity when a caller has only a subset or after refresh.
  let savedOrders: Order[] = [];
  try { savedOrders = readOrders(workspace); }
  catch { /* Storage errors are already surfaced by the workspace persistence hook. */ }
  return [...orders, ...savedOrders].reduce((highest, order) => {
    const match = /^OC-(\d+)$/.exec(order.invoice);
    const number = Number(match?.[1] || 0);
    return Number.isSafeInteger(number) ? Math.max(highest, number) : highest;
  }, 0) + 1;
}