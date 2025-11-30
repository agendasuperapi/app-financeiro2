import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAppContext } from '@/contexts/AppContext';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScheduledTransaction } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ScheduleTransactionTypeSelector from '../schedule/ScheduleTransactionTypeSelector';
import { getCategoriesByType } from '@/services/categoryService';
import { Category } from '@/types/categories';
import CategoryIcon from '@/components/categories/CategoryIcon';
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import { getNextReferenceCode } from '@/utils/referenceCodeUtils';
import { supabase } from '@/integrations/supabase/client';
interface LembretesTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ScheduledTransaction | null;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  defaultType?: 'income' | 'expense' | 'reminder' | 'outros';
}
const LembretesTransactionForm: React.FC<LembretesTransactionFormProps> = ({
  open,
  onOpenChange,
  initialData,
  mode,
  onSuccess,
  defaultType = 'expense'
}) => {
  const {
    t
  } = usePreferences();
  const {
    addScheduledTransaction,
    updateScheduledTransaction,
    deleteScheduledTransaction
  } = useAppContext();
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'reminder' | 'lembrete' | 'outros'>(initialData?.type || defaultType);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [editScopeDialogOpen, setEditScopeDialogOpen] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<any>(null);
  const [relatedReminders, setRelatedReminders] = useState<any[]>([]);

  // Schema for the scheduled transaction form
  const formSchema = z.object({
    type: z.enum(['income', 'expense', 'reminder', 'lembrete', 'outros']),
    description: z.string().min(1, {
      message: t('validation.required')
    }),
    amount: z.number().optional(),
    category: z.string().optional(), // Make category optional for lembretes
    scheduledDate: z.string().min(1, {
      message: t('validation.required')
    }),
    recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    goalId: z.string().optional().nullable()
  });

  // Default form values
  const defaultValues = {
    type: initialData?.type || defaultType,
    description: initialData?.description || '',
    amount: initialData?.amount || (defaultType === 'reminder' ? 0 : 0),
    category: initialData?.category_id || '',
    scheduledDate: initialData?.scheduledDate ? new Date(initialData.scheduledDate).toISOString().slice(0, 16) : (() => {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      return now.toISOString().slice(0, 16);
    })(),
    recurrence: initialData?.recurrence as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' || 'once',
    goalId: initialData?.goalId || undefined
  };

  // Form setup
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues
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
        goalId: initialData.goalId
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

  // Helper function to translate recurrence to Portuguese
  const translateRecurrence = (recurrence: string) => {
    const translations = {
      'once': 'uma vez',
      'daily': 'diariamente', 
      'weekly': 'semanalmente',
      'monthly': 'mensalmente',
      'yearly': 'anualmente'
    };
    return translations[recurrence as keyof typeof translations] || recurrence;
  };

  // Check for related reminders with the same codigo_trans
  const checkRelatedReminders = async (codigoTrans: string) => {
    console.log('🔍 Checking for related reminders with codigo_trans:', codigoTrans);
    
    try {
      const { data, error } = await (supabase as any)
        .from('tbl_lembrete')
        .select('*')
        .eq('codigo_trans', codigoTrans)
        .order('date', { ascending: true });

      if (error) {
        console.error('❌ Error checking related reminders:', error);
        return [];
      }

      console.log('✅ Found related reminders:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Exception checking related reminders:', error);
      return [];
    }
  };

  // Handle edit scope selection
  const handleEditScopeSelection = async (scope: 'current' | 'future' | 'all') => {
    if (!pendingFormValues || !initialData) return;

    console.log('📝 Applying edit with scope:', scope);
    console.log('🔢 Related reminders count:', relatedReminders.length);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let userPhone = '';
      if (user?.user_metadata?.phone) {
        const rawPhone = user.user_metadata.phone;
        userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
      }

      const outrosCategoryId = 'd6c7432e-2b7a-4937-95db-4ce2df58d40f';
      const referenceCode = await getNextReferenceCode();

      const updateData = {
        type: pendingFormValues.type,
        description: pendingFormValues.description,
        amount: pendingFormValues.amount,
        category: 'Outros',
        category_id: outrosCategoryId,
        scheduledDate: new Date(pendingFormValues.scheduledDate).toISOString(),
        recurrence: pendingFormValues.recurrence,
        goalId: pendingFormValues.goalId,
        reference_code: referenceCode,
        status: 'pending' as const,
        phone: userPhone,
        situacao: 'ativo'
      };

      if (scope === 'current') {
        // Update only the current reminder
        await updateScheduledTransaction(initialData.id, updateData);
      } else if (scope === 'future') {
        // Update current and all future reminders
        const currentDate = new Date(initialData.scheduledDate);
        const futureReminders = relatedReminders.filter(r => 
          new Date(r.date) >= currentDate
        );
        
        for (const reminder of futureReminders) {
          await updateScheduledTransaction(reminder.id, updateData);
        }
      } else if (scope === 'all') {
        // Update all related reminders
        for (const reminder of relatedReminders) {
          await updateScheduledTransaction(reminder.id, updateData);
        }
      }

      setEditScopeDialogOpen(false);
      setPendingFormValues(null);
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('❌ Error applying edit scope:', error);
    }
  };

  // Form submission handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('🚀 Form submitted with values:', values);
    console.log('🌐 Is online:', isOnline);
    console.log('🔧 Mode:', mode);
    console.log('📄 Initial data:', initialData);

    try {
      // Get user phone from user_metadata  
      const { data: { user } } = await supabase.auth.getUser();
      let userPhone = '';
      if (user?.user_metadata?.phone) {
        const rawPhone = user.user_metadata.phone;
        // Add Brazilian country code 55 if not already present
        userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
      }

      // Use the specific outros category ID
      const outrosCategoryId = 'd6c7432e-2b7a-4937-95db-4ce2df58d40f';

      // Generate reference code
      const referenceCode = await getNextReferenceCode();

      // For reminders, set amount to 0
      const submitData = {
        ...values,
        amount: values.type === 'reminder' ? 0 : values.amount || 0
      };
      
      console.log('📝 Submit data processed:', submitData);

      if (mode === 'create') {
        console.log('➕ Creating scheduled transaction...');
        
        const transactionData = {
          type: submitData.type,
          description: submitData.description,
          amount: submitData.amount,
          category: 'Outros',
          category_id: outrosCategoryId,
          scheduledDate: new Date(submitData.scheduledDate).toISOString(),
          recurrence: submitData.recurrence, // Keep in English for type compatibility
          goalId: submitData.goalId,
          reference_code: referenceCode,
          status: 'pending' as const, // Default status with proper typing
          phone: userPhone, // User's phone from registration
          situacao: 'ativo' // Default situacao
        };
        
        console.log('🎯 Final category_id before sending:', outrosCategoryId);
        console.log('📋 Creating transaction with data:', transactionData);
        await addScheduledTransaction(transactionData);
        console.log('✅ Create request sent');
      } else if (initialData) {
        console.log('✏️ Updating scheduled transaction...', initialData.id);
        console.log('📝 Full initialData:', initialData);
        
        // Check if this reminder is part of a series (has codigo_trans)
        const codigoTrans = (initialData as any).codigo_trans || (initialData as any).reference_code;
        console.log('🔍 codigo_trans from initialData:', codigoTrans);
        
        if (codigoTrans) {
          // Check for related reminders
          const related = await checkRelatedReminders(codigoTrans);
          console.log('📊 Related reminders found:', related.length);
          
          if (related.length > 1) {
            // Multiple related reminders found - ask user for edit scope
            setRelatedReminders(related);
            setPendingFormValues(submitData);
            setEditScopeDialogOpen(true);
            return; // Don't close the dialog yet
          }
        }
        
        // Single reminder or no related reminders - update normally
        const updateData = {
          type: submitData.type,
          description: submitData.description,
          amount: submitData.amount,
          category: 'Outros',
          category_id: outrosCategoryId,
          scheduledDate: new Date(submitData.scheduledDate).toISOString(),
          recurrence: submitData.recurrence,
          goalId: submitData.goalId,
          reference_code: referenceCode,
          status: 'pending' as const,
          phone: userPhone,
          situacao: 'ativo'
        };
        
        console.log('📋 Updating transaction with ID:', initialData.id);
        console.log('📋 Update data:', updateData);
        await updateScheduledTransaction(initialData.id, updateData);
        console.log('✅ Update request sent');
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
  const handleDelete = () => {
    if (initialData) {
      deleteScheduledTransaction(initialData.id);
      onOpenChange(false);
      setDeleteDialogOpen(false);
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    }
  };
  return <>
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
              
              
              
              
              <FormField control={form.control} name="description" render={({
              field
            }) => <FormItem>
                    <FormLabel>{t('common.description')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="scheduledDate" render={({
              field
            }) => <FormItem>
                    <FormLabel>{t('schedule.scheduledFor')}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="recurrence" render={({
              field
            }) => <FormItem>
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
                  </FormItem>} />

              <DialogFooter className="gap-2 justify-between sm:justify-end">
                {mode === 'edit' && <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 sm:mr-auto" onClick={() => setDeleteDialogOpen(true)} disabled={!isOnline}>
                    {t('common.delete')}
                  </Button>}
                <div className="space-x-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!isOnline} onClick={() => {
                  console.log('🔄 Update button clicked!');
                  console.log('📝 Form state:', form.formState);
                  console.log('❌ Form errors:', form.formState.errors);
                  console.log('📊 Form values:', form.getValues());
                  console.log('✅ Form valid:', form.formState.isValid);
                  console.log('🌐 Online status:', isOnline);

                  // Trigger validation manually to see detailed errors
                  form.trigger().then(isValid => {
                    console.log('🔍 Manual validation result:', isValid);
                    if (!isValid) {
                      console.log('❌ Validation errors after trigger:', form.formState.errors);
                    }
                  });
                }}>
                    {mode === 'create' ? t('common.create') : t('common.update')}
                  </Button>
                </div>
              </DialogFooter>
              {!isOnline && <p className="text-xs text-muted-foreground text-right mt-2">
                  {t('schedule.editingRequiresConnection')}
                </p>}
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

      {/* Edit Scope Selection Dialog */}
      <AlertDialog open={editScopeDialogOpen} onOpenChange={setEditScopeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Lembretes Relacionados</AlertDialogTitle>
            <AlertDialogDescription>
              Este lembrete faz parte de uma série de {relatedReminders.length} parcelas. 
              Como você deseja aplicar as alterações?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 my-4">
            <Button 
              variant="outline" 
              onClick={() => handleEditScopeSelection('current')}
              className="justify-start"
            >
              Apenas esta parcela
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleEditScopeSelection('future')}
              className="justify-start"
            >
              Esta e todas as futuras
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleEditScopeSelection('all')}
              className="justify-start"
            >
              Todas as parcelas
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEditScopeDialogOpen(false);
              setPendingFormValues(null);
            }}>
              {t('common.cancel')}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};
export default LembretesTransactionForm;