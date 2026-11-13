import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { deliveryRates, orderErrors, applyEdit, zoneLabels, type Order, type Zone } from '@/lib/orders';

const labels = { name: 'Recipient name', phone: 'Phone number', address: 'Delivery address', note: 'Delivery note (optional)' } as const;

export function OrderEditor({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (order: Order) => void }) {
  const [draft, setDraft] = useState(order);
  const errors = orderErrors(draft);
  const set = (patch: Partial<Order>) => setDraft(d => applyEdit(d, patch));
  const cls = (k: string) => `field-input ${errors.includes(k) ? 'invalid' : ''}`;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] overflow-auto"><DialogHeader><DialogTitle>{order.name ? 'Edit order' : 'New order'}</DialogTitle><DialogDescription>{draft.invoice}</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={e => { e.preventDefault(); onSave(draft); }}>
    {(['name', 'phone', 'address'] as const).map(key => <label key={key} className="field-label">{labels[key]}{key === 'address' ? <textarea aria-label={labels[key]} className={cls(key)} value={draft[key]} onChange={e => set({ [key]: e.target.value })}/> : <input aria-label={labels[key]} className={cls(key)} value={draft[key]} onChange={e => set({ [key]: e.target.value })}/>}{key === 'phone' && errors.includes(key) && <span className="text-destructive text-[11px]">Enter 11 digits starting with 01.</span>}</label>)}
    <label className="field-label">Delivery zone<select aria-label="Delivery zone" className="field-input" value={draft.zone} onChange={e => { const zone = e.target.value as Zone; set({ zone, delivery: String(deliveryRates[zone]) }); }}>{(Object.keys(zoneLabels) as Zone[]).map(z => <option key={z} value={z}>{zoneLabels[z]} (৳{deliveryRates[z]})</option>)}</select></label>
    <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-3">
      <label className="field-label">Item / Product<input aria-label="Item / Product" className="field-input" value={draft.item ?? ''} onChange={e => set({ item: e.target.value })}/></label>
      <label className="field-label">Qty<input aria-label="Qty" type="number" min={1} step={1} className={cls('qty')} value={draft.qty ?? '1'} onChange={e => set({ qty: e.target.value })}/></label>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label className="field-label">Product amount (৳)<input aria-label="Product amount" type="number" min={0} step="0.01" className={cls('product')} value={draft.product} onChange={e => set({ product: e.target.value })}/></label>
      <label className="field-label">Delivery charge (৳)<input aria-label="Delivery charge" type="number" min={0} step="0.01" className={cls('delivery')} value={draft.delivery} onChange={e => set({ delivery: e.target.value })}/></label>
    </div>
    <label className="field-label">Total COD amount (৳)<input aria-label="Total COD amount" type="number" min={0} step="0.01" className={cls('cod')} value={draft.cod} onChange={e => set({ cod: e.target.value })}/></label>
    <p className="text-xs text-muted-foreground">Product amount = Total COD − Delivery charge. Changing the zone or charge keeps the agreed total.</p>
    <label className="field-label">{labels.note}<textarea aria-label="Delivery note" className="field-input" value={draft.note} onChange={e => set({ note: e.target.value })}/></label>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save order</Button></div>
  </form></DialogContent></Dialog>;
}
