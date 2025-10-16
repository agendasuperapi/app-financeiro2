import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, User, Target, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MainLayout from '@/components/layout/MainLayout';
import { LimiteCard } from '@/components/limits/LimiteCard';
import { AddLimitModal } from '@/components/limits/AddLimitModal';
import { AddGoalModal } from '@/components/limits/AddGoalModal';
import { EditLimitModal } from '@/components/limits/EditLimitModal';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useApp } from '@/contexts/AppContext';
import { Goal } from '@/types';

const LimitsPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<Goal | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const { goals, getGoals, deleteGoal, isClientView, selectedUser, refetchClientData } = useClientAwareData();
  const { categories } = useApp();
  const { t } = usePreferences();

  // Gerar opções de meses (últimos 6 e próximos 6 meses)
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    
    for (let i = -6; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy', { locale: ptBR });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    
    return options;
  }, []);

  // Separar limites/metas por tipo (receita vs despesa)
  // Puxar todos os cadastros sem filtrar
  const { incomeLimits, expenseLimits } = useMemo(() => {
    const allLimits = goals || [];
    const income: Goal[] = [];
    const expense: Goal[] = [];

    allLimits.forEach(limit => {
      if (limit.type === 'income') {
        income.push(limit);
      } else {
        expense.push(limit);
      }
    });

    return { incomeLimits: income, expenseLimits: expense };
  }, [goals]);

  const handlePreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(format(date, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(format(date, 'yyyy-MM'));
  };

  const handleAddLimit = () => {
    setIsAddModalOpen(true);
  };

  const handleAddGoal = () => {
    setIsAddGoalModalOpen(true);
  };

  const handleLimitAdded = async () => {
    if (isClientView) {
      await refetchClientData();
    } else {
      await getGoals();
    }
    setIsAddModalOpen(false);
  };

  const handleGoalAdded = async () => {
    if (isClientView) {
      await refetchClientData();
    } else {
      await getGoals();
    }
    setIsAddGoalModalOpen(false);
  };

  const handleEditLimit = (id: string) => {
    const allLimits = [...incomeLimits, ...expenseLimits];
    const limit = allLimits.find(l => l.id === id);
    if (limit) {
      console.log('Editing limit:', limit);
      setEditingLimit(limit);
      setIsEditModalOpen(true);
    }
  };

  const handleLimitUpdated = async () => {
    if (isClientView) {
      await refetchClientData();
    } else {
      await getGoals();
    }
    setIsEditModalOpen(false);
    setEditingLimit(null);
  };

  const handleDeleteLimit = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este limite?')) {
      await deleteGoal(id);
      if (isClientView) {
        await refetchClientData();
      } else {
        await getGoals();
      }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Indicador de visualização de cliente */}
        {isClientView && selectedUser && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <User className="h-4 w-4" />
              <span className="font-medium">
                Visualizando limites de: {selectedUser.name} ({selectedUser.email})
              </span>
            </div>
          </div>
        )}
        
        {/* Cabeçalho */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Meus controles</h1>
          {!isClientView && (
            <div className="flex gap-2">
              <Button onClick={handleAddLimit} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Limite
              </Button>
              <Button onClick={handleAddGoal} className="gap-2" variant="secondary">
                <Target className="h-4 w-4" />
                Adicionar Metas
              </Button>
            </div>
          )}
        </div>

        {/* Seção de Metas (Receitas) */}
        {incomeLimits.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="text-2xl font-semibold">Minhas Metas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {incomeLimits.map((limit) => (
                <LimiteCard
                  key={limit.id}
                  limit={limit}
                  onEdit={handleEditLimit}
                  onDelete={handleDeleteLimit}
                />
              ))}
            </div>
          </div>
        )}

        {/* Seção de Limites (Despesas) */}
        {expenseLimits.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h2 className="text-2xl font-semibold">Limites de Despesa</h2>
            </div>
            
            {/* Filtro de Mês */}
            <div className="flex items-center justify-center gap-4 p-4 bg-card rounded-lg border">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-base font-medium min-w-[140px] text-center">
                {format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: ptBR })
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {expenseLimits.map((limit) => (
                <LimiteCard
                  key={limit.id}
                  limit={limit}
                  selectedMonth={selectedMonth}
                  onEdit={handleEditLimit}
                  onDelete={handleDeleteLimit}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {incomeLimits.length === 0 && expenseLimits.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <p className="text-lg">Nenhum limite ou meta configurado ainda.</p>
              <p>Comece adicionando seus limites de gastos ou metas de receita.</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleAddLimit} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Limite
              </Button>
              <Button onClick={handleAddGoal} className="gap-2" variant="secondary">
                <Target className="h-4 w-4" />
                Adicionar Meta
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Adição de Limite */}
      <AddLimitModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleLimitAdded}
      />

      {/* Modal de Adição de Meta */}
      <AddGoalModal
        open={isAddGoalModalOpen}
        onOpenChange={setIsAddGoalModalOpen}
        onSuccess={handleGoalAdded}
      />

      {/* Modal de Edição */}
      <EditLimitModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={handleLimitUpdated}
        limit={editingLimit}
      />
    </MainLayout>
  );
};

export default LimitsPage;