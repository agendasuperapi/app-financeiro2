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
import { getSaldoByAccount } from '@/services/saldoService';
import { getDependentUsers, checkIfUserIsDependent, DependentUser } from '@/services/dependentViewService';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface ContaFormProps {
  initialData?: ScheduledTransaction | null;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultType?: 'expense';
}

// Schema for the conta form (expense only with installments)
const contaFormSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  installments: z.number().min(1, 'Número de parcelas deve ser maior que zero').int('Deve ser um número inteiro').optional(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  scheduledDate: z.string().min(1, 'Data é obrigatória'),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly', 'installments']),
  goalId: z.string().optional().nullable(),
  conta: z.string().min(1, 'Conta é obrigatória'),
  phone: z.string().optional(),
  dependentName: z.string().optional(),
});

type ContaFormValues = z.infer<typeof contaFormSchema>;

const ContaForm: React.FC<ContaFormProps> = ({
  initialData,
  mode,
  onSuccess,
  onCancel,
  defaultType = 'expense',
}) => {
  const { t } = usePreferences();
  const { selectedUser } = useClientView();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  // States para o campo Conta
  const [contas, setContas] = useState<string[]>([]);
  const [openConta, setOpenConta] = useState(false);
  const [filteredContas, setFilteredContas] = useState<string[]>([]);
  // States para o seletor de pessoa
  const [dependentUsers, setDependentUsers] = useState<DependentUser[]>([]);
  const [isDependent, setIsDependent] = useState(false);
  const [checkingDependent, setCheckingDependent] = useState(true);

  // Default form values for contas (expense only) - simplified approach
  const getDefaultValues = (): ContaFormValues => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    
    if (mode === 'edit' && initialData) {
      const hasInstallments = initialData.parcela && parseInt(initialData.parcela) > 1;
      return {
        description: initialData.description || '',
        amount: Math.abs(initialData.amount || 100),
        installments: hasInstallments ? parseInt(initialData.parcela || '1') : undefined,
        category: initialData.category_id || '',
        scheduledDate: initialData.scheduledDate 
          ? new Date(initialData.scheduledDate).toISOString().slice(0, 16)
          : now.toISOString().slice(0, 16),
        recurrence: hasInstallments ? 'installments' : ((initialData.recurrence as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly') || 'once'),
        goalId: initialData.goalId || null,
        conta: initialData.conta || '',
        phone: initialData.phone || '',
        dependentName: initialData.dependent_name || '',
      };
    }
    
    return {
      description: '',
      amount: 100,
      installments: undefined,
      category: '',
      scheduledDate: now.toISOString().slice(0, 16),
      recurrence: 'once',
      goalId: null,
      conta: '',
      phone: '',
      dependentName: '',
    };
  };

  const defaultFormValues = getDefaultValues();

  // Form setup
  const form = useForm<ContaFormValues>({
    resolver: zodResolver(contaFormSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });

  // Load categories, contas and check if user is dependent
  useEffect(() => {
    const loadData = async () => {
      setLoadingCategories(true);
      setCheckingDependent(true);
      
      try {
        // Load categories
        const categoryData = await getCategoriesByType('expense');
        console.log(`Loaded ${categoryData.length} categories for expense:`, categoryData);
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

        // Load contas
        const saldos = await getSaldoByAccount();
        const contasList = saldos.map(s => s.conta);
        setContas(contasList);
        setFilteredContas(contasList);

        // Check if current user is dependent
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isDep = await checkIfUserIsDependent(user.id);
          setIsDependent(isDep);
          
          if (isDep) {
            // Load dependent users for selection
            const users = await getDependentUsers();
            setDependentUsers(users);
          }
        }

      } catch (error) {
        console.error('Error loading data:', error);
        setCategories([]);
        setContas([]);
      } finally {
        setLoadingCategories(false);
        setCheckingDependent(false);
      }
    };

    loadData();
  }, [form]);

  // Reset form when initialData changes (only for edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const newValues = getDefaultValues();
      form.reset(newValues);
    }
  }, [initialData?.id, mode]);

  // Close conta suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenConta(false);
    
    if (openConta) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openConta]);

  const handleContaInputChange = (value: string, onChange: (value: string) => void) => {
    onChange(value);
    
    // Filter suggestions
    const filtered = contas.filter(conta => 
      conta.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredContas(filtered);
    
    // Show suggestions if there's input and matches
    setOpenConta(value.length > 0 && filtered.length > 0);
  };

  const handleDependentChange = (selectedName: string) => {
    const selectedUser = dependentUsers.find(user => user.name === selectedName);
    if (selectedUser) {
      form.setValue('dependentName', selectedUser.name);
      form.setValue('phone', selectedUser.phone);
    }
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
          .eq('id', selectedUser?.id || user?.id)
          .single();
        
        // Add Brazilian country code 55 if not already present
        let userPhone = '';
        if (userData?.phone) {
          const rawPhone = userData.phone;
          userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
        }
        
        // Determine target user id (admin visualizando um cliente)
        const targetUserId = selectedUser?.id || user?.id || undefined;
        
        const transactionData = {
          type: 'expense' as const,
          description: values.description,
          amount: -values.amount,
          installments: values.recurrence === 'installments' ? (values.installments || 1) : 1,
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
          conta: values.conta,
          dependent_name: values.dependentName || '',
        };
        
        console.log('📋 Creating transaction with data:', transactionData);
        const result = await addScheduledTransaction(transactionData);
        if (!result) {
          console.error('❌ Falha ao criar a transação agendada');
          toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar a transação. Tente novamente.', variant: 'destructive' });
          return;
        }
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
          .eq('id', selectedUser?.id || user?.id)
          .single();
        
        // Add Brazilian country code 55 if not already present
        let userPhone = '';
        if (userData?.phone) {
          const rawPhone = userData.phone;
          userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
        }
        
        // Determine target user id (admin visualizando um cliente)
        const targetUserId = selectedUser?.id || user?.id || undefined;
        
        const updateData = {
          type: 'expense' as const,
          description: values.description,
          amount: -values.amount,
          installments: values.recurrence === 'installments' ? (values.installments || 1) : 1,
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
          conta: values.conta,
          dependent_name: values.dependentName || '',
        };
        
        console.log('📋 Updating transaction with ID:', initialData.id);
        console.log('📋 Update data:', updateData);
        const result = await updateScheduledTransaction({ ...updateData, id: initialData.id });
        if (!result) {
          console.error('❌ Falha ao atualizar a transação agendada');
          toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar as alterações. Verifique os campos e tente novamente.', variant: 'destructive' });
          return;
        }
        console.log('✅ Update request sent', result);
      }
      
      console.log('🎉 Form completed successfully');
      
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
      setDeleteDialogOpen(false);
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          
          {/* Description Field - moved to top */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('common.description')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Digite a descrição da transação..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo Conta */}
          <FormField
            control={form.control}
            name="conta"
            render={({ field }) => (
              <FormItem className="flex flex-col relative">
                <FormLabel>{t('transactions.account')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('transactions.accountPlaceholder')}
                    onChange={(e) => handleContaInputChange(e.target.value, field.onChange)}
                    onFocus={() => {
                      if (field.value) {
                        const filtered = contas.filter(conta => 
                          conta.toLowerCase().includes(field.value.toLowerCase())
                        );
                        setFilteredContas(filtered);
                        setOpenConta(filtered.length > 0);
                      } else {
                        setFilteredContas(contas);
                        setOpenConta(contas.length > 0);
                      }
                    }}
                  />
                </FormControl>
                {openConta && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none">
                    <Command>
                      <CommandList>
                        <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                        <CommandGroup>
                          {filteredContas.map((conta) => (
                            <CommandItem
                              key={conta}
                              value={conta}
                              onSelect={(currentValue) => {
                                field.onChange(currentValue);
                                setOpenConta(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === conta ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {conta}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo Selecionar Pessoa - only show if user is dependent */}
          {isDependent && (
            <FormField
              control={form.control}
              name="dependentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selecionar Pessoa</FormLabel>
                  <Select 
                    onValueChange={handleDependentChange}
                    value={field.value}
                    disabled={checkingDependent || dependentUsers.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={checkingDependent ? "Carregando..." : "Selecione uma pessoa"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dependentUsers.map((user) => (
                        <SelectItem key={user.phone} value={user.name}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
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
                    placeholder="0,00"
                  />
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
                    <SelectItem value="installments">Parcelas</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conditional Installments Field - only show when recurrence is 'installments' */}
          {form.watch('recurrence') === 'installments' && (
            <FormField
              control={form.control}
              name="installments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Parcelas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                      placeholder="1"
                      value={field.value || ''}
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
                      <SelectItem key={category.id} value={category.id}>
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

          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4">
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
                onClick={onCancel}
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
          </div>
          {!isOnline && (
            <p className="text-xs text-muted-foreground text-right mt-2">
              {t('schedule.editingRequiresConnection')}
            </p>
          )}
        </form>
      </Form>
      
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