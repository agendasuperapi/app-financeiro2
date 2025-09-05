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
import { addScheduledTransaction } from '@/services/scheduledTransactionService';
import { Category } from '@/types/categories';
import { supabase } from '@/integrations/supabase/client';

const contaSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  scheduled_date: z.date({ required_error: 'Data é obrigatória' }),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
  parcela: z.string().optional()
});

type ContaFormValues = z.infer<typeof contaSchema>;

interface AddContaFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AddContaForm: React.FC<AddContaFormProps> = ({ onSuccess, onCancel }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [userPhone, setUserPhone] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const form = useForm<ContaFormValues>({
    resolver: zodResolver(contaSchema),
    defaultValues: {
      description: '',
      amount: 0,
      category_id: '',
      recurrence: 'once',
      parcela: ''
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('poupeja_users')
          .select('phone')
          .eq('id', user.id)
          .single();
        
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
      const scheduledTransaction = {
        type: 'expense' as const,
        amount: data.amount,
        category: categories.find(c => c.id === data.category_id)?.name || '',
        description: data.description,
        scheduledDate: data.scheduled_date.toISOString(),
        recurrence: data.recurrence,
        status: 'pending' as const,
        category_id: data.category_id,
        // Campos automáticos
        situacao: 'ativo',
        phone: userPhone,
        aba: 'contas'
      };

      const result = await addScheduledTransaction(scheduledTransaction);
      if (result) {
        toast.success('Conta adicionada com sucesso!');
        onSuccess();
      } else {
        toast.error('Erro ao adicionar conta');
      }
    } catch (error) {
      console.error('Error adding conta:', error);
      toast.error('Erro ao adicionar conta');
    } finally {
      setLoading(false);
    }
  };

  const recurrenceOptions = [
    { value: 'once', label: 'Uma vez' },
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'yearly', label: 'Anual' }
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          placeholder="Digite a descrição da conta"
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
        )}
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
          placeholder="0.00"
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select onValueChange={(value) => form.setValue('category_id', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.icon} {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.category_id && (
          <p className="text-sm text-red-500">{form.formState.errors.category_id.message}</p>
        )}
      </div>

      {/* Data Agendada */}
      <div className="space-y-2">
        <Label>Agendado para</Label>
        <div className="flex gap-2">
          <Input
            type="date"
            onChange={(e) => {
              if (e.target.value) {
                form.setValue('scheduled_date', new Date(e.target.value));
              }
            }}
            className="flex-1"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-10 p-0">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.watch('scheduled_date')}
                onSelect={(date) => date && form.setValue('scheduled_date', date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
        {form.formState.errors.scheduled_date && (
          <p className="text-sm text-red-500">{form.formState.errors.scheduled_date.message}</p>
        )}
      </div>

      {/* Recorrência */}
      <div className="space-y-2">
        <Label>Recorrência</Label>
        <Select onValueChange={(value) => form.setValue('recurrence', value as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a recorrência" />
          </SelectTrigger>
          <SelectContent>
            {recurrenceOptions.map((option) => (
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

      {/* Parcela (sempre visível para informações adicionais) */}
      <div className="space-y-2">
        <Label htmlFor="parcela">Informações Adicionais</Label>
        <Input
          id="parcela"
          {...form.register('parcela')}
          placeholder="Ex: Parcela 1/12, Referência, etc."
        />
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};

export default AddContaForm;