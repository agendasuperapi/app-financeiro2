import React, { useState, useEffect } from 'react';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getScheduledTransactions, markAsPaid, deleteScheduledTransaction } from '@/services/scheduledTransactionService';
import { ScheduledTransaction } from '@/types';
import { Loader2, Edit, Trash2, CheckCircle, Calendar, Plus, Filter } from 'lucide-react';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePreferences } from '@/contexts/PreferencesContext';
import { isAfter, isToday } from 'date-fns';
import { toast } from 'sonner';
import AddContaForm from '@/components/contas/AddContaForm';
import { supabase } from '@/integrations/supabase/client';

const LembrarPage = () => {
  const [contas, setContas] = useState<ScheduledTransaction[]>([]);
  const [filteredContas, setFilteredContas] = useState<ScheduledTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ScheduledTransaction | null>(null);
  const { formatDate } = useDateFormat();
  const { currency } = usePreferences();

  useEffect(() => {
    loadContas();
  }, []);

  useEffect(() => {
    applyStatusFilter();
  }, [contas, statusFilter]);

  const loadContas = async () => {
    setLoading(true);
    try {
      // Buscar diretamente da tabela poupeja_transactions
      const { data, error } = await supabase
        .from("poupeja_transactions")
        .select(`
          *,
          category:poupeja_categories(id, name, icon, color, type)
        `)
        .eq('type', 'lembrete')
        .order("date", { ascending: true });

      if (error) throw error;

      // Converter para o formato esperado
      const filteredData = data.map((item: any) => ({
        id: item.id,
        type: item.type,
        amount: item.amount,
        category: item.category?.name || "Outros",
        category_id: item.category_id,
        categoryIcon: item.category?.icon || "circle",
        categoryColor: item.category?.color || "#607D8B",
        description: item.description || "",
        scheduledDate: item.date,
        recurrence: item.recurrence || 'once',
        goalId: item.goal_id,
        status: item.status || 'pending',
        situacao: item.situacao || 'pendente'
      }));

      setContas(filteredData);
    } catch (error) {
      console.error('Error loading contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyStatusFilter = () => {
    if (statusFilter === 'todos') {
      setFilteredContas(contas);
      return;
    }

    const filtered = contas.filter((conta) => {
      const status = getContaStatus(conta);
      
      switch (statusFilter) {
        case 'pendente':
          return status === 'Pendente';
        case 'avisado':
          return status === 'Avisado';
        default:
          return true;
      }
    });
    
    setFilteredContas(filtered);
  };

  const getContaStatus = (conta: ScheduledTransaction): string => {
    // Use situacao field to determine status
    if (conta.situacao === 'avisado') return 'Avisado';
    return 'Pendente';
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const success = await markAsPaid(id);
      if (success) {
        toast.success('Conta marcada como paga');
        await loadContas();
      } else {
        toast.error('Erro ao marcar conta como paga');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Erro ao marcar conta como paga');
    }
  };

  const handleEdit = async (conta: ScheduledTransaction) => {
    setEditingConta(conta);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await deleteScheduledTransaction(id);
      if (success) {
        toast.success('Conta excluída com sucesso');
        await loadContas();
      } else {
        toast.error('Erro ao excluir conta');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  // Formatar recorrência
  const formatRecurrence = (recurrence?: string) => {
    const recurrenceMap: { [key: string]: string } = {
      'once': 'Uma vez',
      'daily': 'Diário',
      'weekly': 'Semanal',
      'monthly': 'Mensal',
      'yearly': 'Anual'
    };
    return recurrenceMap[recurrence || 'once'] || 'Uma vez';
  };

  // Determinar status
  const getStatus = (conta: ScheduledTransaction) => {
    if (conta.situacao === 'avisado') return { label: 'Avisado', variant: 'default' as const };
    return { label: 'Pendente', variant: 'secondary' as const };
  };

  return (
    <MainLayout>
      <SubscriptionGuard>
        <div className="container mx-auto p-2 md:p-6 space-y-4 md:space-y-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h1 className="text-base md:text-xl font-bold">Lembrar</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Agendar Transação</DialogTitle>
                </DialogHeader>
                <AddContaForm
                  onSuccess={() => {
                    setIsAddDialogOpen(false);
                    loadContas();
                  }}
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Filtro de Status */}
          <div className="flex items-center gap-2 mb-2 md:mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="avisado">Avisado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-2xl font-bold">Agendadas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando contas...</span>
                </div>
              ) : filteredContas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {statusFilter === 'todos' ? 'Nenhuma conta encontrada' : `Nenhuma conta ${statusFilter} encontrada`}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data / Recorrência</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContas.map((conta) => {
                      const status = getStatus(conta);
                      const isPaid = conta.status === 'paid';
                      
                      return (
                        <TableRow key={conta.id}>
                          <TableCell>
                            <div>
                              <div className="font-semibold">
                                {conta.description || 'Conta sem descrição'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(conta.scheduledDate)}</span>
                              </div>
                              <div className="mt-1">
                                {formatRecurrence(conta.recurrence)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(conta)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(conta.id)}
                                className="text-red-600 border-red-600 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Conta</DialogTitle>
            </DialogHeader>
            <AddContaForm
              initialData={editingConta}
              mode="edit"
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setEditingConta(null);
                loadContas();
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingConta(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </SubscriptionGuard>
    </MainLayout>
  );
};

export default LembrarPage;