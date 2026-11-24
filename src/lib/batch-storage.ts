import type { Batch } from './orders';
import { readWorkspaceStorage, writeWorkspaceStorage } from './browser-storage';
const key = 'orderclean-batches-v1';
export function readBatches(workspace = 'Default'): Batch[] {
  const data = JSON.parse(readWorkspaceStorage(key, workspace) || '[]');
  if (!Array.isArray(data)) throw new Error('Invalid saved batches');
  return data.map((batch: unknown) => {
    if (!batch || typeof batch !== 'object') throw new Error('Invalid saved batch');
    const saved = batch as Partial<Batch>;
    if (typeof saved.id !== 'string' || typeof saved.date !== 'string' || typeof saved.courier !== 'string' || !Array.isArray(saved.orders)) {
      throw new Error('Invalid saved batch');
    }
    const orders = saved.orders.map(order => {
      if (!order || typeof order !== 'object' || Array.isArray(order)) throw new Error('Invalid saved batch order');
      const savedOrder = order as Batch['orders'][number];
      return { ...savedOrder, item: savedOrder.item ?? '', qty: savedOrder.qty ?? '1' };
    });
    return { ...saved, orders } as Batch;
  });
}
export function saveBatch(batch: Batch, workspace = 'Default') {
  writeWorkspaceStorage(key, JSON.stringify([batch, ...readBatches(workspace)]), workspace);
}
export function deleteBatch(id: string, workspace = 'Default') {
  writeWorkspaceStorage(key, JSON.stringify(readBatches(workspace).filter(batch => batch.id !== id)), workspace);
}
export function downloadCsv(csv: string, filename: string) {
  const contents = csv.startsWith('\uFEFF') ? csv : `\uFEFF${csv}`;
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function courierFilename(courier: string, date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${courier.toLowerCase()}-orders-${year}-${month}-${day}.csv`;
}