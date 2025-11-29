
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import TransactionList from '@/components/common/TransactionList';
import TransactionTable from '@/components/common/TransactionTable';
import TransactionForm from '@/components/common/TransactionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, User, RotateCcw, Filter, Search, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { useAppContext } from '@/contexts/AppContext';
import { Transaction } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  addMonths, 
  subMonths, 
  addYears, 
  subYears 
} from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useDateFormat } from '@/hooks/useDateFormat';
import { createLocalDate } from '@/utils/transactionUtils';

const TransactionsPage = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('mes');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const { transactions, deleteTransaction, isClientView, selectedUser, targetUserId, userTimezone, refetchClientData } = useClientAwareData();
  const appContext = useAppContext();
  
  // Get timezone: prefer client view timezone, fallback to app context timezone
  const effectiveTimezone = userTimezone || appContext.userTimezone;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { formatDate } = useDateFormat();

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
      filtered = filtered.filter((transaction) => 
        transaction.description?.toLowerCase().includes(query) ||
        transaction.category?.toLowerCase().includes(query) ||
        transaction.creatorName?.toLowerCase().includes(query)
      );
    }

    // Aplicar filtro de status (tipo de transação)
    if (statusFilter !== 'todos') {
      filtered = filtered.filter((transaction) => {
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

      filtered = filtered.filter((transaction) => {
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
    const grouped: { [key: string]: Transaction[] } = {};
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

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setFormOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (refetchClientData) {
        console.log('🔄 [REFRESH] Manual refresh requested - reloading client data...');
        await refetchClientData();
      } else {
        // Força atualização dos dados via evento personalizado
        window.dispatchEvent(new CustomEvent('refresh-transactions'));
      }
      toast({
        title: 'Dados atualizados',
        description: 'A página foi atualizada com sucesso.',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar os dados.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <MainLayout>
      <SubscriptionGuard feature="movimentações ilimitadas">
        <div className="w-full px-4 md:px-6 py-4 md:py-6 lg:py-8 pb-20 md:pb-8 min-h-0">
          {/* Indicador de visualização de cliente */}
          {isClientView && selectedUser && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  Visualizando transações de: {selectedUser.name} ({selectedUser.email})
                </span>
              </div>
            </div>
          )}
          
          {/* Header and Add Button */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <h1 className="text-xl md:text-2xl font-semibold">
              {isMobile ? 'Transações' : 'Transações Recentes'}
            </h1>
            
            <div className="flex items-center gap-2">
              {/* Mobile - Compact buttons with text */}
              {isMobile ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="gap-1"
                  >
                    <RotateCcw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-xs">Atualizar</span>
                  </Button>
                  <Button onClick={handleAddTransaction} size="sm" className="gap-1">
                    <Plus className="h-3 w-3" />
                    <span className="text-xs">Adicionar</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button onClick={handleAddTransaction} size="lg" className="shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    {isClientView ? 'Adicionar para Cliente' : 'Adicionar Transação'}
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Container Sticky Único - Filtros + Navegação */}
          <div className="sticky top-16 md:top-0 z-30 bg-background/95 backdrop-blur-sm">
            {/* Filtros */}
            <div className="pb-2 md:pb-4 flex flex-col lg:flex-row gap-2">
              {/* Campo de Pesquisa */}
              <div className="relative w-full lg:flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar transações..."
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
            
            {/* Controles de Navegação de Data */}
            {(dateFilter === 'mes' || dateFilter === 'ano') && (
              <div className="border-t pt-2 pb-2 flex justify-center mb-2 md:mb-4">
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
          </div>

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
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          
          {/* Content Container */}
          <div className="space-y-4">
            {/* Content */}
            {isMobile ? (
              <TransactionList 
                transactions={filteredTransactions}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            ) : (
              <Card className="animate-fade-in p-1">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl">Lista de Transações</CardTitle>
                  {(searchQuery || statusFilter !== 'todos' || dateFilter !== 'todos') && (
                    <p className="text-sm text-muted-foreground">
                      {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''} encontrada{filteredTransactions.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0 px-8">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== 'todos' || dateFilter !== 'todos' 
                        ? 'Nenhuma transação encontrada com os filtros aplicados' 
                        : 'Nenhuma transação encontrada'
                      }
                    </div>
                  ) : (
                    <TransactionTable 
                      transactions={filteredTransactions}
                      onEdit={handleEditTransaction}
                      onDelete={handleDeleteTransaction}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <TransactionForm
          open={formOpen}
          onOpenChange={setFormOpen}
          initialData={editingTransaction}
          mode={editingTransaction ? 'edit' : 'create'}
          targetUserId={targetUserId}
        />
      </SubscriptionGuard>
    </MainLayout>
  );
};

export default TransactionsPage;
