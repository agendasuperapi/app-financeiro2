
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import TransactionList from '@/components/common/TransactionList';
import TransactionTable from '@/components/common/TransactionTable';
import TransactionForm from '@/components/common/TransactionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, User } from 'lucide-react';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { Transaction } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const TransactionsPage = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { transactions, deleteTransaction, isClientView, selectedUser, targetUserId } = useClientAwareData();
  const isMobile = useIsMobile();

  // Filter out transactions with zero amount
  const filteredTransactions = transactions.filter(transaction => transaction.amount > 0);

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
            
            {/* Add Button - visible on tablet and desktop */}
            {!isMobile && (
              <Button onClick={handleAddTransaction} size="lg" className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                {isClientView ? 'Adicionar para Cliente' : 'Adicionar Transação'}
              </Button>
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

        {/* Mobile Floating Action Button */}
        {isMobile && (
          <div className="fixed bottom-20 right-4 z-50">
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
