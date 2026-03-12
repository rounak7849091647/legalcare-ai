import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface CaseManagementProps {
  userId: string;
}

const caseTypes = [
  'Civil', 'Criminal', 'Family', 'Property', 'Labor', 'Consumer', 
  'Tax', 'Corporate', 'Constitutional', 'Other'
];

const priorities = ['low', 'medium', 'high'];
const statuses = ['active', 'pending', 'closed'];

const CaseManagement = ({ userId }: CaseManagementProps) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    case_number: '',
    case_type: '',
    status: 'active',
    description: '',
    client_name: '',
    opposing_party: '',
    court_name: '',
    next_hearing_date: '',
    priority: 'medium',
    notes: ''
  });

  const fetchCases = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch cases');
    } else {
      setCases(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCases();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.case_type) {
      toast.error('Please fill in required fields');
      return;
    }

    const caseData = {
      ...formData,
      user_id: userId,
      next_hearing_date: formData.next_hearing_date || null,
      case_number: formData.case_number || null,
      description: formData.description || null,
      client_name: formData.client_name || null,
      opposing_party: formData.opposing_party || null,
      court_name: formData.court_name || null,
      notes: formData.notes || null
    };

    if (editingCase) {
      const { error } = await supabase
        .from('cases')
        .update(caseData)
        .eq('id', editingCase.id);

      if (error) {
        toast.error('Failed to update case');
      } else {
        toast.success('Case updated successfully');
        fetchCases();
      }
    } else {
      const { error } = await supabase
        .from('cases')
        .insert([caseData]);

      if (error) {
        toast.error('Failed to create case');
      } else {
        toast.success('Case created successfully');
        fetchCases();
      }
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleDelete = async (caseId: string) => {
    if (!confirm('Are you sure you want to delete this case?')) return;

    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', caseId);

    if (error) {
      toast.error('Failed to delete case');
    } else {
      toast.success('Case deleted');
      fetchCases();
    }
  };

  const handleEdit = (caseItem: Case) => {
    setEditingCase(caseItem);
    setFormData({
      title: caseItem.title,
      case_number: caseItem.case_number || '',
      case_type: caseItem.case_type,
      status: caseItem.status,
      description: caseItem.description || '',
      client_name: caseItem.client_name || '',
      opposing_party: caseItem.opposing_party || '',
      court_name: caseItem.court_name || '',
      next_hearing_date: caseItem.next_hearing_date || '',
      priority: caseItem.priority || 'medium',
      notes: caseItem.notes || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      case_number: '',
      case_type: '',
      status: 'active',
      description: '',
      client_name: '',
      opposing_party: '',
      court_name: '',
      next_hearing_date: '',
      priority: 'medium',
      notes: ''
    });
    setEditingCase(null);
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'closed': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Case Management</h2>
          <p className="text-sm text-muted-foreground">Manage and track all your legal cases</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCase ? 'Edit Case' : 'Create New Case'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Case Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter case title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="case_number">Case Number</Label>
                  <Input
                    id="case_number"
                    value={formData.case_number}
                    onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                    placeholder="e.g., CIV/2024/001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Case Type *</Label>
                  <Select value={formData.case_type} onValueChange={(v) => setFormData({ ...formData, case_type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {caseTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(p => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opposing_party">Opposing Party</Label>
                  <Input
                    id="opposing_party"
                    value={formData.opposing_party}
                    onChange={(e) => setFormData({ ...formData, opposing_party: e.target.value })}
                    placeholder="Enter opposing party"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="court_name">Court Name</Label>
                  <Input
                    id="court_name"
                    value={formData.court_name}
                    onChange={(e) => setFormData({ ...formData, court_name: e.target.value })}
                    placeholder="Enter court name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_hearing_date">Next Hearing Date</Label>
                  <Input
                    id="next_hearing_date"
                    type="date"
                    value={formData.next_hearing_date}
                    onChange={(e) => setFormData({ ...formData, next_hearing_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the case"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCase ? 'Update Case' : 'Create Case'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cases List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No cases found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your filters'
                : 'Create your first case to get started'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Case
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCases.map((caseItem) => (
            <Card key={caseItem.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{caseItem.title}</h3>
                      {caseItem.case_number && (
                        <span className="text-xs text-muted-foreground">#{caseItem.case_number}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{caseItem.case_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(caseItem)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(caseItem.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {caseItem.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {caseItem.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {caseItem.client_name && (
                    <span>Client: {caseItem.client_name}</span>
                  )}
                  {caseItem.priority && (
                    <span className={`flex items-center gap-1 ${getPriorityColor(caseItem.priority)}`}>
                      <AlertCircle className="w-3 h-3" />
                      {caseItem.priority} priority
                    </span>
                  )}
                  {caseItem.next_hearing_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(caseItem.next_hearing_date), 'MMM d, yyyy')}
                    </span>
                  )}
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
