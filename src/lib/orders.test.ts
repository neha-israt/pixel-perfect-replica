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
    expect(order).toMatchObject({ name: 'Rina Begum', phone: '01556778899', address: 'Agrabad, Chattogram', cod: '1310', product: '1200' });
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

describe('Amount variations', () => {
  const block = (amount: string) => `Name: Rina Begum\nPhone: 01712345678\nAddress: House 12, Road 4, Dhaka\n${amount}`;
  it.each(['Total Bill: 1450', 'Bill: 1450', 'taka 1450', 'tk: 1450', 'amount 1450', 'COD: 1450'])('recognizes %s as total COD', amount => {
    expect(requiredOrder(block(amount))).toMatchObject({ cod: '1450', product: '1390', address: 'House 12, Road 4, Dhaka' });
  });
  it.each(['1450', '1,200 tk', '৳ 1,200', 'Payment 1,200 tk', '১৪৫০'])('falls back to price %s', amount => {
    expect(requiredOrder(block(amount)).cod).toBe(amount.includes('200') ? '1200' : '1450');
  });
  it('ignores parenthetical delivery instructions when extracting a bill', () => {
    expect(requiredOrder(block('Total Bill: 1450 (Delivery charge advance niye na thakle add kore diben)'))).toMatchObject({ cod: '1450', product: '1390' });
  });
  it('ignores numbers inside instructional parentheses for fallback prices', () => {
    expect(requiredOrder(block('(Delivery charge 110 add kore diben)\n1450')).cod).toBe('1450');
  });
  it('preserves partial-payment amounts inside parentheses', () => {
    expect(requiredOrder(block('Price: 1200 tk (advance 200 bkash korci, baki 1000 cod)')).cod).toBe('1000');
  });
  it('subtracts advance from a bill if remaining due is not specified', () => {
    expect(requiredOrder(block('Total Bill: 1200 (advance 200 bkash korci)')).cod).toBe('1000');
  });
  it('does not subtract advance again from a labeled COD', () => {
    expect(requiredOrder(block('Price: 1200\nCOD: 1000 (advance 200 paid)')).cod).toBe('1000');
  });
  it('does not use phone or address numbers when the amount is missing', () => {
    expect(requiredOrder(block('(Delivery charge 110 add kore diben)')).cod).toBe('');
  });
});

describe('Inclusive totals and exclusive prices', () => {
  const block = (amount: string, address = 'Agrabad, Chattogram') => `Name: Rina Begum\nPhone: 01712345678\nAddress: ${address}\n${amount}`;
  it.each(['Total Bill: 1450', 'Total: 1450', 'Grand Total: 1,450'])('subtracts delivery exactly once from %s', label => {
    expect(requiredOrder(block(label))).toMatchObject({ cod: '1450', product: '1340', delivery: '110' });
  });
  it('adds delivery to a plain Price: 1200', () => {
    expect(requiredOrder(block('Price: 1200'))).toMatchObject({ cod: '1310', product: '1200', delivery: '110' });
  });
  it('uses the inside-Dhaka rate for a product price with a currency prefix', () => {
    expect(requiredOrder(block('Price: ৳1450', 'Dhaka'))).toMatchObject({ cod: '1510', product: '1450', delivery: '60' });
  });
  it('prioritizes an explicit total over a separate product price', () => {
    expect(requiredOrder(block('Price: 1200\nTotal Bill: 1450'))).toMatchObject({ cod: '1450', product: '1340', address: 'Agrabad, Chattogram' });
  });
  it('keeps explicit partial-payment collection amounts inclusive', () => {
    expect(requiredOrder(block('Price: 1200 tk (advance 200 bkash korci, baki 1000 cod)'))).toMatchObject({ cod: '1000', product: '890' });
  });
  it('does not add delivery again after subtracting an advance', () => {
    expect(requiredOrder(block('Price: 1200 tk (advance 200 bkash korci)'))).toMatchObject({ cod: '1000', product: '890' });
  });
});

