import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, DollarSign } from 'lucide-react';
import { Goal } from '@/types';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useApp } from '@/contexts/AppContext';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface LimiteCardProps {
  limit: Goal;
  selectedMonth?: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const LimiteCard: React.FC<LimiteCardProps> = ({ limit, selectedMonth, onEdit, onDelete }) => {
  const { currency } = usePreferences();
  const { transactions } = useApp();
  const [spentAmount, setSpentAmount] = useState(0);
  const [subConta, setSubConta] = useState<string>('');
  const [contaSaldo, setContaSaldo] = useState(0);

  // Get currency symbol with space
  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$ ' : 'R$ ';
  };

  // Normalize date to 'YYYY-MM-DD' string (strip time/zone)
  const normalizeDateString = (value?: string) => {
    if (!value) return undefined;
    return value.includes('T') ? value.split('T')[0] : value;
  };

  // Fetch account balance if conta_id exists
  useEffect(() => {
    const fetchContaSaldo = async () => {
      if (!limit.conta_id && !(limit as any).conta_id) return;
      
      const contaId = limit.conta_id || (limit as any).conta_id;
      
      try {
        // Get account name
        const { data: contaData } = await (supabase as any)
          .from('tbl_contas')
          .select('name')
          .eq('id', contaId)
          .maybeSingle();
        
        if (contaData) {
          setSubConta(contaData.name);
        }

        // Get account balance from transactions
        const { data: transactions } = await (supabase as any)
          .from('poupeja_transactions')
          .select('amount')
          .eq('conta_id', contaId);

        const balance = transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
        setContaSaldo(balance);
        console.log('💰 Saldo da conta:', balance);
      } catch (error) {
        console.error('Error fetching conta saldo:', error);
      }
    };

    fetchContaSaldo();
  }, [limit]);

  // Calculate spent amount from transactions
  useEffect(() => {
    const fetchSpentAmount = async () => {
      try {
        // Se selectedMonth for fornecido, usar esse período
        // Senão, usar as datas do limite
        let startStr: string | undefined;
        let endStr: string | undefined;
        
        if (selectedMonth) {
          const [year, month] = selectedMonth.split('-').map(Number);
          startStr = `${year}-${String(month).padStart(2, '0')}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        } else {
          const startDate = limit.startDate || limit.start_date;
          const endDate = limit.endDate || limit.end_date;
          startStr = normalizeDateString(startDate);
          endStr = normalizeDateString(endDate);
        }
        
        console.log('🔍 Fetching spent amount for limit:', limit.name);
        console.log('📅 Date range:', { startStr, endStr, selectedMonth });
        
        if (!startStr) {
          console.log('❌ No start date found');
          return;
        }

        // Extract category name from limit name (format: "CategoryName - Period")
        const categoryName = limit.name.split(' - ')[0];
        console.log('🏷️ Looking for category:', categoryName);

        // Get the category ID from the category name
        const { data: category, error: categoryError } = await supabase
          .from('poupeja_categories')
          .select('id, name')
          .eq('name', categoryName)
          .maybeSingle();

        console.log('🏷️ Category found:', category);

        if (!category) {
          console.log('❌ Category not found for name:', categoryName);
          return;
        }

        // Helper to get next day string (YYYY-MM-DD)
        const getNextDayStr = (dateStr: string) => {
          const [y, m, d] = dateStr.split('-').map(Number);
          const next = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + 1));
          return next.toISOString().slice(0, 10);
        };

        // Build query for transactions (both income and expense)
        let query = supabase
          .from('poupeja_transactions')
          .select('amount, date, description, type, conta_id, tbl_contas(name)')
          .eq('category_id', category.id)
          .gte('date', startStr);

        // Use exclusive upper bound for end date: < next day
        if (endStr) {
          query = query.lt('date', getNextDayStr(endStr));
        }

        const { data: txData, error } = await query;

        const transactions = (txData as any[]) || [];

        console.log('💰 Transactions found:', transactions);

        if (error) {
          console.error('Error fetching transactions:', error);
          return;
        }

        // Calculate sum (values already come with correct sign from database)
        const totalAmount = transactions?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
        
        console.log('💰 Total amount:', totalAmount);
        setSpentAmount(totalAmount);

        // Get conta name from the most recent transaction (any type)
        const allTransactions = transactions || [];
        if (allTransactions.length > 0) {
          const sortedTransactions = [...allTransactions].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const mostRecentContaName = (sortedTransactions[0] as any).tbl_contas?.name;
          setSubConta(mostRecentContaName || '');
          console.log('📋 Conta name from most recent transaction:', mostRecentContaName);
        }

      } catch (error) {
        console.error('Error calculating spent amount:', error);
      }
    };

    fetchSpentAmount();
  }, [limit, transactions, selectedMonth]);

  // Calcular valores
  const limitAmount = limit.targetAmount || limit.target_amount || 0;
  const currentValue = (limit.conta_id || (limit as any).conta_id) ? contaSaldo : Math.abs(spentAmount);
  const remainingAmount = limitAmount - currentValue;
  const progressPercentage = limitAmount > 0 ? (currentValue / limitAmount) * 100 : 0;

  // Formatação de período
  const formatPeriod = () => {
    if (selectedMonth) {
      // Usar o mês selecionado do filtro com parse para evitar erros de fuso
      const date = parse(selectedMonth, 'yyyy-MM', new Date());
      const formatted = format(date, 'MMM/yyyy', { locale: ptBR });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    
    // Fallback para as datas do banco (se não tiver selectedMonth)
    const startDate = limit.startDate || limit.start_date;
    if (!startDate) return 'Período não definido';

    const toLocalDate = (val: string | Date) => {
      if (!val) return null as unknown as Date;
      if (val instanceof Date) return val;
      const s = normalizeDateString(val);
      if (!s) return null as unknown as Date;
      if (s.length === 10) {
        return parse(s, 'yyyy-MM-dd', new Date());
      }
      return new Date(val);
    };

    const start = toLocalDate(startDate as any);
    if (!start || isNaN(start.getTime())) return 'Período não definido';

    const formatted = format(start, 'MMM/yyyy', { locale: ptBR });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Determinar cor da barra de progresso
  const getProgressColor = () => {
    if (progressPercentage >= 90) return 'bg-red-500';
    if (progressPercentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">{limit.name.split(' - ')[0]}</h3>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(limit.id)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(limit.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Período */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Período:</span> {formatPeriod()}
        </div>

        {/* Renderização para Receita (Income) */}
        {limit.type === 'income' && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Meta:</span>
                <span className="font-semibold">
                  {getCurrencySymbol()}{limitAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium">{subConta ? `Saldo ${subConta}` : 'Total Recebido'}:</span>
                <span className="text-green-600 font-semibold">
                  {getCurrencySymbol()}{(limit.conta_id || (limit as any).conta_id ? contaSaldo : Math.abs(spentAmount)).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Progress 
                value={Math.min(progressPercentage, 100)} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressPercentage.toFixed(1)}% atingido</span>
                <span>
                  {remainingAmount > 0 ? 'Falta: ' : 'Excedeu: '}
                  {getCurrencySymbol()}{Math.abs(remainingAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Renderização para Despesa (Expense) */}
        {limit.type === 'expense' && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Limite:</span>
                <span className="font-semibold">
                  {getCurrencySymbol()}{limitAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium">Gasto:</span>
                <span className={`${Math.abs(spentAmount) >= limitAmount ? 'text-red-600' : 'text-orange-600'} font-semibold`}>
                  {getCurrencySymbol()}{Math.abs(spentAmount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Progress 
                value={Math.min(progressPercentage, 100)} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressPercentage.toFixed(1)}% usado</span>
                <span>
                  {remainingAmount > 0 ? 'Restante: ' : 'Excedido: '}
                  {getCurrencySymbol()}{Math.abs(remainingAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="w-full text-center">
          {limit.type === 'income' ? (
            // Mensagens para Receita
            progressPercentage >= 100 ? (
              <p className="text-sm font-medium text-green-600">
                ✓ Meta atingida!
              </p>
            ) : progressPercentage >= 75 ? (
              <p className="text-sm font-medium text-blue-600">
                📈 Quase lá!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Continue assim
              </p>
            )
          ) : (
            // Mensagens para Despesa
            progressPercentage >= 100 ? (
              <p className="text-sm font-medium text-red-600">
                ⚠️ Limite ultrapassado!
              </p>
            ) : progressPercentage >= 90 ? (
              <p className="text-sm font-medium text-yellow-600">
                ⚠️ Próximo do limite
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Dentro do limite
              </p>
            )
          )}
        </div>
      </CardFooter>
    </Card>
  );
};