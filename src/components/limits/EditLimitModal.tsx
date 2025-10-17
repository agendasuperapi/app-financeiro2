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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Goal } from '@/types';

const editLimitFormSchema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  limitAmount: z.number().min(0.01, 'Digite um valor maior que zero'),
});

type EditLimitFormValues = z.infer<typeof editLimitFormSchema>;

interface EditLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  limit: Goal | null;
}

export const EditLimitModal: React.FC<EditLimitModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  limit,
}) => {
  const { updateGoal } = useAppContext();
  const { currency } = usePreferences();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{
    id: string;
    name: string;
    color: string;
    type: string;
  }>>([]);

  // Fetch categories from database based on limit type
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryType = limit?.type || 'expense';
        console.log('Fetching categories for type:', categoryType);
        
        const { data, error } = await supabase
          .from('poupeja_categories')
          .select('id, name, color, type')
          .eq('type', categoryType)
          .order('name');

        if (error) {
          console.error('Error fetching categories:', error);
          toast.error('Erro ao carregar categorias');
          return;
        }

        console.log('Fetched categories:', data);
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Erro ao carregar categorias');
      }
    };

    if (open && limit) {
      fetchCategories();
    }
  }, [open, limit]);

  // Get currency symbol with space
  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$ ' : 'R$ ';
  };

  const form = useForm<EditLimitFormValues>({
    resolver: zodResolver(editLimitFormSchema),
    defaultValues: {
      limitAmount: 0,
    },
  });

  // Update form when limit changes
  useEffect(() => {
    if (limit && categories.length > 0) {
      const categoryId = (limit as any).category_id || '';
      
      const formData = {
        categoryId: categoryId,
        limitAmount: limit.targetAmount || limit.target_amount || 0,
      };
      
      form.reset(formData);
    }
  }, [limit, categories, form]);

  const onSubmit = async (data: EditLimitFormValues) => {
    if (!limit) return;

    try {
      setIsLoading(true);

      // Encontrar categoria selecionada
      const selectedCategory = categories.find(cat => cat.id === data.categoryId);
      
      const limitName = `${selectedCategory?.name || 'Limite'}`;

      // Atualizar o limite
      const updatedLimit = {
        name: limitName,
        targetAmount: data.limitAmount,
        currentAmount: limit.currentAmount || limit.current_amount || 0,
        startDate: '',
        endDate: '',
        color: selectedCategory?.color || '#3B82F6',
        category_id: data.categoryId,
        transactions: limit.transactions || [],
      };

      await updateGoal(limit.id, updatedLimit);
      
      toast.success(limit.type === 'income' ? 'Meta de receita atualizada com sucesso!' : 'Limite atualizado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Error updating limit:', error);
      toast.error('Erro ao atualizar limite. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!limit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Limite</DialogTitle>
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