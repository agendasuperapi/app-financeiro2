import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import TransactionList from '@/components/common/TransactionList';
import TransactionTable from '@/components/common/TransactionTable';
import TransactionForm from '@/components/common/TransactionForm';
import ContaForm from '@/components/contas/ContaForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, User, Search, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { useAppContext } from '@/contexts/AppContext';
import { Transaction } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addMonths, subMonths, addYears, subYears } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useDateFormat } from '@/hooks/useDateFormat';
import { createLocalDate, formatCurrency } from '@/utils/transactionUtils';
import { supabase } from '@/integrations/supabase/client';
import { usePreferences } from '@/contexts/PreferencesContext';
const TransactionsPage = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [contaFormOpen, setContaFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingConta, setEditingConta] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('mes');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  
  // Estados para dialog de transações relacionadas
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [pastTransactions, setPastTransactions] = useState<any[]>([]);
  const [futureTransactions, setFutureTransactions] = useState<any[]>([]);
  const [editOption, setEditOption] = useState<'single' | 'future' | 'past' | 'all'>('single');
  const {
    transactions,
    deleteTransaction,
    isClientView,
    selectedUser,
    targetUserId,
    userTimezone,
    refetchClientData
  } = useClientAwareData();
  const appContext = useAppContext();

  // Get timezone: prefer client view timezone, fallback to app context timezone
  const effectiveTimezone = userTimezone || appContext.userTimezone;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { formatDate } = useDateFormat();
  const { currency } = usePreferences();

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

  // Filter transactions based on search, status, and date
  const baseFilteredTransactions = transactions.filter(transaction => {
    const formato = transaction.formato;

    // Se não tem formato definido, considera como 'transacao' (padrão)
    if (!formato) {
      return true; // Inclui transações sem formato definido
    }
    return formato === 'agenda' || formato === 'transacao';
  });

  // Apply filters
  React.useEffect(() => {
    applyFilters();
  }, [baseFilteredTransactions, searchQuery, statusFilter, dateFilter, selectedDate, startDate, endDate]);
  const applyFilters = () => {
    let filtered = [...baseFilteredTransactions];

    // Aplicar filtro de pesquisa
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(transaction => transaction.description?.toLowerCase().includes(query) || transaction.category?.toLowerCase().includes(query) || transaction.creatorName?.toLowerCase().includes(query));
    }

    // Aplicar filtro de status (tipo de transação)
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(transaction => {
        switch (statusFilter) {
          case 'receita':
            return transaction.type === 'income';
          case 'despesa':
            return transaction.type === 'expense';
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
      filtered = filtered.filter(transaction => {
        const sourceDateStr = transaction.date as string;
        const transactionDate = createLocalDate(sourceDateStr, effectiveTimezone);
        const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
        switch (dateFilter) {
          case 'hoje':
            return transactionDateOnly.getTime() === today.getTime();
          case 'ontem':
            return transactionDateOnly.getTime() === yesterday.getTime();
          case 'amanha':
            return transactionDateOnly.getTime() === tomorrow.getTime();
          case 'proximos7dias':
            const next7Days = new Date(today);
            next7Days.setDate(next7Days.getDate() + 7);
            return transactionDateOnly >= today && transactionDateOnly <= next7Days;
          case 'mes':
            return transactionDate.getMonth() === selectedDate.getMonth() && transactionDate.getFullYear() === selectedDate.getFullYear();
          case 'ano':
            return transactionDate.getFullYear() === selectedDate.getFullYear();
          case 'periodo':
            if (startDate && endDate) {
              const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
              const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
              return transactionDateOnly >= startDateOnly && transactionDateOnly <= endDateOnly;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Ordenar por data (coluna date) respeitando fuso horário - mais recente primeiro
    filtered.sort((a, b) => {
      const dateA = createLocalDate(a.date as string, effectiveTimezone).getTime();
      const dateB = createLocalDate(b.date as string, effectiveTimezone).getTime();
      return dateB - dateA;
    });

    // Agrupar por mês (mantendo ordem mais recente primeiro dentro de cada mês)
    const grouped: {
      [key: string]: Transaction[];
    } = {};
    filtered.forEach(transaction => {
      const transactionDate = createLocalDate(transaction.date as string, effectiveTimezone);
      const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(transaction);
    });

    // Ordenar os meses (mais recente primeiro) e flatten
    const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const sortedFiltered = sortedMonths.flatMap(monthKey => grouped[monthKey]);
    setFilteredTransactions(sortedFiltered);
  };
  // Função para verificar transações relacionadas
  const checkForRelatedTransactions = async (codigoTrans: string | number, currentId: string, currentDate?: string) => {
    try {
      const codeStr = String(codigoTrans).replace(/\D/g, '');
      console.log(`🔍 TransactionsPage - Buscando codigo-trans: "${codeStr}"`);

      const targetUserIdValue = selectedUser?.id || (await supabase.auth.getUser())?.data?.user?.id;
      if (!targetUserIdValue || !codeStr) return { past: [], future: [] };

      const { data: allData, error } = await (supabase as any)
        .from('poupeja_transactions')
        .select('id, date, description, amount, "codigo-trans"')
        .eq('user_id', targetUserIdValue)
        .neq('id', currentId)
        .order('date', { ascending: true });

      if (error) return { past: [], future: [] };

      const rows = (allData || []).filter((item: any) => {
        const itemCodigo = String(item['codigo-trans'] || '').replace(/\D/g, '');
        return itemCodigo === codeStr;
      });

      const baseDate = currentDate ? new Date(currentDate) : new Date();
      const past = rows.filter((r: any) => new Date(r.date) < baseDate);
      const future = rows.filter((r: any) => new Date(r.date) >= baseDate);

      console.log(`✅ TransactionsPage - Resultado: ${past.length} passadas, ${future.length} futuras`);
      return { past, future };
    } catch (error) {
      console.error('Erro ao buscar transações relacionadas:', error);
      return { past: [], future: [] };
    }
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setFormOpen(true);
  };
  
  const handleEditTransaction = async (transaction: Transaction) => {
    const formato = (transaction as any).formato;
    
    // Se formato é agenda, usar ContaForm
    if (formato === 'agenda') {
      setEditingConta(transaction);
      setContaFormOpen(true);
      return;
    }
    
    // Se formato não é agenda, continuar com lógica normal de TransactionForm
    setTransactionToEdit(transaction);
    setEditOption('single');
    
    const codigoTrans = (transaction as any)['codigo-trans'];
    
    if (codigoTrans) {
      const currentDate = transaction.date as string;
      const related = await checkForRelatedTransactions(codigoTrans, transaction.id, currentDate);
      setPastTransactions(related.past);
      setFutureTransactions(related.future);
      
      // Se há transações relacionadas, mostrar dialog de opções
      if (related.past.length > 0 || related.future.length > 0) {
        setEditDialogOpen(true);
        return;
      }
    } else {
      setPastTransactions([]);
      setFutureTransactions([]);
    }
    
    // Se não há relacionadas, abrir formulário diretamente
    setEditingTransaction(transaction);
    setFormOpen(true);
  };
  
  const handleConfirmEdit = () => {
    setEditDialogOpen(false);
    setEditingTransaction(transactionToEdit);
    setFormOpen(true);
  };
  
  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
  };
  return <MainLayout>
      <SubscriptionGuard feature="movimentações ilimitadas">
        <div className="w-full px-4 md:px-6 pt-2 md:py-6 lg:py-8 pb-20 md:pb-8 min-h-0">
          {/* Indicador de visualização de cliente */}
          {isClientView && selectedUser && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  Visualizando transações de: {selectedUser.name} ({selectedUser.email})
                </span>
              </div>
            </div>}
          
          {/* Header and Add Button */}
          <div className="flex items-center justify-between mb-6 gap-2 py-[20px]">
            <h1 className="md:text-2xl font-semibold text-lg">
              {isMobile ? 'Transações' : 'Transações Recentes'}
            </h1>
            
            <Button onClick={handleAddTransaction} size={isMobile ? "sm" : "lg"} className={isMobile ? "gap-1" : "shrink-0"}>
              <Plus className={isMobile ? "h-3 w-3" : "mr-2 h-4 w-4"} />
              <span className={isMobile ? "text-xs" : ""}>
                {isMobile ? 'Adicionar' : isClientView ? 'Adicionar para Cliente' : 'Adicionar Transação'}
              </span>
            </Button>
          </div>
          
          {/* Filtros */}
          <div className="mb-2 md:mb-4">
            <div className="flex flex-col lg:flex-row gap-2">
              {/* Campo de Pesquisa */}
              <div className="relative w-full lg:flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar transações..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
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
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
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
          </div>
            
          {/* Controles de Navegação de Data - STICKY */}
          {(dateFilter === 'mes' || dateFilter === 'ano') && <div className="sticky z-30 bg-background/95 backdrop-blur-sm border-y py-2 flex justify-center mb-2 md:mb-4 md:top-0" style={{
          top: isMobile ? 'calc(3.5rem + env(safe-area-inset-top))' : '0'
        }}>
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
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
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
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>}
          
          {/* Content Container */}
          <div className="space-y-4">
            {/* Content */}
            {isMobile ? <TransactionList transactions={filteredTransactions} onEdit={handleEditTransaction} onDelete={handleDeleteTransaction} /> : <Card className="animate-fade-in p-1">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl">Lista de Transações</CardTitle>
                  {(searchQuery || statusFilter !== 'todos' || dateFilter !== 'todos') && <p className="text-sm text-muted-foreground">
                      {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''} encontrada{filteredTransactions.length !== 1 ? 's' : ''}
                    </p>}
                </CardHeader>
                <CardContent className="pt-0 px-8">
                  {filteredTransactions.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== 'todos' || dateFilter !== 'todos' ? 'Nenhuma transação encontrada com os filtros aplicados' : 'Nenhuma transação encontrada'}
                    </div> : <TransactionTable transactions={filteredTransactions} onEdit={handleEditTransaction} onDelete={handleDeleteTransaction} />}
                </CardContent>
              </Card>}
          </div>
        </div>

        <TransactionForm 
          open={formOpen} 
          onOpenChange={setFormOpen} 
          initialData={editingTransaction} 
          mode={editingTransaction ? 'edit' : 'create'} 
          targetUserId={targetUserId}
          editScope={editOption}
          relatedTransactionIds={
            editOption === 'future' ? futureTransactions.map(t => t.id) :
            editOption === 'past' ? pastTransactions.map(t => t.id) :
            editOption === 'all' ? [...pastTransactions.map(t => t.id), ...futureTransactions.map(t => t.id)] :
            []
          }
        />
        
        {/* Dialog para editar contas (formato agenda) */}
        <Dialog open={contaFormOpen} onOpenChange={setContaFormOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Agendamento</DialogTitle>
            </DialogHeader>
            <ContaForm 
              mode="edit" 
              initialData={editingConta} 
              onSuccess={() => {
                setContaFormOpen(false);
                setEditingConta(null);
                refetchClientData();
              }} 
              onCancel={() => {
                setContaFormOpen(false);
                setEditingConta(null);
              }} 
            />
          </DialogContent>
        </Dialog>
        
        {/* Dialog de Pré-Edição */}
        <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Transações Relacionadas Encontradas</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                {transactionToEdit && (
                  <>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="font-medium">{transactionToEdit.description}</p>
                      <p className={cn("text-sm font-semibold", 
                        transactionToEdit.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                        {formatCurrency(Math.abs(transactionToEdit.amount), currency)}
                      </p>
                    </div>
                    
                    <p className="text-sm">
                      Encontramos outras transações com o mesmo código. O que deseja editar?
                    </p>
                    
                    <RadioGroup value={editOption} onValueChange={(value: any) => setEditOption(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="edit-single" />
                        <Label htmlFor="edit-single">Apenas esta transação</Label>
                      </div>
                      
                      {futureTransactions.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="future" id="edit-future" />
                          <Label htmlFor="edit-future">Esta e todas as futuras ({futureTransactions.length})</Label>
                        </div>
                      )}
                      
                      {pastTransactions.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="past" id="edit-past" />
                          <Label htmlFor="edit-past">Esta e todas as passadas ({pastTransactions.length})</Label>
                        </div>
                      )}
                      
                      {pastTransactions.length > 0 && futureTransactions.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="edit-all" />
                          <Label htmlFor="edit-all">Todas ({pastTransactions.length + futureTransactions.length + 1})</Label>
                        </div>
                      )}
                    </RadioGroup>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmEdit}>Continuar Edição</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SubscriptionGuard>
    </MainLayout>;
};
export default TransactionsPage;