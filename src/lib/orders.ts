export type Zone = 'inside' | 'outside';
export type Order = { id: string; invoice: string; name: string; phone: string; address: string; item: string; qty: string; product: string; delivery: string; zone: Zone; cod: string; note: string; status?: string; rawText?: string; duplicateConfirmed?: boolean };
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

const amountLabels = /^(?:grand\s+total|total\s+bill|bill|cod(?: amount)?|cash(?: on delivery)?|amount|total|price|product(?: price| amount)?|taka|tk|টাকা|মূল্য|দাম)\s*[:：-]?\s*(?:৳|tk\.?|bdt)?\s*(?=\d)/i;
const withoutParentheses = (text: string) => {
  let clean = text;
  while (/\([^()]*\)/.test(clean)) clean = clean.replace(/\([^()]*\)/g, ' ');
  return clean;
};
const standalonePrice = /^\s*(?:৳|[$€£]|tk\.?|bdt)?\s*\d{1,7}(?:[, ]\d{3})*(?:\.\d{1,2})?\s*(?:৳|[$€£]|tk\.?|taka|bdt|টাকা|\/-)?\s*$/i;
const locationWords = /\b(?:road|rd|house|holding|flat|floor|sector|block|area|thana|sadar|district|village|union|upazila|upazilla|bazar|bazaar|lane|avenue|para|mohalla|dhaka|dhanmondi|mirpur|uttara|agrabad|chattogram|chittagong|sylhet|rajshahi|khulna|barishal|barisal|rangpur|mymensingh|cumilla|comilla|cox'?s bazar|gazipur|narayanganj|narsingdi|tangail|kishoreganj|manikganj|munshiganj|faridpur|gopalganj|madaripur|rajbari|shariatpur|bogura|bogra|joypurhat|naogaon|natore|chapainawabganj|pabna|sirajganj|dinajpur|gaibandha|kurigram|lalmonirhat|nilphamari|panchagarh|thakurgaon|bagerhat|chuadanga|jashore|jessore|jhenaidah|kushtia|magura|meherpur|narail|satkhira|bhola|barguna|jhalokati|patuakhali|pirojpur|bandarban|brahmanbaria|chandpur|feni|khagrachhari|lakshmipur|noakhali|rangamati|habiganj|moulvibazar|sunamganj|jamalpur|netrokona|sherpur)\b|(?:রোড|রাস্তা|বাড়ি|বাড়ি|বাসা|সেক্টর|ব্লক|এলাকা|থানা|সদর|জেলা|গ্রাম|বাজার|ঢাকা|মিরপুর|চট্টগ্রাম|সিলেট|খুলনা|রাজশাহী|বরিশাল|রংপুর|ময়মনসিংহ)/i;
const itemWords = /\b(?:item|product|qty|quantity|size|colou?r|ta|piece|pieces|pcs|lagbe|hoodie|dress|ring|kettle|set|shirt|tshirt|t-shirt|pant|saree|order)\b|(?:সাইজ|রং|কালার|পিস|লাগবে|হুডি|ড্রেস|পণ্য|পরিমাণ|আংটি|কেটলি)/i;
const greetingOpener = /\b(?:as[\s-]*salamu\s+(?:alaikum|alaykum)|assalamu\s+(?:alaikum|alaykum)|salam|hi|hello|bhaiya|bhai|vai|apu)\b|(?:আসসালামু\s*আলাইকুম|সালাম|ভাইয়া|ভাইয়া|আপু)(?:\s|[!,.।]|$)/i;

/** Quantities are read from the message; the item name is always typed by the seller. */
export function extractQuantity(text: string): string {
  const lines = normalizeDigits(text).split('\n').map(line => line.trim());
  const itemLabel = /^(?:item(?: name)?|product(?: name)?|পণ্য)\s*[:：-]\s*/i;
  // Nouns are only a hint for reading a quantity ("2 black hoodie", "hoodie x2"); no item name is ever produced here.
  const noun = /\b(?:hoodie|dress|ring|kettle|shirt|t-?shirt|pants?|saree|set)\b|(?:হুডি|ড্রেস|আংটি|কেটলি)/i;
  const candidates = lines.filter(line => !amountLabels.test(line) && !/^(?:name|recipient|customer|phone|phn|mob(?:ile)?|address|addr|add|note|instruction|নাম|ফোন|ঠিকানা|নোট)\s*[:：-]/i.test(line) && (itemLabel.test(line) || !locationWords.test(line)));
  const qtyLabel = /^(?:qty|quantity|পরিমাণ)\s*[:：-]?\s*(\d+)\b/i;
  const unitQty = /\b(\d+)\s*(?:pcs?|pieces?|units?)\b|(\d+)\s*পিস/i;
  const itemLine = candidates.find(line => noun.test(line)) || '';
  const count = candidates.map(line => line.match(qtyLabel)?.[1] || line.match(unitQty)?.[1] || line.match(unitQty)?.[2]).find(Boolean)
    || itemLine.match(/(?:^|\s)(\d+)\s*(?:x\s*)?(?=(?:black|white|blue|red|green|hoodie|dress|ring|kettle|shirt|saree)\b)/i)?.[1]
    || itemLine.match(/\bx\s*(\d+)\b/i)?.[1];
  return count && Number(count) > 0 ? String(Number(count)) : '1';
}

export function parseOrders(text: string, start = 1): Order[] {
  const normalized = normalizeDigits(text).replace(/\r/g, '').trim();
  if (!normalized) return [];
  const phoneRe = /(?:\+?88[ -]?)?01[\d -]{7,14}\d/;
  // Support compact chat exports that use slashes between the four order fields.
  // Only expand a line when its final segment is clearly an amount and one segment is a phone.
  const prepared = normalized.split('\n').map(line => {
    const parts = line.split('/').map(part => part.trim());
    return parts.length >= 4 && phoneRe.test(parts.join(' ')) && standalonePrice.test(parts[parts.length - 1] ?? '')
      ? parts.join('\n')
      : line;
  }).join('\n');
  const chunks = prepared.split(/\n\s*\n|\n[-=]{3,}\n|\n(?=(?:name|recipient(?: name)?|נাম)\s*[:：])/i).filter(x => x.trim());
  const keyLine = /^[^:：]{1,25}[:：]/;
  const useful = chunks.filter(chunk => phoneRe.test(chunk) || chunk.split('\n').filter(x => keyLine.test(x.trim())).length >= 2);
  return useful.map((rawChunk, i) => {
    const allLines = rawChunk.split('\n').map(x => x.trim()).filter(Boolean);
    // Keep conversation and item requests in Notes, never identity fields.
    const itemDetail = (x: string) => /\b(?:qty|quantity|size|colou?r|ta|piece|pieces|pcs|lagbe)\b|(?:সাইজ|রং|কালার|পিস|লাগবে)/i.test(x);
    const isItem = (x: string) => itemWords.test(x) && (!locationWords.test(x) || itemDetail(x)) && !amountLabels.test(x);
    const chatter = (x: string) => !isItem(x) && (greetingOpener.test(x) || /[?？]|\b(?:hobe|ache|please|plz)\b/i.test(x)) && !phoneRe.test(x) && !/^(?:name|recipient|customer|address|addr|add|note|instruction|নাম|ঠিকানা|নোট)\s*[:：-]/i.test(x);
    const noteOnly = (x: string) => greetingOpener.test(x) || isItem(x) || (chatter(x) && !locationWords.test(x));
    const lines = allLines.filter(x => !noteOnly(x));
    const chunk = lines.join('\n');
    const field = (pattern: RegExp) => lines.find(x => pattern.test(x))?.replace(pattern, '').trim() ?? '';
    const phoneLine = field(/^(?:phone(?: number)?|phn|ph|mob(?:ile)?|cell|contact|ফোন|মোবাইল|নম্বর)\s*[:：-]\s*/i);
    const rawPhone = phoneLine || chunk.match(phoneRe)?.[0] || '';
    let phone = rawPhone.replace(/\D/g, '');
    if (phone.startsWith('8801')) phone = phone.slice(2);
    const codLine = field(amountLabels);
    const nameLabel = /^(?:name|recipient(?: name)?|customer|নাম)\s*[:：-]\s*/i;
    const explicitName = lines.find(x => nameLabel.test(x))?.replace(nameLabel, '').trim() ?? '';
    const usableName = (value: string) => Boolean(value) && !isItem(value) && !greetingOpener.test(value) && !locationWords.test(value) && !/\d|[:：]|(?:tk|bdt)/i.test(value);
    const name = (usableName(explicitName) ? explicitName : '') || lines.find(x => !nameLabel.test(x) && usableName(x)) || '';
    const noteLabel = /^(?:note|instruction|নোট)\s*[:：-]\s*/i;
    const addressLabel = /^(?:address|addr|add|delivery address|ঠিকানা)\s*[:：-]\s*/i;
    const addressIndex = lines.findIndex(x => addressLabel.test(x));
    const known = /^(?:name|recipient|customer|phone|phn|ph|mob|mobile|cell|contact|cod|cash|amount|grand\s+total|total|bill|price|product|taka|tk|note|instruction|নাম|ফোন|মোবাইল|নম্বর|টাকা|মূল্য|দাম|নোট)\b|^(?:নাম|ফোন|মোবাইল|নম্বর|টাকা|মূল্য|দাম|নোট)\s*[:：]/i;
    const isMetadata = (line: string) => known.test(line) || standalonePrice.test(withoutParentheses(line)) || !withoutParentheses(line).trim();
    const phoneIndex = lines.findIndex(x => phoneRe.test(x));
    const matchedPhoneLine = lines[phoneIndex];
    const addressParts: string[] = [];
    const addressLines = new Set<string>();
    lines.forEach((line, index) => {
      if (index === addressIndex) {
        addressParts.push(line.replace(addressLabel, ''));
        addressLines.add(line);
        return;
      }
      if (line === name || isMetadata(line) || phoneRe.test(line) || /(?:tk|bdt|টাকা|৳)/i.test(line)) return;
      // Filtering must not make a later chat line appear directly below the phone.
      const directlyBelowPhone = matchedPhoneLine !== undefined && index === phoneIndex + 1 && allLines.indexOf(line) === allLines.indexOf(matchedPhoneLine) + 1;
      if (locationWords.test(line) || /\bbuilding\b/i.test(line) || directlyBelowPhone) {
        addressParts.push(line);
        addressLines.add(line);
      }
    });
    const note = allLines.filter(line => noteOnly(line) || noteLabel.test(line) || (line !== name && !isMetadata(line) && !addressLines.has(line) && !phoneRe.test(line) && !/(?:tk|bdt|টাকা|৳)/i.test(line))).map(line => line.replace(noteLabel, '').replace(/^(?:name|recipient(?: name)?|customer|নাম)\s*[:：-]\s*/i, '')).join('; ');
    const address = addressParts.join(', ');
    const zone = detectZone(address);
    const delivery = String(deliveryRates[zone]);
    const cod = extractCod(chunk, codLine, delivery);
    return { id: `order-${Date.now()}-${start + i}`, invoice: `OC-${String(start + i).padStart(4, '0')}`, name, phone, address, item: '', qty: extractQuantity(rawChunk), product: productFromCod(cod, delivery), delivery, zone, cod, note, rawText: rawChunk.trim() };
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
  if (!/^\d+$/.test(order.qty ?? '1') || Number(order.qty ?? '1') < 1) errors.push('qty');
  return errors;
}

const csvCell = (value: string) => {
  const safe = (/^[=+@\-\t\r]/.test(value) ? "'" : '') + value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export const steadfastHeaders = ['Invoice', 'Name', 'Address', 'Phone', 'Amount', 'Note'];
export const pathaoHeaders = ['ItemType', 'StoreName', 'MerchantOrderId', 'RecipientName', 'RecipientPhone', 'RecipientAddress', 'RecipientCity', 'RecipientZone', 'AmountToCollect', 'ItemQuantity', 'ItemWeight', 'ItemDesc', 'SpecialInstruction'];
export function orderExportNote(order: Order) {
  return [order.item.trim() && `Item: ${order.item.trim()}`, `Qty: ${order.qty || '1'}`, order.note.trim() && `Note: ${order.note.trim()}`].filter(Boolean).join('; ');
}
export function pathaoOrderRow(order: Order): Record<string, string> {
  return {
    ItemType: 'Parcel', StoreName: '', MerchantOrderId: order.invoice, RecipientName: order.name,
    RecipientPhone: order.phone, RecipientAddress: order.address, RecipientCity: '', RecipientZone: '',
    AmountToCollect: order.cod, ItemQuantity: order.qty || '1', ItemWeight: '',
    ItemDesc: orderExportNote(order), SpecialInstruction: order.note,
  };
}
/** Checked orders take precedence; otherwise export only orders that are ready. */
export function selectExportOrders(orders: Order[], selectedIds: string[]) {
  return selectedIds.length ? orders.filter(order => selectedIds.includes(order.id)) : orders.filter(order => !orderErrors(order).length);
}
export function steadfastCsv(orders: Order[]) {
  if (orders.some(order => orderErrors(order).length)) throw new Error('Correct flagged orders before exporting.');
  return '\uFEFF' + [steadfastHeaders, ...orders.map(o => [o.invoice, o.name, o.address, o.phone, o.cod, orderExportNote(o)])].map(row => row.map(csvCell).join(',')).join('\r\n');
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
  return '\uFEFF' + [headers, ...rows.map(row => headers.map(h => row[h] ?? ''))].map(row => row.map(csvCell).join(',')).join('\r\n');
}
export function pathaoCsv(orders: Order[]) {
  if (orders.some(order => orderErrors(order).length)) throw new Error('Correct flagged orders before exporting.');
  return templateCsv(pathaoHeaders, orders.map(pathaoOrderRow));
}
const num = (v?: string) => (v ? v.replace(/[\s,]/g, '') : '');
/** Explicit collection amounts win; plain product prices include the supplied delivery only when no advance is stated. */
export function extractCod(chunk: string, codLine = '', delivery = '0') {
  chunk = normalizeDigits(chunk);
  codLine = normalizeDigits(codLine);
  const N = '([\\d][\\d,]*(?:\\.\\d+)?)';
  const due = chunk.match(new RegExp(`(?:baki|baaki|due|remaining|বাকি)\\s*[:：-]?\\s*(?:৳|tk\\.?|bdt)?\\s*${N}`, 'i'))?.[1]
    || chunk.match(new RegExp(`${N}[^\\S\\r\\n]*(?:৳|tk|taka|bdt|টাকা)?[^\\S\\r\\n]*(?:cod|cash on delivery)\\b`, 'i'))?.[1];
  if (due) return num(due);
  const first = (t: string) => t.match(new RegExp(N))?.[1];
  const cleanLines = withoutParentheses(chunk).split('\n').map(line => line.trim());
  // Never interpret a phone, address/location, quantity, or note as a fallback price.
  const excludedField = /^(?:name|recipient|customer|phone|phn|ph|mob(?:ile)?|cell|contact|address|addr|add|delivery address|note|instruction|qty|quantity|size|color|colour|নাম|ফোন|মোবাইল|নম্বর|ঠিকানা|নোট|পরিমাণ|সাইজ)\s*[:：-]/i;
  const phone = /(?:\+?88[ -]?)?01[\d -]{7,14}\d/;
  const candidates = cleanLines.filter(line => !excludedField.test(line) && !phone.test(line) && !locationWords.test(line) && !/\b(?:pcs?|pieces?|units?)\b|পিস/i.test(line));
  const totalLine = candidates.find(line => /^(?:grand\s+total|total(?:\s+bill)?)\s*[:：-]?\s*(?:৳|tk\.?|bdt)?\s*\d/i.test(line));
  const labeledLine = totalLine || candidates.find(line => amountLabels.test(line));
  const labeled = labeledLine?.replace(amountLabels, '');
  const explicitCod = candidates.find(line => /^(?:cod(?: amount)?|cash(?: on delivery)?)\s*[:：-]?\s*(?:৳|tk\.?|bdt)?\s*\d/i.test(line));
  // A labeled COD already states the remaining collection amount; do not subtract advance twice.
  if (explicitCod) return num(first(explicitCod.replace(amountLabels, '')));
  const numericAmount = /(?:^|[^\d])((?:\d{1,7}(?:[, ]\d{3})*|\d+)(?:\.\d{1,2})?)(?!\d)/;
  const flexibleLine = candidates.find(line => numericAmount.test(line) && (amountLabels.test(line) || /(?:৳|[$€£]|\btaka?\b|\btka\b|\bbdt\b|টাকা|\bpr(?:i|e)?ce\b|\bprize\b|\bcost\b|\btotal\b|\bbill\b|\bcod\b|\bpayment\b|\bpaymnt\b|\bamount\b|\bamt\b)/i.test(line)))
    || candidates.find(line => standalonePrice.test(line));
  const flexibleValue = flexibleLine?.match(numericAmount)?.[1];
  const main = num(first(labeled ?? '') || first(withoutParentheses(codLine)) || flexibleValue || '');
  const adv = num(chunk.match(new RegExp(`(?:advance|adv|agrim|অগ্রিম|paid)\\s*[:：-]?\\s*(?:৳|tk\\.?)?\\s*${N}`, 'i'))?.[1]);
  if (main && adv && Number(adv) < Number(main)) return String(Number(main) - Number(adv));
  const selectedLine = labeledLine || (!codLine ? flexibleLine : undefined);
  // A standalone tk/taka amount is commonly the merchant's final collection figure.
  // Keep it inclusive; only explicitly labeled product prices add delivery below.
  if (main && !adv && !labeledLine && !codLine && flexibleLine && standalonePrice.test(flexibleLine) && /\b(?:tk|taka)\b|টাকা/i.test(flexibleLine)) return main;
  if (main && !adv && selectedLine && /^(?:price|prize|prce|product(?: price| amount)?|cost)\b/i.test(selectedLine)) return computeCod(main, delivery);
  if (main && !adv && !labeledLine && !codLine && flexibleLine && !/\b(?:total|bill|cod|payment)\b/i.test(flexibleLine)) return computeCod(main, delivery);
  return main;
}
