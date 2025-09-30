import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePreferences } from '@/contexts/PreferencesContext';

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  accounts: string[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  accounts,
}) => {
  const { currency } = usePreferences();
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$ ' : 'R$ ';
  };

  const handleTransfer = async () => {
    if (!fromAccount || !toAccount || !amount) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (fromAccount === toAccount) {
      toast.error('As contas de origem e destino devem ser diferentes');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('Digite um valor válido maior que zero');
      return;
    }

    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const transferDescription = description || `Transferência de ${fromAccount} para ${toAccount}`;

      // Buscar categoria padrão de "Outros" para transferências
      const { data: categories } = await supabase
        .from('poupeja_categories')
        .select('id')
        .eq('name', 'Outros')
        .limit(1);

      const categoryId = categories?.[0]?.id;

      // Criar transação de saída (expense)
      const { error: expenseError } = await supabase
        .from('poupeja_transactions')
        .insert({
          user_id: user.id,
          amount: -amountValue,
          type: 'expense',
          category_id: categoryId,
          description: `${transferDescription} (Saída)`,
          date: today,
          conta: fromAccount,
        });

      if (expenseError) throw expenseError;

      // Criar transação de entrada (income)
      const { error: incomeError } = await supabase
        .from('poupeja_transactions')
        .insert({
          user_id: user.id,
          amount: amountValue,
          type: 'income',
          category_id: categoryId,
          description: `${transferDescription} (Entrada)`,
          date: today,
          conta: toAccount,
        });

      if (incomeError) throw incomeError;

      toast.success('Transferência realizada com sucesso!');
      
      // Reset form
      setFromAccount('');
      setToAccount('');
      setAmount('');
      setDescription('');
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao realizar transferência:', error);
      toast.error('Erro ao realizar transferência. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Saldo</DialogTitle>
          <DialogDescription>
            Transfira saldo entre suas contas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conta de Origem */}
          <div className="space-y-2">
            <Label htmlFor="from-account">De (Conta de Origem)</Label>
            <Select value={fromAccount} onValueChange={setFromAccount}>
              <SelectTrigger id="from-account">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account} value={account}>
                    {account}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Indicador Visual */}
          <div className="flex justify-center py-2">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Conta de Destino */}
          <div className="space-y-2">
            <Label htmlFor="to-account">Para (Conta de Destino)</Label>
            <Select value={toAccount} onValueChange={setToAccount}>
              <SelectTrigger id="to-account">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account} value={account}>
                    {account}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {getCurrencySymbol()}
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="pl-12"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Descrição (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Input
              id="description"
              placeholder="Descrição da transferência"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={isLoading}>
            {isLoading ? 'Transferindo...' : 'Transferir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};