import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, createLocalDate } from '@/utils/transactionUtils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import CategoryDetailsList from './CategoryDetailsList';
import { Transaction } from '@/types';

interface EnhancedChartCardProps {
  transactions: Transaction[];
  currentMonth: Date;
  hideValues?: boolean;
  filterPerson?: string;
}

type FilterType = 'all' | 'income' | 'expense' | 'expense_unpaid' | 'expense_paid' | 
                  'expense_overdue' | 'income_unreceived' | 'income_received' | 'income_overdue';

const EnhancedChartCard: React.FC<EnhancedChartCardProps> = ({
  transactions,
  currentMonth,
  hideValues = false,
  filterPerson = 'all'
}) => {
  const { currency, t, language } = usePreferences();
  const isMobile = useIsMobile();
  const [filterType, setFilterType] = React.useState<FilterType>('all');

  const locale = language === 'pt' ? pt : enUS;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter transactions based on selected filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filter by type and status
    switch (filterType) {
      case 'income':
        filtered = filtered.filter(tx => tx.type === 'income');
        break;
      case 'expense':
        filtered = filtered.filter(tx => tx.type === 'expense');
        break;
      case 'expense_unpaid':
        filtered = filtered.filter(tx => tx.type === 'expense' && tx.status !== 'paid');
        break;
      case 'expense_paid':
        filtered = filtered.filter(tx => tx.type === 'expense' && tx.status === 'paid');
        break;
      case 'expense_overdue':
        filtered = filtered.filter(tx => {
          if (tx.type !== 'expense' || tx.status === 'paid') return false;
          const txDate = createLocalDate(tx.date);
          return txDate < today;
        });
        break;
      case 'income_unreceived':
        filtered = filtered.filter(tx => tx.type === 'income' && tx.status !== 'paid');
        break;
      case 'income_received':
        filtered = filtered.filter(tx => tx.type === 'income' && tx.status === 'paid');
        break;
      case 'income_overdue':
        filtered = filtered.filter(tx => {
          if (tx.type !== 'income' || tx.status === 'paid') return false;
          const txDate = createLocalDate(tx.date);
          return txDate < today;
        });
        break;
    }

    // Filter by person
    if (filterPerson !== 'all') {
      filtered = filtered.filter(tx => tx.creatorName === filterPerson);
    }

    return filtered;
  }, [transactions, filterType, filterPerson, today]);

  // Calculate category data for chart
  const chartData = useMemo(() => {
    const categoryMap = new Map<string, { amount: number; color: string }>();
    
    filteredTransactions.forEach(tx => {
      const category = tx.category || t('categories.other');
      const color = tx.categoryColor || '#94A3B8';
      const amount = Math.abs(tx.amount);
      
      if (categoryMap.has(category)) {
        const existing = categoryMap.get(category)!;
        categoryMap.set(category, { 
          amount: existing.amount + amount, 
          color 
        });
      } else {
        categoryMap.set(category, { amount, color });
      }
    });

    const data = Array.from(categoryMap.entries()).map(([category, { amount, color }]) => ({
      name: category,
      value: amount,
      color
    }));

    return data.sort((a, b) => b.value - a.value);
  }, [filteredTransactions, t]);

  // Calculate total and category details
  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  const categoryDetails = useMemo(() => {
    return chartData.map(item => ({
      category: item.name,
      amount: item.value,
      color: item.color,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }));
  }, [chartData, total]);

  // Get title based on filter
  const getTitle = () => {
    switch (filterType) {
      case 'income':
        return t('charts.incomeOnly');
      case 'expense':
        return t('charts.expenseOnly');
      case 'expense_unpaid':
        return t('charts.expenseUnpaid');
      case 'expense_paid':
        return t('charts.expensePaid');
      case 'expense_overdue':
        return t('charts.expenseOverdue');
      case 'income_unreceived':
        return t('charts.incomeUnreceived');
      case 'income_received':
        return t('charts.incomeReceived');
      case 'income_overdue':
        return t('charts.incomeOverdue');
      default:
        return t('charts.all');
    }
  };

  const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">{t('nav.charts')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter - Mobile: Select, Desktop: Tabs */}
        {isMobile ? (
          <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('charts.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('charts.all')}</SelectItem>
              <SelectItem value="income">{t('charts.incomeOnly')}</SelectItem>
              <SelectItem value="expense">{t('charts.expenseOnly')}</SelectItem>
              <SelectItem value="expense_unpaid">{t('charts.expenseUnpaid')}</SelectItem>
              <SelectItem value="expense_paid">{t('charts.expensePaid')}</SelectItem>
              <SelectItem value="expense_overdue">{t('charts.expenseOverdue')}</SelectItem>
              <SelectItem value="income_unreceived">{t('charts.incomeUnreceived')}</SelectItem>
              <SelectItem value="income_received">{t('charts.incomeReceived')}</SelectItem>
              <SelectItem value="income_overdue">{t('charts.incomeOverdue')}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Tabs value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
            <TabsList className="w-full overflow-x-auto flex-wrap h-auto justify-start gap-1">
              <TabsTrigger value="all" className="text-xs">{t('charts.all')}</TabsTrigger>
              <TabsTrigger value="income" className="text-xs">{t('charts.incomeOnly')}</TabsTrigger>
              <TabsTrigger value="expense" className="text-xs">{t('charts.expenseOnly')}</TabsTrigger>
              <TabsTrigger value="expense_unpaid" className="text-xs">{t('charts.expenseUnpaid')}</TabsTrigger>
              <TabsTrigger value="expense_paid" className="text-xs">{t('charts.expensePaid')}</TabsTrigger>
              <TabsTrigger value="expense_overdue" className="text-xs">{t('charts.expenseOverdue')}</TabsTrigger>
              <TabsTrigger value="income_unreceived" className="text-xs">{t('charts.incomeUnreceived')}</TabsTrigger>
              <TabsTrigger value="income_received" className="text-xs">{t('charts.incomeReceived')}</TabsTrigger>
              <TabsTrigger value="income_overdue" className="text-xs">{t('charts.incomeOverdue')}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Chart Section */}
        <div className="space-y-2">
          <div className="text-center">
            <h3 className="font-semibold text-lg">{getTitle()}</h3>
            <p className="text-sm text-muted-foreground capitalize">
              {format(startDate, 'd')} a {format(endDate, 'd')} de {format(currentMonth, 'MMMM yyyy', { locale })}
            </p>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => 
                      hideValues ? '******' : formatCurrency(value, currency)
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center value */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {hideValues ? '******' : formatCurrency(total, currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('common.total')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </div>
          )}
        </div>

        {/* Details Section */}
        {chartData.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">{t('charts.details')}</h4>
            <CategoryDetailsList 
              categories={categoryDetails} 
              hideValues={hideValues}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedChartCard;
