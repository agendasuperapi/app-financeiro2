
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TransactionList from '@/components/common/TransactionList';
import UpcomingExpensesAlert from '@/components/dashboard/UpcomingExpensesAlert';
import GoalNavigation from '@/components/common/GoalNavigation';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Goal, ScheduledTransaction, Transaction } from '@/types';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/transactionUtils';

interface DashboardContentProps {
  filteredTransactions: any[];
  goals: Goal[];
  currentGoalIndex: number;
  currentMonth: Date;
  hideValues: boolean;
  onGoalChange: (index: number) => void;
  onEditTransaction: (transaction: any) => void;
  onDeleteTransaction: (id: string) => void;
  onMarkScheduledAsPaid: (transaction: ScheduledTransaction) => void;
  scheduledTransactions?: ScheduledTransaction[];
  onTransactionsWithSimulationsUpdate?: (transactions: any[]) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  filteredTransactions,
  goals,
  currentGoalIndex,
  currentMonth,
  hideValues,
  onGoalChange,
  onEditTransaction,
  onDeleteTransaction,
  onMarkScheduledAsPaid,
  scheduledTransactions = [],
  onTransactionsWithSimulationsUpdate
}) => {
  const { t, currency } = usePreferences();

  // Simulações mensais baseadas em poupeja_transactions.recurrence = 'Mensal'
  const [monthlySimulations, setMonthlySimulations] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    const fetchMensalAndSimulate = async () => {
      try {
        // Verificar se o mês atual é passado - não gerar simulações para meses passados
        const today = new Date();
        const currentYear = currentMonth.getFullYear();
        const currentMonthIndex = currentMonth.getMonth();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        
        // Se o mês selecionado é anterior ao mês atual, não gerar simulações
        if (currentYear < todayYear || (currentYear === todayYear && currentMonthIndex < todayMonth)) {
          setMonthlySimulations([]);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('poupeja_transactions')
          .select(`*, category:poupeja_categories(id, name, icon, color, type) `)
          .eq('recurrence', 'Mensal')
          .eq('status', 'pending')
          .eq('situacao', 'ativo');

        if (error) throw error;

        const y = currentMonth.getFullYear();
        const m = currentMonth.getMonth();
        
        // Filtrar simulações que já existem como transações reais no mês atual
        const filteredData = ((data as any[]) || []).filter((item: any) => {
          const desc = item.description ? String(item.description).toLowerCase() : '';
          
          // Verificar se já existe uma transação real com descrição similar no mês atual
          const hasRealTransaction = filteredTransactions.some((realTx: any) => {
            const realDesc = realTx.description ? String(realTx.description).toLowerCase() : '';
            const realDate = new Date(realTx.date);
            const sameMonth = realDate.getFullYear() === y && realDate.getMonth() === m;
            const similarDesc = realDesc && desc && (realDesc.includes(desc) || desc.includes(realDesc));
            return sameMonth && similarDesc;
          });
          
          return !hasRealTransaction;
        });
        
        const sims: Transaction[] = filteredData.map((item: any) => {
          const baseDate = item.date ? new Date(item.date) : new Date(y, m, 1);
          const day = baseDate.getDate() || 1;
          const simDate = new Date(y, m, Math.min(day, 28));
          const desc = item.description ? String(item.description) : '';
          return {
            id: `mensal-sim-${item.id}-${y}-${m + 1}`,
            type: item.type,
            amount: Number(item.amount) || 0,
            category: item.category?.name || 'Outros',
            categoryIcon: item.category?.icon || 'circle',
            categoryColor: item.category?.color || '#607D8B',
            description: desc ? `${desc} (Simulação)` : 'Simulação',
            date: simDate.toISOString(),
            goalId: item.goal_id || undefined,
            conta: item.conta || undefined,
            creatorName: item.name || undefined,
          } as Transaction;
        });

        setMonthlySimulations(sims);
      } catch (e) {
        console.error('DashboardContent: erro ao buscar Mensal:', e);
        setMonthlySimulations([]);
      }
    };

    fetchMensalAndSimulate();
  }, [currentMonth, filteredTransactions]);

  // Combinar transações reais com simulações mensais
  const transactionsWithSimulations = React.useMemo(() => {
    const combined = [...filteredTransactions, ...monthlySimulations];
    return combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTransactions, monthlySimulations]);

  // Atualizar parent component com transações combinadas
  React.useEffect(() => {
    onTransactionsWithSimulationsUpdate?.(transactionsWithSimulations);
  }, [transactionsWithSimulations, onTransactionsWithSimulationsUpdate]);

  // Total de despesas (reais + simulações) no mês atual
  const totalExpensesCombined = React.useMemo(() => {
    return transactionsWithSimulations
      .filter((tx: any) => (tx.type === 'expense') || (typeof tx.amount === 'number' && tx.amount < 0))
      .reduce((sum: number, tx: any) => {
        const amt = Number(tx.amount) || 0;
        // Considerar valor absoluto para despesas negativas ou tipo 'expense'
        return sum + (amt < 0 ? -amt : (tx.type === 'expense' ? amt : 0));
      }, 0);
  }, [transactionsWithSimulations]);

  // Total de receitas (reais + simulações) no mês atual
  const totalIncomesCombined = React.useMemo(() => {
    return transactionsWithSimulations
      .filter((tx: any) => (tx.type === 'income') || (typeof tx.amount === 'number' && tx.amount > 0))
      .reduce((sum: number, tx: any) => {
        const amt = Number(tx.amount) || 0;
        // Considerar valor absoluto para receitas positivas ou tipo 'income'
        return sum + (amt > 0 ? amt : (tx.type === 'income' ? amt : 0));
      }, 0);
  }, [transactionsWithSimulations]);

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
    <>
      {/* Alerta de despesas próximas */}
      <motion.div variants={itemVariants}>
        <UpcomingExpensesAlert 
          onMarkAsPaid={onMarkScheduledAsPaid}
        />
      </motion.div>
      
      {/* Progresso das metas */}
      <motion.div variants={itemVariants}>
        <GoalNavigation goals={goals} currentGoalIndex={currentGoalIndex} onGoalChange={onGoalChange} />
      </motion.div>

      {/* Seção de gráficos */}
      <motion.div variants={itemVariants}>
        <DashboardCharts 
          currentMonth={currentMonth} 
          hideValues={hideValues}
          monthTransactions={filteredTransactions}
        />
      </motion.div>

      {/* Transações recentes */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold">{t('transactions.recent')}</h3>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t('common.income')}: <span className="text-green-600 font-medium" id="income-total">{hideValues ? '******' : formatCurrency(totalIncomesCombined, currency)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('common.expense')}: <span className="text-red-600 font-medium" id="expense-total">{hideValues ? '******' : formatCurrency(totalExpensesCombined, currency)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Saldo Mês: <span className={`font-medium ${(totalIncomesCombined - totalExpensesCombined) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{hideValues ? '******' : formatCurrency(totalIncomesCombined - totalExpensesCombined, currency)}</span>
                  </p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link to="/transactions">{t('common.viewAll')}</Link>
              </Button>
            </div>
            <TransactionList 
              transactions={transactionsWithSimulations.slice(0, 10)} 
              onEdit={onEditTransaction} 
              onDelete={onDeleteTransaction} 
              hideValues={hideValues} 
            />
            {transactionsWithSimulations.length > 10 && (
              <div className="mt-6 text-center">
                <Button variant="outline" asChild>
                  <Link to="/transactions">{t('common.viewAll')}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};

export default DashboardContent;
