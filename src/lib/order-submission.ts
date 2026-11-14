import type { Order } from './orders';

export type SubmissionQueue = { orders: Order[]; pending: Order[] };

/** Only valid phone/total pairs or nonempty exact source text identify repeats. */
export function isDuplicateOrder(order: Order, existing: Order[]): boolean {
  return existing.some(previous => {
    const sameCollection = /^01\d{9}$/.test(order.phone)
      && previous.phone === order.phone
      && order.cod.trim() !== '' && previous.cod.trim() !== ''
      && Number.isFinite(Number(order.cod)) && Number.isFinite(Number(previous.cod))
      && Number(order.cod) === Number(previous.cod);
    return sameCollection || Boolean(order.rawText?.trim() && order.rawText === previous.rawText);
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