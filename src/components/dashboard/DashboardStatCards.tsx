
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/transactionUtils';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { motion } from 'framer-motion';

interface DashboardStatCardsProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  hideValues: boolean;
  transactionsWithSimulations?: any[];
  onNavigateToTransactionType: (type: 'income' | 'expense') => void;
}

const DashboardStatCards: React.FC<DashboardStatCardsProps> = ({
  totalIncome,
  totalExpenses,
  balance,
  hideValues,
  transactionsWithSimulations = [],
  onNavigateToTransactionType
}) => {
  // Puxar valor do elemento income-total
  const [incomeFromTotal, setIncomeFromTotal] = React.useState(totalIncome);
  
  React.useEffect(() => {
    const getIncomeFromElement = () => {
      const element = document.getElementById('income-total');
      if (element && element.textContent && !element.textContent.includes('*')) {
        // Tratar formato brasileiro: R$ 5.850,00
        let text = element.textContent;
        // Remover símbolos de moeda e espaços
        text = text.replace(/[R$\s]/g, '');
        // Remover pontos de milhares e substituir vírgula decimal por ponto
        text = text.replace(/\./g, '').replace(',', '.');
        const value = parseFloat(text) || totalIncome;
        setIncomeFromTotal(value);
      } else {
        setIncomeFromTotal(totalIncome);
      }
    };

    // Observar mudanças no elemento
    const observer = new MutationObserver(getIncomeFromElement);
    const targetElement = document.getElementById('income-total');
    
    if (targetElement) {
      observer.observe(targetElement, { childList: true, characterData: true, subtree: true });
      getIncomeFromElement(); // Executar uma vez
    }

    return () => observer.disconnect();
  }, [totalIncome]);

  const { t, currency } = usePreferences();
  
  // Total de despesas (reais + simulações) - mesma lógica do DashboardContent
  const totalExpensesCombined = React.useMemo(() => {
    if (transactionsWithSimulations.length === 0) return totalExpenses;
    
    return transactionsWithSimulations
      .filter((tx: any) => (tx.type === 'expense') || (typeof tx.amount === 'number' && tx.amount < 0))
      .reduce((sum: number, tx: any) => {
        const amt = Number(tx.amount) || 0;
        // Considerar valor absoluto para despesas negativas ou tipo 'expense'
        return sum + (amt < 0 ? -amt : (tx.type === 'expense' ? amt : 0));
      }, 0);
  }, [transactionsWithSimulations, totalExpenses]);

  // Cálculo do saldo: valor do mês passado + income + expense dos cards
  const [calculatedBalance, setCalculatedBalance] = React.useState(balance);
  
  React.useEffect(() => {
    const calculateBalanceFromCards = () => {
      const incomeElement = document.getElementById('income-card-value');
      const expenseElement = document.getElementById('expense-card-value');
      
      if (incomeElement && expenseElement && !hideValues) {
        // Extrair valores dos elementos
        const extractValue = (element: HTMLElement) => {
          if (!element.textContent || element.textContent.includes('*')) return 0;
          let text = element.textContent;
          text = text.replace(/[R$\s]/g, '');
          text = text.replace(/\./g, '').replace(',', '.');
          return parseFloat(text) || 0;
        };
        
        const incomeValue = extractValue(incomeElement);
        const expenseValue = extractValue(expenseElement);
        
        // Saldo = valor do mês anterior + income + expense
        const newBalance = balance + incomeValue + expenseValue;
        setCalculatedBalance(newBalance);
      } else {
        setCalculatedBalance(balance);
      }
    };

    // Observar mudanças nos elementos dos cards
    const observer = new MutationObserver(calculateBalanceFromCards);
    const incomeElement = document.getElementById('income-card-value');
    const expenseElement = document.getElementById('expense-card-value');
    
    if (incomeElement && expenseElement) {
      observer.observe(incomeElement, { childList: true, characterData: true, subtree: true });
      observer.observe(expenseElement, { childList: true, characterData: true, subtree: true });
      calculateBalanceFromCards(); // Executar uma vez
    }

    return () => observer.disconnect();
  }, [balance, hideValues]);

  // Cores/fundo conforme sinal do saldo calculado
  const saldoBgGradient = calculatedBalance >= 0
    ? 'bg-gradient-to-br from-green-500 via-green-600 to-green-700' 
    : 'bg-gradient-to-br from-red-500 via-red-600 to-red-700';
  
  const renderHiddenValue = () => '******';

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
    <motion.div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
      variants={itemVariants}
    >
      {/* Card do Saldo */}
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={`relative overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 ${saldoBgGradient}`}>
          <CardContent className="p-4 lg:p-6">
            <div className="text-center text-white relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 rounded-full bg-white/20">
                  <Wallet className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                <p className="text-xs lg:text-sm font-medium opacity-90">{t('stats.currentBalance')}</p>
              </div>
              <p id="balance-card-value" className={`text-xl lg:text-2xl xl:text-3xl font-bold text-white`}>
                {hideValues ? renderHiddenValue() : formatCurrency(calculatedBalance, currency)}
              </p>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 lg:w-16 lg:h-16 bg-white/10 rounded-full" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Card de Receita */}
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className="relative overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" 
          onClick={() => onNavigateToTransactionType('income')}
        >
          <CardContent className="p-4 lg:p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs lg:text-sm font-medium text-green-700 dark:text-green-400">
                  {t('common.income')}
                </p>
              </div>
              <p id="income-card-value" className="text-xl lg:text-2xl xl:text-3xl font-bold text-green-700 dark:text-green-400">
                {hideValues ? renderHiddenValue() : formatCurrency(incomeFromTotal, currency)}
              </p>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 lg:w-16 lg:h-16 bg-green-200/30 dark:bg-green-800/20 rounded-full" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Card de Despesa */}
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
        className="sm:col-span-2 lg:col-span-1"
      >
        <Card 
          className="relative overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20" 
          onClick={() => onNavigateToTransactionType('expense')}
        >
          <CardContent className="p-4 lg:p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-xs lg:text-sm font-medium text-red-700 dark:text-red-400">
                  {t('common.expense')}
                </p>
              </div>
              <p id="expense-card-value" className="text-xl lg:text-2xl xl:text-3xl font-bold text-red-700 dark:text-red-400">
                {hideValues ? renderHiddenValue() : formatCurrency(totalExpensesCombined, currency)}
              </p>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 lg:w-16 lg:h-16 bg-red-200/30 dark:bg-red-800/20 rounded-full" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Nova row - Cálculo do Saldo */}
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
        className="sm:col-span-2 lg:col-span-3"
      >
        <Card className="relative overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4 lg:p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Wallet className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs lg:text-sm font-medium text-blue-700 dark:text-blue-400">
                  Saldo Calculado (Mês Anterior + Income + Expense)
                </p>
              </div>
              <p id="calculated-balance-value" className="text-xl lg:text-2xl xl:text-3xl font-bold text-blue-700 dark:text-blue-400">
                {hideValues ? renderHiddenValue() : formatCurrency(calculatedBalance, currency)}
              </p>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 lg:w-16 lg:h-16 bg-blue-200/30 dark:bg-blue-800/20 rounded-full" />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DashboardStatCards;
