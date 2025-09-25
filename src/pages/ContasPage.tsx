import React, { useState, useEffect } from 'react';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
import { getScheduledTransactions, markAsPaid, markAsReceived, deleteScheduledTransaction } from '@/services/scheduledTransactionService';
import { Loader2, Edit, Trash2, CheckCircle, Plus, Filter, User, ChevronLeft, ChevronRight, CalendarIcon, Search } from 'lucide-react';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { ScheduledTransaction } from '@/types';
import { 
  isAfter, 
  isToday, 
  isYesterday, 
  isTomorrow, 
  isWithinInterval, 
  startOfDay, 
  endOfDay, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  addMonths, 
  addYears, 
  subMonths, 
  subYears 
} from 'date-fns';
import { toast } from 'sonner';
import ContaForm from '@/components/contas/ContaForm';

const ContasPage = () => {
  const [contas, setContas] = useState<ScheduledTransaction[]>([]);
  const [filteredContas, setFilteredContas] = useState<ScheduledTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<string>('mes');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ScheduledTransaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<ScheduledTransaction | null>(null);
  const { formatDate } = useDateFormat();
  const { currency } = usePreferences();
  const { isClientView, selectedUser, targetUserId } = useClientAwareData();

  useEffect(() => {
    if (targetUserId) {
      loadContas();
    }
  }, [targetUserId]);

  useEffect(() => {
    applyFilters();
  }, [contas, statusFilter, dateFilter, selectedDate, startDate, endDate, searchQuery]);

  const loadContas = async () => {
    setLoading(true);
    try {
      if (!targetUserId) {
        setContas([]);
        return;
      }
      const data = await getScheduledTransactions(targetUserId);
      
      // Gerar simulações para transações mensais
      const simulatedTransactions = generateMonthlySimulations(data);
      setContas([...data, ...simulatedTransactions]);
    } catch (error) {
      console.error('Error loading contas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para gerar simulações de transações mensais
  const generateMonthlySimulations = (transactions: ScheduledTransaction[]): ScheduledTransaction[] => {
    const simulations: ScheduledTransaction[] = [];
    const currentDate = new Date();
    
    // Filtrar apenas transações mensais que ainda não foram pagas
    const monthlyTransactions = transactions.filter(
      transaction => transaction.recurrence === 'monthly' && transaction.status !== 'paid'
    );
    
    monthlyTransactions.forEach(transaction => {
      const originalDate = new Date(transaction.scheduledDate);
      
      // Gerar simulações para os próximos 12 meses
      for (let i = 1; i <= 12; i++) {
        const simulatedDate = addMonths(originalDate, i);
        
        // Só adicionar se a data simulada for futura
        if (simulatedDate > currentDate) {
          const simulatedTransaction: ScheduledTransaction = {
            ...transaction,
            id: `${transaction.id}_simulated_${i}`,
            scheduledDate: simulatedDate.toISOString(),
            status: 'pending',
            description: `${transaction.description} (Simulação)`,
            // Marcar como simulação para distinguir visualmente
            __isSimulation: true
          };
          
          simulations.push(simulatedTransaction);
        }
      }
    });
    
    return simulations;
  };

  const applyFilters = () => {
    let filtered = contas;

    // Apply status filter
    if (statusFilter !== 'todos') {
      filtered = filtered.filter((conta) => {
        const status = getContaStatus(conta);
        
        switch (statusFilter) {
          case 'pendente':
            return status === 'Pendente';
          case 'pago':
            return status === 'Pago';
          case 'vencido':
            return status === 'Vencido' || status === 'Vence Hoje';
          default:
            return true;
        }
      });
    }

    // Apply date filter
    if (dateFilter !== 'todos') {
      filtered = filtered.filter((conta) => {
        const contaDate = new Date(conta.scheduledDate);
        const today = new Date();
        
        switch (dateFilter) {
          case 'ontem':
            return isYesterday(contaDate);
          case 'hoje':
            return isToday(contaDate);
          case 'amanha':
            return isTomorrow(contaDate);
          case 'proximos7dias':
            return isWithinInterval(contaDate, {
              start: startOfDay(today),
              end: endOfDay(addDays(today, 7))
            });
          case 'mes':
            return isWithinInterval(contaDate, {
              start: startOfMonth(selectedDate),
              end: endOfMonth(selectedDate)
            });
          case 'ano':
            return isWithinInterval(contaDate, {
              start: startOfYear(selectedDate),
              end: endOfYear(selectedDate)
            });
          case 'periodo':
            if (startDate && endDate) {
              return isWithinInterval(contaDate, {
                start: startOfDay(startDate),
                end: endOfDay(endDate)
              });
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((conta) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          conta.description?.toLowerCase().includes(searchLower) ||
          conta.category?.toLowerCase().includes(searchLower) ||
          conta.creatorName?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    setFilteredContas(filtered);
  };

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

  const getContaStatus = (conta: ScheduledTransaction): string => {
    const scheduledDate = new Date(conta.scheduledDate);
    const isOverdue = isAfter(new Date(), scheduledDate) && !isToday(scheduledDate);
    const isDueToday = isToday(scheduledDate);
    const isPaid = conta.status === 'paid' || conta.status === 'recebido';

    if (isPaid) {
      return conta.status === 'recebido' ? 'Recebido' : 'Pago';
    }
    if (isDueToday) return 'Vence Hoje';
    if (isOverdue) return 'Vencido';
    return 'Pendente';
  };

  const handleMarkAsPaid = async (id: string) => {
    console.log('🎯 handleMarkAsPaid called with ID:', id);
    console.log('🔍 markAsPaid function:', typeof markAsPaid);
    try {
      const success = await markAsPaid(id);
      console.log('📊 markAsPaid result:', success);
      if (success) {
        toast.success('Conta marcada como paga');
        await loadContas();
      } else {
        toast.error('Erro ao marcar conta como paga');
      }
    } catch (error) {
      console.error('❌ Error marking as paid:', error);
      toast.error('Erro ao marcar conta como paga: ' + error);
    }
  };

  const handleMarkAsReceived = async (id: string) => {
    console.log('🎯 handleMarkAsReceived called with ID:', id);
    try {
      const success = await markAsReceived(id);
      console.log('📊 markAsReceived result:', success);
      if (success) {
        toast.success('Conta marcada como recebida');
        await loadContas();
      } else {
        toast.error('Erro ao marcar conta como recebida');
      }
    } catch (error) {
      console.error('❌ Error marking as received:', error);
      toast.error('Erro ao marcar conta como recebida: ' + error);
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

  // Determinar status
  const getStatus = (conta: ScheduledTransaction) => {
    const scheduledDate = new Date(conta.scheduledDate);
    const isOverdue = isAfter(new Date(), scheduledDate) && !isToday(scheduledDate);
    const isDueToday = isToday(scheduledDate);
    const isPaid = conta.status === 'paid';

    if (isPaid) return { label: conta.amount > 0 ? 'Recebido' : 'Pago', variant: 'default' as const };
    if (isDueToday) return { label: 'Vence Hoje', variant: 'destructive' as const };
    if (isOverdue) return { label: 'Vencido', variant: 'destructive' as const };
    return { label: 'Pendente', variant: 'secondary' as const };
  };

  return (
    <MainLayout>
      <SubscriptionGuard>
          <div className="container mx-auto p-2 md:p-6 space-y-4 md:space-y-6">
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
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h1 className="text-base md:text-xl font-bold">Contas a Pagar</h1>
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
                <ContaForm
                  mode="create"
                  onSuccess={() => {
                    setIsAddDialogOpen(false);
                    loadContas();
                  }}
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2 md:mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            {/* Campo de Pesquisa */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar contas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Filtro de Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Data */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
                    <Calendar
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
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => startDate ? date < startDate : false}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            )}
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
                  {statusFilter === 'todos' && dateFilter === 'todos' && !searchQuery.trim() ? 
                    'Nenhuma conta encontrada' : 
                    'Nenhuma conta encontrada para os filtros selecionados'
                  }
                </div>
              ) : (
                <div className="space-y-4">
                   {filteredContas.map((conta) => {
                     const status = getStatus(conta);
                     const isPaid = conta.status === 'paid';
                     const isSimulation = conta.__isSimulation;
                     
                     return (
                       <Card key={conta.id} className={`transition-all hover:shadow-md ${isSimulation ? 'border-dashed border-2 border-orange-300 bg-orange-50/30' : ''}`}>
                         <CardContent className="p-2 md:p-4">
                           {/* Primeira linha: Descrição e Status */}
                           <div className="flex items-center justify-between mb-3">
                             <div className="flex-1">
                               <h3 className="font-semibold text-xs md:text-lg flex items-center gap-2">
                                 {conta.description || 'Conta sem descrição'}
                                 {isSimulation && (
                                   <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                     Simulação
                                   </Badge>
                                 )}
                               </h3>
                             </div>
                             <Badge variant={isSimulation ? 'outline' : status.variant} className="ml-2">
                               {isSimulation ? 'Previsto' : status.label}
                             </Badge>
                           </div>

                           {/* Segunda linha: Data, Recorrência e Categoria */}
                           <div className="flex items-center gap-1 md:gap-4 mb-2 md:mb-3 text-[10px] md:text-sm text-muted-foreground">
                             <div className="flex items-center gap-1">
                               <CalendarIcon className="h-2.5 w-2.5 md:h-4 md:w-4" />
                               <span>{formatDate(conta.scheduledDate, 'dd/MM/yyyy HH:mm')}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <span>•</span>
                               {conta.creatorName && (
                                 <span className="inline-flex items-center px-1 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] md:text-[9px] font-medium mr-1">
                                   {conta.creatorName}
                                 </span>
                               )}
                               <span>{formatRecurrence(conta.recurrence)}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <span>•</span>
                               <span className="truncate">{conta.category}</span>
                             </div>
                           </div>

                           {/* Terceira linha: Valor e Ações */}
                           <div className="flex items-center justify-between">
             <div className="font-bold text-sm md:text-xl">
               {formatCurrency(Math.abs(conta.amount))}
             </div>
                             
                              <div className="flex items-center gap-1 flex-wrap">
                                 {!isSimulation && !isPaid && (
                                   <>
                                     {/* Botão para Marcar como Pago (despesas) */}
                                     {conta.amount < 0 && (
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={() => {
                                           console.log('🖱️ Mark as Paid clicked for ID:', conta.id);
                                           handleMarkAsPaid(conta.id);
                                         }}
                                         className="text-[8px] md:text-[10px] px-1 md:px-2 py-0.5 md:py-1 h-6 md:h-7 text-red-600 border-red-600 hover:bg-red-50"
                                       >
                                        <CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                                        Marcar como Pago
                                       </Button>
                                     )}
                                     
                                     {/* Botão para Marcar como Recebido (receitas) */}
                                     {conta.amount > 0 && (
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={() => {
                                           console.log('🖱️ Mark as Received clicked for ID:', conta.id);
                                           handleMarkAsReceived(conta.id);
                                         }}
                                         className="text-[8px] md:text-[10px] px-1 md:px-2 py-0.5 md:py-1 h-6 md:h-7 text-green-600 border-green-600 hover:bg-green-50"
                                       >
                                        <CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                                        Marcar como Recebido
                                       </Button>
                                     )}
                                   </>
                                 )}
                               
                                {!isSimulation && isPaid && (
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     disabled
                                     className={`text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 h-6 md:h-7 ${
                                       conta.amount > 0 
                                         ? 'text-green-600 border-green-600' 
                                         : 'text-red-600 border-red-600'
                                     }`}
                                   >
                                     <CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                                     {conta.amount > 0 ? 'Recebido' : 'Pago'}
                                   </Button>
                                )}
                               
                               {!isSimulation && (
                                 <>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleEdit(conta)}
                                     className="h-6 md:h-7 w-6 md:w-7 p-0"
                                   >
                                     <Edit className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                   </Button>
                                   
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleDeleteClick(conta)}
                                     className="text-red-600 border-red-600 hover:bg-red-50 h-6 md:h-7 w-6 md:w-7 p-0"
                                   >
                                     <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                   </Button>
                                 </>
                               )}
                             </div>
                           </div>

                           {/* Mostrar data de pagamento se foi pago */}
                           {!isSimulation && isPaid && conta.paidDate && (
                             <div className="mt-2 text-sm text-green-600">
                               Pago em: {formatDate(conta.paidDate)}
                             </div>
                           )}

                           {/* Informação adicional para simulações */}
                           {isSimulation && (
                             <div className="mt-2 text-sm text-orange-700 bg-orange-50 p-2 rounded">
                               Esta é uma simulação da recorrência mensal desta transação
                             </div>
                           )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
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
            <ContaForm
              mode="edit"
              initialData={editingConta}
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

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                {contaToDelete && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-medium">
                      {contaToDelete.description || 'Conta sem descrição'}
                    </p>
                    <p className="text-sm font-semibold text-metacash-error">
                      {formatCurrency(Math.abs(contaToDelete.amount))}
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

export default ContasPage;