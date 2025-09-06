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
        <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4 lg:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-4 lg:mb-6">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Lembrar</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span>Adicionar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4 w-full">
                <DialogHeader>
                  <DialogTitle>Agendar Lembrete</DialogTitle>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtro:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl lg:text-2xl font-bold">Lembretes Agendados</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-4 lg:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando lembretes...</span>
                </div>
              ) : filteredContas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {statusFilter === 'todos' ? 'Nenhum lembrete encontrado' : `Nenhum lembrete ${statusFilter} encontrado`}
                </div>
              ) : (
                <>
                  {/* Tabela para desktop */}
                  <div className="hidden lg:block">
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
                          
                          return (
                            <TableRow key={conta.id}>
                              <TableCell>
                                <div className="font-semibold">
                                  {conta.description || 'Lembrete sem descrição'}
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
                  </div>

                  {/* Tabela simplificada para tablet */}
                  <div className="hidden md:block lg:hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lembrete</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContas.map((conta) => {
                          const status = getStatus(conta);
                          
                          return (
                            <TableRow key={conta.id}>
                              <TableCell>
                                <div>
                                  <div className="font-semibold text-sm">
                                    {conta.description || 'Lembrete sem descrição'}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDate(conta.scheduledDate)}</span>
                                    </div>
                                    <div className="mt-1">
                                      {formatRecurrence(conta.recurrence)}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={status.variant} className="text-xs">
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(conta)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(conta.id)}
                                    className="text-red-600 border-red-600 hover:bg-red-50 h-7 w-7 p-0"
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
                  </div>

                  {/* Cards para mobile */}
                  <div className="md:hidden space-y-3 p-4">
                    {filteredContas.map((conta) => {
                      const status = getStatus(conta);
                      
                      return (
                        <Card key={conta.id} className="shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate">
                                  {conta.description || 'Lembrete sem descrição'}
                                </h3>
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(conta.scheduledDate)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {formatRecurrence(conta.recurrence)}
                                </div>
                              </div>
                              <Badge variant={status.variant} className="ml-2 flex-shrink-0">
                                {status.label}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(conta)}
                                className="flex-1 h-8 text-xs"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(conta.id)}
                                className="flex-1 h-8 text-xs text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Excluir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md mx-4 w-full">
            <DialogHeader>
              <DialogTitle>Editar Lembrete</DialogTitle>
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