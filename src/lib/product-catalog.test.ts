import { afterEach, expect, it, vi } from 'vitest';
import { matchingProducts, readProducts, saveProducts } from './product-catalog';
import { applyEdit, parseOrders } from './orders';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
const hoodie = { id: 'hoodie', name: 'Black hoodie', price: '1200' };
const ring = { id: 'ring', name: 'Ring', price: '500' };

it('persists added, edited and deleted products between reads', () => {
  saveProducts([hoodie, ring]);
  expect(readProducts()).toEqual([hoodie, ring]);
  saveProducts([{ ...hoodie, name: 'Green hoodie', price: '1300' }, ring]);
  expect(readProducts()[0]).toEqual({ id: 'hoodie', name: 'Green hoodie', price: '1300' });
  saveProducts(readProducts().filter(p => p.id !== 'ring'));
  expect(readProducts().map(p => p.id)).toEqual(['hoodie']);
});
it('matches names without case sensitivity and shows all on empty input', () => {
  expect(matchingProducts([hoodie, ring], ' HOOD ')).toEqual([hoodie]);
  expect(matchingProducts([hoodie, ring], '')).toEqual([hoodie, ring]);
  expect(matchingProducts([hoodie], 'kettle')).toEqual([]);
});
it('rejects invalid prices and blank names', () => {
  for (const patch of [{ name: ' ' }, { price: '-1' }, { price: '' }, { price: 'abc' }]) {
    expect(() => saveProducts([{ ...hoodie, ...patch }])).toThrow();
  }
});
it('surfaces device storage failures', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  expect(() => saveProducts([hoodie])).toThrow('Storage blocked');
});
it('selecting a catalog name preserves quantity and every monetary field', () => {
  const order = parseOrders('Name: Rina\nPhone: 01712345678\nRoad 4, Sylhet\nCOD: 1450')[0];
  if (!order) throw new Error('Expected parsed order');
  expect(order.item).toBe('');
  expect(applyEdit(order, { item: hoodie.name })).toMatchObject({ item: 'Black hoodie', qty: '1', product: '1340', delivery: '110', cod: '1450' });
});