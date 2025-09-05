import React, { useState, useEffect } from 'react';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContasCard } from '@/components/contas/ContasCard';
import { getScheduledTransactions } from '@/services/scheduledTransactionService';
import { ScheduledTransaction } from '@/types';
import { Loader2 } from 'lucide-react';

const ContasPage = () => {
  const [contas, setContas] = useState<ScheduledTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContas();
  }, []);

  const loadContas = async () => {
    setLoading(true);
    try {
      const data = await getScheduledTransactions();
      setContas(data);
    } catch (error) {
      console.error('Error loading contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    await loadContas(); // Recarregar dados após marcar como pago
  };

  const handleEdit = async (conta: ScheduledTransaction) => {
    // TODO: Implementar edição
    console.log('Edit conta:', conta);
  };

  const handleDelete = async (id: string) => {
    await loadContas(); // Recarregar dados após exclusão
  };

  return (
    <SubscriptionGuard>
      <MainLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Contas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando contas...</span>
                </div>
              ) : contas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conta encontrada
                </div>
              ) : (
                <div className="space-y-4">
                  {contas.map((conta) => (
                    <ContasCard
                      key={conta.id}
                      conta={conta}
                      onMarkAsPaid={() => handleMarkAsPaid(conta.id)}
                      onEdit={() => handleEdit(conta)}
                      onDelete={() => handleDelete(conta.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </SubscriptionGuard>
  );
};

export default ContasPage;