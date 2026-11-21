import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { matchingProducts, type CatalogProduct } from '@/lib/product-catalog';

export function ProductAutocomplete({ value, products, label, onChange }: { value: string; products: CatalogProduct[]; label: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const matches = matchingProducts(products, value);
  const choose = (product: CatalogProduct) => { onChange(product.name); setOpen(false); };
  function move(index: number) {
    setActive(index);
    document.getElementById(`${listId}-${index}`)?.scrollIntoView({ block: 'nearest' });
  }
  return <Popover open={open} onOpenChange={setOpen}><PopoverAnchor asChild><div className="product-autocomplete"><input ref={input} role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined} autoComplete="off" className="field-input item-input" placeholder="Type item name" value={value} onFocus={() => { setOpen(true); setActive(0); }} onClick={() => setOpen(true)} onChange={e => { onChange(e.target.value); setActive(0); setOpen(true); }} onKeyDown={e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); setOpen(true);
      if (matches.length) move(open ? (active + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length : 0);
    } else if (e.key === 'Enter' && open) {
      e.preventDefault(); const product = matches[active]; if (product) choose(product);
    } else if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'Tab') { setOpen(false); }
  }}/></div></PopoverAnchor><PopoverContent align="start" className="product-suggestions p-1" onOpenAutoFocus={e => e.preventDefault()} onCloseAutoFocus={e => e.preventDefault()} onInteractOutside={e => { if (e.target === input.current) e.preventDefault(); }}>
    <div role="listbox" id={listId} aria-label="Saved products" className="max-h-56 overflow-y-auto">{matches.length ? matches.map((product, index) => <Button key={product.id} id={`${listId}-${index}`} role="option" aria-selected={active === index} tabIndex={-1} variant="ghost" className={`h-auto w-full justify-between gap-3 whitespace-normal px-2 py-2 text-left text-xs ${active === index ? 'bg-muted text-foreground' : ''}`} onPointerMove={() => setActive(index)} onPointerDown={e => e.preventDefault()} onClick={() => choose(product)}><span className="min-w-0 break-words">{product.name}</span><span className="shrink-0 text-muted-foreground">৳{Number(product.price).toLocaleString('en-BD')}</span></Button>) : <p className="px-2 py-3 text-xs text-muted-foreground">{products.length ? 'No matching products' : 'No saved products yet'}</p>}</div>
  </PopoverContent></Popover>;
}