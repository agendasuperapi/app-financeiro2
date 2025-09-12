import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { LimiteCard } from '@/components/limits/LimiteCard';
import { AddLimitModal } from '@/components/limits/AddLimitModal';
import { EditLimitModal } from '@/components/limits/EditLimitModal';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Goal } from '@/types';

const LimitsPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<Goal | null>(null);
  const { goals, getGoals, deleteGoal } = useAppContext();
  const { t } = usePreferences();

  // Filtrar apenas os goals que são limites (poderemos adicionar um campo type futuramente)
  const limits = goals || [];

  const handleAddLimit = () => {
    setIsAddModalOpen(true);
  };

  const handleLimitAdded = async () => {
    await getGoals();
    setIsAddModalOpen(false);
  };

  const handleEditLimit = (id: string) => {
    const limit = limits.find(l => l.id === id);
    if (limit) {
      setEditingLimit(limit);
      setIsEditModalOpen(true);
    }
  };

  const handleLimitUpdated = async () => {
    await getGoals();
    setIsEditModalOpen(false);
    setEditingLimit(null);
  };

  const handleDeleteLimit = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este limite?')) {
      await deleteGoal(id);
      await getGoals();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Limites</h1>
          <Button onClick={handleAddLimit} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {/* Grid de Limites */}
        {limits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {limits.map((limit) => (
              <LimiteCard
                key={limit.id}
                limit={limit}
                onEdit={handleEditLimit}
                onDelete={handleDeleteLimit}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <p className="text-lg">Nenhum limite configurado ainda.</p>
              <p>Comece adicionando seu primeiro limite de gastos.</p>
            </div>
            <Button onClick={handleAddLimit} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Limite
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Adição */}
      <AddLimitModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleLimitAdded}
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