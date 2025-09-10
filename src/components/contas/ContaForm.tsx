import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { supabase } from '@/integrations/supabase/client';
import { addScheduledTransaction, updateScheduledTransaction, deleteScheduledTransaction } from '@/services/scheduledTransactionService';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScheduledTransaction } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ContaTransactionTypeSelector from './ContaTransactionTypeSelector';
import { getCategoriesByType } from '@/services/categoryService';
import { Category } from '@/types/categories';
import CategoryIcon from '@/components/categories/CategoryIcon';

interface ContaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ScheduledTransaction | null;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  defaultType?: 'income' | 'expense';
}

// Schema for the conta form (income/expense with amount)
const contaFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  scheduledDate: z.string().min(1, 'Data é obrigatória'),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
  goalId: z.string().optional().nullable(),
});

type ContaFormValues = z.infer<typeof contaFormSchema>;

const ContaForm: React.FC<ContaFormProps> = ({
  open,
  onOpenChange,
  initialData,
  mode,
  onSuccess,
  defaultType = 'expense',
}) => {
  const { t } = usePreferences();
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>(initialData?.type as 'income' | 'expense' || defaultType);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Default form values for contas
  const defaultValues: Partial<ContaFormValues> = {
    type: initialData?.type as 'income' | 'expense' || defaultType,
    description: initialData?.description || '',
    amount: initialData?.amount || 0,
    category: initialData?.category_id || '',
    scheduledDate: initialData?.scheduledDate 
      ? new Date(initialData.scheduledDate).toISOString().slice(0, 16)
      : (() => {
          const now = new Date();
          now.setHours(now.getHours() + 1, 0, 0, 0);
          return now.toISOString().slice(0, 16);
        })(),
    recurrence: (initialData?.recurrence as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly') || 'once',
    goalId: initialData?.goalId || undefined,
  };

  // Form setup
  const form = useForm<ContaFormValues>({
    resolver: zodResolver(contaFormSchema),
    defaultValues,
  });

  // Load categories when type changes
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const categoryData = await getCategoriesByType(selectedType);
        console.log(`Loaded ${categoryData.length} categories for ${selectedType}:`, categoryData);
        setCategories(categoryData);
        
        // Set default category if none selected and categories are available
        if (categoryData.length > 0) {
          const currentCategory = form.getValues('category');
          const categoryExists = categoryData.some(c => c.id === currentCategory || c.name === currentCategory);
          
          if (!categoryExists) {
            console.log("Setting default category to:", categoryData[0].id);
            form.setValue('category', categoryData[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [selectedType, form]);

  // Reset form when opening/closing
  useEffect(() => {
    if (open && !initialData) {
      // Reset form to default values when creating new conta
      form.reset(defaultValues);
      setSelectedType(defaultType);
    } else if (open && initialData) {
      // Populate form with initial data when editing
      const editValues: Partial<ContaFormValues> = {
        type: initialData.type as 'income' | 'expense',
        description: initialData.description,
        amount: initialData.amount,
        category: initialData.category_id || '',
        scheduledDate: new Date(initialData.scheduledDate).toISOString().slice(0, 16),
        recurrence: (initialData.recurrence || 'once') as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly',
        goalId: initialData.goalId,
      };
      form.reset(editValues);
      setSelectedType(initialData.type as 'income' | 'expense');
    }
  }, [open, initialData, form, defaultValues, defaultType]);

  // Handle type change
  const handleTypeChange = (type: 'income' | 'expense') => {
    setSelectedType(type);
    form.setValue('type', type);
    form.setValue('category', ''); // Reset category when type changes
  };

  // Form submission handler
  const onSubmit = async (values: ContaFormValues) => {
    console.log('🚀 Conta form submitted with values:', values);
    
    try {
      if (mode === 'create') {
        console.log('➕ Creating scheduled transaction...');
        // Find the selected category to get both name and id
        const selectedCategory = categories.find(cat => cat.id === values.category);
        console.log('🏷️ Selected category:', selectedCategory);
        
        // Get current user for phone number
        const { data: { user } } = await supabase.auth.getUser();
        const { data: userData } = await supabase
          .from('poupeja_users')
          .select('phone')
          .eq('id', user?.id)
          .single();
        
        // Add Brazilian country code 55 if not already present
        let userPhone = '';
        if (userData?.phone) {
          const rawPhone = userData.phone;
          userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
        }
        
        const transactionData = {
          type: values.type,
          description: values.description,
          amount: values.amount,
          category: selectedCategory?.name || 'Outros',
          category_id: values.category,
          scheduledDate: new Date(values.scheduledDate).toISOString(),
          recurrence: values.recurrence,
          goalId: values.goalId,
          reference_code: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
          situacao: 'ativo',
          phone: userPhone,
        };
        
        console.log('📋 Creating transaction with data:', transactionData);
        const result = await addScheduledTransaction(transactionData);
        console.log('✅ Create request sent', result);
      } else if (initialData) {
        console.log('✏️ Updating scheduled transaction...', initialData.id);
        // Find the selected category to get both name and id
        const selectedCategory = categories.find(cat => cat.id === values.category);
        console.log('🏷️ Selected category:', selectedCategory);
        
        // Get current user for phone number
        const { data: { user } } = await supabase.auth.getUser();
        const { data: userData } = await supabase
          .from('poupeja_users')
          .select('phone')
          .eq('id', user?.id)
          .single();
        
        // Add Brazilian country code 55 if not already present
        let userPhone = '';
        if (userData?.phone) {
          const rawPhone = userData.phone;
          userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
        }
        
        const updateData = {
          type: values.type,
          description: values.description,
          amount: values.amount,
          category: selectedCategory?.name || 'Outros',
          category_id: values.category,
          scheduledDate: new Date(values.scheduledDate).toISOString(),
          recurrence: values.recurrence,
          goalId: values.goalId,
          reference_code: initialData?.reference_code || Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
          situacao: 'ativo',
          phone: userPhone,
        };
        
        console.log('📋 Updating transaction with ID:', initialData.id);
        console.log('📋 Update data:', updateData);
        const result = await updateScheduledTransaction({ ...updateData, id: initialData.id });
        console.log('✅ Update request sent', result);
      }
      
      console.log('🎉 Closing dialog');
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        console.log('🔄 Calling onSuccess callback');
        onSuccess();
      }
    } catch (error) {
      console.error('❌ Error in onSubmit:', error);
      // Don't close dialog on error, let user try again
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (initialData) {
      await deleteScheduledTransaction(initialData.id);
      onOpenChange(false);
      setDeleteDialogOpen(false);
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Agendar Transação' : 'Editar Transação'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ContaTransactionTypeSelector form={form} onTypeChange={handleTypeChange} />
              
              {/* Amount Field */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.amount')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.category')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={loadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingCategories ? t('common.loading') : t('transactions.selectCategory')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id} className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <CategoryIcon icon={category.icon} color={category.color} size={16} />
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.description')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.scheduledFor')}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.recurrence')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('schedule.recurrence')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="once">{t('schedule.once')}</SelectItem>
                        <SelectItem value="daily">{t('schedule.daily')}</SelectItem>
                        <SelectItem value="weekly">{t('schedule.weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('schedule.monthly')}</SelectItem>
                        <SelectItem value="yearly">{t('schedule.yearly')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                {mode === 'edit' && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={!isOnline}
                    className="w-full sm:w-auto"
                  >
                    {t('common.delete')}
                  </Button>
                )}
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 sm:flex-initial min-w-20"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    variant="default"
                    size="sm"
                    disabled={!isOnline}
                    className="flex-1 sm:flex-initial min-w-20"
                  >
                    {mode === 'create' ? t('common.create') : t('common.update')}
                  </Button>
                </div>
              </DialogFooter>
              {!isOnline && (
                <p className="text-xs text-muted-foreground text-right mt-2">
                  {t('schedule.editingRequiresConnection')}
                </p>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('schedule.confirmDeleteSchedule')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ContaForm;