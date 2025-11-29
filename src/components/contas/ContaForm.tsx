import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useClientView } from '@/contexts/ClientViewContext';
import { supabase } from '@/integrations/supabase/client';
import { addScheduledTransaction, updateScheduledTransaction, deleteScheduledTransaction, deleteMultipleTransactions } from '@/services/scheduledTransactionService';
import { useDateFormat } from '@/hooks/useDateFormat';
import { formatInTimeZone } from 'date-fns-tz';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScheduledTransaction } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getCategoriesByType, addCategory } from '@/services/categoryService';
import { Category } from '@/types/categories';
import CategoryIcon from '@/components/categories/CategoryIcon';
import ContaAddedByGrid from '@/components/common/ContaAddedByGrid';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import CategoryForm from '@/components/categories/CategoryForm';
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
  conta_id: z.string().min(1, 'Conta é obrigatória'),
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
  const { timezone } = useDateFormat();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [futureTransactions, setFutureTransactions] = useState<any[]>([]);
  const [pastTransactions, setPastTransactions] = useState<any[]>([]);
  const [editOption, setEditOption] = useState<'single' | 'future' | 'past' | 'all'>('single');
  const [deleteOption, setDeleteOption] = useState<'single' | 'future' | 'past' | 'all'>('single');
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

  // Check for related transactions (both past and future) with same codigo-trans
  const checkForRelatedTransactions = async (codigoTrans: string | number, currentId: string, currentDate?: string) => {
    try {
      const codeStr = String(codigoTrans);
      console.log(`🔍 Verificando transações relacionadas por codigo-trans: ${codeStr}, excluindo id: ${currentId}`);

      const { data: user } = await supabase.auth.getUser();
      const targetUserId = selectedUser?.id || user?.user?.id;
      if (!targetUserId || !codeStr) return { past: [], future: [] };

      // 1) Tentativa direta pelo campo codigo-trans
      let { data, error } = await (supabase as any)
        .from('poupeja_transactions')
        .select('id, date, description, reference_code')
        .eq('user_id', targetUserId)
        .eq('formato', 'agenda')
        .eq('codigo-trans', codeStr)
        .neq('id', currentId)
        .order('date', { ascending: true });

      let rows = data || [];

      // 2) Fallback: usar sufixo numérico no reference_code (ex.: B1757096724 -> 1757096724)
      if ((error || rows.length === 0) && codeStr) {
        const { data: likeData } = await (supabase as any)
          .from('poupeja_transactions')
          .select('id, date, description, reference_code')
          .eq('user_id', targetUserId)
          .eq('formato', 'agenda')
          .like('reference_code', `%${codeStr}`)
          .neq('id', currentId)
          .order('date', { ascending: true });
        rows = likeData || [];
      }

      // Separar em passadas e futuras em relação à data da transação
      let past: any[] = [];
      let future: any[] = [];
      
      if (currentDate) {
        const baseDate = new Date(currentDate);
        past = rows.filter((r: any) => r?.date && new Date(r.date) < baseDate);
        future = rows.filter((r: any) => r?.date && new Date(r.date) > baseDate);
      }

      console.log(`✅ Encontradas ${past.length} transações passadas e ${future.length} transações futuras`);
      return { past, future };
    } catch (error) {
      console.error('❌ Erro em checkForRelatedTransactions:', error);
      return { past: [], future: [] };
    }
  };

  // Default form values for contas (income or expense) - simplified approach
  const getDefaultValues = (): ContaFormValues => {
    const now = new Date();
    if (mode === 'edit' && initialData) {
      const hasInstallments = initialData.parcela && parseInt(initialData.parcela) > 1;
      return {
        type: (initialData.type === 'income' || initialData.type === 'expense') ? initialData.type : 'expense',
        description: initialData.description || '',
        amount: Math.abs(initialData.amount || 100),
        installments: hasInstallments ? parseInt(initialData.parcela || '1') : undefined,
        category: initialData.category_id || '',
        scheduledDate: initialData.scheduledDate ? formatInTimeZone(new Date(initialData.scheduledDate), timezone, "yyyy-MM-dd'T'HH:mm") : formatInTimeZone(now, timezone, "yyyy-MM-dd'T'HH:mm"),
        recurrence: hasInstallments ? 'installments' : initialData.recurrence as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' || 'once',
        goalId: initialData.goalId || null,
        // Campos obrigatórios
        conta_id: initialData.conta_id || '',
        name: initialData.creatorName || '',
        phone: initialData.phone || ''
      };
    }
    return {
      type: defaultType,
      description: '',
      amount: '' as any,
      installments: undefined,
      category: '',
      scheduledDate: formatInTimeZone(now, timezone, "yyyy-MM-dd'T'HH:mm"),
      recurrence: 'once',
      goalId: null,
      // Campos obrigatórios
      conta_id: '',
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

        // Para "Receita", sempre usar categoria "Outros"
        if (transactionType === 'income') {
          const outrosCategory = categoryData.find(c => c.name.toLowerCase() === 'outros');
          if (outrosCategory) {
            form.setValue('category', outrosCategory.id);
          }
        } else {
          // Set default category if none selected and categories are available
          if (categoryData.length > 0) {
            const currentCategory = form.getValues('category');
            const categoryExists = categoryData.some(c => c.id === currentCategory || c.name === currentCategory);
            if (!categoryExists) {
              console.log("Setting default category to:", categoryData[0].id);
              form.setValue('category', categoryData[0].id);
            }
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
      
      // Garantir que o conta_id do banco seja carregado quando ausente
      if (!(initialData as any).conta_id && initialData.id) {
        (async () => {
          try {
            const { data } = await (supabase as any)
              .from('poupeja_transactions')
              .select('conta_id')
              .eq('id', initialData.id)
              .maybeSingle();
            if (data?.conta_id) {
              form.setValue('conta_id', data.conta_id, { shouldValidate: true });
            }
          } catch (e) {
            // silencioso
          }
        })();
      }
      
      // Verificar duplicatas quando carregar dados para edição
      const checkDuplicatesOnLoad = async () => {
        const codigoTrans = (initialData as any)?.['codigo-trans'];
        const currentDate = (initialData as any)?.date as string | undefined;
        if (codigoTrans) {
          console.log(`🔍 Verificando duplicatas ao carregar para codigo-trans: ${codigoTrans}`);
          const { past, future } = await checkForRelatedTransactions(codigoTrans, initialData.id, currentDate);
          
          console.log(`📋 Encontradas ${past.length} transações passadas e ${future.length} transações futuras ao carregar`);
          setPastTransactions(past);
          setFutureTransactions(future);
        } else {
          console.log('ℹ️ Transação não possui codigo-trans');
          setPastTransactions([]);
          setFutureTransactions([]);
        }
      };
      
      checkDuplicatesOnLoad();
    }
  }, [initialData?.id, mode]);

  const handleAddCategory = async (categoryData: Omit<Category, 'id'>) => {
    try {
      const categoryType = form.watch('type') === 'income' ? 'income' : 'expense';
      
      const newCategory = await addCategory({
        ...categoryData,
        type: categoryType
      } as Omit<Category, 'id'>);
      
      if (newCategory) {
        toast.success(`Categoria ${categoryData.name} adicionada com sucesso`);
        
        // Reload categories
        const reloadedCategories = await getCategoriesByType(form.watch('type'));
        setCategories(reloadedCategories);
        
        // Select the new category
        form.setValue('category', newCategory.id);
        
        setCategoryFormOpen(false);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Erro ao adicionar categoria');
    }
  };

  // Form submission handler
  const onSubmit = async (values: ContaFormValues) => {
    console.log('🚀 Conta form submitted with values:', values);
    try {
      if (mode === 'edit' && initialData?.id) {
        // Verificar se existe codigo-trans na transação atual
        const codigoTrans = (initialData as any)?.['codigo-trans'];
        
        if (codigoTrans) {
          console.log(`🔍 Verificando duplicatas para codigo-trans: ${codigoTrans}`);
          const currentDate = (initialData as any)?.date as string | undefined;
          const { past, future } = await checkForRelatedTransactions(codigoTrans, initialData.id, currentDate);
          
          if (past.length > 0 || future.length > 0) {
            console.log(`📋 Encontradas ${past.length} transações passadas e ${future.length} transações futuras`);
            setPastTransactions(past);
            setFutureTransactions(future);
            // Não abrir o dialog, usar a escolha inline
            await performUpdate(values, editOption);
            return;
          } else {
            console.log('✅ Nenhuma duplicata encontrada, prosseguindo com edição normal');
          }
        } else {
          console.log('ℹ️ Transação não possui codigo-trans, prosseguindo normalmente');
        }
      }

      // Se chegou aqui, não há duplicatas ou é criação - prosseguir normalmente
      await performUpdate(values, 'single');
    } catch (error) {
      console.error('❌ Error in onSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar transação';
      toast.error(`Erro: ${errorMessage}`);
    }
  };

  // Perform the actual update
  const performUpdate = async (values: ContaFormValues, editOption: 'single' | 'future' | 'past' | 'all') => {
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
        
        let userPhone = '';
        try {
          const {
            data: userData,
            error: phoneError
          } = await supabase.from('poupeja_users').select('phone').eq('id', selectedUser?.id || user?.id).maybeSingle();
          
          if (phoneError) {
            console.warn('⚠️ Erro ao buscar telefone do usuário:', phoneError);
          }
          
          // Add Brazilian country code 55 if not already present
          if (userData?.phone) {
            const rawPhone = userData.phone;
            userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
          }
        } catch (phoneErr) {
          console.warn('⚠️ Exceção ao buscar telefone:', phoneErr);
        }

        // Determine target user id (admin visualizando um cliente)
        const targetUserId = selectedUser?.id || user?.id;
        
        if (!targetUserId) {
          throw new Error('Usuário não identificado. Faça login novamente.');
        }
        
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
          // Campos obrigatórios
          conta_id: values.conta_id,
          creatorName: values.name
        };
        console.log('📋 Creating transaction with data:', transactionData);
        const result = await addScheduledTransaction(transactionData);
        console.log('✅ Create result:', result);
        
        if (!result) {
          throw new Error('Falha ao criar transação - nenhum resultado retornado');
        }
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
        
        let userPhone = '';
        try {
          const {
            data: userData,
            error: phoneError
          } = await supabase.from('poupeja_users').select('phone').eq('id', selectedUser?.id || user?.id).maybeSingle();
          
          if (phoneError) {
            console.warn('⚠️ Erro ao buscar telefone do usuário:', phoneError);
          }
          
          // Add Brazilian country code 55 if not already present
          if (userData?.phone) {
            const rawPhone = userData.phone;
            userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
          }
        } catch (phoneErr) {
          console.warn('⚠️ Exceção ao buscar telefone:', phoneErr);
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
          // Campos obrigatórios
          conta_id: values.conta_id,
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

      // Show appropriate success message
      if (mode === 'create') {
        toast.success('✅ Conta criada com sucesso');
      }

      // Process based on edit option
      if (editOption === 'future' && futureTransactions.length > 0) {
        const codigoTransRaw = (initialData as any)?.['codigo-trans'] || (initialData as any)?.reference_code?.toString()?.replace(/^[A-Za-z]/, '');
        if (codigoTransRaw) {
          await updateFutureTransactions(values, codigoTransRaw);
        } else {
          await updateFutureTransactionsByList(values, futureTransactions as any);
        }
        toast.success(`✅ Transação atual e ${futureTransactions.length} transações futuras atualizadas`);
      } else if (editOption === 'past' && pastTransactions.length > 0) {
        await updatePastTransactions(values, pastTransactions as any);
        toast.success(`✅ Transação atual e ${pastTransactions.length} transações passadas atualizadas`);
      } else if (editOption === 'all' && (pastTransactions.length > 0 || futureTransactions.length > 0)) {
        const allRelated = [...pastTransactions, ...futureTransactions];
        await updateAllTransactions(values, allRelated as any);
        toast.success(`✅ Transação atual e ${allRelated.length} transações relacionadas atualizadas`);
      } else {
        toast.success('✅ Transação atualizada com sucesso');
      }

      // Call onSuccess only after all updates are done
      if (onSuccess) {
        console.log('🔄 Calling onSuccess callback');
        onSuccess();
      }
    } catch (error) {
      console.error('❌ Error in performUpdate:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Error details:', errorMessage);
      toast.error(`Erro ao atualizar transação: ${errorMessage}`);
      throw error; // Re-throw para ser capturado no onSubmit
    }
  };

  // Function to update all future transactions with same codigo-trans
  const updateFutureTransactions = async (values: ContaFormValues, codigoTrans: string) => {
    if (!codigoTrans) {
      console.error('❌ codigo-trans não fornecido para updateFutureTransactions');
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      const targetUserId = selectedUser?.id || user?.user?.id;
      if (!targetUserId) {
        console.error('❌ targetUserId não encontrado');
        return;
      }

      // Calcular a diferença entre a data original e a nova data
      const originalDate = new Date((initialData as any)?.date);
      const newDate = new Date(values.scheduledDate);
      const timeDifference = newDate.getTime() - originalDate.getTime();
      
      console.log(`📅 Data original: ${originalDate.toISOString()}`);
      console.log(`📅 Nova data: ${newDate.toISOString()}`);
      console.log(`⏱️ Diferença de tempo: ${timeDifference}ms (${timeDifference / (1000 * 60 * 60 * 24)} dias)`);

      // Buscar todas as transações futuras com mesmo codigo-trans
      const { data: fetchedFutureTransactions, error: fetchError } = await (supabase as any)
        .from('poupeja_transactions')
        .select('id, date')
        .eq('user_id', targetUserId)
        .eq('formato', 'agenda')
        .eq('codigo-trans', Number(codigoTrans))
        .neq('id', initialData?.id)
        .gt('date', new Date((initialData as any)?.date).toISOString());

      if (fetchError) {
        console.error('❌ Erro ao buscar transações futuras:', fetchError);
        throw fetchError;
      }

      // Usar lista buscada; se vazia, cair para a lista do estado
      const listToUpdate = (fetchedFutureTransactions && fetchedFutureTransactions.length > 0)
        ? fetchedFutureTransactions
        : (futureTransactions || []);

      if (!listToUpdate || listToUpdate.length === 0) {
        console.log('ℹ️ Nenhuma transação futura encontrada para atualizar');
        return;
      }

      console.log(`🔍 Encontradas ${listToUpdate.length} transações futuras para deslocar`);

      // Encontrar a categoria selecionada
      const selectedCategory = categories.find(cat => cat.id === values.category);

      // Atualizar cada transação individualmente com a nova data deslocada
      for (const transaction of listToUpdate) {
        const originalTxDate = new Date(transaction.date);
        const newTxDate = new Date(originalTxDate.getTime() + timeDifference);
        
        console.log(`📆 Transação ${transaction.id}: ${originalTxDate.toISOString()} → ${newTxDate.toISOString()}`);

        const updateData = {
          type: values.type,
          amount: values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount),
          category_id: values.category,
          conta_id: values.conta_id,
          name: values.name,
          phone: values.phone,
          date: newTxDate.toISOString(),
        };

        const { error: updateError } = await (supabase as any)
          .from('poupeja_transactions')
          .update(updateData)
          .eq('id', transaction.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar transação ${transaction.id}:`, updateError);
          throw updateError;
        }
      }

      console.log(`✅ ${listToUpdate.length} transações futuras deslocadas com sucesso`);
    } catch (error) {
      console.error('❌ Erro em updateFutureTransactions:', error);
      toast.error('Erro ao atualizar transações futuras');
      throw error;
    }
  };

  // Atualiza futuras a partir de uma lista já carregada (fallback quando não há codigo-trans)
  const updateFutureTransactionsByList = async (values: ContaFormValues, list: Array<{ id: string; date: string }>) => {
    try {
      // Calcular a diferença entre a data original e a nova data
      const originalDate = new Date((initialData as any)?.date);
      const newDate = new Date(values.scheduledDate);
      const timeDifference = newDate.getTime() - originalDate.getTime();

      for (const tx of list) {
        const originalTxDate = new Date(tx.date);
        const newTxDate = new Date(originalTxDate.getTime() + timeDifference);

        const updateData = {
          type: values.type,
          amount: values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount),
          category_id: values.category,
          conta_id: values.conta_id,
          name: values.name,
          phone: values.phone,
          date: newTxDate.toISOString(),
        };

        const { error: updateError } = await (supabase as any)
          .from('poupeja_transactions')
          .update(updateData)
          .eq('id', tx.id);

        if (updateError) throw updateError;
      }

      console.log(`✅ ${list.length} transações futuras deslocadas (fallback) com sucesso`);
    } catch (error) {
      console.error('❌ Erro em updateFutureTransactionsByList:', error);
      toast.error('Erro ao atualizar transações futuras');
      throw error;
    }
  };

  // Atualiza transações passadas
  const updatePastTransactions = async (values: ContaFormValues, list: Array<{ id: string; date: string }>) => {
    try {
      // Calcular a diferença entre a data original e a nova data
      const originalDate = new Date((initialData as any)?.date);
      const newDate = new Date(values.scheduledDate);
      const timeDifference = newDate.getTime() - originalDate.getTime();

      for (const tx of list) {
        const originalTxDate = new Date(tx.date);
        const newTxDate = new Date(originalTxDate.getTime() + timeDifference);

        const updateData = {
          type: values.type,
          amount: values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount),
          category_id: values.category,
          conta_id: values.conta_id,
          name: values.name,
          phone: values.phone,
          date: newTxDate.toISOString(),
        };

        const { error: updateError } = await (supabase as any)
          .from('poupeja_transactions')
          .update(updateData)
          .eq('id', tx.id);

        if (updateError) throw updateError;
      }

      console.log(`✅ ${list.length} transações passadas atualizadas com sucesso`);
    } catch (error) {
      console.error('❌ Erro em updatePastTransactions:', error);
      toast.error('Erro ao atualizar transações passadas');
      throw error;
    }
  };

  // Atualiza todas as transações (passadas + futuras)
  const updateAllTransactions = async (values: ContaFormValues, list: Array<{ id: string; date: string }>) => {
    try {
      // Calcular a diferença entre a data original e a nova data
      const originalDate = new Date((initialData as any)?.date);
      const newDate = new Date(values.scheduledDate);
      const timeDifference = newDate.getTime() - originalDate.getTime();

      for (const tx of list) {
        const originalTxDate = new Date(tx.date);
        const newTxDate = new Date(originalTxDate.getTime() + timeDifference);

        const updateData = {
          type: values.type,
          amount: values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount),
          category_id: values.category,
          conta_id: values.conta_id,
          name: values.name,
          phone: values.phone,
          date: newTxDate.toISOString(),
        };

        const { error: updateError } = await (supabase as any)
          .from('poupeja_transactions')
          .update(updateData)
          .eq('id', tx.id);

        if (updateError) throw updateError;
      }

      console.log(`✅ ${list.length} transações (passadas + futuras) atualizadas com sucesso`);
    } catch (error) {
      console.error('❌ Erro em updateAllTransactions:', error);
      toast.error('Erro ao atualizar todas as transações');
      throw error;
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!initialData) return;
    
    try {
      let idsToDelete: string[] = [initialData.id];
      
      if (deleteOption === 'future') {
        idsToDelete = [initialData.id, ...futureTransactions.map(t => t.id)];
      } else if (deleteOption === 'past') {
        idsToDelete = [initialData.id, ...pastTransactions.map(t => t.id)];
      } else if (deleteOption === 'all') {
        idsToDelete = [initialData.id, ...pastTransactions.map(t => t.id), ...futureTransactions.map(t => t.id)];
      }
      
      let success: boolean;
      if (idsToDelete.length === 1) {
        success = await deleteScheduledTransaction(initialData.id);
      } else {
        success = await deleteMultipleTransactions(idsToDelete);
      }
      
      if (success) {
        toast.success(idsToDelete.length === 1 
          ? 'Transação excluída com sucesso' 
          : `${idsToDelete.length} transação(ões) excluída(s) com sucesso`
        );
      } else {
        toast.error('Erro ao excluir transação(ões)');
      }
      
      setDeleteDialogOpen(false);
      setDeleteOption('single'); // Reset option
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir transação(ões)');
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
                  <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value ? Math.abs(parseFloat(e.target.value)) : '')} placeholder="0,00" />
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
            
            <FormField control={form.control} name="scheduledDate" render={({
            field
          }) => <FormItem>
                  <FormLabel>{t('schedule.scheduledFor')}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
          </div>

          {/* Category Field - only show for expense */}
          {form.watch('type') === 'expense' && (
            <FormField control={form.control} name="category" render={({
            field
          }) => <FormItem>
                  <FormLabel>{t('common.category')}</FormLabel>
                  <Select 
                    open={selectOpen}
                    onOpenChange={setSelectOpen}
                    onValueChange={field.onChange} 
                    value={field.value} 
                    disabled={loadingCategories}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingCategories ? t('common.loading') : "Qual Categoria"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent 
                      position="popper" 
                      className="w-full max-h-[200px] overflow-y-auto z-[9999]" 
                      sideOffset={5}
                      align="start"
                      avoidCollisions={true}
                    >
                      {categories.map(category => <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <CategoryIcon icon={category.icon} color={category.color} size={16} />
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>)}
                      <Separator className="my-1" />
                      <div className="p-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full justify-start text-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectOpen(false);
                            setCategoryFormOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar categoria
                        </Button>
                      </div>
                    </SelectContent>
                  </Select>
                  
                </FormItem>} />
          )}

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

          {/* Opções de edição - só aparece quando há duplicatas */}
          {(futureTransactions.length > 0 || pastTransactions.length > 0) && (
            <div className="bg-muted/30 p-4 rounded-lg border">
              <FormLabel className="text-sm font-medium mb-3 block">
                Transações Relacionadas Encontradas
              </FormLabel>
              <p className="text-sm text-muted-foreground mb-3">
                Encontramos {pastTransactions.length + futureTransactions.length} transação(ões) relacionadas 
                ({pastTransactions.length} passadas e {futureTransactions.length} futuras). 
                Como você gostaria de proceder?
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="apenas-essa" 
                      name="editOption" 
                      value="single" 
                      checked={editOption === 'single'}
                      onChange={(e) => setEditOption('single')}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <label htmlFor="apenas-essa" className="text-sm cursor-pointer font-medium">
                      Aplicar edição apenas a esta transação
                    </label>
                  </div>
                </div>
                
                {futureTransactions.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="todas-futuras" 
                        name="editOption" 
                        value="future" 
                        checked={editOption === 'future'}
                        onChange={(e) => setEditOption('future')}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <label htmlFor="todas-futuras" className="text-sm cursor-pointer font-medium">
                        Aplicar a todas as transações futuras ({futureTransactions.length} futuras)
                      </label>
                    </div>
                  </div>
                )}
                
                {pastTransactions.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="todas-passadas" 
                        name="editOption" 
                        value="past" 
                        checked={editOption === 'past'}
                        onChange={(e) => setEditOption('past')}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <label htmlFor="todas-passadas" className="text-sm cursor-pointer font-medium">
                        Aplicar a todas as transações passadas ({pastTransactions.length} passadas)
                      </label>
                    </div>
                  </div>
                )}
                
                {(pastTransactions.length > 0 || futureTransactions.length > 0) && (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="todas" 
                        name="editOption" 
                        value="all" 
                        checked={editOption === 'all'}
                        onChange={(e) => setEditOption('all')}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <label htmlFor="todas" className="text-sm cursor-pointer font-medium">
                        Aplicar a TODAS as transações ({pastTransactions.length + futureTransactions.length + 1} total)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(pastTransactions.length > 0 || futureTransactions.length > 0) 
                ? 'Transações Relacionadas Encontradas' 
                : t('common.confirmDelete')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {(pastTransactions.length > 0 || futureTransactions.length > 0) ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Encontramos {pastTransactions.length + futureTransactions.length} transação(ões) relacionadas 
                      ({pastTransactions.length} passadas e {futureTransactions.length} futuras). 
                      Como você gostaria de proceder?
                    </p>
                    
                    <div className="flex flex-col gap-2">
                      {/* Opção 1: Apenas esta */}
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          id="delete-single" 
                          name="deleteOption" 
                          value="single"
                          checked={deleteOption === 'single'} 
                          onChange={() => setDeleteOption('single')}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <label htmlFor="delete-single" className="text-sm cursor-pointer font-medium">
                          Excluir apenas esta transação
                        </label>
                      </div>
                      
                      {/* Opção 2: Todas as futuras */}
                      {futureTransactions.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="delete-future" 
                            name="deleteOption" 
                            value="future"
                            checked={deleteOption === 'future'} 
                            onChange={() => setDeleteOption('future')}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                          />
                          <label htmlFor="delete-future" className="text-sm cursor-pointer font-medium">
                            Excluir todas as transações futuras ({futureTransactions.length} futuras)
                          </label>
                        </div>
                      )}
                      
                      {/* Opção 3: Todas as passadas */}
                      {pastTransactions.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="delete-past" 
                            name="deleteOption" 
                            value="past"
                            checked={deleteOption === 'past'} 
                            onChange={() => setDeleteOption('past')}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                          />
                          <label htmlFor="delete-past" className="text-sm cursor-pointer font-medium">
                            Excluir todas as transações passadas ({pastTransactions.length} passadas)
                          </label>
                        </div>
                      )}
                      
                      {/* Opção 4: Todas */}
                      {(pastTransactions.length > 0 || futureTransactions.length > 0) && (
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="delete-all" 
                            name="deleteOption" 
                            value="all"
                            checked={deleteOption === 'all'} 
                            onChange={() => setDeleteOption('all')}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                          />
                          <label htmlFor="delete-all" className="text-sm cursor-pointer font-medium">
                            Excluir TODAS as transações ({pastTransactions.length + futureTransactions.length + 1} total)
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <span>{t('schedule.confirmDeleteSchedule')}</span>
                )}
              </div>
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

      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        initialData={null}
        onSave={handleAddCategory}
        categoryType={form.watch('type') === 'income' ? 'income' : 'expense'}
      />
    </>;
};
export default ContaForm;