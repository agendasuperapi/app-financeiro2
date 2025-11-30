
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Transaction } from '@/types';
import { createTransactionSchema, TransactionFormValues } from '@/schemas/transactionSchema';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getCategoriesByType } from '@/services/categoryService';
import { createTransactionForUser, checkRelatedTransactions } from '@/services/transactionService';
import { supabase } from '@/integrations/supabase/client';

interface UseTransactionFormProps {
  initialData?: Transaction;
  mode: 'create' | 'edit';
  onComplete: (transaction?: Transaction) => void;
  defaultType?: 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros';
  targetUserId?: string; // Para suportar criação de transações para outros usuários (cliente view)
}

export const useTransactionForm = ({ 
  initialData, 
  mode, 
  onComplete, 
  defaultType = 'expense',
  targetUserId
}: UseTransactionFormProps) => {
  const { addTransaction, updateTransaction, getTransactions, getGoals } = useAppContext();
  const { t } = usePreferences();
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'reminder' | 'lembrete' | 'outros'>(
    initialData?.type || defaultType
  );

  const transactionSchema = createTransactionSchema(t);
  
  // Get default category for selected type
  const getDefaultCategory = async () => {
    if (initialData?.category_id) return initialData.category_id;
    const categories = await getCategoriesByType(selectedType);
    return categories.length > 0 ? categories[0].id : '';
  };

  // Initialize form with proper defaults
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: initialData?.type || defaultType,
      amount: initialData?.amount || 0,
      conta_id: initialData?.conta_id || '',
      category: initialData?.category_id || '',
      description: initialData?.description || '',
      date: initialData?.date 
        ? new Date(initialData.date).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      goalId: initialData?.goalId || undefined,
      name: initialData?.creatorName || '',
    },
  });

  // Simple type change handler that doesn't cause infinite loops
  const handleTypeChange = async (type: 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros') => {
    if (type !== selectedType) {
      setSelectedType(type);
      
      // Update category when type changes
      const categories = await getCategoriesByType(type);
      if (categories.length > 0) {
        // Buscar categoria específica baseada no tipo
        let targetCategory;
        if (type === 'income') {
          targetCategory = categories.find(cat => cat.name === 'Receita');
        } else if (type === 'expense') {
          targetCategory = categories.find(cat => cat.name === 'Outros');
        }
        
        // Se não encontrar a categoria específica, usar a primeira disponível
        const categoryId = targetCategory?.id || categories[0].id;
        form.setValue('category', categoryId, { shouldValidate: true });
      }
    }
  };

  const onSubmit = async (values: TransactionFormValues) => {
    console.log("Form submitted with values:", values);
    console.log("Form validation state:", form.formState);
    console.log("Target User ID for transaction:", targetUserId);
    
    // Handle goalId processing more robustly
    let goalIdValue = values.goalId;
    
    // Check if goalId is an object (from Zod processing) and extract the actual value  
    if (goalIdValue && typeof goalIdValue === 'object' && (goalIdValue as any).value) {
      goalIdValue = (goalIdValue as any).value;
    }
    
    // Normalize goalId: convert "none", null, "undefined" to undefined
    if (!goalIdValue || goalIdValue === "none" || goalIdValue === "undefined") {
      goalIdValue = undefined;
    }
    
    // Convert "none" value and null back to undefined for goalId
    // Make amount negative for expenses
    const processedValues = {
      ...values,
      amount: values.type === 'expense' ? -Math.abs(values.amount) : values.amount,
      goalId: goalIdValue
    };
    
    try {
      let createdTransaction: Transaction | null = null;
      
      if (mode === 'create') {
        console.log("Creating transaction...");
        
        // Se temos um targetUserId, precisamos criar a transação diretamente no banco
        if (targetUserId) {
          console.log("Creating transaction for client:", targetUserId);
          createdTransaction = await createTransactionForUser({
            type: processedValues.type as 'income' | 'expense',
            amount: processedValues.amount,
            category_id: processedValues.category,
            description: processedValues.description || '',
            date: new Date(processedValues.date).toISOString(),
            goalId: processedValues.goalId,
            user_id: targetUserId,
            conta_id: processedValues.conta_id,
            name: processedValues.name || undefined,
            status: 'paid', // Sempre marcar como paid
          });
          // Disparar evento para atualizar dados do cliente imediatamente
          try {
            window.dispatchEvent(new CustomEvent('client-transactions-updated', { detail: { userId: targetUserId } }));
            console.log("📣 [EVENT] client-transactions-updated dispatched for user:", targetUserId);
          } catch (e) {
            console.warn("[EVENT] Failed to dispatch client-transactions-updated event", e);
          }
        } else {
          // Usar método normal do contexto para o usuário logado
          createdTransaction = await addTransaction({
            type: processedValues.type,
            amount: processedValues.amount,
            category_id: processedValues.category,
            description: processedValues.description || '',
            date: new Date(processedValues.date).toISOString(),
            goalId: processedValues.goalId,
            category: '',
            conta_id: processedValues.conta_id,
            creatorName: processedValues.name || undefined,
            status: 'paid', // Sempre marcar como paid
            // name will be saved in DB via AppContext addTransaction
          });
        }
        
        console.log("Transaction created successfully, refreshing data...");
      } else if (initialData) {
        console.log("Updating transaction...");
        
        // Check if there are related transactions with the same codigo-trans
        const relatedCheck = await checkRelatedTransactions(initialData.id);
        
        if (relatedCheck.hasRelated) {
          console.log(`Found ${relatedCheck.count} related transactions with same codigo-trans`);
          
          // Show confirmation dialog (this will be handled by the TransactionForm component)
          throw new Error('BULK_EDIT_CONFIRMATION_REQUIRED');
        }
        
        // Para edição normal, usar método normal (transações só podem ser editadas pelo próprio usuário)
        await updateTransaction(initialData.id, {
          type: processedValues.type,
          amount: processedValues.amount,
          category_id: processedValues.category,
          description: processedValues.description || '',
          date: new Date(processedValues.date).toISOString(),
          goalId: processedValues.goalId,
          conta_id: processedValues.conta_id,
          creatorName: processedValues.name || undefined,
          status: 'paid', // Sempre marcar como paid
        });
        
        console.log("Transaction updated successfully, refreshing data...");
      }

      // AppContext automatically updates state after add/update operations
      // No need to manually reload data here
      console.log("Transaction operation completed successfully");
      onComplete(createdTransaction || undefined);
    } catch (error) {
      console.error("Error saving transaction:", error);
      throw error;
    }
  };

  // Set default category when form loads
  useEffect(() => {
    const loadDefaultCategory = async () => {
      if (!form.getValues('category')) {
        const defaultCategory = await getDefaultCategory();
        if (defaultCategory) {
          form.setValue('category', defaultCategory);
        }
      }
    };
    
    loadDefaultCategory();
  }, [selectedType]);

  // Sync form when initialData or defaultType changes
  useEffect(() => {
    if (initialData) {
      setSelectedType(initialData.type);
      form.reset({
        type: initialData.type,
        amount: Math.abs(initialData.amount), // Garantir valor positivo na edição
        conta_id: initialData.conta_id || '',
        category: initialData.category_id || '',
        description: initialData.description || '',
        date: new Date(initialData.date).toISOString().split('T')[0],
        goalId: initialData.goalId,
        name: initialData.creatorName || '',
      });

      // Garantir que o conta_id mais recente seja carregado do banco quando ausente
      if (!initialData.conta_id && initialData.id) {
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
    } else {
      setSelectedType(defaultType);
      form.reset({
        type: defaultType,
        amount: 0,
        conta_id: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        goalId: undefined,
        name: '',
      });
    }
  }, [initialData, defaultType]);

  return {
    form,
    selectedType,
    handleTypeChange,
    onSubmit
  };
};
