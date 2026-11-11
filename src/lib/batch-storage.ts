import type { Batch } from './orders';
const key = 'orderclean-batches-v1';
export function readBatches(): Batch[] {
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(data)) return [];
  return data.filter((batch: Batch) => typeof batch.id === 'string' && typeof batch.date === 'string' && Array.isArray(batch.orders));
}
export function saveBatch(batch: Batch) {
  localStorage.setItem(key, JSON.stringify([batch, ...readBatches()]));
}
export function deleteBatch(id: string) {
  localStorage.setItem(key, JSON.stringify(readBatches().filter(batch => batch.id !== id)));
}
export function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}