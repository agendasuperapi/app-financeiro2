import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useClientView } from '@/contexts/ClientViewContext';
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
import { getCategoriesByType } from '@/services/categoryService';
import { Category } from '@/types/categories';
import CategoryIcon from '@/components/categories/CategoryIcon';
import ContaAddedByGrid from '@/components/common/ContaAddedByGrid';
import BulkEditDialog from '@/components/contas/BulkEditDialog';
import { toast } from 'sonner';
interface ContaFormProps {
  initialData?: ScheduledTransaction | null;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultType?: 'income' | 'expense';
}

// Schema for the conta form (income or expense with installments)
const contaFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  installments: z.number().min(1, 'Número de parcelas deve ser maior que zero').int('Deve ser um número inteiro').optional(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  scheduledDate: z.string().min(1, 'Data é obrigatória'),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly', 'installments']),
  goalId: z.string().optional().nullable(),
  // Campos obrigatórios do ContaInput e AddedByField
  conta: z.string().min(1, 'Conta é obrigatória'),
  name: z.string().min(1, 'Usuario é obrigatório'),
  phone: z.string().optional()
});
type ContaFormValues = z.infer<typeof contaFormSchema>;
const ContaForm: React.FC<ContaFormProps> = ({
  initialData,
  mode,
  onSuccess,
  onCancel,
  defaultType = 'expense'
}) => {
  const {
    t
  } = usePreferences();
  const {
    selectedUser
  } = useClientView();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [futureTransactions, setFutureTransactions] = useState<any[]>([]);

  // Check for future transactions with same codigo-trans (numeric text)
  const checkForRelatedTransactions = async (codigoTrans: string | number, currentId: string) => {
    try {
      const codeStr = String(codigoTrans);
      console.log(`Checking for related by codigo-trans: ${codeStr}, excluding id: ${currentId}`);

      const { data: user } = await supabase.auth.getUser();
      const targetUserId = selectedUser?.id || user?.user?.id;
      if (!targetUserId || !codeStr) return [];

      const { data, error } = (supabase as any)
        .from('poupeja_transactions')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('formato', 'agenda')
        .eq('codigo-trans', codeStr)
        .neq('id', currentId);

      if (error) {
        console.error('Error checking related transactions:', error);
        return [];
      }

      console.log(`Found ${data?.length || 0} related transactions`);
      return data || [];
    } catch (error) {
      console.error('Error in checkForRelatedTransactions:', error);
      return [];
    }
  };

  // Default form values for contas (income or expense) - simplified approach
  const getDefaultValues = (): ContaFormValues => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    if (mode === 'edit' && initialData) {
      const hasInstallments = initialData.parcela && parseInt(initialData.parcela) > 1;
      return {
        type: (initialData.type === 'income' || initialData.type === 'expense') ? initialData.type : 'expense',
        description: initialData.description || '',
        amount: Math.abs(initialData.amount || 100),
        installments: hasInstallments ? parseInt(initialData.parcela || '1') : undefined,
        category: initialData.category_id || '',
        scheduledDate: initialData.scheduledDate ? new Date(initialData.scheduledDate).toISOString().slice(0, 16) : now.toISOString().slice(0, 16),
        recurrence: hasInstallments ? 'installments' : initialData.recurrence as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' || 'once',
        goalId: initialData.goalId || null,
        // Novos campos obrigatórios - usando campos disponíveis da interface
        conta: initialData.conta || '',
        name: initialData.creatorName || '',
        phone: initialData.phone || ''
      };
    }
    return {
      type: defaultType,
      description: '',
      amount: 100,
      installments: undefined,
      category: '',
      scheduledDate: now.toISOString().slice(0, 16),
      recurrence: 'once',
      goalId: null,
      // Novos campos obrigatórios
      conta: '',
      name: '',
      phone: ''
    };
  };
  const defaultFormValues = getDefaultValues();

  // Form setup
  const form = useForm<ContaFormValues>({
    resolver: zodResolver(contaFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange'
  });

  // Load categories based on selected transaction type
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const transactionType = form.watch('type');
        const categoryData = await getCategoriesByType(transactionType);
        console.log(`Loaded ${categoryData.length} categories for ${transactionType}:`, categoryData);
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
  }, [form.watch('type')]);

  // Reset form when initialData changes (only for edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const newValues = getDefaultValues();
      form.reset(newValues);
    }
  }, [initialData?.id, mode]);

  // Form submission handler
  const onSubmit = async (values: ContaFormValues) => {
    console.log('🚀 Conta form submitted with values:', values);
    try {
      if (mode === 'edit') {
        // Use codigo-trans if available, otherwise derive from reference_code removing any letter prefix
        const codigoTrans = (initialData as any)?.['codigo-trans'] ?? String(initialData?.reference_code ?? '').replace(/^[A-Za-z]+/, '');

        if (codigoTrans) {
          const relatedTransactions = await checkForRelatedTransactions(codigoTrans, initialData.id);
          
          if (Array.isArray(relatedTransactions) && relatedTransactions.length > 0) {
            setFutureTransactions(relatedTransactions);
            setBulkEditDialogOpen(true);
            return; // Wait for user decision
          }
        }
      }

      await performUpdate(values, false);
    } catch (error) {
      console.error('❌ Error in onSubmit:', error);
    }
  };

  // Perform the actual update
  const performUpdate = async (values: ContaFormValues, editAll: boolean) => {
    try {
      if (mode === 'create') {
        console.log('➕ Creating scheduled transaction...');
        // Find the selected category to get both name and id
        const selectedCategory = categories.find(cat => cat.id === values.category);
        console.log('🏷️ Selected category:', selectedCategory);

        // Get current user for phone number
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        const {
          data: userData
        } = await supabase.from('poupeja_users').select('phone').eq('id', selectedUser?.id || user?.id).single();

        // Add Brazilian country code 55 if not already present
        let userPhone = '';
        if (userData?.phone) {
          const rawPhone = userData.phone;
          userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
        }

        // Determine target user id (admin visualizando um cliente)
        const targetUserId = selectedUser?.id || user?.id || undefined;
        const transactionData = {
          type: values.type,
          description: values.description,
          amount: values.type === 'expense' ? -values.amount : values.amount,
          installments: values.recurrence === 'installments' ? values.installments || 1 : 1,
          category: selectedCategory?.name || 'Outros',
          category_id: values.category,
          scheduledDate: new Date(values.scheduledDate).toISOString(),
          recurrence: values.recurrence,
          goalId: values.goalId,
          reference_code: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
          situacao: 'ativo',
          phone: values.phone || userPhone,
          parcela: values.recurrence === 'installments' ? (values.installments || 1).toString() : '1',
          user_id: targetUserId,
          formato: 'agenda',
          // Campos obrigatórios do ContaInput e AddedByField
          conta: values.conta,
          creatorName: values.name
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
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        const {
          data: userData
        } = await supabase.from('poupeja_users').select('phone').eq('id', selectedUser?.id || user?.id).single();

        // Add Brazilian country code 55 if not already present
        let userPhone = '';
        if (userData?.phone) {
          const rawPhone = userData.phone;
          userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
        }

        // Determine target user id (admin visualizando um cliente)
        const targetUserId = selectedUser?.id || user?.id || undefined;
        const updateData = {
          type: values.type,
          description: values.description,
          amount: values.type === 'expense' ? -values.amount : values.amount,
          installments: values.recurrence === 'installments' ? values.installments || 1 : 1,
          category: selectedCategory?.name || 'Outros',
          category_id: values.category,
          scheduledDate: new Date(values.scheduledDate).toISOString(),
          recurrence: values.recurrence,
          goalId: values.goalId,
          reference_code: initialData?.reference_code || Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
          situacao: 'ativo',
          phone: values.phone || userPhone,
          parcela: values.recurrence === 'installments' ? (values.installments || 1).toString() : '1',
          status: 'pending' as const,
          user_id: targetUserId,
          formato: 'agenda',
          // Campos obrigatórios do ContaInput e AddedByField
          conta: values.conta,
          creatorName: values.name
        };
        console.log('📋 Updating transaction with ID:', initialData.id);
        console.log('📋 Update data:', updateData);
        const result = await updateScheduledTransaction({
          ...updateData,
          id: initialData.id
        });
        console.log('✅ Update request sent', result);
      }
      console.log('🎉 Form completed successfully');

      // Call onSuccess callback if provided
      if (onSuccess) {
        console.log('🔄 Calling onSuccess callback');
        onSuccess();
      }

      if (editAll && futureTransactions.length > 0) {
        // Update all future transactions with same codigo-trans
        const codigoTrans = (initialData as any)?.['codigo-trans'] ?? undefined;
        await updateFutureTransactions(values, codigoTrans);
        toast.success(`Atualizada a transação atual e mais ${futureTransactions.length} transações futuras`);
      } else {
        toast.success('Transação atualizada com sucesso');
      }
    } catch (error) {
      console.error('❌ Error in performUpdate:', error);
      toast.error('Erro ao atualizar transação');
    }
  };

  // Function to update all future transactions by codigo-trans (from this record forward)
  const updateFutureTransactions = async (values: ContaFormValues, codigoTrans?: string | number) => {
    const codeStr = codigoTrans ? String(codigoTrans) : ((initialData as any)?.['codigo-trans'] ? String((initialData as any)['codigo-trans']) : undefined);
    if (!codeStr) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      const targetUserId = selectedUser?.id || user?.user?.id;
      if (!targetUserId) return;

      const updateData: any = {
        type: values.type,
        amount: values.type === 'expense' ? -values.amount : values.amount,
        category_id: values.category,
        description: values.description,
        conta: values.conta,
        name: values.name,
        phone: values.phone
      };

      const cutoff = (initialData as any)?.date || initialData?.scheduledDate || new Date().toISOString();

      const { error } = (supabase as any)
        .from('poupeja_transactions')
        .update(updateData)
        .eq('user_id', targetUserId)
        .eq('formato', 'agenda')
        .eq('codigo-trans', codeStr)
        .neq('id', initialData?.id)
        .gte('date', cutoff);

      if (error) {
        console.error('Error updating future transactions:', error);
        throw error;
      }

      console.log('Successfully updated future transactions');
    } catch (error) {
      console.error('Error in updateFutureTransactions:', error);
      throw error;
    }
  };

  const handleBulkEditConfirm = (editAll: boolean) => {
    setBulkEditDialogOpen(false);
    const values = form.getValues();
    performUpdate(values, editAll);
  };

  // Delete handler
  const handleDelete = async () => {
    if (initialData) {
      await deleteScheduledTransaction(initialData.id);
      setDeleteDialogOpen(false);
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    }
  };
  return <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Transaction Type Field */}
          <FormField control={form.control} name="type" render={({
            field
          }) => <FormItem>
                <FormLabel>Tipo de Transação</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'income' ? 'default' : 'outline'}
                      onClick={() => field.onChange('income')}
                      className={`${field.value === 'income' 
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                        : 'border-green-600 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      Receita
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'expense' ? 'default' : 'outline'}
                      onClick={() => field.onChange('expense')}
                      className={`${field.value === 'expense'
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                        : 'border-red-600 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      Despesa
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>} />
          
          {/* Description Field - moved to top */}
          <FormField control={form.control} name="description" render={({
          field
        }) => <FormItem>
                <FormLabel>{t('common.description')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Digite a descrição da transação..." />
                </FormControl>
                <FormMessage />
              </FormItem>} />
          
          {/* Amount Field */}
          <FormField control={form.control} name="amount" render={({
          field
        }) => <FormItem>
                <FormLabel>{t('common.amount')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0.01" {...field} onChange={e => field.onChange(Math.abs(parseFloat(e.target.value) || 0))} placeholder="0,00" />
                </FormControl>
                <FormMessage />
              </FormItem>} />

          <ContaAddedByGrid form={form} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <SelectItem value="installments">Parcelas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>} />
            
            <FormField control={form.control} name="category" render={({
            field
          }) => <FormItem>
                  <FormLabel>{t('common.category')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingCategories}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingCategories ? t('common.loading') : "Qual Categoria"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(category => <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <CategoryIcon icon={category.icon} color={category.color} size={16} />
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  
                </FormItem>} />
          </div>

          {/* Conditional Installments Field - only show when recurrence is 'installments' */}
          {form.watch('recurrence') === 'installments' && <FormField control={form.control} name="installments" render={({
          field
        }) => <FormItem>
                  <FormLabel>Número de Parcelas</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} placeholder="1" value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />}
          
          <FormField control={form.control} name="scheduledDate" render={({
          field
        }) => <FormItem>
                <FormLabel>{t('schedule.scheduledFor')}</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>} />

          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4">
            {mode === 'edit' && <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={!isOnline} className="w-full sm:w-auto">
                {t('common.delete')}
              </Button>}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" size="sm" onClick={onCancel} className="flex-1 sm:flex-initial min-w-20">
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="default" size="sm" disabled={!isOnline} className="flex-1 sm:flex-initial min-w-20">
                {mode === 'create' ? t('common.create') : t('common.update')}
              </Button>
            </div>
          </div>
          {!isOnline && <p className="text-xs text-muted-foreground text-right mt-2">
              {t('schedule.editingRequiresConnection')}
            </p>}
        </form>
      </Form>
      
      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={bulkEditDialogOpen}
        onOpenChange={setBulkEditDialogOpen}
        futureTransactionsCount={futureTransactions.length}
        onConfirm={handleBulkEditConfirm}
      />
      
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
    </>;
};
export default ContaForm;