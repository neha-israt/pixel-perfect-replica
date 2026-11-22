import type { Batch } from './orders';
import { readWorkspaceStorage, writeWorkspaceStorage } from './browser-storage';
const key = 'orderclean-batches-v1';
export function readBatches(workspace = 'Default'): Batch[] {
  const data = JSON.parse(readWorkspaceStorage(key, workspace) || '[]');
  if (!Array.isArray(data)) return [];
  return data.filter((batch: Batch) => typeof batch.id === 'string' && typeof batch.date === 'string' && Array.isArray(batch.orders)).map((batch: Batch) => ({ ...batch, orders: batch.orders.map(order => ({ ...order, item: order.item ?? '', qty: order.qty ?? '1' })) }));
}
export function saveBatch(batch: Batch, workspace = 'Default') {
  writeWorkspaceStorage(key, JSON.stringify([batch, ...readBatches(workspace)]), workspace);
}
export function deleteBatch(id: string, workspace = 'Default') {
  writeWorkspaceStorage(key, JSON.stringify(readBatches(workspace).filter(batch => batch.id !== id)), workspace);
}
export function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}