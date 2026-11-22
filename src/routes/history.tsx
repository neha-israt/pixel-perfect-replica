import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, History, Trash2 } from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace-shell';
import { Button } from '@/components/ui/button';
import { deleteBatch, downloadCsv, readBatches } from '@/lib/batch-storage';
import { steadfastCsv, type Batch } from '@/lib/orders';
import { PathaoExport } from '@/components/pathao-export';
import { useWorkspace } from '@/components/workspace-provider';

export const Route = createFileRoute('/history')({ head: () => ({ meta: [{ title: 'Batch history — OrderClean BD' }, { name: 'description', content: 'Review your saved courier dispatch batches and download order files again.' }, { property: 'og:title', content: 'Batch history — OrderClean BD' }, { property: 'og:description', content: 'Your device-local ledger of courier order exports.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }), component: BatchHistory });
function BatchHistory() {
  const { active, ready, reportStorageError } = useWorkspace();
  const [batches,setBatches] = useState<Batch[]>([]);
  const [message,setMessage] = useState('');
  const [pathao,setPathao] = useState<Batch | null>(null);
  const [expanded,setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    setBatches([]); setMessage(''); setPathao(null); setExpanded(null);
    try { setBatches(readBatches(active)); }
    catch (error) { reportStorageError(error); setMessage('History could not be read from this device.'); }
  }, [active, ready, reportStorageError]);
  return <WorkspaceShell><div className="page-heading"><div><h1>Batch history</h1><p className="subtitle">Your exported orders, all in one place.</p></div><Button variant="outline" size="sm" asChild><Link to="/"><ArrowLeft/>Order workspace</Link></Button></div>{message && <p role="alert" className="mt-5 text-xs text-destructive">{message}</p>}<div className="section-head"><h2><History size={17}/>{batches.length} saved batches</h2><span className="text-xs text-muted-foreground">On this device only</span></div><div className="table-wrap">{!batches.length ? <div className="empty-state"><History size={28} className="mx-auto mb-3"/>No exported batches yet.</div> : batches.map(batch => <div key={batch.id} className="border-b border-border p-5"><div className="flex flex-wrap gap-4 items-center justify-between"><div><p className="font-semibold text-sm">{batch.courier} <span className="tag good ml-2">CSV exported</span></p><p className="text-xs text-muted-foreground mt-2">{new Date(batch.date).toLocaleString()} · {batch.orders.length} orders · ৳ {batch.orders.reduce((sum,o) => sum + Number(o.cod), 0).toLocaleString('en-BD')}</p></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === batch.id ? null : batch.id)}>{expanded === batch.id ? 'Hide orders' : 'View orders'}</Button><Button variant="outline" size="icon" aria-label={`Download ${batch.courier} batch`} onClick={() => { if (batch.courier === 'Pathao') setPathao(batch); else downloadCsv(steadfastCsv(batch.orders), `orderclean-batch-${batch.id}.csv`); }}><Download/></Button><Button variant="ghost" size="icon" aria-label="Delete batch" onClick={() => { if (!window.confirm('Delete this saved batch?')) return; try { deleteBatch(batch.id, active); setBatches(readBatches(active)); } catch (error) { reportStorageError(error); setMessage('This batch could not be deleted.'); } }}><Trash2/></Button></div></div>{expanded === batch.id && <div className="overflow-x-auto mt-4"><table className="order-table"><thead><tr><th>Invoice</th><th>Recipient</th><th>Phone</th><th>Address</th><th>COD</th></tr></thead><tbody>{batch.orders.map(o => <tr key={o.id}><td>{o.invoice}</td><td>{o.name}</td><td>{o.phone}</td><td>{o.address}</td><td>৳ {o.cod}</td></tr>)}</tbody></table></div>}</div>)}</div>{pathao && <PathaoExport orders={pathao.orders} onClose={() => setPathao(null)} onExport={csv => { downloadCsv(csv, `orderclean-pathao-${pathao.id}.csv`);setPathao(null); }}/>}</WorkspaceShell>;
}