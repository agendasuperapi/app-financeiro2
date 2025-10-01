import { Transaction, TimeRange } from '../types';
import { format, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";

// Get today's date at midnight
const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Get yesterday's date at midnight
const getYesterdayStart = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
};

// Get date X days ago at midnight
const getDaysAgoStart = (days: number) => {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);
  daysAgo.setHours(0, 0, 0, 0);
  return daysAgo;
};

// Create a local date from string to avoid timezone issues
export const createLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date(NaN);
  // Treat YYYY-MM-DD as local date (no timezone shift)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  }
  // Treat midnight UTC as local midnight to avoid showing previous day
  if (/T00:00:00(\.\d{3})?(Z|\+00:00)$/.test(dateString)) {
    const y = Number(dateString.slice(0, 4));
    const m = Number(dateString.slice(5, 7));
    const d = Number(dateString.slice(8, 10));
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  }
  // Fallback: native parsing (keeps local timezone conversion)
  return new Date(dateString);
};

// Filter transactions by time range
export const filterTransactionsByTimeRange = (
  transactions: Transaction[],
  timeRange: TimeRange,
  customStartDate?: Date,
  customEndDate?: Date
): Transaction[] => {
  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today

  switch (timeRange) {
    case 'today':
      const todayStart = getTodayStart();
      return sortedTransactions.filter(
        (t) => new Date(t.date) >= todayStart && new Date(t.date) <= now
      );

    case 'yesterday':
      const yesterdayStart = getYesterdayStart();
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return sortedTransactions.filter(
        (t) => new Date(t.date) >= yesterdayStart && new Date(t.date) <= yesterdayEnd
      );

    case '7days':
      const sevenDaysAgo = getDaysAgoStart(7);
      return sortedTransactions.filter(
        (t) => new Date(t.date) >= sevenDaysAgo && new Date(t.date) <= now
      );

    case '14days':
      const fourteenDaysAgo = getDaysAgoStart(14);
      return sortedTransactions.filter(
        (t) => new Date(t.date) >= fourteenDaysAgo && new Date(t.date) <= now
      );

    case '30days':
      const thirtyDaysAgo = getDaysAgoStart(30);
      return sortedTransactions.filter(
        (t) => new Date(t.date) >= thirtyDaysAgo && new Date(t.date) <= now
      );

    case 'custom':
      if (!customStartDate || !customEndDate) {
        return sortedTransactions;
      }
      const startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      return sortedTransactions.filter(
        (t) => new Date(t.date) >= startDate && new Date(t.date) <= endDate
      );

    default:
      return sortedTransactions;
  }
};

// Calculate total income
export const calculateTotalIncome = (transactions: Transaction[]): number => {
  return transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
};

// Calculate total expenses (return absolute value since expenses are stored as negative)
export const calculateTotalExpenses = (transactions: Transaction[]): number => {
  return Math.abs(transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0));
};

// NEW: Calculate month-specific financial data
export const calculateMonthlyFinancialData = (
  allTransactions: Transaction[],
  selectedMonth: Date
) => {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const selectedMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const selectedMonthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
  
  console.log('calculateMonthlyFinancialData:', {
    selectedMonth: selectedMonth.toDateString(),
    currentMonth: currentMonth.toDateString(),
    selectedMonthStart: selectedMonthStart.toDateString(),
    selectedMonthEnd: selectedMonthEnd.toDateString(),
    totalTransactions: allTransactions.length
  });
  
  // Filter transactions for the selected month only
  const monthTransactions = allTransactions.filter(transaction => {
    const transactionDate = createLocalDate(transaction.date);
    return transactionDate >= selectedMonthStart && transactionDate <= selectedMonthEnd;
  });
  
  // Calculate income and expenses for the selected month
  const monthlyIncome = calculateTotalIncome(monthTransactions);
  const monthlyExpenses = calculateTotalExpenses(monthTransactions);
  
  let accumulatedBalance = 0;
  
  // Calculate accumulated balance based on month type
  if (selectedMonthStart < currentMonth) {
    // PREVIOUS MONTHS: Show balance of that specific month only
    // This represents the balance that was available at the end of that month
    const transactionsUpToSelectedMonth = allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate <= selectedMonthEnd;
    });
    // Just sum all transactions since expenses are already negative
    accumulatedBalance = transactionsUpToSelectedMonth.reduce((sum, t) => sum + t.amount, 0);
    console.log('Previous month calculation:', { transactionsCount: transactionsUpToSelectedMonth.length, balance: accumulatedBalance });
    
  } else if (selectedMonthStart.getTime() === currentMonth.getTime()) {
    // CURRENT MONTH: Balance = all transactions up to current month (accumulated balance)
    const currentDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const transactionsUpToCurrent = allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate <= currentDateEnd;
    });
    // Just sum all transactions since expenses are already negative
    accumulatedBalance = transactionsUpToCurrent.reduce((sum, t) => sum + t.amount, 0);
    console.log('Current month calculation:', { transactionsCount: transactionsUpToCurrent.length, balance: accumulatedBalance });
    
  } else {
    // FUTURE MONTHS: Show current accumulated balance (will be transported to future)
    // No future transactions should be counted
    const currentDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const transactionsUpToCurrent = allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate <= currentDateEnd;
    });
    // Just sum all transactions since expenses are already negative
    accumulatedBalance = transactionsUpToCurrent.reduce((sum, t) => sum + t.amount, 0);
    console.log('Future month calculation:', { transactionsCount: transactionsUpToCurrent.length, balance: accumulatedBalance });
    
    // For future months, income and expenses should be only what's already registered for that future month
    // (the monthlyIncome and monthlyExpenses calculated above are correct)
  }
  
  const result = {
    monthlyIncome,
    monthlyExpenses,
    accumulatedBalance,
    monthTransactions
  };
  
  console.log('Final monthly calculation result:', result);
  return result;
};

