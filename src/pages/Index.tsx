import React, { useState, useEffect } from 'react';
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
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 11, 1)); // Dezembro 2025
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [transactionsWithSimulations, setTransactionsWithSimulations] = useState<any[]>([]);
  
  console.log("Dashboard rendered with:", {
    transactionsCount: transactions.length, 
    filteredTransactionsCount: filteredTransactions.length,
    goalsCount: goals.length,
    scheduledTransactionsCount: scheduledTransactions.length
  });

  console.log('🔍 [DEZEMBRO] scheduledTransactions:', scheduledTransactions.map(st => ({
    id: st.id,
    amount: st.amount,
    description: st.description,
    recurrence: st.recurrence,
    status: st.status,
    situacao: st.situacao
  })));
  
  // NEW: Calculate month-specific financial data using the new utility with error handling
  const monthlyData = React.useMemo(() => {
    try {
      if (!transactions || !Array.isArray(transactions)) {
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
      const transactionsWithSimulations = [...transactions, ...simulations];
      
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
  }, [transactions, scheduledTransactions, currentMonth]);

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
  const baseBalanceBeforeMonth = transactions.reduce((sum: number, t: any) => {
    const d = new Date(t.date);
    return d < monthStart ? sum + (t.amount || 0) : sum;
  }, 0);
  const balance = baseBalanceBeforeMonth + (totalIncome || 0) - (totalExpenses || 0);
  
  // Calculate previousMonthsBalance (balance up to end of previous month)
  const previousMonthsBalance = React.useMemo(() => {
    const endOfPreviousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0, 23, 59, 59, 999);
    
    // Real transactions up to previous month
    const realTransactions = transactions
      .filter((t: any) => new Date(t.date) <= endOfPreviousMonth)
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    
    // Add simulated transactions for intermediate months (from next month after last real transaction until previous month)
    let simulatedBalance = 0;
    
    // Find the last real transaction month
    const lastRealTransactionDate = transactions
      .filter((t: any) => t.formato === 'transacao' || t.status === 'paid' || t.status === 'recebido')
      .map((t: any) => new Date(t.date))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    if (lastRealTransactionDate) {
      const startSimulationMonth = new Date(lastRealTransactionDate.getFullYear(), lastRealTransactionDate.getMonth() + 1, 1);
      
      // Apply simulations for each month from start to previous month
      let currentSimMonth = new Date(startSimulationMonth);
      while (currentSimMonth <= endOfPreviousMonth) {
        const simulationsForMonth = scheduledTransactions
          .filter((st: any) => st.recurrence === 'Mensal' && st.status === 'pending' && st.situacao === 'ativo')
          .reduce((sum: number, st: any) => sum + (st.amount || 0), 0);
        
        simulatedBalance += simulationsForMonth;
        console.log(`🔄 [DEZEMBRO] Simulating month ${currentSimMonth.getMonth() + 1}/${currentSimMonth.getFullYear()}: ${simulationsForMonth}`);
        
        currentSimMonth.setMonth(currentSimMonth.getMonth() + 1);
      }
    }
    
    const result = realTransactions + simulatedBalance;
    console.log('🔍 [DEZEMBRO] previousMonthsBalance calculation:', {
      realTransactions,
      simulatedBalance,
      result,
      currentMonth: currentMonth.getMonth() + 1
    });
    return result;
  }, [transactions, currentMonth, scheduledTransactions]);
  
  // Calculate monthlyBalanceCombined (current month balance with simulations)
  const monthlyBalanceCombined = React.useMemo(() => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Para o mês atual (dezembro), usar as transações agendadas como simulações
    let monthlyTransactions = [];
    
    if (transactionsWithSimulations.length > 0) {
      // Usar o state se estiver populado
      monthlyTransactions = transactionsWithSimulations.filter((t: any) => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });
    } else {
      // Se não tiver simulações no state, criar as simulações para o mês atual usando scheduledTransactions
      const currentMonthScheduled = scheduledTransactions
        .filter((st: any) => st.recurrence === 'Mensal' && st.status === 'pending' && st.situacao === 'ativo')
        .map((st: any) => ({
          ...st,
          date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 10).toISOString(),
          __isSimulation: true
        }));
      
      monthlyTransactions = [...transactions.filter((t: any) => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      }), ...currentMonthScheduled];
    }
    
    const monthlyIncome = monthlyTransactions
      .filter((t: any) => (t.type === 'income') || (typeof t.amount === 'number' && t.amount > 0))
      .reduce((sum: number, t: any) => {
        const amt = Number(t.amount) || 0;
        return sum + (amt > 0 ? amt : (t.type === 'income' ? Math.abs(amt) : 0));
      }, 0);
      
    const monthlyExpenses = monthlyTransactions
      .filter((t: any) => (t.type === 'expense') || (typeof t.amount === 'number' && t.amount < 0))
      .reduce((sum: number, t: any) => {
        const amt = Number(t.amount) || 0;
        return sum + (amt < 0 ? -amt : (t.type === 'expense' ? amt : 0));
      }, 0);
      
    const result = monthlyIncome - monthlyExpenses;
    console.log('🔍 [DEZEMBRO] monthlyBalanceCombined calculation:', {
      monthlyIncome,
      monthlyExpenses,
      result,
      monthlyTransactionsCount: monthlyTransactions.length,
      currentMonth: `${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}`,
      monthlyTransactions: monthlyTransactions.map(t => ({
        id: t.id,
        amount: t.amount,
        description: t.description,
        date: t.date,
        formato: t.formato,
        __isSimulation: t.__isSimulation
      }))
    });
    return result;
  }, [transactionsWithSimulations, currentMonth, transactions, scheduledTransactions]);
  
  // Load initial data only once when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      console.log("Dashboard: Loading initial data...");
      try {
        await Promise.all([getTransactions(), getGoals()]);
        console.log("Dashboard: Initial data loaded successfully");
      } catch (error) {
        console.error("Dashboard: Error loading initial data:", error);
      }
    };
    
    loadInitialData();
  }, []); // ✅ Empty dependency array - runs only once

  // Update date range when month changes
  useEffect(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
    setCustomDateRange(firstDay, lastDay);
    console.log("Dashboard: Date range updated for month:", currentMonth.toDateString());
  }, [currentMonth, setCustomDateRange]);

  // Removed auto-refresh to prevent performance issues
  // Data will be refreshed when user performs actions (add/edit/delete transactions)
  
  const handleMonthChange = (date: Date) => {
    console.log("Dashboard: Month changed to:", date.toDateString());
    setCurrentMonth(date);
    
    // Update filtered transactions range to match the selected month
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
      
      // Refresh transactions and goals
      console.log("Dashboard: Refreshing data after delete...");
      await Promise.all([
        getTransactions(),
        getGoals()
      ]);
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
      // Refresh data to update the alert
      console.log("Dashboard: Refreshing data after marking as paid...");
      await Promise.all([
        getTransactions(),
        getGoals()
      ]);
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
