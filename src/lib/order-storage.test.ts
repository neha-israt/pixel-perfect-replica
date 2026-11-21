import { afterEach, expect, it, vi } from 'vitest';
import { nextInvoiceNumber, ordersStorageKey, readOrders, saveOrders } from './order-storage';
import { applyEdit, parseOrders } from './orders';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
const message = 'Name: Rina\nPhone: 01712345678\nRoad 4, Sylhet\nCOD: 1450';

it('saves parsed and edited orders under the dedicated key without losing fields', () => {
  const order = parseOrders(message)[0];
  if (!order) throw new Error('Expected order');
  const edited = applyEdit(order, { item: 'Black hoodie', zone: 'inside', delivery: '60', cod: '1500', qty: '2', duplicateConfirmed: true });
  saveOrders([edited]);
  expect(JSON.parse(localStorage.getItem('orderclean_orders') || '[]')).toEqual([edited]);
  expect(readOrders()).toEqual([edited]);
  expect(readOrders()[0]).toMatchObject({ invoice: 'OC-0001', product: '1440', delivery: '60', cod: '1500', item: 'Black hoodie', qty: '2', duplicateConfirmed: true });
});
it('continues invoices from the highest saved invoice even after gaps or reordering', () => {
  const orders = parseOrders(`${message}\n\n${message}`, 7).reverse();
  saveOrders(orders);
  expect(nextInvoiceNumber(readOrders())).toBe(9);
  expect(nextInvoiceNumber(orders.slice(0, 1))).toBe(9);
  expect(nextInvoiceNumber([])).toBe(1);
});
it('persists deletion and removes the dedicated key when cleared without touching other storage', () => {
  const orders = parseOrders(`${message}\n\n${message}`);
  saveOrders(orders);
  saveOrders(orders.slice(1));
  expect(readOrders().map(order => order.invoice)).toEqual(['OC-0002']);
  localStorage.setItem('orderclean-products-v1', '[]');
  saveOrders([]);
  expect(localStorage.getItem(ordersStorageKey)).toBeNull();
  expect(readOrders()).toEqual([]);
  expect(localStorage.getItem('orderclean-products-v1')).toBe('[]');
});
it('normalizes missing legacy item and quantity fields', () => {
  const order = parseOrders(message)[0];
  if (!order) throw new Error('Expected order');
  const { item, qty, ...legacy } = order;
  localStorage.setItem(ordersStorageKey, JSON.stringify([legacy]));
  expect(readOrders()[0]).toMatchObject({ item: '', qty: '1' });
});
it('surfaces malformed data and storage failures rather than silently clearing it', () => {
  localStorage.setItem(ordersStorageKey, '{invalid');
  expect(readOrders).toThrow();
  expect(localStorage.getItem(ordersStorageKey)).toBe('{invalid');
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Blocked'); });
  expect(() => saveOrders([])).toThrow('Blocked');
});