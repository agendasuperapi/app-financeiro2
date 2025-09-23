
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
    const simulations: any[] = [];
    
    scheduledTransactions
      .filter(scheduled => scheduled.recurrence === 'monthly')
      .forEach(scheduled => {
        // Gerar simulações para os próximos 12 meses
        for (let i = 0; i < 12; i++) {
          const simulationDate = new Date(currentMonth);
          simulationDate.setMonth(simulationDate.getMonth() + i);
          simulationDate.setDate(new Date(scheduled.scheduled_date || scheduled.scheduledDate).getDate());
          
          // Verificar se a simulação é para o mês atual ou futuro
          const isCurrentOrFuture = simulationDate >= new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          
          if (isCurrentOrFuture) {
            const simulation = {
              id: `simulation-${scheduled.id}-${i}`,
              type: scheduled.type,
              amount: scheduled.amount,
              category: scheduled.category,
              categoryIcon: scheduled.categoryIcon,
              categoryColor: scheduled.categoryColor,
              description: `${scheduled.description} (Simulação)`,
              date: simulationDate.toISOString(),
              conta: scheduled.conta,
              creatorName: scheduled.creatorName,
              __isSimulation: true,
              __originalScheduledId: scheduled.id
            };
            simulations.push(simulation);
          }
        }
      });
    
    return simulations;
  };

  // Combinar transações reais com simulações
  const transactionsWithSimulations = React.useMemo(() => {
    const simulations = generateMonthlySimulations(scheduledTransactions);
    
    // Filtrar simulações para o mês atual
    const currentMonthSimulations = simulations.filter(sim => {
      const simDate = new Date(sim.date);
      return simDate.getMonth() === currentMonth.getMonth() && 
             simDate.getFullYear() === currentMonth.getFullYear();
    });
    
    // Combinar e ordenar por data
    const combined = [...filteredTransactions, ...currentMonthSimulations];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTransactions, scheduledTransactions, currentMonth]);

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
