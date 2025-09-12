import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { LimiteCard } from '@/components/limits/LimiteCard';
import { AddLimitModal } from '@/components/limits/AddLimitModal';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';

const LimitsPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { goals, getGoals } = useAppContext();
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
                onEdit={(id) => {
                  // TODO: Implementar edição
                  console.log('Edit limit:', id);
                }}
                onDelete={(id) => {
                  // TODO: Implementar exclusão
                  console.log('Delete limit:', id);
                }}
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
    </MainLayout>
  );
};

export default LimitsPage;