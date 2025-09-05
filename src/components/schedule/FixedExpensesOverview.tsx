
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Transaction } from '@/types';
import { formatCurrency, createLocalDate } from '@/utils/transactionUtils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Calendar, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface FixedExpensesOverviewProps {
  scheduledTransactions: Transaction[];
}

const FixedExpensesOverview: React.FC<FixedExpensesOverviewProps> = ({ scheduledTransactions }) => {
  const { t, currency } = usePreferences();

  // Filtrar apenas despesas
  const expenses = scheduledTransactions.filter(transaction => transaction.type === 'expense');

  // Calcular total mensal de despesas fixas (pendentes)
  const monthlyTotal = expenses
    .filter(transaction => transaction.recurrence === 'monthly' && transaction.status !== 'paid')
    .reduce((total, transaction) => total + transaction.amount, 0);

  // Calcular total pago neste mês
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyPaid = expenses
    .filter(transaction => {
      if (!transaction.paidDate) return false;
      const paidDate = createLocalDate(transaction.paidDate);
      return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
    })
    .reduce((total, transaction) => total + (transaction.paidAmount || transaction.amount), 0);

  // Calcular próximos vencimentos (próximos 7 dias)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const upcomingPayments = expenses.filter(transaction => {
    if (transaction.status === 'paid') return false;
    const transactionDate = createLocalDate(transaction.nextExecutionDate || transaction.scheduledDate || transaction.scheduled_date || transaction.date);
    return transactionDate >= today && transactionDate <= nextWeek;
  });

  // Calcular transações vencidas
  const overdueTransactions = expenses.filter(transaction => {
    if (transaction.status === 'paid') return false;
    const transactionDate = createLocalDate(transaction.nextExecutionDate || transaction.scheduledDate || transaction.scheduled_date || transaction.date);
    return transactionDate < today;
  });

  // Contar por tipo de recorrência
  const recurrenceStats = expenses
    .filter(transaction => transaction.status !== 'paid')
    .reduce((stats, transaction) => {
      const recurrence = transaction.recurrence || 'once';
      stats[recurrence] = (stats[recurrence] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-3 lg:grid-cols-3 gap-1 md:gap-2 lg:gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-1 py-2 md:px-3 md:py-2 lg:px-6 lg:py-6">
          <CardTitle className="text-xs md:text-xs lg:text-sm font-medium break-words leading-tight">{t('schedule.monthlyTotal')}</CardTitle>
          <TrendingUp className="h-2 w-2 md:h-3 md:w-3 lg:h-4 lg:w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-1 pb-1 md:px-3 md:pb-3 lg:px-6 lg:pb-6">
          <div className="text-sm md:text-lg lg:text-2xl font-bold text-red-600">
            {formatCurrency(monthlyTotal, currency)}
          </div>
          <p className="text-xs md:text-xs lg:text-xs text-muted-foreground break-words">
            {t('schedule.pendingExpenses')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-1 py-2 md:px-3 md:py-2 lg:px-6 lg:py-6">
          <CardTitle className="text-xs md:text-xs lg:text-sm font-medium break-words leading-tight">{t('schedule.paidThisMonth')}</CardTitle>
          <CheckCircle className="h-2 w-2 md:h-3 md:w-3 lg:h-4 lg:w-4 text-green-500 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-1 pb-1 md:px-3 md:pb-3 lg:px-6 lg:pb-6">
          <div className="text-sm md:text-lg lg:text-2xl font-bold text-green-600">
            {formatCurrency(monthlyPaid, currency)}
          </div>
          <p className="text-xs md:text-xs lg:text-xs text-muted-foreground break-words">
            {t('schedule.alreadyPaid')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-1 py-2 md:px-3 md:py-2 lg:px-6 lg:py-6">
          <CardTitle className="text-xs md:text-xs lg:text-sm font-medium break-words leading-tight">{t('schedule.upcomingPayments')}</CardTitle>
          <Clock className="h-2 w-2 md:h-3 md:w-3 lg:h-4 lg:w-4 text-orange-500 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-1 pb-1 md:px-3 md:pb-3 lg:px-6 lg:pb-6">
          <div className="text-sm md:text-lg lg:text-2xl font-bold text-orange-600">
            {upcomingPayments.length}
          </div>
          <p className="text-xs md:text-xs lg:text-xs text-muted-foreground break-words">
            {t('schedule.next7Days')}
          </p>
        </CardContent>
      </Card>

    </div>
  );
};

export default FixedExpensesOverview;
