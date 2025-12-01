import React, { useState, useEffect } from 'react';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { markLembreteAsPaid, deleteLembrete, deleteMultipleLembretes } from '@/services/lembreteService';
import { ScheduledTransaction } from '@/types';
import { Loader2, Edit, Trash2, CheckCircle, Calendar, Plus, Filter, User, Search, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { isAfter, isToday, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { toast } from 'sonner';
import AddContaForm from '@/components/contas/AddContaForm';
import ReminderForm from '@/components/lembretes/ReminderForm';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
const LembrarPage = () => {
  const isMobile = useIsMobile();
  
  // Função para normalizar valores de recorrência
  const normalizeRecurrence = (recurrence: string | null | undefined): 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' => {
    if (!recurrence) return 'once';
    const recurrenceMap: {
      [key: string]: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    } = {
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
  const [pastTransactions, setPastTransactions] = useState<any[]>([]);
  const [futureTransactions, setFutureTransactions] = useState<any[]>([]);
  const [deleteOption, setDeleteOption] = useState<'single' | 'future' | 'past' | 'all'>('single');
  const {
    formatDate,
    formatDateTime
  } = useDateFormat();
  const {
    currency
  } = usePreferences();
  const {
    isClientView,
    selectedUser,
    targetUserId
  } = useClientAwareData();

  // Função para navegação de data
  const handleDateNavigation = (direction: 'prev' | 'next') => {
    if (dateFilter === 'mes') {
      setSelectedDate(direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1));
    } else if (dateFilter === 'ano') {
      setSelectedDate(direction === 'prev' ? subYears(selectedDate, 1) : addYears(selectedDate, 1));
    }
  };
  const getDateFilterLabel = () => {
    const {
      formatMonth
    } = useDateFormat();
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
      // Buscar diretamente da tabela tbl_lembrete para o usuário específico
      const {
        data,
        error
      } = await supabase.from("tbl_lembrete" as any).select('*').eq('user_id', targetUserId).order("date", {
        ascending: true
      });
      if (error) throw error;

      // Converter para o formato esperado
      const filteredData = data.map((item: any) => ({
        id: item.id,
        type: 'lembrete' as const,
        amount: item.amount || 0,
        category: "Lembretes",
        category_id: null,
        categoryIcon: "bell",
        categoryColor: "#607D8B",
        description: item.description || "",
        scheduledDate: item.date,
        recurrence: normalizeRecurrence(item.recurrence),
        goalId: null,
        status: item.status || 'pending',
        situacao: item.situacao || 'pendente',
        creatorName: item.name || undefined,
        phone: item.phone || undefined,
        reference_code: item.reference_code || undefined,
        codigo_trans: item.codigo_trans || undefined
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
      filtered = filtered.filter(conta => conta.description?.toLowerCase().includes(query) || conta.category?.toLowerCase().includes(query) || conta.creatorName?.toLowerCase().includes(query));
    }

    // Aplicar filtro de status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(conta => {
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
      filtered = filtered.filter(conta => {
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
      const success = await markLembreteAsPaid(id);
      if (success) {
        toast.success('Lembrete marcado como concluído');
        await loadContas();
      } else {
        toast.error('Erro ao marcar lembrete como concluído');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Erro ao marcar lembrete como concluído');
    }
  };
  const checkForRelatedReminders = async (codigoTrans: string | number, currentId: string, currentDate?: string) => {
    try {
      const codeStr = String(codigoTrans).replace(/\D/g, '');
      console.log(`🔍 LembrarPage - Buscando codigo_trans: "${codeStr}"`);

      const targetUserIdValue = selectedUser?.id || (await supabase.auth.getUser())?.data?.user?.id;
      if (!targetUserIdValue || !codeStr) return { past: [], future: [] };

      const { data: allData, error } = await (supabase as any)
        .from('tbl_lembrete')
        .select('id, date, description, codigo_trans')
        .eq('user_id', targetUserIdValue)
        .neq('id', currentId)
        .order('date', { ascending: true });

      if (error) return { past: [], future: [] };

      const rows = (allData || []).filter((item: any) => {
        const itemCodigo = String(item.codigo_trans || '').replace(/\D/g, '');
        return itemCodigo === codeStr;
      });

      const baseDate = currentDate ? new Date(currentDate) : new Date();
      const past = rows.filter((r: any) => new Date(r.date) < baseDate);
      const future = rows.filter((r: any) => new Date(r.date) >= baseDate);

      console.log(`✅ Resultado: ${past.length} passadas, ${future.length} futuras`);
      return { past, future };
    } catch (error) {
      return { past: [], future: [] };
    }
  };

  const handleEdit = async (conta: ScheduledTransaction) => {
    setEditingConta(conta);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (conta: ScheduledTransaction) => {
    setContaToDelete(conta);
    setDeleteOption('single');
    
    const codigoTrans = (conta as any).codigo_trans;
    
    if (codigoTrans) {
      const currentDate = conta.scheduledDate;
      const related = await checkForRelatedReminders(codigoTrans, conta.id, currentDate);
      setPastTransactions(related.past);
      setFutureTransactions(related.future);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      setPastTransactions([]);
      setFutureTransactions([]);
    }
    
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!contaToDelete) return;
    
    try {
      const codigoTrans = (contaToDelete as any).codigo_trans;
      
      if (codigoTrans) {
        const currentDate = contaToDelete.scheduledDate;
        const related = await checkForRelatedReminders(codigoTrans, contaToDelete.id, currentDate);
        
        setPastTransactions(related.past);
        setFutureTransactions(related.future);
        
        let idsToDelete: string[] = [contaToDelete.id];
        
        if (deleteOption === 'future') {
          idsToDelete = [contaToDelete.id, ...related.future.map(t => t.id)];
        } else if (deleteOption === 'past') {
          idsToDelete = [contaToDelete.id, ...related.past.map(t => t.id)];
        } else if (deleteOption === 'all') {
          idsToDelete = [contaToDelete.id, ...related.past.map(t => t.id), ...related.future.map(t => t.id)];
        }
        
        console.log('🗑️ Deletando IDs:', idsToDelete);
        
        let success: boolean;
        if (idsToDelete.length === 1) {
          success = await deleteLembrete(contaToDelete.id);
        } else {
          success = await deleteMultipleLembretes(idsToDelete);
        }
        
        if (success) {
          toast.success(idsToDelete.length === 1 
            ? 'Lembrete excluído com sucesso' 
            : `${idsToDelete.length} lembrete(s) excluído(s) com sucesso`
          );
        } else {
          toast.error('Erro ao excluir lembrete(s)');
        }
      } else {
        const success = await deleteLembrete(contaToDelete.id);
        
        if (success) {
          toast.success('Lembrete excluído com sucesso');
        } else {
          toast.error('Erro ao excluir lembrete');
        }
      }
      
      await loadContas();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Erro ao excluir lembrete(s)');
    }
    
    setDeleteDialogOpen(false);
    setContaToDelete(null);
    setDeleteOption('single');
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
    const recurrenceMap: {
      [key: string]: string;
    } = {
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
        return {
          label: 'Avisado',
          variant: 'default' as const
        };
      case 'ativo':
        return {
          label: 'Ativo',
          variant: 'default' as const
        };
      case 'concluido':
      case 'concluído':
        return {
          label: 'Concluído',
          variant: 'destructive' as const
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          variant: 'destructive' as const
        };
      case 'pendente':
      default:
        return {
          label: 'Pendente',
          variant: 'secondary' as const
        };
    }
  };
  return <MainLayout>
      <SubscriptionGuard>
          <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4 lg:space-y-6 px-[24px] py-[24px]">
            {isClientView && selectedUser && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    Visualizando relatórios de: {selectedUser.name} ({selectedUser.email})
                  </span>
                </div>
              </div>}
          <div className="flex items-center justify-between mb-6 gap-2 py-[20px]">
            <h1 className="md:text-2xl font-semibold text-lg">Lembrar</h1>
            <Button 
              size={isMobile ? "sm" : "lg"} 
              className={isMobile ? "gap-1" : "shrink-0"} 
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className={isMobile ? "h-3 w-3" : "mr-2 h-4 w-4"} />
              <span className={isMobile ? "text-xs" : ""}>Adicionar</span>
            </Button>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-col lg:flex-row gap-2 mb-2 md:mb-4">
            {/* Campo de Pesquisa */}
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar lembretes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
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
          {(dateFilter === 'mes' || dateFilter === 'ano') && <div className="sticky top-0 z-10 bg-background py-2 flex justify-center mb-2 md:mb-4">
              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                <Button variant="ghost" size="sm" onClick={() => handleDateNavigation('prev')} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm font-medium px-2 min-w-[120px] text-center">
                  {getDateFilterLabel()}
                </span>
                
                <Button variant="ghost" size="sm" onClick={() => handleDateNavigation('next')} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>}

          {/* Seletor de Período */}
          {dateFilter === 'periodo' && <div className="flex justify-center mb-2 md:mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal w-full sm:w-[140px]", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? formatDate(startDate) : "Data inicial"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal w-full sm:w-[140px]", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? formatDate(endDate) : "Data final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>}
          
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl lg:text-2xl font-bold">Lembretes Agendados</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-4 lg:p-6">
              {loading ? <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando lembretes...</span>
                </div> : filteredContas.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  {searchQuery || statusFilter !== 'todos' || dateFilter !== 'todos' ? 'Nenhum lembrete encontrado com os filtros aplicados' : 'Nenhum lembrete encontrado'}
                </div> : <>
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
                        {filteredContas.map(conta => {
                      const status = getStatus(conta);
                      return <TableRow key={conta.id}>
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
                                     <span>{formatDateTime(conta.scheduledDate)}</span>
                                   </div>
                                  <div className="mt-1">
                                    {formatRecurrence(conta.recurrence)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleEdit(conta)} className="h-8 w-8 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  
                                  <Button size="sm" variant="outline" onClick={() => handleDeleteClick(conta)} className="text-red-600 border-red-600 hover:bg-red-50 h-8 w-8 p-0">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>;
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
                        {filteredContas.map(conta => {
                      const status = getStatus(conta);
                      return <TableRow key={conta.id}>
                              <TableCell>
                                <div>
                                  <div className="font-semibold text-sm">
                                    {conta.description || 'Lembrete sem descrição'}
                                  </div>
                                   <div className="text-xs text-muted-foreground mt-1">
                                     <div className="flex items-center gap-1">
                                       <Calendar className="h-3 w-3" />
                                        <span>{formatDateTime(conta.scheduledDate)}</span>
                                     </div>
                                     <div className="mt-1">
                                       {conta.creatorName ? <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-[9px] font-medium mr-2">
                                           {conta.creatorName}
                                         </span> : null}
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
                                  <Button size="sm" variant="outline" onClick={() => handleEdit(conta)} className="h-7 w-7 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  
                                  <Button size="sm" variant="outline" onClick={() => handleDeleteClick(conta)} className="text-red-600 border-red-600 hover:bg-red-50 h-7 w-7 p-0">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>;
                    })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Cards para mobile */}
                  <div className="md:hidden space-y-3 p-4">
                    {filteredContas.map(conta => {
                  const status = getStatus(conta);
                  return <Card key={conta.id} className="shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate">
                                  {conta.description || 'Lembrete sem descrição'}
                                </h3>
                                 <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                   <Calendar className="h-3 w-3" />
                                   <span>{formatDateTime(conta.scheduledDate)}</span>
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
                              <Button size="sm" variant="outline" onClick={() => handleEdit(conta)} className="flex-1 h-8 text-xs">
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              
                              <Button size="sm" variant="outline" onClick={() => handleDeleteClick(conta)} className="flex-1 h-8 text-xs text-red-600 border-red-600 hover:bg-red-50">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Excluir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>;
                })}
                  </div>
                </>}
            </CardContent>
          </Card>
        </div>
        
        {/* Dialog de Adição */}
        <ReminderForm open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} mode="create" onSuccess={() => {
        setIsAddDialogOpen(false);
        loadContas();
      }} targetUserId={targetUserId} />

        {/* Dialog de Edição */}
        <ReminderForm open={isEditDialogOpen} onOpenChange={open => {
        setIsEditDialogOpen(open);
        if (!open) setEditingConta(null);
      }} initialData={editingConta} mode="edit" onSuccess={() => {
        setIsEditDialogOpen(false);
        setEditingConta(null);
        loadContas();
      }} targetUserId={targetUserId} />

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pastTransactions.length > 0 || futureTransactions.length > 0 
                  ? 'Lembretes Relacionados Encontrados' 
                  : 'Confirmar Exclusão'}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                {contaToDelete && (
                  <>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="font-medium">
                        {contaToDelete.description || 'Lembrete sem descrição'}
                      </p>
                      {contaToDelete.amount > 0 && (
                        <p className="text-sm font-semibold text-metacash-error">
                          {formatCurrency(Math.abs(contaToDelete.amount))}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(new Date(contaToDelete.scheduledDate))}
                      </p>
                    </div>

                    {(pastTransactions.length > 0 || futureTransactions.length > 0) && (
                      <div className="space-y-3">
                        <p className="text-sm">
                          Encontramos outros lembretes com o mesmo código. O que deseja excluir?
                        </p>
                        
                        <RadioGroup value={deleteOption} onValueChange={(value: any) => setDeleteOption(value)}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="single" id="single" />
                            <Label htmlFor="single" className="font-normal cursor-pointer">
                              Apenas este lembrete
                            </Label>
                          </div>
                          
                          {futureTransactions.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="future" id="future" />
                              <Label htmlFor="future" className="font-normal cursor-pointer">
                                Este e todos os futuros ({futureTransactions.length} lembretes)
                              </Label>
                            </div>
                          )}
                          
                          {pastTransactions.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="past" id="past" />
                              <Label htmlFor="past" className="font-normal cursor-pointer">
                                Este e todos os passados ({pastTransactions.length} lembretes)
                              </Label>
                            </div>
                          )}
                          
                          {pastTransactions.length > 0 && futureTransactions.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="all" id="all" />
                              <Label htmlFor="all" className="font-normal cursor-pointer">
                                Todos os lembretes relacionados ({pastTransactions.length + futureTransactions.length + 1} no total)
                              </Label>
                            </div>
                          )}
                        </RadioGroup>
                      </div>
                    )}
                  </>
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
    </MainLayout>;
};
export default LembrarPage;