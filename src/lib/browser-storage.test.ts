import { afterEach, expect, it, vi } from 'vitest';
import { probeStorage, storageRead, storageWrite, StorageUnavailableError, workspaceKey } from './browser-storage';
import { readOrders, saveOrders, nextInvoiceNumber, ordersStorageKey } from './order-storage';
import { readProducts, saveProducts } from './product-catalog';
import { deleteBatch, readBatches, saveBatch } from './batch-storage';
import { parseOrders } from './orders';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
const orders = () => parseOrders('Name: Rina\nPhone: 01712345678\nRoad 4, Sylhet\nCOD: 1450', 7);

it('separates order lists and invoice continuity by workspace name', () => {
  saveOrders(orders(), 'Default');
  expect(readOrders('Neha')).toEqual([]);
  saveOrders(orders().map(order => ({ ...order, cod: '1850', invoice: 'OC-0002' })), 'Neha');
  expect(readOrders('Default')[0]?.cod).toBe('1450');
  expect(readOrders('Neha')[0]?.cod).toBe('1850');
  expect(nextInvoiceNumber(readOrders('Default'))).toBe(8);
  expect(nextInvoiceNumber(readOrders('Neha'), 'Neha')).toBe(3);
  saveOrders([], 'Neha');
  expect(readOrders('Neha')).toEqual([]);
  expect(readOrders('Default')).toHaveLength(1);
  expect(workspaceKey(ordersStorageKey, 'A/B')).not.toBe(workspaceKey(ordersStorageKey, 'A%2FB'));
});

it('keeps existing unscoped orders in Default only and retires them after saving', () => {
  localStorage.setItem(ordersStorageKey, JSON.stringify(orders()));
  expect(readOrders('Default')).toHaveLength(1);
  expect(readOrders('Other')).toEqual([]);
  saveOrders(readOrders('Default'));
  expect(localStorage.getItem(ordersStorageKey)).toBeNull();
  expect(readOrders('Default')).toHaveLength(1);
  saveOrders([]);
  expect(readOrders('Default')).toEqual([]);
});

it('isolates catalogs and exported history as well as order lists', () => {
  saveProducts([{ id: '1', name: 'Ring', price: '500' }], 'Default');
  saveBatch({ id: '1', date: '2026-11-22', courier: 'Steadfast', orders: orders() }, 'Default');
  expect(readProducts('Other')).toEqual([]);
  expect(readBatches('Other')).toEqual([]);
  deleteBatch('1', 'Other');
  expect(readBatches('Default')).toHaveLength(1);
  expect(readProducts('Default')[0]?.name).toBe('Ring');
});

it('guards storage getter access, reads, writes and removals', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked read'); });
  expect(() => storageRead('x')).toThrow(StorageUnavailableError);
  vi.restoreAllMocks();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
  expect(probeStorage).toThrow(StorageUnavailableError);
  expect(() => storageWrite('x', 'y')).toThrow(StorageUnavailableError);
  vi.restoreAllMocks();
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Blocked removal'); });
  expect(() => storageWrite('x', null)).toThrow(StorageUnavailableError);
  vi.restoreAllMocks();
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Private session'); });
  expect(() => storageRead('x')).toThrow(StorageUnavailableError);
  expect(() => storageWrite('x', 'y')).toThrow(StorageUnavailableError);
});