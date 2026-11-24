import { afterEach, expect, it } from 'vitest';
import { courierFilename, readBatches, saveBatch } from './batch-storage';
import { applyEdit, parseOrders } from './orders';

afterEach(() => localStorage.clear());

it('keeps the item and quantity the seller typed in saved batches', () => {
  const orders = parseOrders('Name: Rina\nPhone: 01712345678\n2 black hoodie\nRoad 4, Sylhet\nCOD: 1450').map(order => applyEdit(order, { item: 'black hoodie', status: 'ready' }));
  saveBatch({ id: 'batch-1', date: '2026-11-13', courier: 'Steadfast', orders });
  expect(readBatches()[0]?.orders[0]).toMatchObject({ item: 'black hoodie', qty: '2', cod: '1450', status: 'ready' });
});

it('defaults legacy saved orders to a blank item and quantity one', () => {
  localStorage.setItem('orderclean-batches-v1', JSON.stringify([{ id: 'old', date: '2026-11-12', courier: 'Steadfast', orders: [{ name: 'Rina', cod: '1450' }] }]));
  expect(readBatches()[0]?.orders[0]).toMatchObject({ item: '', qty: '1', name: 'Rina', cod: '1450' });
});

it('surfaces malformed batches instead of silently overwriting history', () => {
  localStorage.setItem('orderclean-batches-v1', JSON.stringify([{ id: 'broken', orders: [] }]));
  expect(readBatches).toThrow('Invalid saved batch');
});

it('uses the required courier-specific dated export filenames', () => {
  const date = new Date(2026, 10, 24);
  expect(courierFilename('Steadfast', date)).toBe('steadfast-orders-2026-11-24.csv');
  expect(courierFilename('Pathao', date)).toBe('pathao-orders-2026-11-24.csv');
});