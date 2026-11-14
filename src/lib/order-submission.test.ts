import { describe, expect, it } from 'vitest';
import { applyEdit, parseOrders, parseCsv, steadfastCsv } from './orders';
import { isDuplicateOrder, resolveDuplicate, submitOrders } from './order-submission';

const raw = 'Name: Farhana Akter\nPhone: 01811223344\nAddress: Road 4, Sylhet\nTotal Bill: 1850';
const first = parseOrders(raw)[0];
if (!first) throw new Error('Missing test order');
const repeat = { ...first, id: 'repeat', invoice: 'OC-0002' };

describe('Duplicate submissions', () => {
  it('holds a matching 11-digit phone and total before adding a second row', () => {
    const queue = submitOrders([first], [{ ...repeat, rawText: '', name: 'Farhana' }]);
    expect(queue.orders).toHaveLength(1);
    expect(queue.pending[0]).toMatchObject({ phone: '01811223344', cod: '1850' });
  });
  it('compares numeric total values without depending on name or price', () => {
    expect(isDuplicateOrder({ ...repeat, cod: '1850.00', product: '1700', name: 'Another name', rawText: '' }, [first])).toBe(true);
  });
  it('allows different phone numbers or different total COD amounts', () => {
    expect(submitOrders([first], [{ ...repeat, rawText: '', phone: '01712345678' }]).orders).toHaveLength(2);
    expect(submitOrders([first], [{ ...repeat, rawText: '', cod: '1900' }]).orders).toHaveLength(2);
  });
  it('does not match missing or invalid phone/total fields', () => {
    for (const patch of [{ phone: '0181122334' }, { cod: '' }, { cod: 'oops' }]) {
      const order = { ...first, ...patch, rawText: '' };
      expect(isDuplicateOrder(order, [order])).toBe(false);
    }
  });
  it('also detects exact repeated raw text even if the original row was edited', () => {
    expect(isDuplicateOrder(repeat, [applyEdit(first, { cod: '2000' })])).toBe(true);
  });
  it('skips a repeat and continues processing other incoming orders', () => {
    const unique = { ...repeat, id: 'unique', phone: '01712345678', rawText: '' };
    const result = resolveDuplicate(submitOrders([first], [repeat, unique]), false);
    expect(result.orders.map(order => order.id)).toEqual([first.id, 'unique']);
    expect(result.pending).toEqual([]);
  });
  it('adds an overridden repeat with a badge flag without changing totals or exports', () => {
    const result = resolveDuplicate(submitOrders([first], [repeat]), true);
    expect(result.orders[1]).toMatchObject({ duplicateConfirmed: true, cod: '1850', product: '1740', delivery: '110' });
    expect(parseCsv(steadfastCsv(result.orders)).slice(1).map(row => row[4])).toEqual(['1850', '1850']);
  });
  it('detects repeats within a single paste and asks about each one separately', () => {
    const queue = submitOrders([], [first, repeat, { ...repeat, id: 'third' }]);
    expect(queue.orders).toHaveLength(1);
    expect(queue.pending).toHaveLength(2);
    const next = resolveDuplicate(queue, true);
    expect(next.orders).toHaveLength(2);
    expect(next.pending[0]?.id).toBe('third');
    expect(resolveDuplicate(next, false).orders).toHaveLength(2);
  });
});