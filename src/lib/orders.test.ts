import { describe, expect, it } from 'vitest';
import { applyEdit, computeCod, normalizeDigits, orderErrors, parseCsv, parseOrders, sampleText, steadfastCsv, templateCsv } from './orders';

function requiredOrder(text = sampleText, index = 0) {
  const order = parseOrders(text)[index];
  if (!order) throw new Error('Expected parsed order');
  return order;
}

describe('Order clean-up', () => {
  it('extracts recipient, full address, phone and BDT COD', () => {
    const order = parseOrders(sampleText)[0];
    expect(order).toMatchObject({ name: 'Nusrat Jahan', phone: '01712345678', address: 'House 12, Road 4, Dhanmondi, Dhaka', cod: '1450', zone: 'inside', delivery: '60', product: '1390' });
  });
  it('normalizes Bangla digits and parses Bangla labels', () => {
    expect(normalizeDigits('০১৮১২৩৪৫৬৭৮')).toBe('01812345678');
    expect(parseOrders(sampleText)[1]).toMatchObject({ name: 'রাফি হাসান', phone: '01812345678', cod: '850', product: '790' });
  });
  it('flags a phone missing one of the 11 digits', () => {
    expect(orderErrors(requiredOrder(sampleText, 2))).toContain('phone');
  });
  it('flags missing total COD but allows zero product amount', () => {
    const order = requiredOrder();
    expect(orderErrors({ ...order, cod: '' })).toContain('cod');
    expect(orderErrors({ ...order, product: '0' })).not.toContain('product');
  });
  it('ignores leading chat and reads abbreviated labels', () => {
    const order = requiredOrder('apu dress ta hobe?\nRina Begum\nphn: 01556-778899\naddr: Agrabad, Chattogram\nprice 1200 tk');
    expect(order).toMatchObject({ name: 'Rina Begum', phone: '01556778899', address: 'Agrabad, Chattogram', cod: '1200', product: '1090' });
    expect(orderErrors(order)).toEqual([]);
  });
  it('defaults delivery to 60 inside Dhaka and 110 outside', () => {
    expect(requiredOrder(sampleText, 0)).toMatchObject({ zone: 'inside', delivery: '60' });
    expect(requiredOrder(sampleText, 2)).toMatchObject({ zone: 'outside', delivery: '110', cod: '2200', product: '2090' });
  });
  it('computes total COD as product plus delivery', () => {
    expect(computeCod('1450', '75')).toBe('1525');
  });
  it('keeps the agreed total when the zone changes and back-calculates product', () => {
    const order = applyEdit(requiredOrder(), { zone: 'outside', delivery: '110' });
    expect(order).toMatchObject({ cod: '1450', product: '1340' });
  });
  it('editing total COD back-calculates product; editing product updates total', () => {
    const order = requiredOrder();
    expect(applyEdit(order, { cod: '2000' }).product).toBe('1940');
    expect(applyEdit(order, { product: '1000' }).cod).toBe('1060');
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
describe('Courier CSV exports', () => {
  it('Steadfast uses exact column order, Total COD and 11-digit phone with leading 0', () => {
    const order = requiredOrder();
    const rows = parseCsv(steadfastCsv([order]));
    expect(rows[0]).toEqual(['Invoice', 'Recipient Name', 'Recipient Address', 'Recipient Phone', 'COD Amount', 'Note']);
    expect(rows[1]?.[3]).toBe('01712345678');
    expect(rows[1]?.[4]).toBe('1450');
  });
  it('Pathao keeps the uploaded template column order', () => {
    const headers = ['ItemType', 'RecipientName', 'RecipientPhone', 'RecipientCity', 'RecipientZone'];
    const rows = parseCsv(templateCsv(headers, [{ RecipientPhone: '01712345678', RecipientName: 'A', ItemType: 'Parcel', RecipientCity: 'Dhaka', RecipientZone: 'Mirpur' }]));
    expect(rows[0]).toEqual(headers);
    expect(rows[1]).toEqual(['Parcel', 'A', '01712345678', 'Dhaka', 'Mirpur']);
  });
});

import { extractCod as _x } from './orders';
describe('partial payments', () => {
  it('uses baki amount, not smushed numbers', () => expect(_x('Price: 1200 tk (advance 200 bkash korci, baki 1000 cod)', 'Price: 1200 tk (advance 200 bkash korci, baki 1000 cod)')).toBe('1000'));
  it('subtracts advance when no due given', () => expect(_x('Price: 1200 tk advance 200', 'Price: 1200 tk advance 200')).toBe('1000'));
  it('plain COD stays total', () => expect(_x('COD: 1,450 tk', 'COD: 1,450 tk')).toBe('1450'));
});
