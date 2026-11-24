import { useState } from 'react';
import { Upload, Download, AlertCircle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { orderExportNote, parseCsv, pathaoHeaders, pathaoOrderRow, templateCsv, type Order } from '@/lib/orders';

export function fieldKey(header: string): 'invoice' | 'name' | 'phone' | 'address' | 'cod' | 'note' | 'qty' | undefined {
  const h = header.toLowerCase().replace(/[^a-z]/g, '');
  if (/invoice|merchantorder|orderid/.test(h)) return 'invoice';
  if (/^(?:recipientname|customername|name)$/.test(h)) return 'name';
  if (/^(?:recipientphone(?:number)?|customerphone(?:number)?|phone(?:number)?|contactnumber|mobile(?:number)?)$/.test(h)) return 'phone';
  if (/^(?:recipientaddress|customeraddress|deliveryaddress|address)$/.test(h)) return 'address';
  if (/^(?:amounttocollect|codamount|totalcod|collectionamount|cod|amount)$/.test(h)) return 'cod';
  if (/^(?:itemquantity|quantity|qty)$/.test(h)) return 'qty';
  if (/^(?:itemdesc|itemdescription)$/.test(h)) return 'note';
  if (/instruction|note/.test(h)) return 'note';
  return undefined;
}
export function PathaoExport({ orders, onClose, onExport }: { orders: Order[]; onClose: () => void; onExport: (csv: string) => void }) {
  const [headers, setHeaders] = useState<string[]>(pathaoHeaders);
  const [rows, setRows] = useState<Record<string, string>[]>(() => orders.map(pathaoOrderRow));
  const [customTemplate, setCustomTemplate] = useState(false);
  const [error, setError] = useState('');
  const extra = headers.filter(h => !fieldKey(h));
  const orderValue = (order: Order, header: string) => {
    const normalized = header.toLowerCase().replace(/[^a-z]/g, '');
    if (normalized === 'itemdesc') return orderExportNote(order);
    if (normalized === 'specialinstruction') return order.note;
    const key = fieldKey(header);
    return key ? String(order[key] ?? '') : '';
  };
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-w-3xl max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>Export for Pathao</DialogTitle><DialogDescription>{customTemplate ? 'Your uploaded sample header and column order are preserved. Complete each additional field required by the template.' : 'Download the standard Pathao bulk columns, or upload a current sample CSV to use its exact headers and column order.'}</DialogDescription></DialogHeader><label className="field-label border border-dashed border-input p-5 rounded-md"><span className="flex gap-2 items-center"><Upload size={16}/>Upload optional Pathao sample CSV</span><input type="file" accept=".csv" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { const parsed = parseCsv(await file.text()); const head = parsed[0] || []; if (!head.length || !head.some(h => fieldKey(h) === 'phone') || !head.some(h => fieldKey(h) === 'name')) throw new Error('Choose a Pathao sample CSV with recipient name and phone columns.'); setHeaders(head); setRows(orders.map(order => Object.fromEntries(head.map(h => [h, orderValue(order, h)])))); setCustomTemplate(true); setError(''); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to read the template.'); } }}/></label>
    {!!headers.length && <><div className="text-xs text-muted-foreground flex gap-2"><AlertCircle size={15}/>{customTemplate ? 'Complete the remaining template fields for every order.' : 'Store, city, zone, and weight are left blank rather than guessed; fill them if needed.'}</div><div className="overflow-x-auto"><table className="order-table"><thead><tr><th>Recipient</th>{extra.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={orders[i]?.id ?? i}><td>{orders[i]?.name}</td>{extra.map(h => <td key={h}><input className="field-input min-w-32" aria-label={`${h} for ${orders[i]?.name}`} value={row[h] ?? ''} onChange={e => setRows(current => current.map((r, j) => i === j ? { ...r, [h]: e.target.value } : r))}/></td>)}</tr>)}</tbody></table></div><Button disabled={customTemplate && rows.some(row => extra.some(h => !row[h]?.trim()))} onClick={() => onExport(templateCsv(headers, rows))}><Download/>{customTemplate ? 'Download Pathao CSV' : 'Download standard Pathao CSV'}</Button></>}
    {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
  </DialogContent></Dialog>;
}