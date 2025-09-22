
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import TransactionList from '@/components/common/TransactionList';
import TransactionTable from '@/components/common/TransactionTable';
import TransactionForm from '@/components/common/TransactionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, User, RotateCcw } from 'lucide-react';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { Transaction } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const TransactionsPage = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { transactions, deleteTransaction, isClientView, selectedUser, targetUserId, refetchClientData } = useClientAwareData();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Filter out transactions with zero amount
  const filteredTransactions = transactions.filter(transaction => transaction.amount !== 0);

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setFormOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (refetchClientData) {
        console.log('🔄 [REFRESH] Manual refresh requested - reloading client data...');
        await refetchClientData();
      } else {
        // Força atualização dos dados via evento personalizado
        window.dispatchEvent(new CustomEvent('refresh-transactions'));
      }
      toast({
        title: 'Dados atualizados',
        description: 'A página foi atualizada com sucesso.',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar os dados.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <MainLayout>
      <SubscriptionGuard feature="movimentações ilimitadas">
        <div className="w-full px-4 md:px-6 py-4 md:py-6 lg:py-8 pb-20 md:pb-8 min-h-0">
          {/* Indicador de visualização de cliente */}
          {isClientView && selectedUser && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  Visualizando transações de: {selectedUser.name} ({selectedUser.email})
                </span>
              </div>
            </div>
          )}
          
          {/* Header and Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h1 className="text-xl md:text-2xl font-semibold">
              {isMobile ? 'Transações' : 'Transações Recentes'}
            </h1>
            
            {/* Buttons - visible on tablet and desktop */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button onClick={handleAddTransaction} size="lg" className="shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  {isClientView ? 'Adicionar para Cliente' : 'Adicionar Transação'}
                </Button>
              </div>
            )}
          </div>
          
          {/* Content Container */}
          <div className="space-y-4">
            {/* Content */}
            {isMobile ? (
              <TransactionList 
                transactions={filteredTransactions}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            ) : (
              <Card className="animate-fade-in p-1">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl">Lista de Transações</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-8">
                  <TransactionTable 
                    transactions={filteredTransactions}
                    onEdit={handleEditTransaction}
                    onDelete={handleDeleteTransaction}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Mobile Floating Action Buttons */}
        {isMobile && (
          <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-3">
            <Button 
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-background border-2"
            >
              <RotateCcw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="sr-only">Atualizar</span>
            </Button>
            <Button 
              onClick={handleAddTransaction}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">{isClientView ? 'Adicionar para Cliente' : 'Adicionar Transação'}</span>
            </Button>
          </div>
        )}

        <TransactionForm
          open={formOpen}
          onOpenChange={setFormOpen}
          initialData={editingTransaction}
          mode={editingTransaction ? 'edit' : 'create'}
          targetUserId={targetUserId}
        />
      </SubscriptionGuard>
    </MainLayout>
  );
};

export default TransactionsPage;
