import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { orderErrors, type Order } from '@/lib/orders';

export function OrderEditor({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (order: Order) => void }) {
  const [draft, setDraft] = useState(order);
  const errors = orderErrors(draft);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{order.name ? 'Edit order' : 'New order'}</DialogTitle><DialogDescription>{draft.invoice}</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={e => { e.preventDefault(); onSave(draft); }}>
    {(['name', 'phone', 'address', 'cod', 'note'] as const).map(key => <label key={key} className="field-label">{{ name: 'Recipient name', phone: 'Phone number', address: 'Delivery address', cod: 'COD amount (৳)', note: 'Delivery note (optional)' }[key]}{key === 'address' || key === 'note' ? <textarea aria-label={key === 'address' ? 'Delivery address' : 'Delivery note'} className={`field-input ${errors.includes(key) ? 'invalid' : ''}`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/> : <input aria-label={{ name: 'Recipient name', phone: 'Phone number', cod: 'COD amount' }[key]} className={`field-input ${errors.includes(key) ? 'invalid' : ''}`} type={key === 'cod' ? 'number' : 'text'} min={key === 'cod' ? 0 : undefined} step={key === 'cod' ? '0.01' : undefined} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/>} {key === 'phone' && errors.includes(key) && <span className="text-destructive text-[11px]">Enter 11 digits starting with 01.</span>}</label>)}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save order</Button></div>
  </form></DialogContent></Dialog>;
}