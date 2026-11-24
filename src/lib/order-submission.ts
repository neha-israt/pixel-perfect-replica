import type { Order } from './orders';
import { normalizeDigits } from './orders';

export type SubmissionQueue = { orders: Order[]; pending: Order[] };

function totalCod(order: Order): string {
  // `cod` is the current model's total collection amount; accept `totalCod` in
  // older/imported records so duplicate checks use the same semantic value.
  const alias = (order as Order & { totalCod?: unknown }).totalCod;
  if (typeof alias === 'string' && alias.trim()) return alias;
  return typeof alias === 'number' && Number.isFinite(alias) ? String(alias) : order.cod;
}

function normalizedPhone(value: string): string {
  let digits = normalizeDigits(value).replace(/\D/g, '');
  if (digits.startsWith('8801')) digits = digits.slice(2);
  return /^01\d{9}$/.test(digits) ? digits : '';
}

function normalizedText(value: string): string {
  return normalizeDigits(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function normalizedAmount(value: string): string {
  const amount = value.trim().replace(/[\s,]/g, '');
  return amount && Number.isFinite(Number(amount)) ? String(Number(amount)) : '';
}

/** A valid local phone identifies a repeat even when one order's COD is unresolved. */
export function isDuplicateOrder(order: Order, existing: Order[]): boolean {
  return existing.some(previous => {
    const orderPhone = normalizedPhone(order.phone);
    const previousPhone = normalizedPhone(previous.phone);
    const samePhone = Boolean(orderPhone && previousPhone && orderPhone === previousPhone);
    const orderName = normalizedText(order.name);
    const previousName = normalizedText(previous.name);
    const orderAddress = normalizedText(order.address);
    const previousAddress = normalizedText(previous.address);
    const orderCod = normalizedAmount(totalCod(order));
    const previousCod = normalizedAmount(totalCod(previous));
    const sameRecipientAndAmount = Boolean(orderName && orderCod && orderName === previousName && orderCod === previousCod);
    const sameRecipientAddress = Boolean(orderName && orderAddress && orderName === previousName && orderAddress === previousAddress)
      && (!orderCod || !previousCod || orderCod === previousCod);
    return samePhone || sameRecipientAndAmount || sameRecipientAddress || Boolean(order.rawText?.trim() && order.rawText === previous.rawText);
  });
}

/** Stop at each repeat so later entries cannot bypass a merchant's decision. */
export function submitOrders(orders: Order[], incoming: Order[]): SubmissionQueue {
  const accepted = [...orders];
  for (const [index, order] of incoming.entries()) {
    if (isDuplicateOrder(order, accepted)) return { orders: accepted, pending: incoming.slice(index) };
    accepted.push(order);
  }
  return { orders: accepted, pending: [] };
}

export function resolveDuplicate(queue: SubmissionQueue, addAnyway: boolean): SubmissionQueue {
  const [order, ...rest] = queue.pending;
  if (!order) return queue;
  const accepted = addAnyway ? [...queue.orders, { ...order, duplicateConfirmed: true }] : queue.orders;
  return submitOrders(accepted, rest);
}