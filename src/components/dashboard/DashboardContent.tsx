
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TransactionList from '@/components/common/TransactionList';
import UpcomingExpensesAlert from '@/components/dashboard/UpcomingExpensesAlert';
import GoalNavigation from '@/components/common/GoalNavigation';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Goal, ScheduledTransaction } from '@/types';
import { motion } from 'framer-motion';

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
  scheduledTransactions = []
}) => {
  const { t } = usePreferences();

  // Função para simular transações mensais
  const generateMonthlySimulations = (scheduledTransactions: ScheduledTransaction[]) => {
    // This function is now just for display - calculations include simulations in Index.tsx
    return [];
  };

  // Combinar transações reais com simulações (agora recebidas via props)
  const transactionsWithSimulations = React.useMemo(() => {
    // Since simulations are now included in filteredTransactions from parent, just use them
    return filteredTransactions;
  }, [filteredTransactions]);

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
              <h3 className="text-xl font-semibold">{t('transactions.recent')}</h3>
              <Button variant="outline" asChild>
                <Link to="/transactions">{t('common.viewAll')}</Link>
              </Button>
            </div>
            <TransactionList 
              transactions={transactionsWithSimulations.slice(0, 5)} 
              onEdit={onEditTransaction} 
              onDelete={onDeleteTransaction} 
              hideValues={hideValues} 
            />
            {transactionsWithSimulations.length > 5 && (
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
