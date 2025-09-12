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
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const LimiteCard: React.FC<LimiteCardProps> = ({ limit, onEdit, onDelete }) => {
  const { currency } = usePreferences();
  const { transactions } = useApp();
  const [spentAmount, setSpentAmount] = useState(0);

  // Get currency symbol with space
  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$ ' : 'R$ ';
  };

  // Normalize date to 'YYYY-MM-DD' string (strip time/zone)
  const normalizeDateString = (value?: string) => {
    if (!value) return undefined;
    return value.includes('T') ? value.split('T')[0] : value;
  };

  // Calculate spent amount from transactions
  useEffect(() => {
    const fetchSpentAmount = async () => {
      try {
        const startDate = limit.startDate || limit.start_date;
        const endDate = limit.endDate || limit.end_date;
        
        console.log('🔍 Fetching spent amount for limit:', limit.name);
        console.log('📅 Date range (raw):', { startDate, endDate });
        
        const startStr = normalizeDateString(startDate);
        const endStr = normalizeDateString(endDate);
        
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
          .single();

        console.log('🏷️ Category found:', category);
        console.log('🏷️ Category error:', categoryError);

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

        // Build query for transactions
        let query = supabase
          .from('poupeja_transactions')
          .select('amount, date, description')
          .eq('category_id', category.id)
          .eq('type', 'expense')
          .gte('date', startStr);

        // Use exclusive upper bound for end date: < next day
        if (endStr) {
          query = query.lt('date', getNextDayStr(endStr));
        }

        const { data: transactions, error } = await query;

        console.log('💰 Transactions found:', transactions);
        console.log('💰 Transactions error:', error);

        if (error) {
          console.error('Error fetching transactions:', error);
          return;
        }

        // Calculate total spent amount
        const total = transactions?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
        console.log('💰 Total spent amount:', total);
        setSpentAmount(total);

      } catch (error) {
        console.error('Error calculating spent amount:', error);
      }
    };

    fetchSpentAmount();
  }, [limit, transactions]);

  // Calcular valores
  const limitAmount = limit.targetAmount || limit.target_amount || 0;
  const remainingAmount = limitAmount - spentAmount;
  const progressPercentage = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;

  // Formatação de período
  const startDate = limit.startDate || limit.start_date;
  const endDate = limit.endDate || limit.end_date;
  
  const formatPeriod = () => {
    if (!startDate) return 'Período não definido';

    const toLocalDate = (val: string | Date) => {
      if (!val) return null as unknown as Date;
      if (val instanceof Date) return val;
      const s = normalizeDateString(val);
      if (!s) return null as unknown as Date;
      if (s.length === 10) {
        // Parse 'yyyy-MM-dd' as local date to avoid timezone shift
        return parse(s, 'yyyy-MM-dd', new Date());
      }
      return new Date(val);
    };

    const start = toLocalDate(startDate as any);
    const end = endDate ? toLocalDate(endDate as any) : null;

    if (!start || isNaN(start.getTime())) return 'Período não definido';

    if (end && !isNaN(end.getTime())) {
      const sameMonthYear = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
      if (sameMonthYear) {
        return format(start, 'MMM/yyyy', { locale: ptBR });
      }
      return `${format(start, 'MMM/yyyy', { locale: ptBR })} - ${format(end, 'MMM/yyyy', { locale: ptBR })}`;
    }

    return format(start, 'MMM/yyyy', { locale: ptBR });
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

        {/* Valores */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Limite:</span>
            <span className="font-semibold">
              {getCurrencySymbol()}{limitAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">Gasto:</span>
            <span className={progressPercentage >= 90 ? 'text-red-600 font-semibold' : ''}>
              {getCurrencySymbol()}{spentAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Barra de Progresso */}
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
      </CardContent>

      <CardFooter className="pt-0">
        <div className="w-full text-center">
          {progressPercentage >= 100 ? (
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
          )}
        </div>
      </CardFooter>
    </Card>
  );
};