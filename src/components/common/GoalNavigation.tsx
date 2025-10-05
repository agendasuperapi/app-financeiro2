
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/utils/transactionUtils';
import { Goal } from '@/types';
import { usePreferences } from '@/contexts/PreferencesContext';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface GoalNavigationProps {
  goals: Goal[];
  currentGoalIndex: number;
  onGoalChange: (index: number) => void;
}

const GoalNavigation: React.FC<GoalNavigationProps> = ({ 
  goals, 
  currentGoalIndex, 
  onGoalChange 
}) => {
  const { t, currency } = usePreferences();
  const [actualAmount, setActualAmount] = useState(0);
  const [contaBalance, setContaBalance] = useState(0);
  
  if (goals.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          {t('goals.noGoals')}
        </p>
      </div>
    );
  }

  const currentGoal = goals[currentGoalIndex];

  // Get currency symbol with space
  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$ ' : 'R$ ';
  };

  // Normalize date to 'YYYY-MM-DD' string (strip time/zone)
  const normalizeDateString = (value?: string) => {
    if (!value) return undefined;
    return value.includes('T') ? value.split('T')[0] : value;
  };

  // Calculate actual amount from transactions
  useEffect(() => {
    const fetchActualAmount = async () => {
      try {
        const startDate = currentGoal.startDate || currentGoal.start_date;
        const endDate = currentGoal.endDate || currentGoal.end_date;
        
        const startStr = normalizeDateString(startDate);
        const endStr = normalizeDateString(endDate);
        
        if (!startStr) {
          setActualAmount(currentGoal.currentAmount);
          return;
        }

        // Extract category name from goal name (format: "CategoryName - Period")
        const categoryName = currentGoal.name.split(' - ')[0];

        // Get the category ID from the category name
        const { data: category, error: categoryError } = await supabase
          .from('poupeja_categories')
          .select('id, name')
          .eq('name', categoryName)
          .single();

        if (!category || categoryError) {
          setActualAmount(currentGoal.currentAmount);
          return;
        }

        // Helper to get next day string (YYYY-MM-DD)
        const getNextDayStr = (dateStr: string) => {
          const [y, m, d] = dateStr.split('-').map(Number);
          const next = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + 1));
          return next.toISOString().slice(0, 10);
        };

        // Build query for transactions (both income and expense)
        let query = supabase
          .from('poupeja_transactions')
          .select('amount, date, description, type')
          .eq('category_id', category.id)
          .gte('date', startStr);

        // Use exclusive upper bound for end date: < next day
        if (endStr) {
          query = query.lt('date', getNextDayStr(endStr));
        }

        const { data: transactions, error } = await query;

        if (error) {
          console.error('Error fetching transactions:', error);
          setActualAmount(currentGoal.currentAmount);
          return;
        }

        // Calculate based on goal type
        const totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
        const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
        
        // For income goals, show total income. For expense goals, show total expenses
        const calculatedAmount = currentGoal.type === 'income' ? totalIncome : totalExpenses;
        
        setActualAmount(calculatedAmount);

      } catch (error) {
        console.error('Error calculating actual amount:', error);
        setActualAmount(currentGoal.currentAmount);
      }
    };

    fetchActualAmount();
  }, [currentGoal]);

  // Fetch conta balance if goal has conta_id
  useEffect(() => {
    const fetchContaBalance = async () => {
      try {
        const contaId = currentGoal.conta_id;
        
        if (!contaId) {
          setContaBalance(0);
          return;
        }

        // Get transactions for this conta and calculate balance
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setContaBalance(0);
          return;
        }

        const { data: transactions, error } = await (supabase as any)
          .from('poupeja_transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('conta_id', contaId);

        if (error) {
          console.error('Error fetching conta transactions:', error);
          setContaBalance(0);
          return;
        }

        // Calculate balance by summing all transactions
        const balance = transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
        setContaBalance(balance);

      } catch (error) {
        console.error('Error calculating conta balance:', error);
        setContaBalance(0);
      }
    };

    fetchContaBalance();
  }, [currentGoal]);

  const isExpense = currentGoal.type === 'expense';
  const rawValue = currentGoal.conta_id ? contaBalance : actualAmount;
  const absValue = Math.abs(rawValue);
  const effectiveValue = isExpense ? absValue : rawValue;
  const progress = Math.min(Math.round((effectiveValue / currentGoal.targetAmount) * 100), 100);
  
  // Check if limit is exceeded (only for expenses)
  const isExceeded = isExpense ? absValue > currentGoal.targetAmount : false;
  
  // Check if goal is achieved (only for income)
  const isGoalAchieved = !isExpense ? effectiveValue >= currentGoal.targetAmount : false;
  
  const handlePreviousGoal = () => {
    onGoalChange(currentGoalIndex > 0 ? currentGoalIndex - 1 : goals.length - 1);
  };
  
  const handleNextGoal = () => {
    onGoalChange(currentGoalIndex < goals.length - 1 ? currentGoalIndex + 1 : 0);
  };
  
  return (
    <motion.div 
      className={`p-4 border rounded-lg shadow-sm ${isExceeded ? 'bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-800' : 'bg-card'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{t('goals.progress')}</h3>
        
        {goals.length > 1 && (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePreviousGoal}
              className="h-8 w-8 rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentGoalIndex + 1}/{goals.length}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNextGoal}
              className="h-8 w-8 rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div>
        <div className="flex justify-between mb-1">
          <p className="text-sm font-medium">{currentGoal.name}</p>
          <p className="text-sm font-medium">{progress}%</p>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between mt-2 text-sm">
          <div className="flex items-center gap-2">
            {isExceeded && (
              <span className="text-red-600 dark:text-red-400 font-medium text-xs">
                Limite Excedido
              </span>
            )}
            {isGoalAchieved && (
              <span className="text-green-600 dark:text-green-400 font-medium text-xs">
                Meta Batida
              </span>
            )}
            <span className={`font-semibold ${isExceeded ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>
              {formatCurrency(currentGoal.conta_id ? contaBalance : actualAmount, currency)}
            </span>
          </div>
          <span className="text-muted-foreground">
            {t('goals.of')} {formatCurrency(currentGoal.targetAmount, currency)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default GoalNavigation;
