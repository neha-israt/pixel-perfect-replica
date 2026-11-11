import { describe, expect, it } from 'vitest';
import { computeCod, normalizeDigits, orderErrors, parseCsv, parseOrders, sampleText, steadfastCsv, templateCsv } from './orders';

function requiredOrder(text = sampleText, index = 0) {
  const order = parseOrders(text)[index];
  if (!order) throw new Error('Expected parsed order');
  return order;
}

describe('Order clean-up', () => {
  it('extracts recipient, full address, phone and BDT COD', () => {
    const order = parseOrders(sampleText)[0];
    expect(order).toMatchObject({ name: 'Nusrat Jahan', phone: '01712345678', address: 'House 12, Road 4, Dhanmondi, Dhaka', product: '1450', zone: 'inside', delivery: '60', cod: '1510' });
  });
  it('normalizes Bangla digits and parses Bangla labels', () => {
    expect(normalizeDigits('০১৮১২৩৪৫৬৭৮')).toBe('01812345678');
    expect(parseOrders(sampleText)[1]).toMatchObject({ name: 'রাফি হাসান', phone: '01812345678', product: '850' });
  });
  it('flags a phone missing one of the 11 digits', () => {
    expect(orderErrors(requiredOrder(sampleText, 2))).toContain('phone');
  });
  it('flags missing product amount but allows zero', () => {
    const order = requiredOrder();
    expect(orderErrors({ ...order, product: '' })).toContain('product');
    expect(orderErrors({ ...order, product: '0' })).not.toContain('product');
  });
  it('ignores leading chat and reads abbreviated labels', () => {
    const order = requiredOrder('apu dress ta hobe?\nRina Begum\nphn: 01556-778899\naddr: Agrabad, Chattogram\nprice 1200 tk');
    expect(order).toMatchObject({ name: 'Rina Begum', phone: '01556778899', address: 'Agrabad, Chattogram', product: '1200' });
    expect(orderErrors(order)).toEqual([]);
  });
  it('defaults delivery to 60 inside Dhaka and 110 outside', () => {
    expect(requiredOrder(sampleText, 0)).toMatchObject({ zone: 'inside', delivery: '60' });
    expect(requiredOrder(sampleText, 2)).toMatchObject({ zone: 'outside', delivery: '110', cod: '2310' });
  });
  it('computes total COD as product plus delivery', () => {
    expect(computeCod('1450', '75')).toBe('1525');
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