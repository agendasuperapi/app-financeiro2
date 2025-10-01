import React, { useState, useEffect } from 'react';
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
import { getCategoriesByType } from '@/services/categoryService';
import { v4 as uuidv4 } from 'uuid';

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
  const [fromSubAccount, setFromSubAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [toSubAccount, setToSubAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [toCategoryId, setToCategoryId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [dependents, setDependents] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [categoriesData, peopleData] = await Promise.all([
          getCategoriesByType('income'),
          (supabase as any)
            .from('view_cadastros_unificados')
            .select('id, primeiro_name, phone')
            .eq('id', user.id)
        ]);

        setCategories(categoriesData);
        setDependents(peopleData.data || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    const selectedPerson = dependents.find(d => d.primeiro_name === name);
    if (selectedPerson) {
      setPhone(selectedPerson.phone || '');
    }
  }, [name, dependents]);

  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$ ' : 'R$ ';
  };

  const handleTransfer = async () => {
    if (!fromAccount || !toAccount || !amount || !categoryId || !toCategoryId) {
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
      const referenceCode = uuidv4();

      // Criar transação de saída (income com valor negativo)
      const { error: outgoingError } = await supabase
        .from('poupeja_transactions')
        .insert({
          user_id: user.id,
          amount: -amountValue,
          type: 'income',
          category_id: categoryId,
          name: name || null,
          phone: phone || null,
          description: `${transferDescription} (Saída)`,
          date: today,
          reference_code: referenceCode,
          formato: 'transacao',
          conta: fromAccount,
          sub_conta: fromSubAccount || null,
        });

      if (outgoingError) throw outgoingError;

      // Criar transação de entrada (income com valor positivo)
      const { error: incomingError } = await supabase
        .from('poupeja_transactions')
        .insert({
          user_id: user.id,
          amount: amountValue,
          type: 'income',
          category_id: toCategoryId,
          name: name || null,
          phone: phone || null,
          description: `${transferDescription} (Entrada)`,
          date: today,
          reference_code: referenceCode,
          formato: 'transacao',
          conta: toAccount,
          sub_conta: toSubAccount || null,
        });

      if (incomingError) throw incomingError;

      toast.success('Transferência realizada com sucesso!');
      
      // Reset form
      setFromAccount('');
      setFromSubAccount('');
      setToAccount('');
      setToSubAccount('');
      setAmount('');
      setDescription('');
      setCategoryId('');
      setToCategoryId('');
      setName('');
      setPhone('');
      
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

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
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

          {/* Categoria de Origem */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria de Origem *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name/Pessoa */}
          <div className="space-y-2">
            <Label htmlFor="name">Pessoa (Opcional)</Label>
            <Select value={name} onValueChange={setName}>
              <SelectTrigger id="name">
                <SelectValue placeholder="Selecione a pessoa" />
              </SelectTrigger>
              <SelectContent>
                {dependents.map((person) => (
                  <SelectItem key={`${person.id}-${person.primeiro_name}`} value={person.primeiro_name}>
                    {person.primeiro_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Telefone (automático) */}
          {phone && (
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} disabled className="bg-muted" />
            </div>
          )}

          {/* Conta de Origem */}
          <div className="space-y-2">
            <Label htmlFor="from-account">De (Conta de Origem) *</Label>
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

          {/* Sub-conta de Origem */}
          <div className="space-y-2">
            <Label htmlFor="from-sub-account">Sub-conta de Origem (Opcional)</Label>
            <Input
              id="from-sub-account"
              placeholder="Sub-conta"
              value={fromSubAccount}
              onChange={(e) => setFromSubAccount(e.target.value)}
            />
          </div>

          {/* Indicador Visual */}
          <div className="flex justify-center py-2">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Categoria de Destino */}
          <div className="space-y-2">
            <Label htmlFor="to-category">Categoria de Destino *</Label>
            <Select value={toCategoryId} onValueChange={setToCategoryId}>
              <SelectTrigger id="to-category">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conta de Destino */}
          <div className="space-y-2">
            <Label htmlFor="to-account">Para (Conta de Destino) *</Label>
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

          {/* Sub-conta de Destino */}
          <div className="space-y-2">
            <Label htmlFor="to-sub-account">Sub-conta de Destino (Opcional)</Label>
            <Input
              id="to-sub-account"
              placeholder="Sub-conta"
              value={toSubAccount}
              onChange={(e) => setToSubAccount(e.target.value)}
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