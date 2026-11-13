export type Zone = 'inside' | 'outside';
export type Order = { id: string; invoice: string; name: string; phone: string; address: string; item: string; qty: string; product: string; delivery: string; zone: Zone; cod: string; note: string };
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
const standalonePrice = /^\s*(?:৳|tk\.?|bdt)?\s*\d{1,7}(?:,\d{3})*(?:\.\d{1,2})?\s*(?:৳|tk\.?|taka|bdt|টাকা)?\s*$/i;
const locationWords = /\b(?:road|rd|house|holding|flat|floor|sector|block|area|thana|sadar|district|village|union|upazila|upazilla|bazar|bazaar|lane|avenue|para|mohalla|dhaka|dhanmondi|mirpur|uttara|agrabad|chattogram|chittagong|sylhet|rajshahi|khulna|barishal|barisal|rangpur|mymensingh|cumilla|comilla|cox'?s bazar|gazipur|narayanganj|narsingdi|tangail|kishoreganj|manikganj|munshiganj|faridpur|gopalganj|madaripur|rajbari|shariatpur|bogura|bogra|joypurhat|naogaon|natore|chapainawabganj|pabna|sirajganj|dinajpur|gaibandha|kurigram|lalmonirhat|nilphamari|panchagarh|thakurgaon|bagerhat|chuadanga|jashore|jessore|jhenaidah|kushtia|magura|meherpur|narail|satkhira|bhola|barguna|jhalokati|patuakhali|pirojpur|bandarban|brahmanbaria|chandpur|feni|khagrachhari|lakshmipur|noakhali|rangamati|habiganj|moulvibazar|sunamganj|jamalpur|netrokona|sherpur)\b|(?:রোড|রাস্তা|বাড়ি|বাড়ি|বাসা|সেক্টর|ব্লক|এলাকা|থানা|সদর|জেলা|গ্রাম|বাজার|ঢাকা|মিরপুর|চট্টগ্রাম|সিলেট|খুলনা|রাজশাহী|বরিশাল|রংপুর|ময়মনসিংহ)/i;
const itemWords = /\b(?:item|product|qty|quantity|size|colou?r|ta|piece|pieces|pcs|lagbe|hoodie|dress|ring|kettle|set|shirt|tshirt|t-shirt|pant|saree|order)\b|(?:সাইজ|রং|কালার|পিস|লাগবে|হুডি|ড্রেস|পণ্য|পরিমাণ|আংটি|কেটলি)/i;
const greetingOpener = /\b(?:as[\s-]*salamu\s+(?:alaikum|alaykum)|assalamu\s+(?:alaikum|alaykum)|salam|hi|hello|bhaiya|bhai|vai|apu)\b|(?:আসসালামু\s*আলাইকুম|সালাম|ভাইয়া|ভাইয়া|আপু)(?:\s|[!,.।]|$)/i;

/** Item descriptions and quantities are independent of money, phones and locations. */
export function extractItemDetails(text: string): Pick<Order, 'item' | 'qty'> {
  const lines = normalizeDigits(text).split('\n').map(line => line.trim());
  const itemLabel = /^(?:item(?: name)?|product(?: name)?|পণ্য)\s*[:：-]\s*/i;
  const noun = /\b(?:hoodie|dress|ring|kettle|shirt|t-?shirt|pants?|saree|set)\b|(?:হুডি|ড্রেস|আংটি|কেটলি)/i;
  const candidates = lines.filter(line => !amountLabels.test(line) && !/^(?:name|recipient|customer|phone|phn|mob(?:ile)?|address|addr|add|note|instruction|নাম|ফোন|ঠিকানা|নোট)\s*[:：-]/i.test(line) && (itemLabel.test(line) || !locationWords.test(line)));
  const qtyLabel = /^(?:qty|quantity|পরিমাণ)\s*[:：-]?\s*(\d+)\b/i;
  const unitQty = /\b(\d+)\s*(?:pcs?|pieces?|units?)\b|(\d+)\s*পিস/i;
  const itemLine = candidates.find(line => itemLabel.test(line)) || candidates.find(line => noun.test(line)) || '';
  const count = candidates.map(line => line.match(qtyLabel)?.[1] || line.match(unitQty)?.[1] || line.match(unitQty)?.[2]).find(Boolean)
    || itemLine.match(/(?:^|\s)(\d+)\s*(?:x\s*)?(?=(?:black|white|blue|red|green|hoodie|dress|ring|kettle|shirt|saree)\b)/i)?.[1]
    || itemLine.match(/\bx\s*(\d+)\b/i)?.[1];
  let item = itemLine.replace(itemLabel, '').replace(/^.*?\b(?:apu|bhaiya|bhai|vai)\b[\s,:-]*/i, '')
    .replace(/\b\d+\s*(?:pcs?|pieces?|units?)\b|(\d+)\s*পিস/gi, '').replace(/^\d+\s*(?:x\s*)?/i, '')
    .replace(/\bx\s*\d+\b/gi, '').replace(/\b(?:ta|lagbe|hobe|please|plz|send|want|need)\b/gi, '')
    .replace(/\bsize\s*[:：-]?\s*\S+/gi, '').replace(/[?？]/g, '').replace(/\s+/g, ' ').trim();
  const color = candidates.find(line => /^(?:colou?r|কালার|রং)\s*[:：-]?/i.test(line))?.replace(/^(?:colou?r|কালার|রং)\s*[:：-]?\s*/i, '').trim();
  if (item && color && !item.toLowerCase().includes(color.toLowerCase())) item = `${color} ${item}`;
  return { item, qty: count && Number(count) > 0 ? String(Number(count)) : '1' };
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
    // Keep conversation and item requests in Notes, never identity fields.
    const isItem = (x: string) => itemWords.test(x) && !locationWords.test(x) && !amountLabels.test(x);
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
    const name = field(/^(?:name|recipient(?: name)?|customer|নাম)\s*[:：-]\s*/i) || lines.find(x => !isItem(x) && !locationWords.test(x) && !/\d|[:：]|(?:tk|bdt)/i.test(x)) || '';
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
    const note = allLines.filter(line => noteOnly(line) || noteLabel.test(line) || (line !== name && !isMetadata(line) && !addressLines.has(line) && !phoneRe.test(line) && !/(?:tk|bdt|টাকা|৳)/i.test(line))).map(line => line.replace(noteLabel, '')).join('; ');
    const address = addressParts.join(', ');
    const zone = detectZone(address);
    const delivery = String(deliveryRates[zone]);
    const cod = extractCod(chunk, codLine, delivery);
    return { id: `order-${Date.now()}-${start + i}`, invoice: `OC-${String(start + i).padStart(4, '0')}`, name, phone, address, ...extractItemDetails(rawChunk), product: productFromCod(cod, delivery), delivery, zone, cod, note };
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
  // Never interpret a phone, house/road number, or instructional note as a fallback price.
  const candidates = cleanLines.filter(line => !/^(?:phone|phn|ph|mob(?:ile)?|cell|contact|address|addr|add|delivery address|note|instruction|ফোন|মোবাইল|নম্বর|ঠিকানা|নোট)\s*[:：-]/i.test(line));
  const totalLine = candidates.find(line => /^(?:grand\s+total|total(?:\s+bill)?)\s*[:：-]?\s*(?:৳|tk\.?|bdt)?\s*\d/i.test(line));
  const labeledLine = totalLine || candidates.find(line => amountLabels.test(line));
  const labeled = labeledLine?.replace(amountLabels, '');
  const explicitCod = candidates.find(line => /^(?:cod(?: amount)?|cash(?: on delivery)?)\s*[:：-]?\s*(?:৳|tk\.?|bdt)?\s*\d/i.test(line));
  // A labeled COD already states the remaining collection amount; do not subtract advance twice.
  if (explicitCod) return num(first(explicitCod.replace(amountLabels, '')));
  const currency = candidates.join('\n').match(/(?:^|[^\d,])(?:৳|\btk\.?|\bbdt)\s*(\d{1,7}(?:,\d{3})*(?:\.\d{1,2})?)(?![\d,])/i)?.[1]
    || candidates.join('\n').match(/(?:^|[^\d,])(\d{1,7}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:৳|tk\b|taka\b|bdt\b|টাকা)/i)?.[1];
  const fallback = candidates.find(line => standalonePrice.test(line));
  const main = num(first(labeled ?? '') || first(withoutParentheses(codLine)) || currency || first(fallback ?? ''));
  const adv = num(chunk.match(new RegExp(`(?:advance|adv|agrim|অগ্রিম|paid)\\s*[:：-]?\\s*(?:৳|tk\\.?)?\\s*${N}`, 'i'))?.[1]);
  if (main && adv && Number(adv) < Number(main)) return String(Number(main) - Number(adv));
  if (main && !adv && labeledLine && /^(?:price|product(?: price| amount)?)\b/i.test(labeledLine)) return computeCod(main, delivery);
  return main;
}
