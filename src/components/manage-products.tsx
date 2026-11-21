import { useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { validProduct, type CatalogProduct } from '@/lib/product-catalog';

export function ManageProducts({ products, onSave, onClose }: { products: CatalogProduct[]; onSave: (products: CatalogProduct[]) => boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<CatalogProduct>({ id: '', name: '', price: '' });
  const [error, setError] = useState('');
  const editing = Boolean(draft.id);
  const reset = () => setDraft({ id: '', name: '', price: '' });
  function persist(next: CatalogProduct[]) {
    const saved = onSave(next);
    setError(saved ? '' : 'Products could not be saved on this device. Please try again.');
    return saved;
  }
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] overflow-auto"><DialogHeader><DialogTitle>Manage Products</DialogTitle><DialogDescription>Product catalog · On this device only</DialogDescription></DialogHeader>
    <form className="grid gap-3" onSubmit={event => {
      event.preventDefault();
      const product = { ...draft, id: draft.id || crypto.randomUUID(), name: draft.name.trim() };
      if (!validProduct(product)) { setError('Enter a product name and a valid default price.'); return; }
      if (persist(editing ? products.map(p => p.id === product.id ? product : p) : [...products, product])) reset();
    }}>
      <label className="field-label">Product name<input aria-label="Catalog product name" className="field-input" value={draft.name} required onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}/></label>
      <label className="field-label">Default price (৳)<input aria-label="Default price" className="field-input" type="number" min="0" step="0.01" required value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))}/></label>
      <div className="flex justify-end gap-2">{editing && <Button type="button" variant="ghost" onClick={reset}><X/>Cancel edit</Button>}<Button type="submit">{editing ? <Save/> : <Plus/>}{editing ? 'Save product' : 'Add product'}</Button></div>
    </form>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <div className="divide-y divide-border border-t border-border">{products.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No saved products yet.</p> : products.map(product => <div key={product.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{product.name}</p><p className="text-xs text-muted-foreground">৳{Number(product.price).toLocaleString('en-BD')}</p></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label={`Edit product ${product.name}`} title="Edit product" onClick={() => setDraft(product)}><Pencil/></Button><Button variant="ghost" size="icon" aria-label={`Delete product ${product.name}`} title="Delete product" onClick={() => { if (persist(products.filter(p => p.id !== product.id)) && draft.id === product.id) reset(); }}><Trash2/></Button></div></div>)}</div>
  </DialogContent></Dialog>;
}