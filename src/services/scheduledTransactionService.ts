
import { supabase } from "@/integrations/supabase/client";
import { ScheduledTransaction } from "@/types";
import { v4 as uuidv4 } from "uuid";


// Função para normalizar valores de recorrência
const normalizeRecurrence = (recurrence: string | null | undefined): 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined => {
  if (!recurrence) return 'once';
  
  // Mapeamento de valores em português para inglês
  const recurrenceMap: { [key: string]: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' } = {
    'Uma vez': 'once',
    'Diário': 'daily',
    'Semanal': 'weekly',
    'Mensal': 'monthly',
    'Anual': 'yearly',
    // Valores já em inglês
    'once': 'once',
    'daily': 'daily',
    'weekly': 'weekly',
    'monthly': 'monthly',
    'yearly': 'yearly'
  };
  
  return recurrenceMap[recurrence] || 'once';
};

export const getScheduledTransactions = async (): Promise<ScheduledTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from("poupeja_transactions")
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type)
      `)
      .order("date", { ascending: true });

    if (error) throw error;

    return data.map((item) => ({
      id: item.id,
      type: item.type as 'income' | 'expense' | 'reminder' | 'outros',
      amount: item.amount,
      category: item.category?.name || "Outros",
      category_id: item.category_id,
      categoryIcon: item.category?.icon || "circle",
      categoryColor: item.category?.color || "#607D8B",
      description: item.description || "",
      scheduledDate: item.date, // usando date da tabela poupeja_transactions
      recurrence: 'once' as const, // valor padrão para transações regulares
      goalId: item.goal_id,
      status: 'pending' as const, // valor padrão para status
      paidDate: undefined,
      paidAmount: undefined,
      lastExecutionDate: undefined,
      nextExecutionDate: undefined,
    }));
  } catch (error) {
    console.error("Error fetching scheduled transactions:", error);
    return [];
  }
};

import { getNextReferenceCode } from "@/utils/referenceCodeUtils";

// Function to get next reference code for scheduled transactions
const getNextScheduledReferenceCode = getNextReferenceCode;

export const addScheduledTransaction = async (
  transaction: Omit<ScheduledTransaction, "id">
): Promise<ScheduledTransaction | null> => {
  try {
    const newId = uuidv4();
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("User not authenticated");
    }

    // Get category ID - if it's already an ID, use it directly, otherwise find by name
    let categoryId = transaction.category_id;
    
    if (!categoryId) {
      // Try to find by name if category_id is not provided
      const { data: categoryByName } = await supabase
        .from("poupeja_categories")
        .select("id")
        .eq("name", transaction.category)
        .eq("type", transaction.type)
        .single();
      
      if (categoryByName) {
        categoryId = categoryByName.id;
      } else {
        // Fallback to default "Outros" category
        const defaultCategoryId = transaction.type === 'income' ? 'other-income' : 'other-expense';
        categoryId = defaultCategoryId;
      }
    }
    
    // Generate next reference code
    const referenceCode = await getNextScheduledReferenceCode();
    console.log("Generated reference code:", referenceCode);
    
    const { data, error } = await supabase
      .from("poupeja_transactions")
      .insert({
        id: newId,
        user_id: session.user.id,
        type: transaction.type,
        amount: transaction.amount,
        category_id: categoryId,
        description: transaction.description,
        date: transaction.scheduledDate,
        goal_id: transaction.goalId,
        reference_code: referenceCode
      })
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type)
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      type: data.type as 'income' | 'expense' | 'reminder' | 'outros',
      amount: data.amount,
      category: data.category?.name || "Outros",
      category_id: data.category_id,
      categoryIcon: data.category?.icon || "circle",
      categoryColor: data.category?.color || "#607D8B",
      description: data.description || "",
      scheduledDate: data.date, // usando date da tabela poupeja_transactions
      recurrence: 'once' as const, // valor padrão para transações regulares
      goalId: data.goal_id,
      status: 'pending' as const, // valor padrão para status
      paidDate: undefined,
      paidAmount: undefined,
      lastExecutionDate: undefined,
      nextExecutionDate: undefined,
    };
  } catch (error) {
    console.error("Error adding scheduled transaction:", error);
    return null;
  }
};

export const updateScheduledTransaction = async (
  transaction: ScheduledTransaction
): Promise<ScheduledTransaction | null> => {
  try {
    // Get category ID - if it's already an ID, use it directly, otherwise find by name
    let categoryId = transaction.category_id;
    
    if (!categoryId) {
      // Try to find by name if category_id is not provided
      const { data: categoryByName } = await supabase
        .from("poupeja_categories")
        .select("id")
        .eq("name", transaction.category)
        .eq("type", transaction.type)
        .single();
      
      if (categoryByName) {
        categoryId = categoryByName.id;
      } else {
        // Fallback to default "Outros" category
        const defaultCategoryId = transaction.type === 'income' ? 'other-income' : 'other-expense';
        categoryId = defaultCategoryId;
      }
    }

    const { data, error } = await supabase
      .from("poupeja_transactions")
      .update({
        type: transaction.type,
        amount: transaction.amount,
        category_id: categoryId,
        description: transaction.description,
        date: transaction.scheduledDate,
        goal_id: transaction.goalId
      })
      .eq("id", transaction.id)
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type)
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      type: data.type as 'income' | 'expense' | 'reminder' | 'outros',
      amount: data.amount,
      category: data.category?.name || "Outros",
      category_id: data.category_id,
      categoryIcon: data.category?.icon || "circle",
      categoryColor: data.category?.color || "#607D8B",
      description: data.description || "",
      scheduledDate: data.date, // usando date da tabela poupeja_transactions
      recurrence: 'once' as const, // valor padrão para transações regulares
      goalId: data.goal_id,
      status: 'pending' as const, // valor padrão para status
      paidDate: undefined,
      paidAmount: undefined,
      lastExecutionDate: undefined,
      nextExecutionDate: undefined,
    };
  } catch (error) {
    console.error("Error updating scheduled transaction:", error);
    return null;
  }
};

export const markAsPaid = async (
  transactionId: string,
  paidAmount?: number
): Promise<boolean> => {
  try {
    // Just delete the transaction since it was "paid"
    const { error: updateError } = await supabase
      .from("poupeja_transactions")
      .delete()
      .eq("id", transactionId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error("Error marking transaction as paid:", error);
    return false;
  }
};

export const deleteScheduledTransaction = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("poupeja_transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return false;
  }
};
