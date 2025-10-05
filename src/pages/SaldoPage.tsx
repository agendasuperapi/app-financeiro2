import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import { Wallet, TrendingUp, TrendingDown, DollarSign, ArrowLeftRight } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { formatCurrency } from '@/utils/transactionUtils';
import { getSaldoByAccount } from '@/services/saldoService';
import { toast } from 'sonner';
import { TransferModal } from '@/components/saldo/TransferModal';

interface AccountBalance {
  conta: string;
  total: number;
}

const SaldoPage: React.FC = () => {
  const { user } = useAppContext();
  const { currency } = usePreferences();
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadAccountBalances();
    }
  }, [user]);

  const loadAccountBalances = async () => {
    try {
      setLoading(true);
      const balances = await getSaldoByAccount();
      setAccountBalances(balances);
    } catch (error) {
      console.error('Erro ao carregar saldos por conta:', error);
      toast.error('Erro ao carregar saldos das contas');
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accountBalances.reduce((sum, account) => sum + account.total, 0);
  const positiveAccounts = accountBalances.filter(account => account.total > 0);
  const negativeAccounts = accountBalances.filter(account => account.total < 0);

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Saldo por Conta</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  const accountNames = accountBalances.map(acc => acc.conta);

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Saldo por Conta</h1>
          </div>
          {accountBalances.length > 1 && (
            <Button onClick={() => setIsTransferModalOpen(true)} className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Transferir Saldo
            </Button>
          )}
        </div>

        {/* Resumo Geral */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalBalance, currency)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contas Positivas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{positiveAccounts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contas Negativas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{negativeAccounts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Contas */}
        {accountBalances.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Nenhuma conta encontrada
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Crie algumas transações para ver os saldos por conta aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accountBalances.map((account) => (
              <Card key={account.conta} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    {account.conta}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${account.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(account.total, currency)}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {account.total >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {account.total >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Transferência */}
      <TransferModal
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        onSuccess={loadAccountBalances}
      />
    </MainLayout>
  );
};

export default SaldoPage;