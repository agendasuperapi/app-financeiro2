import React, { useState, useEffect } from 'react';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getScheduledTransactions, markAsPaid, deleteScheduledTransaction } from '@/services/scheduledTransactionService';
import { ScheduledTransaction } from '@/types';
import { Loader2, Edit, Trash2, CheckCircle, Calendar, Plus, Filter, User, Search, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { 
  isAfter, 
  isToday, 
  addMonths, 
  subMonths, 
  addYears, 
  subYears 
} from 'date-fns';
import { toast } from 'sonner';
import AddContaForm from '@/components/contas/AddContaForm';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const LembrarPage = () => {
  
  // Função para normalizar valores de recorrência
  const normalizeRecurrence = (recurrence: string | null | undefined): 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' => {
    if (!recurrence) return 'once';
    
    const recurrenceMap: { [key: string]: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' } = {
      'Uma vez': 'once',
      'Diário': 'daily',
      'Semanal': 'weekly',
      'Mensal': 'monthly',
      'Anual': 'yearly',
      'once': 'once',
      'daily': 'daily',
      'weekly': 'weekly',
      'monthly': 'monthly',
      'yearly': 'yearly'
    };
    
    return recurrenceMap[recurrence] || 'once';
  };
  const [contas, setContas] = useState<ScheduledTransaction[]>([]);
  const [filteredContas, setFilteredContas] = useState<ScheduledTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('mes');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ScheduledTransaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<ScheduledTransaction | null>(null);
  const { formatDate } = useDateFormat();
  const { currency } = usePreferences();
  const { isClientView, selectedUser, targetUserId } = useClientAwareData();

  // Função para navegação de data
  const handleDateNavigation = (direction: 'prev' | 'next') => {
    if (dateFilter === 'mes') {
      setSelectedDate(direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1));
    } else if (dateFilter === 'ano') {
      setSelectedDate(direction === 'prev' ? subYears(selectedDate, 1) : addYears(selectedDate, 1));
    }
  };

  const getDateFilterLabel = () => {
    const { formatMonth } = useDateFormat();
    
    switch (dateFilter) {
      case 'mes':
        return formatMonth(selectedDate);
      case 'ano':
        return selectedDate.getFullYear().toString();
      case 'periodo':
        if (startDate && endDate) {
          return `${formatDate(startDate)} - ${formatDate(endDate)}`;
        }
        return 'Selecionar período';
      default:
        return '';
    }
  };

  useEffect(() => {
    loadContas();
  }, [targetUserId]);

  useEffect(() => {
    applyFilters();
  }, [contas, statusFilter, searchQuery, dateFilter, selectedDate, startDate, endDate]);

  const loadContas = async () => {
    setLoading(true);
    try {
      // Buscar diretamente da tabela poupeja_transactions para o usuário específico
      const { data, error } = await supabase
        .from("poupeja_transactions")
        .select(`
          *,
          category:poupeja_categories(id, name, icon, color, type)
        `)
        .eq('type', 'lembrete')
        .eq('user_id', targetUserId)
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
        recurrence: normalizeRecurrence(item.recurrence),
        goalId: item.goal_id,
        status: item.status || 'pending',
        situacao: item.situacao || 'pendente',
        creatorName: item.name ? item.name : undefined
      }));

      setContas(filteredData);
    } catch (error) {
      console.error('Error loading contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...contas];

    // Aplicar filtro de pesquisa
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((conta) => 
        conta.description?.toLowerCase().includes(query) ||
        conta.category?.toLowerCase().includes(query) ||
        conta.creatorName?.toLowerCase().includes(query)
      );
    }

    // Aplicar filtro de status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter((conta) => {
        const status = getContaStatus(conta);
        
        switch (statusFilter) {
          case 'pendente':
            return status === 'Pendente';
          case 'avisado':
            return status === 'Avisado';
          case 'ativo':
            return status === 'Ativo';
          case 'concluido':
            return status === 'Concluído';
          case 'cancelado':
            return status === 'Cancelado';
          default:
            return true;
        }
      });
    }

    // Aplicar filtro de data
    if (dateFilter !== 'todos') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      filtered = filtered.filter((conta) => {
        const contaDate = new Date(conta.scheduledDate);
        const contaDateOnly = new Date(contaDate.getFullYear(), contaDate.getMonth(), contaDate.getDate());

        switch (dateFilter) {
          case 'hoje':
            return contaDateOnly.getTime() === today.getTime();
          case 'ontem':
            return contaDateOnly.getTime() === yesterday.getTime();
          case 'amanha':
            return contaDateOnly.getTime() === tomorrow.getTime();
          case 'proximos7dias':
            const next7Days = new Date(today);
            next7Days.setDate(next7Days.getDate() + 7);
            return contaDateOnly >= today && contaDateOnly <= next7Days;
          case 'mes':
            return contaDate.getMonth() === selectedDate.getMonth() && contaDate.getFullYear() === selectedDate.getFullYear();
          case 'ano':
            return contaDate.getFullYear() === selectedDate.getFullYear();
          case 'periodo':
            if (startDate && endDate) {
              const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
              const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
              return contaDateOnly >= startDateOnly && contaDateOnly <= endDateOnly;
            }
            return true;
          default:
            return true;
        }
      });
    }

    setFilteredContas(filtered);
  };

  const getContaStatus = (conta: ScheduledTransaction): string => {
    // Use situacao field to determine status
    const situacao = conta.situacao?.toLowerCase() || 'pendente';
    
    switch (situacao) {
      case 'avisado':
        return 'Avisado';
      case 'ativo':
        return 'Ativo';
      case 'concluido':
      case 'concluído':
        return 'Concluído';
      case 'cancelado':
        return 'Cancelado';
      case 'pendente':
      default:
        return 'Pendente';
    }
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

  const handleDeleteClick = (conta: ScheduledTransaction) => {
    setContaToDelete(conta);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (contaToDelete) {
      try {
        const success = await deleteScheduledTransaction(contaToDelete.id);
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
    }
    setDeleteDialogOpen(false);
    setContaToDelete(null);
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

  // Determinar status baseado na coluna situacao do Supabase
  const getStatus = (conta: ScheduledTransaction) => {
    const situacao = conta.situacao?.toLowerCase() || 'pendente';
    
    switch (situacao) {
      case 'avisado':
        return { label: 'Avisado', variant: 'default' as const };
      case 'ativo':
        return { label: 'Ativo', variant: 'default' as const };
      case 'concluido':
      case 'concluído':
        return { label: 'Concluído', variant: 'destructive' as const };
      case 'cancelado':
        return { label: 'Cancelado', variant: 'destructive' as const };
      case 'pendente':
      default:
        return { label: 'Pendente', variant: 'secondary' as const };
    }
  };

  return (
    <MainLayout>
      <SubscriptionGuard>
          <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4 lg:space-y-6">
            {isClientView && selectedUser && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    Visualizando relatórios de: {selectedUser.name} ({selectedUser.email})
                  </span>
                </div>
              </div>
            )}
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
                  targetUserId={targetUserId}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-col lg:flex-row gap-2 mb-2 md:mb-4">
            {/* Campo de Pesquisa */}
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar lembretes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Status e Período na mesma linha */}
            <div className="flex gap-2 lg:gap-2">
              {/* Filtro de Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 lg:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="avisado">Avisado</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro de Data */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="flex-1 lg:w-[180px]">
                  <SelectValue placeholder="Data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Datas</SelectItem>
                  <SelectItem value="ontem">Ontem</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="amanha">Amanhã</SelectItem>
                  <SelectItem value="proximos7dias">Próximos 7 dias</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                  <SelectItem value="ano">Ano</SelectItem>
                  <SelectItem value="periodo">Período</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Controles de Navegação de Data */}
          {(dateFilter === 'mes' || dateFilter === 'ano') && (
            <div className="flex justify-center mb-2 md:mb-4">
              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateNavigation('prev')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm font-medium px-2 min-w-[120px] text-center">
                  {getDateFilterLabel()}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateNavigation('next')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Seletor de Período */}
          {dateFilter === 'periodo' && (
            <div className="flex justify-center mb-2 md:mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal w-full sm:w-[140px]",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? formatDate(startDate) : "Data inicial"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal w-full sm:w-[140px]",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? formatDate(endDate) : "Data final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          
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
                  {searchQuery || statusFilter !== 'todos' || dateFilter !== 'todos' 
                    ? 'Nenhum lembrete encontrado com os filtros aplicados' 
                    : 'Nenhum lembrete encontrado'
                  }
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
                                     <span>{formatDate(conta.scheduledDate, 'dd/MM/yyyy HH:mm')}</span>
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
                                    onClick={() => handleDeleteClick(conta)}
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
                                       <span>{formatDate(conta.scheduledDate, 'dd/MM/yyyy HH:mm')}</span>
                                    </div>
                                     <div className="mt-1">
                                       {conta.creatorName ? (
                                         <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-[9px] font-medium mr-2">
                                           {conta.creatorName}
                                         </span>
                                       ) : null}
                                       <span>{formatRecurrence(conta.recurrence)}</span>
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
                                    onClick={() => handleDeleteClick(conta)}
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
                                  <span>{formatDate(conta.scheduledDate, 'dd/MM/yyyy HH:mm')}</span>
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
                                onClick={() => handleDeleteClick(conta)}
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
              targetUserId={targetUserId}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                {contaToDelete && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-medium">
                      {contaToDelete.description || 'Lembrete sem descrição'}
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SubscriptionGuard>
    </MainLayout>
  );
};

export default LembrarPage;