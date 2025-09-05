import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScheduledTransaction } from '@/types';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Edit, Trash2, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { format, isAfter, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { markAsPaid, deleteScheduledTransaction } from '@/services/scheduledTransactionService';
import { toast } from 'sonner';

interface ContasCardProps {
  conta: ScheduledTransaction;
  onMarkAsPaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ContasCard: React.FC<ContasCardProps> = ({
  conta,
  onMarkAsPaid,
  onEdit,
  onDelete
}) => {
  const { formatDate } = useDateFormat();
  const { currency } = usePreferences();

  // Verificar se está vencido
  const scheduledDate = new Date(conta.scheduledDate);
  const isOverdue = isAfter(new Date(), scheduledDate) && !isToday(scheduledDate);
  const isDueToday = isToday(scheduledDate);
  const isPaid = conta.description?.includes('[PAGO]') || false;

  // Determinar status e cor
  const getStatus = () => {
    if (isPaid) return { label: 'Pago', variant: 'default' as const, color: 'text-green-600' };
    if (isDueToday) return { label: 'Vence Hoje', variant: 'destructive' as const, color: 'text-orange-600' };
    if (isOverdue) return { label: 'Vencido', variant: 'destructive' as const, color: 'text-red-600' };
    return { label: 'Pendente', variant: 'secondary' as const, color: 'text-blue-600' };
  };

  const status = getStatus();

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  // Formatar recorrência
  const formatRecurrence = (recurrence?: string) => {
    const recurrenceMap: { [key: string]: string } = {
      'once': 'Uma vez',
      'daily': 'Diário',
      'weekly': 'Semanal',
      'monthly': 'Mensal',
      'yearly': 'Anual'
    };
    return recurrenceMap[recurrence || 'once'] || 'Uma vez';
  };

  const handleMarkAsPaid = async () => {
    try {
      const success = await markAsPaid(conta.id);
      if (success) {
        toast.success('Conta marcada como paga');
        onMarkAsPaid();
      } else {
        toast.error('Erro ao marcar conta como paga');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Erro ao marcar conta como paga');
    }
  };

  const handleDelete = async () => {
    try {
      const success = await deleteScheduledTransaction(conta.id);
      if (success) {
        toast.success('Conta excluída com sucesso');
        onDelete();
      } else {
        toast.error('Erro ao excluir conta');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        {/* Primeira linha: Descrição e Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {conta.description || 'Conta sem descrição'}
            </h3>
          </div>
          <Badge variant={status.variant} className="ml-2">
            {status.label}
          </Badge>
        </div>

        {/* Segunda linha: Data, Recorrência e Categoria */}
        <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(conta.scheduledDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>•</span>
            <span>{formatRecurrence(conta.recurrence)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>•</span>
            <span>{conta.category}</span>
          </div>
        </div>

        {/* Terceira linha: Valor e Ações */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-xl">
            {formatCurrency(conta.amount)}
          </div>
          
          <div className="flex items-center gap-2">
            {!isPaid && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAsPaid}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Marcar como Pago
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mostrar data de pagamento se foi pago */}
        {isPaid && conta.paidDate && (
          <div className="mt-2 text-sm text-green-600">
            Pago em: {formatDate(conta.paidDate)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};