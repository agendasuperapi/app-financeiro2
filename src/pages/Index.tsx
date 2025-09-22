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
import { DateRange } from '@/components/common/DateRangeSelector';
import { startOfMonth, endOfMonth, startOfDay } from 'date-fns';

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
  const [currentRange, setCurrentRange] = useState<DateRange>({
    startDate: startOfDay(new Date()),
    endDate: startOfDay(new Date()),
    type: 'today'
  });
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  
  console.log("Dashboard rendered with:", {
    transactionsCount: transactions.length, 
    filteredTransactionsCount: filteredTransactions.length,
    goalsCount: goals.length,
    scheduledTransactionsCount: scheduledTransactions.length
  });
  
  // Calculate financial data based on selected range type
  const financialData = React.useMemo(() => {
    try {
      if (!transactions || !Array.isArray(transactions)) {
        console.warn('Dashboard: Invalid transactions data, using fallback');
        return {
          displayTransactions: [],
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0
        };
      }

      // For "today" filter, use filtered transactions from current day only
      if (currentRange.type === 'today') {
        const todayTransactions = filteredTransactions || [];
        const todayIncome = calculateTotalIncome(todayTransactions);
        const todayExpenses = calculateTotalExpenses(todayTransactions);
        
        return {
          displayTransactions: todayTransactions,
          totalIncome: todayIncome,
          totalExpenses: todayExpenses,
          balance: todayIncome - todayExpenses
        };
      }
      
      // For other filters (month, year, etc.), use the existing monthly calculation
      const monthlyData = calculateMonthlyFinancialData(transactions, new Date(currentRange.startDate.getFullYear(), currentRange.startDate.getMonth(), 1));
      return {
        displayTransactions: monthlyData.monthTransactions,
        totalIncome: monthlyData.monthlyIncome,
        totalExpenses: monthlyData.monthlyExpenses,
        balance: monthlyData.accumulatedBalance
      };
    } catch (error) {
      console.error('Dashboard: Error calculating financial data:', error);
      return {
        displayTransactions: [],
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0
      };
    }
  }, [transactions, filteredTransactions, currentRange]);

  const monthlyGoals = React.useMemo(() => {
    try {
      if (!goals || !Array.isArray(goals)) {
        console.warn('Dashboard: Invalid goals data, using fallback');
        return [];
      }
      return getGoalsForMonth(goals, new Date(currentRange.startDate.getFullYear(), currentRange.startDate.getMonth(), 1));
    } catch (error) {
      console.error('Dashboard: Error calculating monthly goals:', error);
      return [];
    }
  }, [goals, currentRange]);
  
  const { displayTransactions, totalIncome, totalExpenses, balance } = financialData;
  
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

  // Update date range whenever currentRange changes
  useEffect(() => {
    setCustomDateRange(currentRange.startDate, currentRange.endDate);
    console.log("Dashboard: Date range updated:", { 
      start: currentRange.startDate.toDateString(), 
      end: currentRange.endDate.toDateString(),
      type: currentRange.type
    });
  }, [currentRange, setCustomDateRange]);
  
  const handleRangeChange = (range: DateRange) => {
    console.log("Dashboard: Range changed to:", range);
    setCurrentRange(range);
  };

  const handleRefresh = () => {
    getTransactions();
    getGoals();
    toast({
      title: "Dados atualizados",
      description: "As informações foram atualizadas com sucesso."
    });
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
            currentRange={currentRange}
            onRangeChange={handleRangeChange}
            hideValues={hideValues}
            toggleHideValues={toggleHideValues}
            onAddTransaction={handleAddTransaction}
            onRefresh={handleRefresh}
          />
          
          {/* 3 Cards principais na mesma linha */}
          <DashboardStatCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            balance={balance}
            hideValues={hideValues}
            onNavigateToTransactionType={navigateToTransactionType}
          />

          {/* Conteúdo do dashboard - com fallback para evitar erro */}
          <DashboardContent
            filteredTransactions={displayTransactions || []}
            goals={monthlyGoals || []}
            currentGoalIndex={currentGoalIndex}
            currentMonth={new Date(currentRange.startDate.getFullYear(), currentRange.startDate.getMonth(), 1)}
            hideValues={hideValues}
            onGoalChange={setCurrentGoalIndex}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onMarkScheduledAsPaid={handleMarkScheduledAsPaid}
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
