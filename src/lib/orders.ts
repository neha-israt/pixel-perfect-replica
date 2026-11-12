export type Zone = 'inside' | 'outside';
export type Order = { id: string; invoice: string; name: string; phone: string; address: string; product: string; delivery: string; zone: Zone; cod: string; note: string };
/** Default courier base rates in BDT (Pathao/Steadfast standard parcel benchmarks). */
export const deliveryRates: Record<Zone, number> = { inside: 60, outside: 110 };
export const zoneLabels: Record<Zone, string> = { inside: 'Inside Dhaka', outside: 'Outside Dhaka' };
export function detectZone(address: string): Zone { return /dhaka|ঢাকা/i.test(address) ? 'inside' : 'outside'; }
/** Total COD = product amount + delivery charge; blank when product amount is missing. */
export function computeCod(product: string, delivery: string) {
  if (!product.trim() || !Number.isFinite(Number(product))) return '';
  const total = Number(product) + (Number(delivery) || 0);
  return String(Math.round(total * 100) / 100);
}
/** Product amount = total COD - delivery charge; blank when total is missing. */
export function productFromCod(cod: string, delivery: string) {
  if (!cod.trim() || !Number.isFinite(Number(cod))) return '';
  return String(Math.round((Number(cod) - (Number(delivery) || 0)) * 100) / 100);
}
/** Apply an edit: editing product recomputes the total; editing total, delivery or zone keeps the total and recomputes product. */
export function applyEdit(order: Order, patch: Partial<Order>): Order {
  const next = { ...order, ...patch };
  if ('product' in patch && !('cod' in patch)) return { ...next, cod: computeCod(next.product, next.delivery) };
  if ('cod' in patch || 'delivery' in patch || 'zone' in patch) return { ...next, product: productFromCod(next.cod, next.delivery) };
  return next;
}
export type Batch = { id: string; date: string; courier: string; orders: Order[] };

export const sampleText = `Name: Nusrat Jahan
Phone: 01712-345678
Address: House 12, Road 4, Dhanmondi, Dhaka
COD: 1,450 tk
Note: Please call before delivery

নাম: রাফি হাসান
ফোন: ০১৮১২৩৪৫৬৭৮
ঠিকানা: বাড়ি ২৩, মিরপুর ১০, ঢাকা
টাকা: ৮৫০

Name: Tahmina Akter
Phone: 0191234567
Address: 8/A, Zindabazar, Sylhet
COD: 2200

apu dress ta hobe?
Rina Begum
phn: 01556-778899
addr: Agrabad, Chattogram
price 1200 tk`;

