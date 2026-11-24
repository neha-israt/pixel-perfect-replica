import { describe, expect, it } from 'vitest';
import { applyEdit, parseOrders, parseCsv, steadfastCsv } from './orders';
import { isDuplicateOrder, resolveDuplicate, submitOrders } from './order-submission';

const raw = 'Name: Farhana Akter\nPhone: 01811223344\nAddress: Road 4, Sylhet\nTotal Bill: 1850';
const first = parseOrders(raw)[0];
if (!first) throw new Error('Missing test order');
const repeat = { ...first, id: 'repeat', invoice: 'OC-0002' };

describe('Duplicate submissions', () => {
  it('holds a parsed re-paste of an unlabeled order before adding it', () => {
    const pasted = 'Nusrat jahan / 01839759159 / hazaribagh, dhaka / 1490 tk';
    const existing = parseOrders(pasted)[0];
    const repeated = parseOrders(pasted, 2)[0];
    if (!existing || !repeated) throw new Error('Expected parsed orders');

    const queue = submitOrders([existing], [repeated]);
    expect(queue.orders).toEqual([existing]);
    expect(queue.pending).toEqual([repeated]);
    expect(resolveDuplicate(queue, true).orders[1]).toMatchObject({ phone: '01839759159', cod: '1490', duplicateConfirmed: true });
  });
  it('holds a matching 11-digit phone and total before adding a second row', () => {
    const queue = submitOrders([first], [{ ...repeat, rawText: '', name: 'Farhana' }]);
    expect(queue.orders).toHaveLength(1);
    expect(queue.pending[0]).toMatchObject({ phone: '01811223344', cod: '1850' });
  });
  it('compares numeric total values without depending on name or price', () => {
    expect(isDuplicateOrder({ ...repeat, cod: '1850.00', product: '1700', name: 'Another name', rawText: '' }, [first])).toBe(true);
  });
  it('uses totalCod aliases and comma-formatted values as the collection total', () => {
    const aliased = { ...repeat, cod: '', totalCod: '1,850', rawText: '' } as typeof repeat & { totalCod: string | number };
    expect(isDuplicateOrder(aliased, [first])).toBe(true);
    expect(isDuplicateOrder({ ...aliased, totalCod: 1850 }, [first])).toBe(true);
  });
  it('allows a different phone but still flags the same phone when COD differs', () => {
    expect(submitOrders([first], [{ ...repeat, rawText: '', phone: '01712345678', name: 'Another customer', address: 'Different district' }]).orders).toHaveLength(2);
    expect(isDuplicateOrder({ ...repeat, rawText: '', cod: '1900' }, [first])).toBe(true);
  });
  it('normalizes country-code and punctuated phones before matching without COD', () => {
    expect(isDuplicateOrder({ ...repeat, phone: '+88 018-1122-3344', cod: '', rawText: '' }, [first])).toBe(true);
  });
  it('matches normalized recipient and address when COD or a valid phone is unavailable', () => {
    const unresolved = { ...repeat, name: '  FARHANA   AKTER ', phone: '0181122334', address: ' road   4 , SYLHET ', cod: '', rawText: '' };
    expect(isDuplicateOrder(unresolved, [first])).toBe(true);
  });
  it('matches a normalized recipient and amount when phone or address differs', () => {
    const sameRecipientAndAmount = { ...repeat, name: ' FARHANA   AKTER ', phone: '01712345678', address: 'Different district', rawText: '' };
    expect(isDuplicateOrder(sameRecipientAndAmount, [first])).toBe(true);
  });
  it('does not match invalid phones when recipient/address and source text differ', () => {
    const unrelated = { ...repeat, name: 'Another person', phone: '0181122334', address: 'Different district', cod: '1900', rawText: '' };
    expect(isDuplicateOrder(unrelated, [first])).toBe(false);
  });
  it('also detects exact repeated raw text even if the original row was edited', () => {
    expect(isDuplicateOrder(repeat, [applyEdit(first, { cod: '2000' })])).toBe(true);
  });
  it('skips a repeat and continues processing other incoming orders', () => {
    const unique = { ...repeat, id: 'unique', phone: '01712345678', name: 'Another customer', address: 'Different district', rawText: '' };
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