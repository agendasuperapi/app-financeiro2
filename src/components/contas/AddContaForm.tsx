import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { addScheduledTransaction, updateScheduledTransaction } from '@/services/scheduledTransactionService';
import { supabase } from '@/integrations/supabase/client';

const contaSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  scheduled_date: z.date({
    required_error: 'Data é obrigatória'
  }),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly'])
});

type ContaFormValues = z.infer<typeof contaSchema>;

interface AddContaFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
  mode?: 'create' | 'edit';
}

const AddContaForm: React.FC<AddContaFormProps> = ({
  onSuccess,
  onCancel,
  initialData,
  mode = 'create'
}) => {
  const [userPhone, setUserPhone] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const form = useForm<ContaFormValues>({
    resolver: zodResolver(contaSchema),
    defaultValues: {
      description: initialData?.description || '',
      scheduled_date: initialData?.scheduledDate ? new Date(initialData.scheduledDate) : undefined,
      recurrence: initialData?.recurrence || 'once'
    }
  });

  useEffect(() => {
    loadUserPhone();
  }, []);

  const loadUserPhone = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data: profile
        } = await supabase.from('poupeja_users').select('phone').eq('id', user.id).single();
        if (profile?.phone) {
          setUserPhone(profile.phone.startsWith('+55') ? profile.phone : `+55${profile.phone}`);
        } else {
          setUserPhone('+5511999999999'); // Default fallback
        }
      }
    } catch (error) {
      console.error('Error loading user phone:', error);
      setUserPhone('+5511999999999'); // Default fallback
    }
  };

  const onSubmit = async (data: ContaFormValues) => {
    setLoading(true);
    try {
      const transactionData = {
        type: 'lembrete' as const,
        amount: 0,
        category: 'Lembrete',
        description: data.description,
        scheduledDate: data.scheduled_date.toISOString(),
        recurrence: data.recurrence,
        status: 'pending' as const,
        category_id: 'd6c7432e-2b7a-4937-95db-4ce2df58d40f',
        // Campos obrigatórios
        situacao: 'ativo',
        phone: userPhone,
        aba: 'lembrar'
      };

      console.log('Transaction data being sent:', transactionData);

      let result;
      if (mode === 'edit' && initialData) {
        result = await updateScheduledTransaction({
          ...transactionData,
          id: initialData.id,
          categoryIcon: initialData.categoryIcon,
          categoryColor: initialData.categoryColor,
          goalId: initialData.goalId,
          paidDate: initialData.paidDate,
          paidAmount: initialData.paidAmount,
          lastExecutionDate: initialData.lastExecutionDate,
          nextExecutionDate: initialData.nextExecutionDate
        });
      } else {
        result = await addScheduledTransaction(transactionData);
      }

      console.log('Result from service:', result);

      if (result) {
        toast.success(mode === 'edit' ? 'Lembrete atualizado com sucesso!' : 'Lembrete adicionado com sucesso!');
        onSuccess();
      } else {
        toast.error(mode === 'edit' ? 'Erro ao atualizar lembrete' : 'Erro ao adicionar lembrete');
      }
    } catch (error) {
      console.error('Error saving lembrete:', error);
      toast.error(mode === 'edit' ? 'Erro ao atualizar lembrete' : 'Erro ao adicionar lembrete');
    } finally {
      setLoading(false);
    }
  };

  const recurrenceOptions = [{
    value: 'once',
    label: 'Uma vez'
  }, {
    value: 'daily',
    label: 'Diário'
  }, {
    value: 'weekly',
    label: 'Semanal'
  }, {
    value: 'monthly',
    label: 'Mensal'
  }, {
    value: 'yearly',
    label: 'Anual'
  }];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea 
          id="description" 
          {...form.register('description')} 
          placeholder="Digite a descrição do lembrete" 
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
        )}
      </div>

      {/* Data Agendada */}
      <div className="space-y-2">
        <Label>Agendado para</Label>
        <Input 
          type="datetime-local" 
          step="60"
          value={form.watch('scheduled_date') ? format(form.watch('scheduled_date'), "yyyy-MM-dd'T'HH:mm") : ''}
          onChange={e => {
            if (e.target.value) {
              const localDate = new Date(e.target.value);
              localDate.setSeconds(0);
              form.setValue('scheduled_date', localDate);
            }
          }} 
        />
        {form.formState.errors.scheduled_date && (
          <p className="text-sm text-red-500">{form.formState.errors.scheduled_date.message}</p>
        )}
      </div>

      {/* Recorrência */}
      <div className="space-y-2">
        <Label>Recorrência</Label>
        <Select 
          onValueChange={value => form.setValue('recurrence', value as any)} 
          value={form.watch('recurrence')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a recorrência" />
          </SelectTrigger>
          <SelectContent>
            {recurrenceOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.recurrence && (
          <p className="text-sm text-red-500">{form.formState.errors.recurrence.message}</p>
        )}
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : mode === 'edit' ? 'Atualizar' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};

export default AddContaForm;