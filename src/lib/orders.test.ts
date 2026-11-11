import { describe, expect, it } from 'vitest';
import { normalizeDigits, orderErrors, parseCsv, parseOrders, sampleText, steadfastCsv, templateCsv } from './orders';

function requiredOrder(text = sampleText, index = 0) {
  const order = parseOrders(text)[index];
  if (!order) throw new Error('Expected parsed order');
  return order;
}

describe('Order clean-up', () => {
  it('extracts recipient, full address, phone and BDT COD', () => {
    const order = parseOrders(sampleText)[0];
    expect(order).toMatchObject({ name: 'Nusrat Jahan', phone: '01712345678', address: 'House 12, Road 4, Dhanmondi, Dhaka', cod: '1450' });
  });
  it('normalizes Bangla digits and parses Bangla labels', () => {
    expect(normalizeDigits('০১৮১২৩৪৫৬৭৮')).toBe('01812345678');
    expect(parseOrders(sampleText)[1]).toMatchObject({ name: 'রাফি হাসান', phone: '01812345678', cod: '850' });
  });
  it('flags a phone missing one of the 11 digits', () => {
    expect(orderErrors(requiredOrder(sampleText, 2))).toContain('phone');
  });
  it('flags missing COD but allows zero COD', () => {
    const order = requiredOrder();
    expect(orderErrors({ ...order, cod: '' })).toContain('cod');
    expect(orderErrors({ ...order, cod: '0' })).not.toContain('cod');
  });
  it('converts a Bangladesh country code to local format', () => {
    expect(requiredOrder('Name: Rafi\nPhone: +8801712345678\nAddress: Dhaka\nCOD: 200').phone).toBe('01712345678');
  });
  it('exports the exact six requested Steadfast columns and quotes addresses', () => {
    const csv = steadfastCsv([requiredOrder()]);
    expect(parseCsv(csv)[0]).toEqual(['Invoice', 'Recipient Name', 'Recipient Address', 'Recipient Phone', 'COD Amount', 'Note']);
    expect(parseCsv(csv)[1]?.[3]).toBe('01712345678');
    expect(parseCsv(csv)[1]?.[2]).toBe('House 12, Road 4, Dhanmondi, Dhaka');
  });
  it('blocks exporting invalid orders', () => {
    expect(() => steadfastCsv(parseOrders(sampleText))).toThrow();
  });
  it('preserves uploaded courier column order and values', () => {
    expect(parseCsv(templateCsv(['RecipientZone', 'RecipientCity', 'RecipientPhone'], [{ RecipientZone: 'Mirpur', RecipientCity: 'Dhaka', RecipientPhone: '01812345678' }]))[1]).toEqual(['Mirpur', 'Dhaka', '01812345678']);
  });
});