import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, createLocalDate } from '@/utils/transactionUtils';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { calculateCategorySummaries } from '@/utils/transactionUtils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
interface DashboardChartsProps {
  currentMonth?: Date;
  hideValues?: boolean;
  monthTransactions?: any[]; // NEW: Accept month-specific transactions
}

// Generate chart data from the actual transaction data for multiple months
const generateMonthlyChartData = (transactions: any[], selectedMonth: Date) => {
  console.log("Generating monthly chart data with transactions:", transactions.length);

  // Create array for 3 months before, selected month, and 3 months after (7 months total)
  const months = [];

  // Add 3 months before
  for (let i = 3; i >= 1; i--) {
    const monthDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - i, 1);
    months.push(monthDate);
  }

  // Add selected month
  months.push(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1));

  // Add 3 months after
  for (let i = 1; i <= 3; i++) {
    const monthDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + i, 1);
    months.push(monthDate);
  }

  // Create monthly data structure
  const monthlyData = months.map(month => {
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    const monthName = format(month, 'MMM yyyy', {
      locale: pt
    });
    return {
      month: monthKey,
      monthName,
      income: 0,
      expenses: 0,
      balance: 0
    };
  });

  // Fill with actual transaction data
  transactions.forEach(transaction => {
    const transactionDate = createLocalDate(transaction.date);
    const transactionMonthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
    const monthData = monthlyData.find(data => data.month === transactionMonthKey);
    if (monthData) {
      if (transaction.type === 'income') {
        monthData.income += transaction.amount;
      } else {
        // Expenses are stored as negative values, so use absolute value
        monthData.expenses += Math.abs(transaction.amount);
      }
    }
  });

  // Calculate balance for each month
  monthlyData.forEach(monthData => {
    monthData.balance = monthData.income - monthData.expenses;
  });
  return monthlyData;
};
const DashboardCharts: React.FC<DashboardChartsProps> = ({
  currentMonth = new Date(),
  hideValues = false,
  monthTransactions
}) => {
  const {
    transactions
  } = useAppContext(); // Use all transactions, not filtered ones
  const {
    currency,
    t
  } = usePreferences();

  // Always use all transactions to show complete data across all months
  const transactionsToUse = transactions;
  const expenseSummaries = calculateCategorySummaries(transactionsToUse, 'expense');
  console.log("Rendering charts with all transactions:", transactionsToUse.length);

  // Generate monthly data using all transactions and selected month
  const monthlyData = generateMonthlyChartData(transactionsToUse, currentMonth);

  // Custom tooltip for charts
  const CustomTooltip = ({
    active,
    payload,
    label
  }: any) => {
    if (active && payload && payload.length) {
      return <div className="bg-card p-3 border rounded-md shadow-sm">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => <p key={`item-${index}`} className="text-sm" style={{
          color: entry.color
        }}>
              {entry.name === 'income' ? t('common.income') : entry.name === 'expenses' ? t('common.expense') : t('common.balance')}: {hideValues ? '******' : formatCurrency(entry.value, currency)}
            </p>)}
        </div>;
    }
    return null;
  };
  // Listener para capturar gráficos quando transação for atualizada
  useEffect(() => {
    console.log('📊 DashboardCharts mounted - listener registered');
    
    const handleTransactionUpdate = async () => {
      console.log('🎯 transaction-updated event received (or initial capture)!');
      
      // Aguarda um pequeno delay para garantir que os gráficos foram re-renderizados
      setTimeout(async () => {
        console.log('📸 Starting chart capture...');
        
        try {
          // Dynamic import para evitar circular dependency
          const { captureAndSaveChart } = await import('@/services/chartImageService');
          
          const barResult = await captureAndSaveChart('chart-bar-income-expenses', 'grafico_barras', currentMonth);
          console.log('📊 Bar chart capture result:', barResult);
          
          const pieResult = await captureAndSaveChart('chart-pie-categories', 'grafico_pizza', currentMonth);
          console.log('🥧 Pie chart capture result:', pieResult);
        } catch (err) {
          console.error('❌ Error during chart capture flow:', err);
        }
      }, 1000);
    };

    // Registrar listener para atualizações de transação
    window.addEventListener('transaction-updated', handleTransactionUpdate);

    // Também disparar uma captura inicial ao montar o dashboard
    handleTransactionUpdate();
    
    return () => {
      console.log('📊 DashboardCharts unmounted - listener removed');
      window.removeEventListener('transaction-updated', handleTransactionUpdate);
    };
  }, [currentMonth]);

  return <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Income/Expense Bar Chart */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-center">{t('charts.incomeVsExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="chart-bar-income-expenses" className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{
                top: 5,
                right: 20,
                left: 0,
                bottom: 5
              }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="monthName" angle={-45} textAnchor="end" height={60} fontSize={12} />
                  <YAxis 
                    tickFormatter={value => {
                      if (hideValues) return '***';
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toFixed(0);
                    }} 
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="income" name={t('common.income')} fill="#26DE81" />
                  <Bar dataKey="expenses" name={t('common.expense')} fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories Pie Chart */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-center">{t('charts.expenseBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="chart-pie-categories" className="h-64 flex items-center justify-center">
              {expenseSummaries.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 5, right: 30, bottom: 5, left: 30 }}>
                    <Pie 
                      data={expenseSummaries} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={50} 
                      outerRadius={70} 
                      paddingAngle={2} 
                      dataKey="amount" 
                      nameKey="category" 
                      label={false}
                    >
                      {expenseSummaries.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry: any) => {
                        const data = entry.payload;
                        const total = expenseSummaries.reduce((sum, item) => sum + item.amount, 0);
                        const percent = ((data.amount / total) * 100).toFixed(0);
                        return `${value}: ${percent}%`;
                      }}
                    />
                    <Tooltip formatter={value => hideValues ? '******' : formatCurrency(Number(value), currency)} />
                  </PieChart>
                </ResponsiveContainer> : <p className="text-metacash-gray">{t('common.noData')}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default DashboardCharts;