describe('Clean unlabeled addresses and product notes', () => {
  it.each(['Assalamu Alaikum', 'As-salamu alaykum', 'Salam', 'Hi', 'Hello', 'Bhaiya', 'Apu', 'Hello!', 'Salam:'])('ignores greeting %s wherever it appears', greeting => {
    const order = requiredOrder(`${greeting}\nRina Begum\nPhone: 01712345678\n${greeting}\nHouse 12, Road 4\nSylhet\n${greeting}\nTotal Bill: 1450`);
    expect(order).toMatchObject({ name: 'Rina Begum', address: 'House 12, Road 4, Sylhet', note: `${greeting}; ${greeting}; ${greeting}` });
  });
  it.each(['size: XL', 'color: black', '2 pcs', 'dress ta lagbe', 'hoodie set', '1 piece', 'Apu dress ta hobe?'])('moves %s into notes instead of the address', product => {
    const order = requiredOrder(`Rina Begum\n${product}\nPhone: 01712345678\nRoad 4, Sylhet\nTotal Bill: 1450`);
    expect(order).toMatchObject({ name: 'Rina Begum', address: 'Road 4, Sylhet', note: product });
  });
  it('keeps multiple product details alongside the existing merchant note', () => {
    const order = requiredOrder('Name: Rina\nPhone: 01712345678\nhoodie size XL\ncolor black\nRoad 4\nSylhet Sadar\nNote: Call before delivery\nCOD: 1450');
    expect(order).toMatchObject({ address: 'Road 4, Sylhet Sadar', note: 'hoodie size XL; color black; Call before delivery', cod: '1450' });
    const row = parseCsv(steadfastCsv([order]))[1];
    expect(row?.[2]).toBe('Road 4, Sylhet Sadar');
    expect(row?.[5]).toBe('hoodie size XL; color black; Call before delivery');
  });
  it('accepts an unfamiliar locality directly below the phone and its continuation', () => {
    expect(requiredOrder('Name: Rina\nPhone: 01712345678\nKazir Dewri\nBuilding 8/B\nCOD: 1450').address).toBe('Kazir Dewri, Building 8/B');
  });
  it('does not manufacture an address from greetings and item requests', () => {
    const order = requiredOrder('Name: Rina\nPhone: 01712345678\nHello\nhoodie lagbe\nsize XL\nCOD: 1450');
    expect(order).toMatchObject({ address: '', note: 'Hello; hoodie lagbe; size XL' });
    expect(orderErrors(order)).toContain('address');
  });
  it('gives location keywords priority over overlapping item words', () => {
    expect(requiredOrder('Name: Rina\nPhone: 01712345678\nHouse 2, Block A, Dress Road\nSylhet\nCOD: 1450')).toMatchObject({ address: 'House 2, Block A, Dress Road, Sylhet', note: '' });
  });
  it('also keeps product descriptions out of labeled address continuations', () => {
    expect(requiredOrder('Name: Rina\nPhone: 01712345678\nAddress: Kazir Dewri\nhoodie size XL\nSylhet\nCOD: 1450')).toMatchObject({ address: 'Kazir Dewri, Sylhet', note: 'hoodie size XL' });
  });
  it('rejects unrelated openers while recognizing Bangla location details', () => {
    expect(requiredOrder('Hello\nName: Rina\nThank you so much\nPhone: 01712345678\nবাড়ি ১২, মিরপুর\nঢাকা\nড্রেস লাগবে\nCOD: 1450')).toMatchObject({ address: 'বাড়ি 12, মিরপুর, ঢাকা', note: 'Thank you so much; ড্রেস লাগবে' });
  });
});


describe('Conversation routing to Notes', () => {
  it.each(['As-salamu alaykum', 'Assalamu Alaikum', 'Bhaiya', 'Apu'])('routes embedded opener %s out of recipient and address', opener => {
    const order = requiredOrder(`Name: Rina Begum\nPhone: 01712345678\nThanks ${opener}, send it soon\nHouse 12, Road 4\nSylhet\nCOD: 1450`);
    expect(order).toMatchObject({ name: 'Rina Begum', phone: '01712345678', address: 'House 12, Road 4, Sylhet', note: `Thanks ${opener}, send it soon` });
  });
  it('keeps unmatched lines after a location in Notes, not address continuations', () => {
    const order = requiredOrder('Name: Rina\nPhone: 01712345678\nRoad 4, Sylhet\nPlease send the blue one\nGift wrapping needed\nCOD: 1450');
    expect(order).toMatchObject({ address: 'Road 4, Sylhet', note: 'Please send the blue one; Gift wrapping needed' });
  });
  it('does not expose the next unknown line as an address after removing an opener', () => {
    expect(requiredOrder('Name: Rina\nPhone: 01712345678\nApu\nGift wrapping needed\nCOD: 1450')).toMatchObject({ address: '', note: 'Apu; Gift wrapping needed' });
  });
  it('preserves greeting and item notes in the courier export', () => {
    const order = requiredOrder('Name: Rina\nPhone: 01712345678\nAs-salamu alaykum\nhoodie size XL\ncolor black\nRoad 4, Sylhet\nNote: Call first\nCOD: 1450');
    const row = parseCsv(steadfastCsv([order]))[1];
    expect(row?.[1]).toBe('Rina');
    expect(row?.[2]).toBe('Road 4, Sylhet');
    expect(row?.[5]).toBe('As-salamu alaykum; hoodie size XL; color black; Call first');
  });
});
