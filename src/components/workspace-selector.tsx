import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

export function WorkspaceSelector() {
  const { active, names, ready, switchWorkspace, createWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  return <>
    <Select disabled={!ready} value={active} onValueChange={value => {
      if (value === '__new__') { setName(''); setError(''); setOpen(true); }
      else switchWorkspace(value);
    }}>
      <SelectTrigger aria-label="Workspace" className="h-8 w-36 min-w-0 bg-card text-xs shadow-none"><SelectValue /></SelectTrigger>
      <SelectContent className="max-w-64 shadow-none">{names.map(value => <SelectItem key={value} value={value}><span className="block max-w-52 truncate">{value}</span></SelectItem>)}<SelectItem value="__new__"><span className="flex items-center gap-1"><Plus size={13}/>New Workspace</span></SelectItem></SelectContent>
    </Select>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>New Workspace</DialogTitle><DialogDescription>On this browser only</DialogDescription></DialogHeader>
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); if (name.trim() === '__new__') { setError('Choose a different workspace name.'); return; } const result = createWorkspace(name); setError(result); if (!result) setOpen(false); }}>
        <label className="field-label">Workspace name<input autoFocus aria-label="Workspace name" className="field-input" maxLength={60} value={name} onChange={event => setName(event.target.value)} required /></label>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit"><Plus/>Create workspace</Button></div>
      </form>
    </DialogContent></Dialog>
  </>;
}