
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

  const progress = Math.min(Math.round((actualAmount / currentGoal.targetAmount) * 100), 100);
  
  // Check if limit is exceeded (for expenses) or goal not met (for income)
  const isExceeded = currentGoal.type === 'expense' 
    ? actualAmount > currentGoal.targetAmount
    : false; // For income goals, we don't mark as "exceeded"
  
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
          <span className={`font-semibold ${isExceeded ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>
            {formatCurrency(actualAmount, currency)}
          </span>
          <span className="text-muted-foreground">
            {t('goals.of')} {formatCurrency(currentGoal.targetAmount, currency)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default GoalNavigation;
