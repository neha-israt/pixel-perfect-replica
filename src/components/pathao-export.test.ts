import { describe, expect, it } from 'vitest';
import { fieldKey } from './pathao-export';
import { parseCsv, templateCsv } from '@/lib/orders';

describe('Pathao template mapping', () => {
  it.each([
    ['Recipient Phone Number', 'phone'],
    ['Phone Number', 'phone'],
    ['Recipient Address', 'address'],
    ['Delivery Address', 'address'],
    ['Recipient Name', 'name'],
    ['Total COD', 'cod'],
    ['Amount to Collect', 'cod'],
    ['ItemQuantity', 'qty'],
    ['ItemDesc', 'note'],
  ] as const)('maps %s to %s', (header, expected) => {
    expect(fieldKey(header)).toBe(expected);
  });

  it('keeps mapped values and phone leading zeros in the uploaded template order', () => {
    const headers = ['Recipient Phone Number', 'Recipient Name', 'Total COD'];
    const order = { phone: '01712345678', name: 'Rina', cod: '1450' };
    const row = Object.fromEntries(headers.map(header => {
      const key = fieldKey(header);
      return [header, key ? order[key] : ''];
    }));
    expect(parseCsv(templateCsv(headers, [row]))[1]).toEqual(['01712345678', 'Rina', '1450']);
  });
});
