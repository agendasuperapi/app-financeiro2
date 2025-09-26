
import React from 'react';
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
const generateMonthlyChartData = (transactions: any[]) => {
  console.log("Generating monthly chart data with transactions:", transactions.length);
  
  // Create array for last 10 months + next 2 months (total 12 months)
  const months = [];
  const currentDate = new Date();
  
  // Add last 10 months (including current)
  for (let i = 9; i >= 0; i--) {
    const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    months.push(monthDate);
  }
  
  // Add next 2 months
  for (let i = 1; i <= 2; i++) {
    const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    months.push(monthDate);
  }
  
  // Create monthly data structure
  const monthlyData = months.map(month => {
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    const monthName = format(month, 'MMM yyyy', { locale: pt });
    
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
  const { filteredTransactions } = useAppContext();
  const { currency, t } = usePreferences();
  
  // Use monthTransactions if provided, otherwise fall back to filteredTransactions
  const transactionsToUse = monthTransactions || filteredTransactions;
  const expenseSummaries = calculateCategorySummaries(transactionsToUse, 'expense');
  
  console.log("Rendering charts with transactions:", transactionsToUse.length, "for month:", currentMonth.toDateString());
  
  // Generate monthly data using all transactions
  const monthlyData = generateMonthlyChartData(transactionsToUse);
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 border rounded-md shadow-sm">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'income' 
                ? t('common.income') 
                : entry.name === 'expenses' 
                  ? t('common.expense')
                  : t('common.balance')}: {
                    hideValues 
                      ? '******' 
                      : formatCurrency(entry.value, currency)
                  }
            </p>
          ))}
        </div>
      );
    }
  
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Income/Expense Bar Chart */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">{t('charts.incomeVsExpenses')} - Últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis 
                    dataKey="monthName" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={(value) => 
                    hideValues 
                      ? '***' 
                      : formatCurrency(value, currency).split('.')[0]
                  } />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="income" 
                    name={t('common.income')} 
                    fill="#26DE81" 
                  />
                  <Bar 
                    dataKey="expenses" 
                    name={t('common.expense')} 
                    fill="#EF4444" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories Pie Chart */}
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">{t('charts.expenseBreakdown')} - Período Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {expenseSummaries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseSummaries}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amount"
                      nameKey="category"
                      label={({ category, percent }) => 
                        `${category}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {expenseSummaries.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip 
                      formatter={(value) => 
                        hideValues 
                          ? '******' 
                          : formatCurrency(Number(value), currency)
                      } 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-metacash-gray">{t('common.noData')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardCharts;
