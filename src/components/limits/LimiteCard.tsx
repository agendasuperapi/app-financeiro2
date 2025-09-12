import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, DollarSign } from 'lucide-react';
import { Goal } from '@/types';
import { usePreferences } from '@/contexts/PreferencesContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LimiteCardProps {
  limit: Goal;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const LimiteCard: React.FC<LimiteCardProps> = ({ limit, onEdit, onDelete }) => {
  const { currency } = usePreferences();

  // Get currency symbol with space
  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$ ' : 'R$ ';
  };

  // Calcular valores
  const limitAmount = limit.targetAmount || limit.target_amount || 0;
  const spentAmount = limit.currentAmount || limit.current_amount || 0;
  const remainingAmount = limitAmount - spentAmount;
  const progressPercentage = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;

  // Formatação de período
  const startDate = limit.startDate || limit.start_date;
  const endDate = limit.endDate || limit.end_date;
  
  const formatPeriod = () => {
    if (!startDate) return 'Período não definido';
    
    const start = new Date(startDate);
    
    if (endDate) {
      const end = new Date(endDate);
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
            <h3 className="font-semibold text-lg">{limit.name}</h3>
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