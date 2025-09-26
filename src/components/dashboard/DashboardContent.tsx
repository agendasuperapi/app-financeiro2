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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  onBalancesUpdate?: (balances: {
    previousMonthsBalance: number;
    monthlyBalanceCombined: number;
  }) => void;
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
  onTransactionsWithSimulationsUpdate,
  onBalancesUpdate
}) => {
  const {
    t,
    currency
  } = usePreferences();

  // Simulações mensais baseadas em poupeja_transactions.recurrence = 'Mensal'
  const [monthlySimulations, setMonthlySimulations] = React.useState<Transaction[]>([]);

  // Usar apenas dados reais das transações - sem valores mockados
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
        if (currentYear < todayYear || currentYear === todayYear && currentMonthIndex < todayMonth) {
          setMonthlySimulations([]);
          return;
        }
        const {
          data,
          error
        } = await (supabase as any).from('poupeja_transactions').select(`*, category:poupeja_categories(id, name, icon, color, type) `).eq('recurrence', 'Mensal').eq('status', 'pending').eq('situacao', 'ativo');
        if (error) throw error;
        const y = currentMonth.getFullYear();
        const m = currentMonth.getMonth();

        // Filtrar simulações que já existem como transações reais no mês atual
        const filteredData = (data as any[] || []).filter((item: any) => {
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

          // Simular apenas se a data simulada for posterior ou igual à data original
          if (simDate < baseDate) {
            return null;
          }
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
            formato: 'transacao'
          } as Transaction;
        }).filter(Boolean);
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
    // Debug: verificar transações disponíveis
    console.log('🔍 [DASHBOARD DEBUG] Total transactions received:', filteredTransactions.length);
    console.log('🔍 [DASHBOARD DEBUG] Sample transactions:', filteredTransactions.slice(0, 3).map(tx => ({
      id: tx.id,
      description: tx.description,
      formato: tx.formato,
      format: tx.format
    })));

    // Filtrar transações por formato = "agenda" ou "transacao", e incluir simulações
    const filteredByFormato = filteredTransactions.filter((tx: any) => {
      const formato = tx.formato || tx.format;
      const shouldInclude = formato === 'agenda' || formato === 'transacao';
      if (!shouldInclude) {
        console.log('🚫 [DASHBOARD DEBUG] Excluding transaction:', {
          id: tx.id,
          description: tx.description,
          formato: tx.formato,
          format: tx.format
        });
      }
      return shouldInclude;
    });
    console.log('✅ [DASHBOARD DEBUG] Filtered transactions by formato:', filteredByFormato.length);

    // Combinar transações reais filtradas com simulações (que já têm formato: 'transacao')
    const combined = [...filteredByFormato, ...monthlySimulations];
    return combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTransactions, monthlySimulations]);

  // Atualizar parent component com transações combinadas
  React.useEffect(() => {
    onTransactionsWithSimulationsUpdate?.(transactionsWithSimulations);
  }, [transactionsWithSimulations, onTransactionsWithSimulationsUpdate]);

  // Separar transações reais das simuladas para diferentes cálculos
  const realTransactionsOnly = React.useMemo(() => {
    return transactionsWithSimulations.filter((tx: any) => !tx.id.includes('mensal-sim-'));
  }, [transactionsWithSimulations]);
  const simulatedTransactionsOnly = React.useMemo(() => {
    return transactionsWithSimulations.filter((tx: any) => tx.id.includes('mensal-sim-'));
  }, [transactionsWithSimulations]);

  // Total de despesas REAIS no mês atual (para cálculo do saldo real)
  const totalExpensesReal = React.useMemo(() => {
    return realTransactionsOnly.filter((tx: any) => tx.type === 'expense' || typeof tx.amount === 'number' && tx.amount < 0).reduce((sum: number, tx: any) => {
      const amt = Number(tx.amount) || 0;
      return sum + (amt < 0 ? -amt : tx.type === 'expense' ? amt : 0);
    }, 0);
  }, [realTransactionsOnly]);

  // Total de receitas REAIS no mês atual (para cálculo do saldo real)
  const totalIncomesReal = React.useMemo(() => {
    return realTransactionsOnly.filter((tx: any) => tx.type === 'income' || typeof tx.amount === 'number' && tx.amount > 0).reduce((sum: number, tx: any) => {
      const amt = Number(tx.amount) || 0;
      return sum + (amt > 0 ? amt : tx.type === 'income' ? amt : 0);
    }, 0);
  }, [realTransactionsOnly]);

  // Total de despesas (reais + simulações) no mês atual - para exibição
  const totalExpensesCombined = React.useMemo(() => {
    return transactionsWithSimulations.filter((tx: any) => tx.type === 'expense' || typeof tx.amount === 'number' && tx.amount < 0).reduce((sum: number, tx: any) => {
      const amt = Number(tx.amount) || 0;
      // Considerar valor absoluto para despesas negativas ou tipo 'expense'
      return sum + (amt < 0 ? -amt : tx.type === 'expense' ? amt : 0);
    }, 0);
  }, [transactionsWithSimulations]);

  // Total de receitas (reais + simulações) no mês atual - para exibição
  const totalIncomesCombined = React.useMemo(() => {
    return transactionsWithSimulations.filter((tx: any) => tx.type === 'income' || typeof tx.amount === 'number' && tx.amount > 0).reduce((sum: number, tx: any) => {
      const amt = Number(tx.amount) || 0;
      // Considerar valor absoluto para receitas positivas ou tipo 'income'
      return sum + (amt > 0 ? amt : tx.type === 'income' ? amt : 0);
    }, 0);
  }, [transactionsWithSimulations]);

  // Calcular saldo dos meses anteriores (receitas reais + simuladas com recurrence "Mensal")
  const [previousMonthsBalance, setPreviousMonthsBalance] = React.useState(0);
  React.useEffect(() => {
    const calculatePreviousMonthsBalance = async () => {
      try {
        // Data limite: fim do mês anterior ao mês atual
        const endOfPreviousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
        console.log('📊 [BALANCE DEBUG] Calculating for month:', format(currentMonth, 'MMM/yyyy', {
          locale: ptBR
        }));
        console.log('📊 [BALANCE DEBUG] End of previous month:', format(endOfPreviousMonth, 'dd/MM/yyyy', {
          locale: ptBR
        }));

        // 1. Buscar TODAS as transações reais dos meses anteriores (sem filtro de formato)
        // Usar todas as transações disponíveis no contexto, não apenas as filtradas
        const {
          data: allRealTransactions,
          error: txError
        } = await (supabase as any).from('poupeja_transactions').select('*').lte('date', endOfPreviousMonth.toISOString());
        if (txError) throw txError;
        const realTransactionsUntilPreviousMonth = (allRealTransactions || []).filter((tx: any) => {
          const txDate = new Date(tx.date);
          return txDate <= endOfPreviousMonth;
        });
        console.log('📊 [BALANCE DEBUG] Real transactions until previous month:', realTransactionsUntilPreviousMonth.length);

        // Log específico para outubro - DETALHADO
        if (currentMonth.getMonth() === 9) {
          // outubro = mês 9 (0-indexed)
          console.log('🔍 [OCTOBER DEBUG] Current month is October, checking transactions...');
          console.log('🔍 [OCTOBER DEBUG] Real transactions until previous month:', realTransactionsUntilPreviousMonth.length);
          console.log('🔍 [OCTOBER DEBUG] ALL Real transactions details:', realTransactionsUntilPreviousMonth.map(tx => ({
            id: tx.id,
            date: tx.date,
            amount: tx.amount,
            description: tx.description,
            month: new Date(tx.date).getMonth() + 1,
            year: new Date(tx.date).getFullYear()
          })));

          // Verificar se há duplicatas por ID
          const ids = realTransactionsUntilPreviousMonth.map(tx => tx.id);
          const uniqueIds = [...new Set(ids)];
          if (ids.length !== uniqueIds.length) {
            console.log('⚠️ [OCTOBER DEBUG] DUPLICATED TRANSACTIONS DETECTED!');
            console.log('🔍 [OCTOBER DEBUG] Total transactions:', ids.length);
            console.log('🔍 [OCTOBER DEBUG] Unique IDs:', uniqueIds.length);
          }
        }

        // 2. Buscar transações com recurrence = "Mensal" para simular
        const {
          data: mensalTransactions,
          error
        } = await (supabase as any).from('poupeja_transactions').select('*').eq('recurrence', 'Mensal').eq('status', 'pending').eq('situacao', 'ativo');
        if (error) throw error;

        // 3. Simular transações mensais apenas da data original para frente
        const simulatedTransactions: any[] = [];
        if (mensalTransactions) {
          mensalTransactions.forEach((transaction: any) => {
            const originalDate = new Date(transaction.date);

            // Simular apenas para meses a partir da data original até o mês anterior ao atual
            let simDate = new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());
            while (simDate <= endOfPreviousMonth) {
              // Só simular se a data simulada for igual ou posterior à data original
              if (simDate >= originalDate) {
                // Verificar se já existe transação real similar neste mês
                const hasRealTransaction = realTransactionsUntilPreviousMonth.some((realTx: any) => {
                  const realDesc = realTx.description ? String(realTx.description).toLowerCase() : '';
                  const transactionDesc = transaction.description ? String(transaction.description).toLowerCase() : '';
                  const realDate = new Date(realTx.date);
                  const sameMonth = realDate.getFullYear() === simDate.getFullYear() && realDate.getMonth() === simDate.getMonth();
                  const similarDesc = realDesc && transactionDesc && (realDesc.includes(transactionDesc) || transactionDesc.includes(realDesc));
                  return sameMonth && similarDesc;
                });
                if (!hasRealTransaction) {
                  simulatedTransactions.push({
                    id: `mensal-sim-${transaction.id}-${simDate.getFullYear()}-${simDate.getMonth() + 1}`,
                    type: transaction.type,
                    amount: Number(transaction.amount) || 0,
                    date: simDate.toISOString(),
                    description: transaction.description
                  });
                }
              }

              // Próximo mês
              simDate.setMonth(simDate.getMonth() + 1);
            }
          });
        }

        // 4. Combinar transações reais e simuladas
        const combinedTransactions = [...realTransactionsUntilPreviousMonth, ...simulatedTransactions];
        console.log('📊 [BALANCE DEBUG] All transactions (real + simulated):', combinedTransactions.length);

        // 5. Calcular saldo (receitas - despesas)
        const balance = combinedTransactions.reduce((acc: number, tx: any) => {
          const amount = Number(tx.amount) || 0;
          return acc + amount;
        }, 0);
        console.log('📊 [BALANCE DEBUG] Previous months balance:', balance);

        // Log específico para outubro - FINAL DETALHADO
        if (currentMonth.getMonth() === 9) {
          // outubro = mês 9 (0-indexed)
          console.log('🔍 [OCTOBER DEBUG] Final balance calculation:', balance);
          console.log('🔍 [OCTOBER DEBUG] Combined transactions count:', combinedTransactions.length);
          console.log('🔍 [OCTOBER DEBUG] Real transactions count:', realTransactionsUntilPreviousMonth.length);
          console.log('🔍 [OCTOBER DEBUG] Simulated transactions count:', simulatedTransactions.length);

          // Verificar duplicatas por ID
          const allIds = combinedTransactions.map(tx => tx.id);
          const uniqueAllIds = [...new Set(allIds)];
          if (allIds.length !== uniqueAllIds.length) {
            console.log('⚠️ [OCTOBER DEBUG] DUPLICATED TRANSACTIONS DETECTED!');
            console.log('🔍 [OCTOBER DEBUG] Total IDs:', allIds.length);
            console.log('🔍 [OCTOBER DEBUG] Unique IDs:', uniqueAllIds.length);

            // Encontrar duplicatas
            const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
            console.log('🔍 [OCTOBER DEBUG] Duplicate IDs:', [...new Set(duplicateIds)]);

            // Mostrar transações duplicadas
            duplicateIds.forEach(duplicateId => {
              const duplicatedTransactions = combinedTransactions.filter(tx => tx.id === duplicateId);
              console.log(`🔍 [OCTOBER DEBUG] Duplicated transaction ${duplicateId}:`, duplicatedTransactions);
            });
          }

          // Separar por mês para verificar se há transações de outubro sendo contadas
          const transactionsByMonth = {};
          combinedTransactions.forEach(tx => {
            const txDate = new Date(tx.date);
            const monthKey = `${txDate.getFullYear()}-${txDate.getMonth() + 1}`;
            if (!transactionsByMonth[monthKey]) {
              transactionsByMonth[monthKey] = {
                count: 0,
                incomes: 0,
                expenses: 0,
                transactions: []
              };
            }
            transactionsByMonth[monthKey].count++;
            transactionsByMonth[monthKey].transactions.push({
              id: tx.id,
              amount: tx.amount,
              description: tx.description,
              date: tx.date
            });
            if (tx.amount > 0) {
              transactionsByMonth[monthKey].incomes += tx.amount;
            } else {
              transactionsByMonth[monthKey].expenses += tx.amount;
            }
          });
          console.log('🔍 [OCTOBER DEBUG] Transactions by month:', transactionsByMonth);

          // Verificar se há transações de outubro (mês 10) sendo contadas incorretamente
          if (transactionsByMonth['2025-10']) {
            console.log('⚠️ [OCTOBER DEBUG] OCTOBER TRANSACTIONS FOUND IN PREVIOUS MONTHS CALCULATION!');
            console.log('🔍 [OCTOBER DEBUG] October transactions:', transactionsByMonth['2025-10']);
          }
          const incomes = combinedTransactions.filter(tx => tx.amount > 0);
          const expenses = combinedTransactions.filter(tx => tx.amount < 0);
          console.log('🔍 [OCTOBER DEBUG] Incomes count:', incomes.length);
          console.log('🔍 [OCTOBER DEBUG] Expenses count:', expenses.length);
          console.log('🔍 [OCTOBER DEBUG] Incomes total:', incomes.reduce((sum, tx) => sum + tx.amount, 0));
          console.log('🔍 [OCTOBER DEBUG] Expenses total:', expenses.reduce((sum, tx) => sum + tx.amount, 0));

          // Verificar receitas detalhadamente
          console.log('🔍 [OCTOBER DEBUG] DETAILED INCOMES:', incomes.map(tx => ({
            id: tx.id,
            amount: tx.amount,
            description: tx.description,
            date: tx.date,
            month: new Date(tx.date).getMonth() + 1
          })));
        }
        setPreviousMonthsBalance(balance);
      } catch (error) {
        console.error('Erro ao calcular saldo dos meses anteriores:', error);
        setPreviousMonthsBalance(0);
      }
    };
    calculatePreviousMonthsBalance();
  }, [currentMonth]);

  // Calcular saldo REAL (sem simulações) para o saldo atual
  const monthlyBalanceReal = totalIncomesReal - totalExpensesReal;
  const currentBalanceReal = previousMonthsBalance + monthlyBalanceReal;

  // Saldo combinado (com simulações) para exibição de comparação
  const monthlyBalanceCombined = totalIncomesCombined - totalExpensesCombined;
  const currentBalanceCombined = previousMonthsBalance + monthlyBalanceCombined;

  // Notificar o componente pai com os saldos calculados (fonte única de verdade)
  React.useEffect(() => {
    onBalancesUpdate?.({
      previousMonthsBalance,
      monthlyBalanceCombined
    });
  }, [previousMonthsBalance, monthlyBalanceCombined, onBalancesUpdate]);
  const itemVariants = {
    hidden: {
      y: 20,
      opacity: 0
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  };
  return <>
      {/* Alerta de despesas próximas */}
      <motion.div variants={itemVariants}>
        <UpcomingExpensesAlert onMarkAsPaid={onMarkScheduledAsPaid} />
      </motion.div>
      
      {/* Progresso das metas */}
      <motion.div variants={itemVariants}>
        <GoalNavigation goals={goals} currentGoalIndex={currentGoalIndex} onGoalChange={onGoalChange} />
      </motion.div>

      {/* Seção de gráficos */}
      <motion.div variants={itemVariants}>
        <DashboardCharts currentMonth={currentMonth} hideValues={hideValues} monthTransactions={transactionsWithSimulations} />
      </motion.div>

      {/* Transações recentes */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold">{t('transactions.recent')}</h3>
                
              </div>
              <Button variant="outline" asChild>
                <Link to="/transactions">{t('common.viewAll')}</Link>
              </Button>
            </div>
            <TransactionList transactions={transactionsWithSimulations.slice(0, 10)} onEdit={onEditTransaction} onDelete={onDeleteTransaction} hideValues={hideValues} />
            {transactionsWithSimulations.length > 10 && <div className="mt-6 text-center">
                <Button variant="outline" asChild>
                  <Link to="/transactions">{t('common.viewAll')}</Link>
                </Button>
              </div>}
          </CardContent>
        </Card>
      </motion.div>
    </>;
};
export default DashboardContent;