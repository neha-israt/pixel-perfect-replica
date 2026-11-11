export type Order = { id: string; invoice: string; name: string; phone: string; address: string; cod: string; note: string };
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
COD: 2200`;

export function normalizeDigits(text: string) {
  return text.replace(/[০-৯]/g, digit => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
}

export function parseOrders(text: string, start = 1): Order[] {
  const normalized = normalizeDigits(text).replace(/\r/g, '').trim();
  if (!normalized) return [];
  const chunks = normalized.split(/\n\s*\n|\n[-=]{3,}\n|\n(?=(?:name|recipient(?: name)?|নাম)\s*[:：])/i).filter(x => x.trim());
  return chunks.map((chunk, i) => {
    const lines = chunk.split('\n').map(x => x.trim()).filter(Boolean);
    const field = (pattern: RegExp) => lines.find(x => pattern.test(x))?.replace(pattern, '').trim() ?? '';
    const phoneLine = field(/^(?:phone(?: number)?|mobile|contact|ফোন|মোবাইল|নম্বর)\s*[:：-]\s*/i);
    const rawPhone = phoneLine || chunk.match(/(?:\+?88[ -]?)?01[\d -]{7,14}\d/)?.[0] || '';
    let phone = rawPhone.replace(/\D/g, '');
    if (phone.startsWith('8801')) phone = phone.slice(2);
    const codLine = field(/^(?:cod(?: amount)?|cash(?: on delivery)?|amount|total|price|টাকা|মূল্য|দাম)\s*[:：-]\s*/i);
    const cod = (codLine || chunk.match(/(?:৳|tk\.?|bdt)\s*([\d,]+(?:\.\d+)?)/i)?.[1] || chunk.match(/([\d,]+(?:\.\d+)?)\s*(?:tk|bdt|টাকা)/i)?.[1] || '').replace(/[^\d.]/g, '');
    const name = field(/^(?:name|recipient(?: name)?|customer|নাম)\s*[:：-]\s*/i) || lines.find(x => !/\d|[:：]|(?:tk|bdt)/i.test(x)) || '';
    const note = field(/^(?:note|instruction|নোট)\s*[:：-]\s*/i);
    const addressLabel = /^(?:address|delivery address|ঠিকানা)\s*[:：-]\s*/i;
    const addressIndex = lines.findIndex(x => addressLabel.test(x));
    const known = /^(?:name|recipient|customer|phone|mobile|contact|cod|cash|amount|total|price|note|instruction|নাম|ফোন|মোবাইল|নম্বর|টাকা|মূল্য|দাম|নোট)\b|^(?:নাম|ফোন|মোবাইল|নম্বর|টাকা|মূল্য|দাম|নোট)\s*[:：]/i;
    const address = addressIndex >= 0
      ? [(lines[addressIndex] ?? '').replace(addressLabel, ''), ...lines.slice(addressIndex + 1).filter(x => !known.test(x))].join(', ')
      : lines.filter(x => x !== name && !known.test(x) && !/(?:\+?88)?01[\d -]{7,}|(?:tk|bdt|টাকা|৳)/i.test(x)).join(', ');
    return { id: `order-${Date.now()}-${start + i}`, invoice: `OC-${String(start + i).padStart(4, '0')}`, name, phone, address, cod, note };
  });
}

export function orderErrors(order: Order): string[] {
  const errors: string[] = [];
  if (!order.name.trim()) errors.push('name');
  if (!/^01\d{9}$/.test(order.phone)) errors.push('phone');
  if (!order.address.trim()) errors.push('address');
  if (!order.cod.trim() || !Number.isFinite(Number(order.cod)) || Number(order.cod) < 0) errors.push('cod');
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