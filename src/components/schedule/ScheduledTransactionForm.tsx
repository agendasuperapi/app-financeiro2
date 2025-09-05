import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAppContext } from '@/contexts/AppContext';
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
import ScheduleTransactionTypeSelector from './ScheduleTransactionTypeSelector';
import { getCategoriesByType } from '@/services/categoryService';
import { Category } from '@/types/categories';
import CategoryIcon from '@/components/categories/CategoryIcon';
import { addDays, addWeeks, addMonths, addYears } from "date-fns";


interface ScheduledTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ScheduledTransaction | null;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  defaultType?: 'income' | 'expense' | 'reminder' | 'outros';
}

const ScheduledTransactionForm: React.FC<ScheduledTransactionFormProps> = ({
  open,
  onOpenChange,
  initialData,
  mode,
  onSuccess,
  defaultType = 'expense',
}) => {
  const { t } = usePreferences();
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'reminder' | 'outros'>(initialData?.type || defaultType);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Schema for the scheduled transaction form
  const formSchema = z.object({
    type: z.enum(['income', 'expense', 'reminder', 'outros']),
    description: z.string().min(1, { message: t('validation.required') }),
    amount: z.number().optional(),
    category: z.string().min(1, { message: t('validation.required') }),
    scheduledDate: z.string().min(1, { message: t('validation.required') }),
    recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    goalId: z.string().optional().nullable(),
  });

  // Default form values
  const defaultValues = {
    type: initialData?.type || defaultType,
    description: initialData?.description || '',
    amount: initialData?.amount || (defaultType === 'reminder' ? 0 : 0),
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
  const form = useForm({
    resolver: zodResolver(formSchema),
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
        // Set a fallback empty array to prevent UI issues
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    // Always load categories, regardless of whether modal is open
    loadCategories();
  }, [selectedType, form]);

  // Reset form when opening/closing
  useEffect(() => {
    if (open && !initialData) {
      // Reset form to default values when creating new transaction
      form.reset(defaultValues);
      setSelectedType(defaultType);
    } else if (open && initialData) {
      // Populate form with initial data when editing
      form.reset({
        type: initialData.type,
        description: initialData.description,
        amount: initialData.amount,
        category: initialData.category_id || '',
        scheduledDate: new Date(initialData.scheduledDate).toISOString().slice(0, 16),
        recurrence: (initialData.recurrence || 'once') as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly',
        goalId: initialData.goalId,
      });
      setSelectedType(initialData.type);
    }
  }, [open, initialData, form]);

  // Handle type change
  const handleTypeChange = (type: 'income' | 'expense' | 'reminder' | 'outros') => {
    setSelectedType(type);
    form.setValue('type', type);
    form.setValue('category', ''); // Reset category when type changes
  };

  // Form submission handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('🚀 Form submitted with values:', values);
    console.log('🌐 Is online:', isOnline);
    console.log('🔧 Mode:', mode);
    console.log('📄 Initial data:', initialData);
    
    // For reminders, set amount to 0
    const submitData = {
      ...values,
      amount: values.type === 'reminder' ? 0 : values.amount || 0
    };
    
    console.log('📝 Submit data processed:', submitData);
    
    try {
      if (mode === 'create') {
        console.log('➕ Creating scheduled transaction...');
        // Find the selected category to get both name and id
        const selectedCategory = categories.find(cat => cat.id === submitData.category);
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
          type: submitData.type,
          description: submitData.description,
          amount: submitData.amount,
          category: selectedCategory?.name || 'Lembretes',
          category_id: submitData.type === 'reminder' ? null : submitData.category, // Para lembretes, não enviar category_id
          scheduledDate: new Date(submitData.scheduledDate).toISOString(),
          recurrence: submitData.recurrence,
          goalId: submitData.goalId,
          reference_code: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000), // Generate reference code
          situacao: 'ativo', // Set status as active
          phone: userPhone, // Set user's phone number with Brazilian country code
        };
        
        console.log('📋 Creating transaction with data:', transactionData);
        const result = await addScheduledTransaction(transactionData);
        console.log('✅ Create request sent', result);
      } else if (initialData) {
        console.log('✏️ Updating scheduled transaction...', initialData.id);
        // Find the selected category to get both name and id
        const selectedCategory = categories.find(cat => cat.id === submitData.category);
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
          type: submitData.type,
          description: submitData.description,
          amount: submitData.amount,
          category: selectedCategory?.name || 'Lembretes',
          category_id: submitData.type === 'reminder' ? null : submitData.category, // Para lembretes, não enviar category_id
          scheduledDate: new Date(submitData.scheduledDate).toISOString(),
          recurrence: submitData.recurrence,
          goalId: submitData.goalId,
          reference_code: initialData?.reference_code || Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000), // Keep existing or generate new reference code
          situacao: 'ativo', // Set status as active
          phone: userPhone, // Set user's phone number with Brazilian country code
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
      console.error('📊 Error details:', {
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause
      });
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
              {mode === 'create' ? t('schedule.scheduleTransaction') : t('common.edit')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ScheduleTransactionTypeSelector form={form} onTypeChange={handleTypeChange} />
              
              {/* Amount Field - Hidden for reminders */}
              {form.watch('type') !== 'reminder' && (
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
                          min="0"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
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

export default ScheduledTransactionForm;
