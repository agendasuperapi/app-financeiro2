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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  periodType: z.enum(['monthly', 'specific']),
  monthYear: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limitAmount: z.number().min(0.01, 'Digite um valor maior que zero'),
}).refine((data) => {
  if (data.periodType === 'monthly' && !data.monthYear) {
    return false;
  }
  if (data.periodType === 'specific' && (!data.startDate || !data.endDate)) {
    return false;
  }
  return true;
}, {
  message: 'Complete todos os campos obrigatórios',
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

  const form = useForm<EditLimitFormValues>({
    resolver: zodResolver(editLimitFormSchema),
    defaultValues: {
      periodType: 'monthly',
      limitAmount: 0,
    },
  });

  // Update form when limit changes
  useEffect(() => {
    if (limit && categories.length > 0) {
      const startStr = (limit.startDate || limit.start_date || '').split('T')[0];
      const endStrRaw = (limit.endDate || limit.end_date || '');
      const endStr = endStrRaw ? endStrRaw.split('T')[0] : '';

      // Parse as local dates to avoid timezone shifts
      const startDate = startStr ? parse(startStr, 'yyyy-MM-dd', new Date()) : null;
      const endDate = endStr ? parse(endStr, 'yyyy-MM-dd', new Date()) : null;
      
      // Find category by name
      const category = categories.find(cat => cat.name === limit.name.split(' - ')[0]);
      
      // Determine period type (same month/year and starts on day 1)
      const isMonthly = !!(startDate && endDate &&
        startDate.getDate() === 1 &&
        endDate.getMonth() === startDate.getMonth() &&
        endDate.getFullYear() === startDate.getFullYear());

      form.reset({
        categoryId: category?.id || '',
        periodType: isMonthly ? 'monthly' : 'specific',
        monthYear: isMonthly ? format(startDate, 'yyyy-MM') : undefined,
        startDate: !isMonthly ? startDate : undefined,
        endDate: !isMonthly && endDate ? endDate : undefined,
        limitAmount: limit.targetAmount || limit.target_amount || 0,
      });
    }
  }, [limit, categories, form]);

  const periodType = form.watch('periodType');

  // Gerar opções de mês/ano (próximos 12 meses)
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy', { locale: ptBR });
      options.push({ value, label });
    }
    
    return options;
  };

  const onSubmit = async (data: EditLimitFormValues) => {
    if (!limit) return;

    try {
      setIsLoading(true);

      // Encontrar categoria selecionada
      const selectedCategory = categories.find(cat => cat.id === data.categoryId);
      
      let startDate: string;
      let endDate: string | undefined;
      let limitName: string;

      if (data.periodType === 'monthly' && data.monthYear) {
        // Para período mensal (usar strings de data para evitar problemas de fuso)
        const [year, month] = data.monthYear.split('-');
        const start = new Date(parseInt(year), parseInt(month) - 1, 1);
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        
        startDate = `${year}-${month}-01`;
        endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        limitName = `${selectedCategory?.name || 'Limite'} - ${format(start, 'MMM/yyyy', { locale: ptBR })}`;
      } else if (data.startDate && data.endDate) {
        // Para período específico
        startDate = format(data.startDate, 'yyyy-MM-dd');
        endDate = format(data.endDate, 'yyyy-MM-dd');
        limitName = `${selectedCategory?.name || 'Limite'} - ${format(data.startDate, 'dd/MM')} a ${format(data.endDate, 'dd/MM/yyyy')}`;
      } else {
        throw new Error('Dados de período inválidos');
      }

      // Atualizar o limite
      const updatedLimit = {
        name: limitName,
        targetAmount: data.limitAmount,
        currentAmount: limit.currentAmount || limit.current_amount || 0,
        startDate,
        endDate,
        color: selectedCategory?.color || '#3B82F6',
        category_id: data.categoryId,
        transactions: limit.transactions || [],
      };

      await updateGoal(limit.id, updatedLimit);
      
      toast.success('Limite atualizado com sucesso!');
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
            Altere as configurações do seu limite de gastos.
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

            {/* Tipo de Período */}
            <FormField
              control={form.control}
              name="periodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Período</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly">Mensal</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="specific" id="specific" />
                        <Label htmlFor="specific">Período Específico</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos condicionais de data */}
            {periodType === 'monthly' ? (
              <FormField
                control={form.control}
                name="monthYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mês/Ano</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o mês e ano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {generateMonthOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Início</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecionar data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Fim</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecionar data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                {isLoading ? 'Salvando...' : 'Atualizar Limite'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};