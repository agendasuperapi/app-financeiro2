
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Calendar, ChevronRight } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/transactionUtils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getTransactions } from '@/services/transactionService';

interface UpcomingExpensesAlertProps {}

const UpcomingExpensesAlert: React.FC<UpcomingExpensesAlertProps> = () => {
  const { t, currency } = usePreferences();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      const data = await getTransactions();
      setTransactions(data);
    };
    
    fetchTransactions();
  }, []);

  // Filtrar apenas despesas recentes (últimos 30 dias)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  const recentExpenses = transactions.filter(
    transaction => transaction.type === 'expense' && 
    new Date(transaction.date) >= thirtyDaysAgo
  );

  // Categorizar por data
  const categorizedExpenses = recentExpenses.reduce((acc, transaction) => {
    const transactionDate = new Date(transaction.date);
    const daysFromToday = Math.ceil((today.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysFromToday === 0) {
      acc.today.push(transaction);
    } else if (daysFromToday <= 7) {
      acc.thisWeek.push(transaction);
    } else {
      acc.thisMonth.push(transaction);
    }

    return acc;
  }, {
    today: [] as Transaction[],
    thisWeek: [] as Transaction[],
    thisMonth: [] as Transaction[]
  });

  const totalRecentExpenses = categorizedExpenses.today.length + 
                                 categorizedExpenses.thisWeek.length + 
                                 categorizedExpenses.thisMonth.length;

  // Não mostrar se não há despesas recentes
  if (totalRecentExpenses === 0) {
    return null;
  }

  const totalAmount = [
    ...categorizedExpenses.today,
    ...categorizedExpenses.thisWeek,
    ...categorizedExpenses.thisMonth
  ].reduce((sum, transaction) => sum + transaction.amount, 0);

  const getUrgencyData = () => {
    if (categorizedExpenses.today.length > 0) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'bg-red-500',
        textColor: 'text-red-800 dark:text-red-200',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-800',
        count: categorizedExpenses.today.length,
        label: 'hoje'
      };
    }
    if (categorizedExpenses.thisWeek.length > 0) {
      return {
        icon: <Clock className="h-4 w-4" />,
        color: 'bg-orange-500',
        textColor: 'text-orange-800 dark:text-orange-200',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        count: categorizedExpenses.thisWeek.length,
        label: 'nesta semana'
      };
    }
    return {
      icon: <Calendar className="h-4 w-4" />,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-800 dark:text-yellow-200',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      count: categorizedExpenses.thisMonth.length,
      label: 'neste mês'
    };
  };

  const urgencyData = getUrgencyData();

  return (
    <Card className={cn(
      "border-l-4 transition-all animate-fade-in",
      urgencyData.borderColor,
      urgencyData.bgColor
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full text-white", urgencyData.color)}>
              {urgencyData.icon}
            </div>
            <div>
              <p className={cn("font-semibold text-sm", urgencyData.textColor)}>
                {totalRecentExpenses} {totalRecentExpenses === 1 ? 'despesa' : 'despesas'} {urgencyData.label}
              </p>
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency(totalAmount, currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Badge com contagem */}
            <Badge variant="secondary" className={urgencyData.textColor}>
              {totalRecentExpenses}
            </Badge>

            {/* Link para página de transações */}
            <Button size="sm" variant="ghost" asChild className="h-8 px-2">
              <Link to="/expenses">
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Detalhes expandidos para casos mais recentes */}
        {(categorizedExpenses.today.length > 0 || categorizedExpenses.thisWeek.length > 0) && (
          <div className="mt-3 pt-3 border-t border-current opacity-20">
            <div className="space-y-1">
              {categorizedExpenses.today.slice(0, 2).map(transaction => (
                <div key={transaction.id} className="flex justify-between items-center text-xs">
                  <span className="truncate max-w-[150px]">{transaction.description}</span>
                  <span className="font-medium">{formatCurrency(transaction.amount, currency)}</span>
                </div>
              ))}
              {categorizedExpenses.thisWeek.slice(0, 2).map(transaction => (
                <div key={transaction.id} className="flex justify-between items-center text-xs">
                  <span className="truncate max-w-[150px]">{transaction.description}</span>
                  <span className="font-medium">{formatCurrency(transaction.amount, currency)}</span>
                </div>
              ))}
              {totalRecentExpenses > 2 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{totalRecentExpenses - 2} outras
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingExpensesAlert;
