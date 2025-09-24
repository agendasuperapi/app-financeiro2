
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
  currentMonth: Date;
}

const DashboardStatCards: React.FC<DashboardStatCardsProps> = ({
  totalIncome,
  totalExpenses,
  balance,
  hideValues,
  transactionsWithSimulations = [],
  onNavigateToTransactionType,
  currentMonth
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
  
  // Filtrar transações do mês selecionado
  const monthlyTransactions = React.useMemo(() => {
    const selectedYear = currentMonth.getFullYear();
    const selectedMonthIndex = currentMonth.getMonth();
    
    return transactionsWithSimulations.filter((tx: any) => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonthIndex;
    });
  }, [transactionsWithSimulations, currentMonth]);
  
  // Total de receitas (reais + simulações) do mês selecionado
  const totalIncomesCombined = React.useMemo(() => {
    if (monthlyTransactions.length === 0) return totalIncome;
    
    return monthlyTransactions
      .filter((tx: any) => (tx.type === 'income') || (typeof tx.amount === 'number' && tx.amount > 0))
      .reduce((sum: number, tx: any) => {
        const amt = Number(tx.amount) || 0;
        // Considerar receitas positivas ou tipo 'income'
        return sum + (amt > 0 ? amt : (tx.type === 'income' ? Math.abs(amt) : 0));
      }, 0);
  }, [monthlyTransactions, totalIncome]);
  
  // Total de despesas (reais + simulações) do mês selecionado
  const totalExpensesCombined = React.useMemo(() => {
    if (monthlyTransactions.length === 0) return totalExpenses;
    
    return monthlyTransactions
      .filter((tx: any) => (tx.type === 'expense') || (typeof tx.amount === 'number' && tx.amount < 0))
      .reduce((sum: number, tx: any) => {
        const amt = Number(tx.amount) || 0;
        // Considerar valor absoluto para despesas negativas ou tipo 'expense'
        return sum + (amt < 0 ? -amt : (tx.type === 'expense' ? amt : 0));
      }, 0);
  }, [monthlyTransactions, totalExpenses]);

  // Estados para valores lidos diretamente dos cards (garante consistência visual)
  const [incomeFromCards, setIncomeFromCards] = React.useState<number>(totalIncomesCombined);
  const [expensesFromCards, setExpensesFromCards] = React.useState<number>(totalExpensesCombined);

  // Util para parsear moeda no formato pt-BR (ex: R$ 5.850,00)
  const parseCurrencyText = (text: string): number => {
    let v = text.trim();
    v = v.replace(/[^0-9,.-]/g, ''); // mantém dígitos, vírgula, ponto e sinal
    // se tiver mais de um separador, remover milhares
    // primeiro remove pontos (milhares) e troca vírgula por ponto
    v = v.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : Math.abs(n);
  };

  // Ler valores mostrados nos cards por ID e observar mudanças
  React.useEffect(() => {
    const readFromCards = () => {
      // Income
      const incomeEl = document.getElementById('income-card-value');
      if (incomeEl && incomeEl.textContent && !incomeEl.textContent.includes('*')) {
        setIncomeFromCards(parseCurrencyText(incomeEl.textContent));
      } else {
        setIncomeFromCards(totalIncomesCombined);
      }
      // Expense
      const expenseEl = document.getElementById('expense-card-value');
      if (expenseEl && expenseEl.textContent && !expenseEl.textContent.includes('*')) {
        setExpensesFromCards(parseCurrencyText(expenseEl.textContent));
      } else {
        setExpensesFromCards(totalExpensesCombined);
      }
    };

    // Observers para reagir a mudanças de conteúdo
    const incomeEl = document.getElementById('income-card-value');
    const expenseEl = document.getElementById('expense-card-value');
    const obsIncome = incomeEl ? new MutationObserver(readFromCards) : null;
    const obsExpense = expenseEl ? new MutationObserver(readFromCards) : null;

    if (incomeEl && obsIncome) obsIncome.observe(incomeEl, { childList: true, characterData: true, subtree: true });
    if (expenseEl && obsExpense) obsExpense.observe(expenseEl, { childList: true, characterData: true, subtree: true });

    // Leitura inicial
    readFromCards();

    return () => {
      obsIncome?.disconnect();
      obsExpense?.disconnect();
    };
  }, [monthlyTransactions, totalIncomesCombined, totalExpensesCombined, hideValues, currency]);

  // Calcular saldo do mês anterior
  // balance = saldo anterior + receitas reais - despesas reais
  // então: saldo do mês anterior = balance - receitas reais + despesas reais
  const previousMonthBalance = balance - totalIncome + totalExpenses;
  
  // adjustedBalance = saldo do mês anterior + (valores exibidos nos cards)
  const adjustedBalance = previousMonthBalance + incomeFromCards - expensesFromCards;

  // Cores/fundo conforme sinal do saldo ajustado
  const saldoBgGradient = adjustedBalance >= 0 
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
              <p className={`text-xl lg:text-2xl xl:text-3xl font-bold text-white`}>
                {hideValues ? renderHiddenValue() : formatCurrency(adjustedBalance, currency)}
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
                {hideValues ? renderHiddenValue() : formatCurrency(totalIncomesCombined, currency)}
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
    </motion.div>
  );
};

export default DashboardStatCards;