// NEW: Get transactions for specific month range
export const getTransactionsForMonth = (
  transactions: Transaction[],
  selectedMonth: Date
): Transaction[] => {
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
  
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= monthStart && transactionDate <= monthEnd;
  });
};

// NEW: Get goals for specific month
export const getGoalsForMonth = (goals: any[], selectedMonth: Date) => {
  return goals.filter(goal => {
    if (!goal.targetDate) return true; // Goals without deadline are always active
    
    const goalDate = new Date(goal.targetDate);
    const selectedMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const selectedMonthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    
    // Goal is active if its target date is within or after the selected month
    return goalDate >= selectedMonthStart;
  });
};

// Format currency based on the selected currency type
export const formatCurrency = (amount: number, currency = 'BRL'): string => {
  const currencyOptions: { [key: string]: { locale: string, currency: string } } = {
    USD: { locale: 'pt-BR', currency: 'USD' },
    BRL: { locale: 'pt-BR', currency: 'BRL' }
  };

  const options = currencyOptions[currency] || currencyOptions.BRL;
  
  return new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency: options.currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// Safe parser that preserves local date when string lacks time (YYYY-MM-DD)
const parseDateSafe = (dateString: string): Date => {
  if (!dateString) return new Date(NaN);
  const isPlainDate = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  if (isPlainDate) {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  return new Date(dateString);
};

// Format date and time to readable string - dd/MM/yy HH:mm format
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = createLocalDate(dateString);
  if (isNaN(date.getTime())) return '';
  
  // Manual formatting to ensure correct date display
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Format date to readable string - fixed to pt-BR with timezone handling
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  // If the string is in YYYY-MM-DD format, treat it as local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  // If it's midnight UTC, render as local midnight (avoid previous day)
  if (/T00:00:00(\.\d{3})?(Z|\+00:00)$/.test(dateString)) {
    const year = Number(dateString.slice(0, 4));
    const month = Number(dateString.slice(5, 7));
    const day = Number(dateString.slice(8, 10));
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  // Fallback
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format time to readable string - fixed to pt-BR
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format date to YYYY-MM-DD (for input[type="date"]) with timezone handling
export const formatDateForInput = (dateString: string): string => {
  // Parse the date string manually to avoid timezone issues
  // If the string is in YYYY-MM-DD format, return as-is
  if (dateString.includes('-') && dateString.length === 10) {
    return dateString;
  }
  
  // For other date formats, convert properly
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Function to calculate category summaries
export const calculateCategorySummaries = (
  transactions: Transaction[],
  type: 'income' | 'expense'
) => {
  const filteredTransactions = transactions.filter((t) => t.type === type);
  // For expenses, use absolute values since they're stored as negative
  const totalAmount = Math.abs(filteredTransactions.reduce((sum, t) => sum + t.amount, 0));
  
  // Group by category
  const categories = filteredTransactions.reduce((acc, t) => {
    if (!acc[t.category]) {
      acc[t.category] = 0;
    }
    // For expenses, use absolute value
    acc[t.category] += type === 'expense' ? Math.abs(t.amount) : t.amount;
    return acc;
  }, {} as Record<string, number>);
  
  // Generate random colors for categories
  const colors = [
    '#4ECDC4', '#FF6B6B', '#2C6E7F', '#FBBF24', '#8B5CF6', 
    '#EC4899', '#10B981', '#94A3B8', '#F43F5E', '#F59E0B'
  ];
  
  // Create summaries
  return Object.entries(categories).map(([category, amount], index) => ({
    category,
    amount,
    percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
    color: colors[index % colors.length]
  }));
};
