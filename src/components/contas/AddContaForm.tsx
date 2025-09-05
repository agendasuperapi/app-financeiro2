import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getCategoriesByType } from '@/services/categoryService';
import { addScheduledTransaction, updateScheduledTransaction } from '@/services/scheduledTransactionService';
import { Category } from '@/types/categories';
import { supabase } from '@/integrations/supabase/client';
import CategoryIcon from '@/components/categories/CategoryIcon';
const contaSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  scheduled_date: z.date({
    required_error: 'Data é obrigatória'
  }),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly', 'installments']),
  parcela: z.string().optional()
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [userPhone, setUserPhone] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const form = useForm<ContaFormValues>({
    resolver: zodResolver(contaSchema),
    defaultValues: {
      description: initialData?.description || '',
      amount: initialData?.amount || 0,
      category_id: initialData?.category_id || '',
      scheduled_date: initialData?.scheduledDate ? new Date(initialData.scheduledDate) : undefined,
      recurrence: initialData?.recurrence || 'once',
      parcela: initialData?.parcela || ''
    }
  });
  const selectedRecurrence = form.watch('recurrence');
  useEffect(() => {
    loadCategories();
    loadUserPhone();
  }, []);
  const loadCategories = async () => {
    try {
      const data = await getCategoriesByType('expense');
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };
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
        type: 'expense' as const,
        amount: data.amount,
        category: categories.find(c => c.id === data.category_id)?.name || '',
        description: data.description,
        scheduledDate: data.scheduled_date.toISOString(),
        recurrence: data.recurrence,
        status: 'pending' as const,
        category_id: data.category_id,
        // Campos obrigatórios
        parcela: data.parcela || '',
        situacao: 'ativo',
        phone: userPhone,
        aba: 'contas'
      };

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

      if (result) {
        toast.success(mode === 'edit' ? 'Conta atualizada com sucesso!' : 'Conta adicionada com sucesso!');
        onSuccess();
      } else {
        toast.error(mode === 'edit' ? 'Erro ao atualizar conta' : 'Erro ao adicionar conta');
      }
    } catch (error) {
      console.error('Error saving conta:', error);
      toast.error(mode === 'edit' ? 'Erro ao atualizar conta' : 'Erro ao adicionar conta');
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
  }, {
    value: 'installments',
    label: 'Parcelas'
  }];
  return <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...form.register('description')} placeholder="Digite a descrição da conta" />
        {form.formState.errors.description && <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>}
      </div>

      {/* Valor */}
      <div className="space-y-2">
        <Label htmlFor="amount">Valor</Label>
        <Input 
          id="amount" 
          type="number" 
          step="0.01" 
          min="0" 
          {...form.register('amount')}
          onChange={e => {
            const value = e.target.value;
            form.setValue('amount', value ? parseFloat(value) : 0);
          }} 
          value={form.watch('amount') || ''}
          placeholder="0.00" 
        />
        {form.formState.errors.amount && <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>}
      </div>

      {/* Categoria */}
      <div className="space-y-2">
        <Label>Categoria</Label>
         <Select onValueChange={value => form.setValue('category_id', value)} value={form.watch('category_id')}>
           <SelectTrigger>
             <SelectValue placeholder="Selecione uma categoria" />
           </SelectTrigger>
          <SelectContent>
            {categories.map(category => <SelectItem key={category.id} value={category.id}>
                <span className="flex items-center gap-2">
                  <CategoryIcon icon={category.icon} color={category.color} size={16} />
                  <span>{category.name}</span>
                </span>
              </SelectItem>)}
          </SelectContent>
        </Select>
        {form.formState.errors.category_id && <p className="text-sm text-red-500">{form.formState.errors.category_id.message}</p>}
      </div>

      {/* Data e Hora Agendada */}
      <div className="space-y-2">
        <Label>Agendado para (Data e Hora - Brasília)</Label>
        <div className="flex gap-2">
         <Input 
           type="datetime-local" 
           step="60"
           value={form.watch('scheduled_date') ? format(form.watch('scheduled_date'), "yyyy-MM-dd'T'HH:mm") : ''}
           onChange={e => {
             if (e.target.value) {
               // Converter para timezone de Brasília e forçar segundos para 00
               const localDate = new Date(e.target.value);
               localDate.setSeconds(0);
               form.setValue('scheduled_date', localDate);
             }
           }} 
           className="flex-1" 
         />
          <Popover>
            <PopoverTrigger asChild>
              
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={form.watch('scheduled_date')} onSelect={date => {
              if (date) {
                // Manter a hora atual se já existir, senão definir como 09:00, mas sempre zerar os segundos
                const currentDate = form.watch('scheduled_date');
                const dateWithTime = new Date(date);
                if (currentDate) {
                  dateWithTime.setHours(currentDate.getHours(), currentDate.getMinutes(), 0);
                } else {
                  dateWithTime.setHours(9, 0, 0);
                }
                form.setValue('scheduled_date', dateWithTime);
              }
            }} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
            </PopoverContent>
          </Popover>
        </div>
        
        {form.formState.errors.scheduled_date && <p className="text-sm text-red-500">{form.formState.errors.scheduled_date.message}</p>}
      </div>

      {/* Recorrência */}
      <div className="space-y-2">
        <Label>Recorrência</Label>
         <Select onValueChange={value => form.setValue('recurrence', value as any)} value={form.watch('recurrence')}>
           <SelectTrigger>
             <SelectValue placeholder="Selecione a recorrência" />
           </SelectTrigger>
          <SelectContent>
            {recurrenceOptions.map(option => <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>)}
          </SelectContent>
        </Select>
        {form.formState.errors.recurrence && <p className="text-sm text-red-500">{form.formState.errors.recurrence.message}</p>}
      </div>

      {/* Parcela (se recorrência = parcelas) */}
      {selectedRecurrence === 'installments' && <div className="space-y-2">
          <Label htmlFor="parcela">Parcela</Label>
          <Input id="parcela" {...form.register('parcela')} placeholder="Ex: 1/12" />
        </div>}

      {/* Botões */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : mode === 'edit' ? 'Atualizar' : 'Salvar'}
        </Button>
      </div>
    </form>;
};
export default AddContaForm;