export function normalizeDigits(text: string) {
  return text.replace(/[০-৯]/g, digit => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
}

export function parseOrders(text: string, start = 1): Order[] {
  const normalized = normalizeDigits(text).replace(/\r/g, '').trim();
  if (!normalized) return [];
  const chunks = normalized.split(/\n\s*\n|\n[-=]{3,}\n|\n(?=(?:name|recipient(?: name)?|নাম)\s*[:：])/i).filter(x => x.trim());
  const keyLine = /^[^:：]{1,25}[:：]/;
  const phoneRe = /(?:\+?88[ -]?)?01[\d -]{7,14}\d/;
  const useful = chunks.filter(chunk => phoneRe.test(chunk) || chunk.split('\n').filter(x => keyLine.test(x.trim())).length >= 2);
  return useful.map((rawChunk, i) => {
    const allLines = rawChunk.split('\n').map(x => x.trim()).filter(Boolean);
    // Drop leading conversational lines (questions, greetings) before the first data line.
    const chatter = (x: string) => /[?？]|\b(?:hobe|ache|apu|bhai|vai|assalamu|salam|hi|hello|please|plz)\b/i.test(x) && !keyLine.test(x) && !phoneRe.test(x);
    let startAt = 0; while (startAt < allLines.length - 1 && chatter(allLines[startAt] ?? '')) startAt++;
    const lines = allLines.slice(startAt).filter(x => !chatter(x));
    const chunk = lines.join('\n');
    const field = (pattern: RegExp) => lines.find(x => pattern.test(x))?.replace(pattern, '').trim() ?? '';
    const phoneLine = field(/^(?:phone(?: number)?|phn|ph|mob(?:ile)?|cell|contact|ফোন|মোবাইল|নম্বর)\s*[:：-]\s*/i);
    const rawPhone = phoneLine || chunk.match(phoneRe)?.[0] || '';
    let phone = rawPhone.replace(/\D/g, '');
    if (phone.startsWith('8801')) phone = phone.slice(2);
    const codLine = field(/^(?:cod(?: amount)?|cash(?: on delivery)?|amount|total|price|product(?: price| amount)?|taka|tk|টাকা|মূল্য|দাম)\s*[:：-]?\s*(?=[\d৳])/i);
    const cod = extractCod(chunk, codLine);
    const name = field(/^(?:name|recipient(?: name)?|customer|নাম)\s*[:：-]\s*/i) || lines.find(x => !/\d|[:：]|(?:tk|bdt)/i.test(x)) || '';
    const note = field(/^(?:note|instruction|নোট)\s*[:：-]\s*/i);
    const addressLabel = /^(?:address|addr|add|delivery address|ঠিকানা)\s*[:：-]\s*/i;
    const addressIndex = lines.findIndex(x => addressLabel.test(x));
    const known = /^(?:name|recipient|customer|phone|phn|ph|mob|mobile|cell|contact|cod|cash|amount|total|price|product|taka|tk|note|instruction|নাম|ফোন|মোবাইল|নম্বর|টাকা|মূল্য|দাম|নোট)\b|^(?:নাম|ফোন|মোবাইল|নম্বর|টাকা|মূল্য|দাম|নোট)\s*[:：]/i;
    const address = addressIndex >= 0
      ? [(lines[addressIndex] ?? '').replace(addressLabel, ''), ...lines.slice(addressIndex + 1).filter(x => !known.test(x))].join(', ')
      : lines.filter(x => x !== name && !known.test(x) && !/(?:\+?88)?01[\d -]{7,}|(?:tk|bdt|টাকা|৳)/i.test(x)).join(', ');
    const zone = detectZone(address);
    const delivery = String(deliveryRates[zone]);
    return { id: `order-${Date.now()}-${start + i}`, invoice: `OC-${String(start + i).padStart(4, '0')}`, name, phone, address, product: productFromCod(cod, delivery), delivery, zone, cod, note };
  });
}

export function orderErrors(order: Order): string[] {
  const errors: string[] = [];
  if (!order.name.trim()) errors.push('name');
  if (!/^01\d{9}$/.test(order.phone)) errors.push('phone');
  if (!order.address.trim()) errors.push('address');
  if (!order.cod.trim() || !Number.isFinite(Number(order.cod)) || Number(order.cod) < 0) errors.push('cod');
  if (!order.product.trim() || !Number.isFinite(Number(order.product)) || Number(order.product) < 0) errors.push('product');
  if (!order.delivery.trim() || !Number.isFinite(Number(order.delivery)) || Number(order.delivery) < 0) errors.push('delivery');
  return errors;
}

const quote = (value: string) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replace(/"/g, '""')}"`;
export const steadfastHeaders = ['Invoice', 'Recipient Name', 'Recipient Address', 'Recipient Phone', 'COD Amount', 'Note'];
export function steadfastCsv(orders: Order[]) {
  if (orders.some(order => orderErrors(order).length)) throw new Error('Correct flagged orders before exporting.');
  return '\uFEFF' + [steadfastHeaders, ...orders.map(o => [o.invoice, o.name, o.address, o.phone, o.cod, o.note])].map(row => row.map(quote).join(',')).join('\r\n');
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ''; let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { if (quoted && input[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(value); value = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && input[i + 1] === '\n') i++; row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = ''; }
    else value += c;
  }
  row.push(value); if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function templateCsv(headers: string[], rows: Record<string, string>[]) {
  return '\uFEFF' + [headers, ...rows.map(row => headers.map(h => row[h] ?? ''))].map(row => row.map(quote).join(',')).join('\r\n');
}
const num = (v?: string) => (v ? v.replace(/,/g, '') : '');
/** Amount the courier collects: explicit due/baki/"N cod" wins, else price minus advance, else first listed amount. */
export function extractCod(chunk: string, codLine = '') {
  const N = '([\\d][\\d,]*(?:\\.\\d+)?)';
  const due = chunk.match(new RegExp(`(?:baki|baaki|due|remaining|বাকি)\\s*[:：-]?\\s*(?:৳|tk\\.?|bdt)?\\s*${N}`, 'i'))?.[1]
    || chunk.match(new RegExp(`${N}\\s*(?:৳|tk|taka|bdt|টাকা)?\\s*(?:cod|cash on delivery)\\b`, 'i'))?.[1];
  if (due) return num(due);
  const first = (t: string) => t.match(new RegExp(N))?.[1];
  const main = num(first(codLine.replace(/\(.*?\)/g, ' ')) || chunk.match(new RegExp(`(?:৳|tk\\.?|bdt)\\s*${N}`, 'i'))?.[1] || chunk.match(new RegExp(`${N}\\s*(?:tk|bdt|টাকা)`, 'i'))?.[1]);
  const adv = num(chunk.match(new RegExp(`(?:advance|adv|agrim|অগ্রিম|paid)\\s*[:：-]?\\s*(?:৳|tk\\.?)?\\s*${N}`, 'i'))?.[1]);
  if (main && adv && Number(adv) < Number(main)) return String(Number(main) - Number(adv));
  return main;
}
