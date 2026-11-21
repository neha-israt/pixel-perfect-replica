import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSavedOrders } from './use-saved-orders';
import { ordersStorageKey, readOrders, saveOrders } from '@/lib/order-storage';
import { applyEdit, parseOrders } from '@/lib/orders';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('restores before saving and automatically persists additions, edits and deletions', async () => {
  const initial = parseOrders('Name: Rina\nPhone: 01712345678\nRoad 4, Sylhet\nCOD: 1450');
  saveOrders(initial);
  const writer = vi.spyOn(Storage.prototype, 'setItem');
  const { result } = renderHook(useSavedOrders);
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.orders).toEqual(initial);
  expect(writer).not.toHaveBeenCalled();
  const added = parseOrders('Name: Farhana\nPhone: 01811223344\nRoad 5, Dhaka\nCOD: 1850', 2);
  act(() => result.current.setOrders(previous => [...previous, ...added]));
  await waitFor(() => expect(readOrders()).toHaveLength(2));
  act(() => result.current.setOrders(previous => previous.map(order => applyEdit(order, { item: 'Ring', product: '1400' }))));
  await waitFor(() => expect(readOrders()[0]).toMatchObject({ item: 'Ring', product: '1400', cod: '1510' }));
  act(() => result.current.setOrders(previous => previous.slice(1)));
  await waitFor(() => expect(readOrders()).toHaveLength(1));
  act(() => { expect(result.current.clearOrders()).toBe(true); });
  expect(result.current.orders).toEqual([]);
  expect(localStorage.getItem(ordersStorageKey)).toBeNull();
});

it('does not overwrite unreadable data on initialization and reports it', async () => {
  localStorage.setItem(ordersStorageKey, 'broken');
  const { result } = renderHook(useSavedOrders);
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.storageError).not.toBe('');
  expect(localStorage.getItem(ordersStorageKey)).toBe('broken');
});

it('keeps the active orders when device storage refuses clearing', async () => {
  const initial = parseOrders('Name: Rina\nPhone: 01712345678\nRoad 4, Sylhet\nCOD: 1450');
  saveOrders(initial);
  const { result } = renderHook(useSavedOrders);
  await waitFor(() => expect(result.current.loaded).toBe(true));
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Blocked'); });
  act(() => { expect(result.current.clearOrders()).toBe(false); });
  expect(result.current.orders).toEqual(initial);
  expect(result.current.storageError).not.toBe('');
});