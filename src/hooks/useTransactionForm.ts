
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Transaction } from '@/types';
import { createTransactionSchema, TransactionFormValues } from '@/schemas/transactionSchema';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getCategoriesByType } from '@/services/categoryService';
import { createTransactionForUser } from '@/services/transactionService';

interface UseTransactionFormProps {
  initialData?: Transaction;
  mode: 'create' | 'edit';
  onComplete: () => void;
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
      amount: initialData?.amount ? Math.abs(initialData.amount) : 0,
      conta: initialData?.conta || '',
      category: initialData?.category_id || '',
      description: initialData?.description || '',
      date: initialData?.date 
        ? new Date(initialData.date).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      goalId: initialData?.goalId || undefined,
    },
  });

  // Simple type change handler that doesn't cause infinite loops
  const handleTypeChange = async (type: 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros') => {
    if (type !== selectedType) {
      setSelectedType(type);
      
      // Update category when type changes
      const categories = await getCategoriesByType(type);
      if (categories.length > 0) {
        form.setValue('category', categories[0].id, { shouldValidate: true });
      }
    }
  };

  const onSubmit = async (values: TransactionFormValues) => {
    console.log("Form submitted with values:", values);
    console.log("Form validation state:", form.formState);
    console.log("Target User ID for transaction:", targetUserId);
    
    // Convert "none" value and null back to undefined for goalId
    // Make amount negative for expenses
    const processedValues = {
      ...values,
      amount: values.type === 'expense' ? -Math.abs(values.amount) : values.amount,
      goalId: values.goalId === "none" || values.goalId === null ? undefined : values.goalId
    };
    
    try {
      if (mode === 'create') {
        console.log("Creating transaction...");
        
        // Se temos um targetUserId, precisamos criar a transação diretamente no banco
        if (targetUserId) {
          console.log("Creating transaction for client:", targetUserId);
          await createTransactionForUser({
            type: processedValues.type as 'income' | 'expense',
            amount: processedValues.amount,
            category_id: processedValues.category,
            description: processedValues.description || '',
            date: new Date(processedValues.date).toISOString(),
            goalId: processedValues.goalId,
            user_id: targetUserId,
            conta: processedValues.conta
          });
        } else {
          // Usar método normal do contexto para o usuário logado
          await addTransaction({
            type: processedValues.type,
            amount: processedValues.amount,
            category_id: processedValues.category,
            description: processedValues.description || '',
            date: new Date(processedValues.date).toISOString(),
            goalId: processedValues.goalId,
            category: '',
            conta: processedValues.conta,
          });
        }
        
        console.log("Transaction created successfully, refreshing data...");
      } else if (initialData) {
        console.log("Updating transaction...");
        
        // Para edição, usar método normal (transações só podem ser editadas pelo próprio usuário)
        await updateTransaction(initialData.id, {
          type: processedValues.type,
          amount: processedValues.amount,
          category_id: processedValues.category,
          description: processedValues.description || '',
          date: new Date(processedValues.date).toISOString(),
          goalId: processedValues.goalId,
          conta: processedValues.conta,
        });
        
        console.log("Transaction updated successfully, refreshing data...");
      }

      // AppContext automatically updates state after add/update operations
      // No need to manually reload data here
      console.log("Transaction operation completed successfully");
      onComplete();
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
        amount: Math.abs(initialData.amount),
        conta: initialData.conta || '',
        category: initialData.category_id || '',
        description: initialData.description || '',
        date: new Date(initialData.date).toISOString().split('T')[0],
        goalId: initialData.goalId,
      });
    } else {
      setSelectedType(defaultType);
      form.reset({
        type: defaultType,
        amount: 0,
        conta: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        goalId: undefined,
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
