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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClientView } from '@/contexts/ClientViewContext';

const limitFormSchema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  limitAmount: z.number().min(0.01, 'Digite um valor maior que zero'),
});

type LimitFormValues = z.infer<typeof limitFormSchema>;

interface AddLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddLimitModal: React.FC<AddLimitModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { addGoal } = useAppContext();
  const { currency } = usePreferences();
  const { selectedUser } = useClientView();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{
    id: string;
    name: string;
    color: string;
    type: string;
  }>>([]);

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('poupeja_categories')
          .select('id, name, color, type')
          .eq('type', 'expense')
          .order('name');

        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }

        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Get currency symbol with space
  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$ ' : 'R$ ';
  };

const form = useForm<LimitFormValues>({
  resolver: zodResolver(limitFormSchema),
  defaultValues: {
    limitAmount: 0,
  },
});

  const onSubmit = async (data: LimitFormValues) => {
    try {
      setIsLoading(true);

      // Encontrar categoria selecionada
      const selectedCategory = categories.find(cat => cat.id === data.categoryId);
      
      // Usar o mês atual como período padrão
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const limitName = `${selectedCategory?.name || 'Limite'} - ${format(currentDate, 'MMM/yyyy', { locale: ptBR })}`;

      // Criar o limite como um goal
      const newLimit = {
        name: limitName,
        targetAmount: data.limitAmount,
        currentAmount: 0,
        startDate,
        endDate,
        color: selectedCategory?.color || '#3B82F6',
        transactions: [], // Propriedade obrigatória do tipo Goal
      };

      if (selectedUser?.id) {
        // Inserir diretamente para o cliente visualizado
        const { error } = await supabase
  .from('poupeja_goals')
  .insert({
    name: newLimit.name,
    target_amount: newLimit.targetAmount,
    current_amount: newLimit.currentAmount || 0,
    start_date: newLimit.startDate,
    end_date: newLimit.endDate,
    color: newLimit.color,
    category_id: data.categoryId,
    type: 'expense',
    user_id: selectedUser.id,
  })
          .select()
          .single();

        if (error) throw error;
      } else {
        // Fluxo normal: cria para o usuário logado
        await addGoal(newLimit, data.categoryId, 'expense');
      }
      
      toast.success('Limite adicionado com sucesso!');
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error adding limit:', error);
      toast.error('Erro ao adicionar limite. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Limite</DialogTitle>
          <DialogDescription>
            Configure um limite de gastos para uma categoria específica.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Categoria */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor do Limite */}
            <FormField
              control={form.control}
              name="limitAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Limite</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {getCurrencySymbol()}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        className="pl-8"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Limite'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};