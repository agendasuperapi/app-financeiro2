import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import TransactionForm from '@/components/common/TransactionForm';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStatCards from '@/components/dashboard/DashboardStatCards';
import DashboardContent from '@/components/dashboard/DashboardContent';
import { useAppContext } from '@/contexts/AppContext';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { usePreferences } from '@/contexts/PreferencesContext';
import { calculateTotalIncome, calculateTotalExpenses, calculateMonthlyFinancialData, getGoalsForMonth } from '@/utils/transactionUtils';
import { useToast } from '@/components/ui/use-toast';
import { markAsPaid } from '@/services/scheduledTransactionService';
import { ScheduledTransaction } from '@/types';
import { DependentsService, Dependent } from '@/services/dependentsService';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use client-aware data para suportar visualização de clientes
  const {
    transactions,
    goals,
    deleteTransaction,
    getGoals,
    isClientView,
    selectedUser,
    targetUserId
  } = useClientAwareData();
  
  // Use app context apenas para funcionalidades gerais
  const {
    filteredTransactions,
    setCustomDateRange,
    hideValues,
    toggleHideValues,
    getTransactions,
    scheduledTransactions
  } = useAppContext();
  const { t } = usePreferences();
  
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Mês atual
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [transactionsWithSimulations, setTransactionsWithSimulations] = useState<any[]>([]);
  // Saldos calculados no DashboardContent (incluindo simulações)
  const [previousMonthsBalance, setPreviousMonthsBalance] = useState(0);
  const [monthlyBalanceCombined, setMonthlyBalanceCombined] = useState(0);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  
  // Logs removidos para melhorar performance
  
  // Get unique creator names for person filter
  const creatorNames = useMemo(() => {
    const names = new Set<string>();
    transactions.forEach(tx => {
      if (tx.creatorName) {
        names.add(tx.creatorName);
      }
    });
    return Array.from(names).sort();
  }, [transactions]);

  // Filter transactions by selected person
  const personFilteredTransactions = useMemo(() => {
    if (selectedPerson === 'all') {
      return transactions;
    }
    return transactions.filter(tx => tx.creatorName === selectedPerson);
  }, [transactions, selectedPerson]);

  // NEW: Calculate month-specific financial data using the new utility with error handling
  const monthlyData = React.useMemo(() => {
    try {
      if (!personFilteredTransactions || !Array.isArray(personFilteredTransactions)) {
        console.warn('Dashboard: Invalid transactions data, using fallback');
        return {
          monthTransactions: [],
          monthlyIncome: 0,
          monthlyExpenses: 0,
          accumulatedBalance: 0
        };
      }

      // Generate simulations for calculations (only for the selected month)
      const generateMonthlySimulations = (scheduledTransactions: any[]) => {
        const simulations: any[] = [];

        // Não gerar simulações - o usuário não quer transações "inventadas"
        return simulations;
      };

      // Include simulations in transactions for calculation
      const simulations = generateMonthlySimulations(scheduledTransactions);
      const transactionsWithSimulations = [...personFilteredTransactions, ...simulations];
      
      const baseData = calculateMonthlyFinancialData(transactionsWithSimulations, currentMonth);
      
      // Return enhanced data with simulations included - balance is calculated progressively month by month
      return {
        ...baseData,
        monthTransactions: baseData.monthTransactions || []
      };
    } catch (error) {
      console.error('Dashboard: Error calculating monthly data:', error);
      return {
        monthTransactions: [],
        monthlyIncome: 0,
        monthlyExpenses: 0,
        accumulatedBalance: 0
      };
    }
  }, [personFilteredTransactions, scheduledTransactions, currentMonth]);

  // Função para simular transações mensais para visualização (apenas do mês selecionado)
  const generateMonthlySimulationsForDisplay = React.useCallback((scheduledTransactions: any[]) => {
    // Não gerar simulações - o usuário não quer transações "inventadas"
    return [];
  }, []);

  // Combinar transações reais com simulações para visualização
  const transactionsWithDisplaySimulations = React.useMemo(() => {
    const simulations = generateMonthlySimulationsForDisplay(scheduledTransactions);
    
    // Filtrar simulações para o mês atual
    const currentMonthSimulations = simulations.filter(sim => {
      const simDate = new Date(sim.date);
      return simDate.getMonth() === currentMonth.getMonth() && 
             simDate.getFullYear() === currentMonth.getFullYear();
    });
    
    // Combinar transações do mês com simulações e ordenar por data
    const monthTransactions = monthlyData?.monthTransactions || [];
    const combined = [...monthTransactions.filter((t: any) => !t.__isSimulation), ...currentMonthSimulations];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [monthlyData, scheduledTransactions, generateMonthlySimulationsForDisplay, currentMonth]);

  const monthlyGoals = React.useMemo(() => {
    try {
      if (!goals || !Array.isArray(goals)) {
        console.warn('Dashboard: Invalid goals data, using fallback');
        return [];
      }
      return getGoalsForMonth(goals, currentMonth);
    } catch (error) {
      console.error('Dashboard: Error calculating monthly goals:', error);
      return [];
    }
  }, [goals, currentMonth]);
  
  const totalIncome = monthlyData.monthlyIncome;
  const totalExpenses = monthlyData.monthlyExpenses;
  // Saldo exibido: saldo base até o início do mês + resultado do mês (inclui simulações do mês)
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const baseBalanceBeforeMonth = personFilteredTransactions.reduce((sum: number, t: any) => {
    const d = new Date(t.date);
    return d < monthStart ? sum + (t.amount || 0) : sum;
  }, 0);
  const balance = baseBalanceBeforeMonth + (totalIncome || 0) - (totalExpenses || 0);
  
  // previousMonthsBalance é fornecido pelo DashboardContent via onBalancesUpdate (inclui simulações)
  // Removido cálculo duplicado para evitar inconsistências
  
  // monthlyBalanceCombined é fornecido pelo DashboardContent via onBalancesUpdate (inclui simulações)
  // Removido cálculo duplicado para evitar inconsistências
  
  // Load dependents
  useEffect(() => {
    const loadDependents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const deps = await DependentsService.getDependents(user.id);
          setDependents(deps);
        }
      } catch (error) {
        console.error('Error loading dependents:', error);
      }
    };
    loadDependents();
  }, []);

  // Load initial data only once when component mounts
  useEffect(() => {
    Promise.all([getTransactions(), getGoals()]).catch(console.error);
  }, []);

  // Update date range when month changes
  useEffect(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
    setCustomDateRange(firstDay, lastDay);
  }, [currentMonth, setCustomDateRange]);

  // Removed auto-refresh to prevent performance issues
  // Data will be refreshed when user performs actions (add/edit/delete transactions)
  
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    setCustomDateRange(firstDay, lastDay);
  };
  
  const handleAddTransaction = (type: 'income' | 'expense' = 'expense') => {
    setSelectedTransaction(null);
    setFormMode('create');
    setTransactionType(type);
    setTransactionDialogOpen(true);
  };
  
  const handleEditTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setFormMode('edit');
    setTransactionDialogOpen(true);
  };
  
  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      toast({
        title: t('transactions.deleted'),
        description: t('transactions.deleteSuccess'),
      });
      
      await Promise.all([getTransactions(), getGoals()]);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: t('common.error'),
        description: t('transactions.deleteError'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkScheduledAsPaid = async (transaction: ScheduledTransaction) => {
    const success = await markAsPaid(transaction.id);
    if (success) {
      toast({
        title: t('schedule.marked_as_paid'),
        description: t('schedule.transaction_marked_as_paid')
      });
      await Promise.all([getTransactions(), getGoals()]);
    } else {
      toast({
        title: t('common.error'),
        description: t('common.somethingWentWrong'),
        variant: "destructive"
      });
    }
  };
  
  const navigateToTransactionType = (type: 'income' | 'expense') => {
    navigate(`/transactions?type=${type}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  };
  
  return (
    <MainLayout title={t('dashboard.title')} onAddTransaction={handleAddTransaction}>
      <SubscriptionGuard feature="o dashboard completo">
        <div className="space-y-8 min-h-0">
          {/* Indicador de visualização de cliente */}
          {isClientView && selectedUser && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  Visualizando dashboard de: {selectedUser.name} ({selectedUser.email})
                </span>
              </div>
            </div>
          )}
          
          {/* Header com navegação de mês e toggle de visibilidade */}
          <DashboardHeader
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
            hideValues={hideValues}
            toggleHideValues={toggleHideValues}
            onAddTransaction={handleAddTransaction}
            creatorNames={dependents.length > 0 ? creatorNames : []}
            selectedPerson={selectedPerson}
            onPersonChange={setSelectedPerson}
          />
          
          {/* 3 Cards principais na mesma linha */}
          <DashboardStatCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            balance={balance}
            hideValues={hideValues}
            transactionsWithSimulations={transactionsWithSimulations}
            onNavigateToTransactionType={navigateToTransactionType}
            currentMonth={currentMonth}
            previousMonthsBalance={previousMonthsBalance}
            monthlyBalanceCombined={monthlyBalanceCombined}
          />

          {/* Conteúdo do dashboard - com fallback para evitar erro */}
          <DashboardContent
            filteredTransactions={transactionsWithDisplaySimulations}
            goals={monthlyGoals || []}
            currentGoalIndex={currentGoalIndex}
            currentMonth={currentMonth}
            hideValues={hideValues}
            onGoalChange={setCurrentGoalIndex}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onMarkScheduledAsPaid={handleMarkScheduledAsPaid}
            scheduledTransactions={scheduledTransactions}
            onTransactionsWithSimulationsUpdate={setTransactionsWithSimulations}
            onBalancesUpdate={({ previousMonthsBalance, monthlyBalanceCombined }) => {
              setPreviousMonthsBalance(previousMonthsBalance);
              setMonthlyBalanceCombined(monthlyBalanceCombined);
            }}
            filterPerson={selectedPerson}
          />
        </div>
      </SubscriptionGuard>

      {/* Dialog do formulário de transação */}
      <TransactionForm 
        open={transactionDialogOpen} 
        onOpenChange={setTransactionDialogOpen} 
        initialData={selectedTransaction} 
        mode={formMode} 
        defaultType={transactionType}
        targetUserId={isClientView ? targetUserId : undefined}
      />
    </MainLayout>
  );
};

export default Index;
