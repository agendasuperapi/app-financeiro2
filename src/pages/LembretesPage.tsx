import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, WifiOff, Filter, X } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { ScheduledTransaction } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePreferences } from '@/contexts/PreferencesContext';
import LembretesTransactionForm from '@/components/lembretes/LembretesTransactionForm';
import TransactionForm from '@/components/common/TransactionForm';
import FixedExpensesOverview from '@/components/schedule/FixedExpensesOverview';
import LembretesCard from '@/components/lembretes/LembretesCard';
import LembretesFilters from '@/components/lembretes/LembretesFilters';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { deleteScheduledTransaction, getScheduledTransactions, markAsPaid } from '@/services/scheduledTransactionService';
import { formatCurrency } from '@/utils/transactionUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

const LembretesPage = () => {
  const { scheduledTransactions } = useAppContext();
  const [localScheduledTransactions, setLocalScheduledTransactions] = useState<ScheduledTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<ScheduledTransaction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [transactionFormType, setTransactionFormType] = useState<'income' | 'expense'>('expense');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecurrence, setSelectedRecurrence] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const { t, currency } = usePreferences();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Check if it's tablet (md breakpoint: 768px to 1023px)
  const [isTablet, setIsTablet] = React.useState(false);
  
  React.useEffect(() => {
    const checkTablet = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (Array.isArray(scheduledTransactions)) {
      // Carregar todos os dados (mesmos da aba Agendamentos)
      setLocalScheduledTransactions(scheduledTransactions);
    } else {
      setLocalScheduledTransactions([]);
    }
  }, [scheduledTransactions]);

  const refreshLocalScheduledTransactions = async () => {
    try {
      const transactions = await getScheduledTransactions();
      // Carregar todos os dados (mesmos da aba Agendamentos)
      setLocalScheduledTransactions(transactions);
    } catch (error) {
      console.error('Error refreshing scheduled transactions:', error);
    }
  };

  const handleSelectTransaction = (transaction: ScheduledTransaction) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleAddSchedule = () => {
    setSelectedTransaction(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleAddTransaction = (type: 'income' | 'expense') => {
    setTransactionFormType(type);
    setIsTransactionFormOpen(true);
  };

  const handleEditTransaction = (transaction: ScheduledTransaction) => {
    setSelectedTransaction(transaction);
    setFormMode('edit');
    setIsFormOpen(true);
    setIsDialogOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return;
    const success = await deleteScheduledTransaction(id);
    if (success) {
      toast({
        title: 'Lembrete excluído',
        description: 'Lembrete foi excluído com sucesso'
      });
      refreshLocalScheduledTransactions();
    } else {
      toast({
        title: t('common.error'),
        description: t('common.somethingWentWrong'),
        variant: "destructive"
      });
    }
  };

  const handleMarkAsPaid = async (transaction: ScheduledTransaction) => {
    try {
      const success = await markAsPaid(transaction.id);
      if (success) {
        toast({
          title: 'Lembrete marcado como concluído',
          description: 'Lembrete foi marcado como concluído'
        });
        
        // Atualizar estado local
        await refreshLocalScheduledTransactions();
      } else {
        toast({
          title: t('common.error'),
          description: t('common.somethingWentWrong'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error marking transaction as paid:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('common.somethingWentWrong'),
        variant: "destructive"
      });
    }
  };

  // Função para normalizar valores de recorrência (mesmo que no serviço)
  const normalizeRecurrence = (recurrence: string | null | undefined): 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined => {
    if (!recurrence) return 'once';
    
    const recurrenceMap: { [key: string]: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' } = {
      'Uma vez': 'once',
      'Diário': 'daily',
      'Semanal': 'weekly',
      'semanal': 'weekly', // adicionar versão minúscula
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

  const filteredTransactions = localScheduledTransactions.filter(transaction => {
    // Na aba Lembretes, mostrar apenas transações com valor 0
    if (transaction.amount > 0) return false;
    
    if (selectedRecurrence) {
      const normalizedTransactionRecurrence = normalizeRecurrence(transaction.recurrence);
      if (normalizedTransactionRecurrence !== selectedRecurrence) return false;
    }
    if (selectedCategory && transaction.category !== selectedCategory) return false;
    if (selectedStatus && transaction.status !== selectedStatus) return false;
    return true;
  });

  // Sort transactions by creation date (newest first)
  const sortedTransactions = filteredTransactions.sort((a, b) => 
    new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  );

  const availableCategories = Array.from(new Set(localScheduledTransactions.map(t => t.category)));
  const availableStatuses = ['pending', 'paid', 'overdue'];

  return (
    <MainLayout 
      title={isMobile ? undefined : 'Lembretes'}
      onAddTransaction={handleAddTransaction}
    >
      <SubscriptionGuard feature="lembretes">
        <div className="space-y-4 md:space-y-6 min-h-0">
          {/* Header Section */}
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center md:gap-4 py-[20px]">
            <h2 className="md:text-2xl font-semibold text-lg">Lembretes</h2>
            
            <div className="flex gap-2">
              {(isMobile || isTablet) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? <X className="h-4 w-4" /> : null}
                  {t('common.filters')}
                </Button>
              )}
              
              <Button onClick={handleAddSchedule} disabled={!isOnline} size={isMobile || isTablet ? "sm" : "default"}>
                <Plus className="mr-2 h-4 w-4" /> 
                <span className="hidden sm:inline">Adicionar Lembrete</span>
                <span className="sm:hidden">Adicionar</span>
              </Button>
            </div>
          </div>

          {!isOnline && (
            <div className="p-3 md:p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <span className="text-sm md:text-base text-yellow-800">Funcionalidade limitada offline</span>
            </div>
          )}

          {/* Mobile and Tablet Layout */}
          {isMobile || isTablet ? (
            <div className="space-y-4">
              {/* Mobile and Tablet Filters */}
              {showFilters && (
                <LembretesFilters
                  selectedRecurrence={selectedRecurrence}
                  selectedCategory={selectedCategory}
                  selectedStatus={selectedStatus}
                  onRecurrenceFilter={setSelectedRecurrence}
                  onCategoryFilter={setSelectedCategory}
                  onStatusFilter={setSelectedStatus}
                  availableCategories={availableCategories}
                />
              )}

              {/* Lista de Lembretes */}
              {sortedTransactions.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      Lembretes
                      <Badge variant="secondary" className="text-xs">{sortedTransactions.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {sortedTransactions.map(transaction => (
                        <LembretesCard
                          key={transaction.id}
                          transaction={transaction}
                          onEdit={handleEditTransaction}
                          onDelete={handleDeleteTransaction}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">Nenhum lembrete encontrado</p>
                    <Button onClick={handleAddSchedule} disabled={!isOnline} size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Adicionar primeiro lembrete
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Desktop Layout */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filtros (coluna lateral) */}
              <div className="lg:col-span-1">
                <LembretesFilters
                  selectedRecurrence={selectedRecurrence}
                  selectedCategory={selectedCategory}
                  selectedStatus={selectedStatus}
                  onRecurrenceFilter={setSelectedRecurrence}
                  onCategoryFilter={setSelectedCategory}
                  onStatusFilter={setSelectedStatus}
                  availableCategories={availableCategories}
                />
              </div>

              {/* Conteúdo principal */}
              <div className="lg:col-span-3 space-y-6">
                {sortedTransactions.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Lembretes
                        <Badge variant="secondary">{sortedTransactions.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {sortedTransactions.map(transaction => (
                          <LembretesCard
                            key={transaction.id}
                            transaction={transaction}
                            onEdit={handleEditTransaction}
                            onDelete={handleDeleteTransaction}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-10">
                      <Plus className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">Nenhum lembrete encontrado</p>
                      <Button onClick={handleAddSchedule} disabled={!isOnline}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar primeiro lembrete
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Transaction Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Lembrete</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{selectedTransaction.description}</p>
                    <p className="text-sm text-muted-foreground">{selectedTransaction.category}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-blue-600 font-medium">
                      {formatCurrency(selectedTransaction.amount, currency)}
                    </p>
                    <Badge variant="outline" className="mt-1 border-blue-200 text-blue-600">
                      Lembrete
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('common.date')}</p>
                    <p>{format(new Date(selectedTransaction.scheduledDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recorrência</p>
                    <p className="capitalize">{t(`schedule.${selectedTransaction.recurrence || 'once'}`)}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                  {!selectedTransaction.status || selectedTransaction.status === 'pending' ? (
                    <Button
                      variant="outline"
                      className="border-green-200 text-green-600 hover:bg-green-50"
                      onClick={() => handleMarkAsPaid(selectedTransaction)}
                      disabled={!isOnline}
                      size={isMobile ? "sm" : "default"}
                    >
                      Marcar como concluído
                    </Button>
                  ) : null}
                  
                  <Button
                    variant="outline"
                    onClick={() => handleEditTransaction(selectedTransaction)}
                    disabled={!isOnline}
                    size={isMobile ? "sm" : "default"}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteTransaction(selectedTransaction.id)}
                    disabled={!isOnline}
                    size={isMobile ? "sm" : "default"}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Scheduled Transaction Form Dialog */}
        <LembretesTransactionForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          initialData={selectedTransaction}
          mode={formMode}
          onSuccess={refreshLocalScheduledTransactions}
          defaultType="outros"
        />

        {/* Regular Transaction Form Dialog */}
        <TransactionForm
          open={isTransactionFormOpen}
          onOpenChange={setIsTransactionFormOpen}
          mode="create"
          defaultType={transactionFormType}
        />
      </SubscriptionGuard>
    </MainLayout>
  );
};

export default LembretesPage;