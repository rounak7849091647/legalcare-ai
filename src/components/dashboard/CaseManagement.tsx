import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Briefcase, Calendar, AlertCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Case {
  id: string;
  title: string;
  case_number: string | null;
  case_type: string;
  status: string;
  description: string | null;
  client_name: string | null;
  opposing_party: string | null;
  court_name: string | null;
  next_hearing_date: string | null;
  priority: string | null;
  notes: string | null;
  created_at: string;
}

const caseTypes  = ['Civil','Criminal','Family','Property','Labor','Consumer','Tax','Corporate','Constitutional','Other'];
const priorities = ['low','medium','high'];
const statuses   = ['active','pending','closed'];

const emptyForm = {
  title:'', case_number:'', case_type:'', status:'active',
  description:'', client_name:'', opposing_party:'',
  court_name:'', next_hearing_date:'', priority:'medium', notes:'',
};

const CaseManagement = ({ userId }: { userId: string }) => {
  const [cases, setCases]           = useState<Case[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCase, setEditingCase]   = useState<Case | null>(null);
  const [formData, setFormData]         = useState({ ...emptyForm });

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const data = await authFetch<Case[]>(`/api/cases`);
      setCases(data || []);
    } catch {
      toast.error('Failed to fetch cases');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCases(); }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.case_type) { toast.error('Please fill in required fields'); return; }

    try {
      if (editingCase) {
        await authFetch(`/api/cases/${editingCase.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success('Case updated successfully');
      } else {
        await authFetch(`/api/cases`, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('Case created successfully');
      }
      fetchCases();
    } catch {
      toast.error(editingCase ? 'Failed to update case' : 'Failed to create case');
    }
    resetForm();
    setIsDialogOpen(false);
  };

  const handleDelete = async (caseId: string) => {
    if (!confirm('Are you sure you want to delete this case?')) return;
    try {
      await authFetch(`/api/cases/${caseId}`, { method: 'DELETE' });
      toast.success('Case deleted');
      fetchCases();
    } catch {
      toast.error('Failed to delete case');
    }
  };

  const handleEdit = (c: Case) => {
    setEditingCase(c);
    setFormData({
      title: c.title, case_number: c.case_number || '', case_type: c.case_type,
      status: c.status, description: c.description || '', client_name: c.client_name || '',
      opposing_party: c.opposing_party || '', court_name: c.court_name || '',
      next_hearing_date: c.next_hearing_date || '', priority: c.priority || 'medium', notes: c.notes || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => { setFormData({ ...emptyForm }); setEditingCase(null); };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (filterStatus === 'all' || c.status === filterStatus);
  });

  const getStatusColor = (s: string) =>
    s === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
    s === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
    'bg-gray-500/10 text-gray-600 border-gray-500/20';

  const getPriorityColor = (p: string | null) =>
    p === 'high' ? 'text-red-500' : p === 'medium' ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Case Management</h2>
          <p className="text-sm text-muted-foreground">Manage and track all your legal cases</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />New Case</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingCase ? 'Edit Case' : 'Create New Case'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Case Title *</Label>
                  <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Enter case title" required />
                </div>
                <div className="space-y-2">
                  <Label>Case Number</Label>
                  <Input value={formData.case_number} onChange={e => setFormData({ ...formData, case_number: e.target.value })} placeholder="e.g., CIV/2024/001" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Case Type *</Label>
                  <Select value={formData.case_type} onValueChange={v => setFormData({ ...formData, case_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{caseTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} placeholder="Enter client name" />
                </div>
                <div className="space-y-2">
                  <Label>Opposing Party</Label>
                  <Input value={formData.opposing_party} onChange={e => setFormData({ ...formData, opposing_party: e.target.value })} placeholder="Enter opposing party" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Court Name</Label>
                  <Input value={formData.court_name} onChange={e => setFormData({ ...formData, court_name: e.target.value })} placeholder="Enter court name" />
                </div>
                <div className="space-y-2">
                  <Label>Next Hearing Date</Label>
                  <Input type="date" value={formData.next_hearing_date} onChange={e => setFormData({ ...formData, next_hearing_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit">{editingCase ? 'Update Case' : 'Create Case'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search cases..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>)}
        </div>
      ) : filteredCases.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No cases found</h3>
          <p className="text-muted-foreground mb-4">{searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Create your first case to get started'}</p>
          {!searchQuery && filterStatus === 'all' && <Button onClick={() => setIsDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Case</Button>}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCases.map(c => (
            <Card key={c.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{c.title}</h3>
                      {c.case_number && <span className="text-xs text-muted-foreground">#{c.case_number}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{c.case_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(c.status)}>{c.status}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(c)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {c.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{c.description}</p>}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {c.client_name && <span>Client: {c.client_name}</span>}
                  {c.priority && <span className={`flex items-center gap-1 ${getPriorityColor(c.priority)}`}><AlertCircle className="w-3 h-3" />{c.priority} priority</span>}
                  {c.next_hearing_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(c.next_hearing_date), 'MMM d, yyyy')}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseManagement;
