import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import TransactionList from '@/components/common/TransactionList';
import TransactionTable from '@/components/common/TransactionTable';
import TransactionForm from '@/components/common/TransactionForm';
import ContaForm from '@/components/contas/ContaForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, User, Search, ChevronLeft, ChevronRight, CalendarIcon, Tag } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { DependentsService } from '@/services/dependentsService';
import { Checkbox } from '@/components/ui/checkbox';

const TransactionsPage = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [contaFormOpen, setContaFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingConta, setEditingConta] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('mes');
  const [nameFilter, setNameFilter] = useState('todos');
  const [availableNames, setAvailableNames] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'created-desc' | 'created-asc'>('date-desc');
  
  const [isDateNavFixed, setIsDateNavFixed] = useState(false);
  const dateNavRef = React.useRef<HTMLDivElement>(null);
  const dateNavPlaceholderRef = React.useRef<HTMLDivElement>(null);
  
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
  const { formatDate, formatMonth } = useDateFormat();
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

  // Fetch unique names from transactions
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Buscar nomes únicos da coluna name em poupeja_transactions
        const { data: transactionsData } = await (supabase as any)
          .from('poupeja_transactions')
          .select('name')
          .eq('user_id', user.id)
          .not('name', 'is', null);
        
        if (transactionsData && transactionsData.length > 0) {
          const uniqueNames = [...new Set(transactionsData.map((t: any) => t.name).filter(Boolean))] as string[];
          setAvailableNames(uniqueNames);
        }
      } catch (error) {
        console.error('Erro ao buscar nomes:', error);
      }
    };
    fetchNames();
  }, [transactions]);

  // Extract unique categories from transactions
  useEffect(() => {
    if (transactions.length > 0) {
      const uniqueCategories = [...new Set(
        transactions
          .map(t => t.category)
          .filter(Boolean)
      )].sort() as string[];
      setAvailableCategories(uniqueCategories);
    }
  }, [transactions]);

  // Scroll listener para fixar a barra de navegação de data
  useEffect(() => {
    if (dateFilter !== 'mes' && dateFilter !== 'ano') {
      setIsDateNavFixed(false);
      return;
    }
    
    const mainElement = document.querySelector('main');
    if (!mainElement) return;
    
    const handleScroll = () => {
      if (dateNavPlaceholderRef.current) {
        const rect = dateNavPlaceholderRef.current.getBoundingClientRect();
        const headerHeight = isMobile ? 56 : 0; // altura do header mobile
        setIsDateNavFixed(rect.top <= headerHeight);
      }
    };
    
    mainElement.addEventListener('scroll', handleScroll);
    handleScroll(); // check initial position
    
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [dateFilter, isMobile]);

  // Apply filters
  React.useEffect(() => {
    applyFilters();
  }, [transactions, searchQuery, statusFilter, dateFilter, nameFilter, selectedDate, startDate, endDate, selectedCategories, sortOrder]);
  const applyFilters = () => {
    let filtered = [...transactions];

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

    // Aplicar filtro de nome
    if (nameFilter !== 'todos') {
      filtered = filtered.filter(transaction => 
        transaction.creatorName?.toLowerCase() === nameFilter.toLowerCase()
      );
    }

    // Aplicar filtro de categorias
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(transaction => 
        transaction.category && selectedCategories.includes(transaction.category)
      );
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

    // Ordenar conforme selecionado
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'created-desc': {
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return createdB - createdA;
        }
        case 'created-asc': {
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return createdA - createdB;
        }
        case 'date-asc': {
          const dateA = createLocalDate(a.date as string, effectiveTimezone).getTime();
          const dateB = createLocalDate(b.date as string, effectiveTimezone).getTime();
          return dateA - dateB;
        }
        case 'date-desc':
        default: {
          const dateA = createLocalDate(a.date as string, effectiveTimezone).getTime();
          const dateB = createLocalDate(b.date as string, effectiveTimezone).getTime();
          return dateB - dateA;
        }
      }
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
  
  const handleEditTransaction = (transaction: Transaction) => {
    const formato = (transaction as any).formato;
    
    // Se formato é agenda, usar ContaForm
    if (formato === 'agenda') {
      setEditingConta(transaction);
      setContaFormOpen(true);
      return;
    }
    
    // Se formato não é agenda, abrir formulário diretamente
    setEditingTransaction(transaction);
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
            <div className="flex flex-col gap-2">
              {/* Campo de Pesquisa */}
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar transações..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
              </div>
              
              {/* Filtros em grid */}
              <div className={cn(
                "grid gap-2",
                availableNames.length > 0 ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4"
              )}>
                {/* Filtro de Status */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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

                {/* Ordenação */}
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Data ↓ (Recente)</SelectItem>
                    <SelectItem value="date-asc">Data ↑ (Antiga)</SelectItem>
                    <SelectItem value="created-desc">Criação ↓ (Recente)</SelectItem>
                    <SelectItem value="created-asc">Criação ↑ (Antiga)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtro de Categorias */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Tag className="mr-2 h-4 w-4" />
                      <span className="truncate">
                        {selectedCategories.length === 0 
                          ? 'Categorias' 
                          : `${selectedCategories.length} sel.`}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="text-sm font-medium">Categorias</span>
                        {selectedCategories.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedCategories([])}
                          >
                            Limpar
                          </Button>
                        )}
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {availableCategories.map((category) => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${category}`}
                              checked={selectedCategories.includes(category)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategories([...selectedCategories, category]);
                                } else {
                                  setSelectedCategories(selectedCategories.filter(c => c !== category));
                                }
                              }}
                            />
                            <label
                              htmlFor={`cat-${category}`}
                              className="text-sm cursor-pointer flex-1 truncate"
                            >
                              {category}
                            </label>
                          </div>
                        ))}
                        {availableCategories.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nenhuma categoria disponível
                          </p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Filtro de Nome - só aparece se houver dependentes */}
                {availableNames.length > 0 && (
                  <Select value={nameFilter} onValueChange={setNameFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {availableNames.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
            
          {/* Placeholder e Controles de Navegação de Data */}
          {(dateFilter === 'mes' || dateFilter === 'ano') && (
            <>
              {/* Placeholder para manter o espaço quando fixo */}
              <div 
                ref={dateNavPlaceholderRef}
                className={cn(
                  isMobile ? "h-12 mb-4" : (isDateNavFixed ? "h-12 mb-4" : "")
                )}
              />
              
              {/* Barra de navegação - sempre fixa em mobile */}
              <div 
                ref={dateNavRef}
                className={cn(
                  "z-40 bg-background py-2 flex justify-center transition-all duration-200",
                  (isMobile || isDateNavFixed)
                    ? "fixed left-0 right-0 border-b shadow-sm" 
                    : "mb-4 -mx-4 md:-mx-6 px-4 md:px-6 border-b"
                )}
                style={(isMobile || isDateNavFixed) ? {
                  top: isMobile ? 'calc(5rem + env(safe-area-inset-top))' : '0'
                } : undefined}
              >
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
              </div>
            </>
          )}

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
                  {(searchQuery || statusFilter !== 'todos' || dateFilter !== 'todos' || selectedCategories.length > 0) && <p className="text-sm text-muted-foreground">
                      {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''} encontrada{filteredTransactions.length !== 1 ? 's' : ''}
                    </p>}
                </CardHeader>
                <CardContent className="pt-0 px-8">
                  {filteredTransactions.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== 'todos' || dateFilter !== 'todos' || selectedCategories.length > 0 ? 'Nenhuma transação encontrada com os filtros aplicados' : 'Nenhuma transação encontrada'}
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
        />
        
        {/* Dialog para editar contas (formato agenda) */}
        <Dialog open={contaFormOpen} onOpenChange={setContaFormOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Agendamento</DialogTitle>
              <DialogDescription className="sr-only">
                Formulário para editar uma transação agendada.
              </DialogDescription>
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
        
        {/* Fim do conteúdo principal */}
      </SubscriptionGuard>
    </MainLayout>;
};
export default TransactionsPage;