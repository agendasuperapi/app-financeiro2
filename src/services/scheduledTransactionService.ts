
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
      scheduledDate: item.date,
      recurrence: 'once' as const,
      goalId: item.goal_id,
      status: (item.description?.includes('[PAID]') ? 'paid' : 'pending') as 'pending' | 'paid' | 'overdue' | 'upcoming',
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
  transaction: Omit<ScheduledTransaction, "id"> & {
    parcela?: string;
    situacao?: string;
    phone?: string;
    aba?: string;
    recurrence?: string;
  }
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
    
    // Prepare insert data with additional fields
    const insertData: any = {
      id: newId,
      user_id: session.user.id,
      type: transaction.type,
      amount: transaction.amount,
      category_id: categoryId,
      description: transaction.description,
      date: transaction.scheduledDate,
      goal_id: transaction.goalId,
      reference_code: referenceCode
    };

    // Add additional fields if they exist
    if (transaction.parcela) insertData.parcela = transaction.parcela;
    if (transaction.situacao) insertData.situacao = transaction.situacao;
    if (transaction.phone) insertData.phone = transaction.phone;
    if (transaction.aba) insertData.aba = transaction.aba;
    if (transaction.recurrence) insertData.recurrence = transaction.recurrence;
    if (transaction.status) insertData.status = transaction.status;

    console.log('Insert data with all fields:', insertData);
    
    const { data, error } = await supabase
      .from("poupeja_transactions")
      .insert(insertData)
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
      scheduledDate: data.date,
      recurrence: 'once' as const,
      goalId: data.goal_id,
      status: (data.description?.includes('[PAID]') ? 'paid' : 'pending') as 'pending' | 'paid' | 'overdue' | 'upcoming',
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
  transaction: ScheduledTransaction & {
    parcela?: string;
    situacao?: string;
    phone?: string;
    aba?: string;
    recurrence?: string;
  }
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

    // Prepare update data with additional fields
    const updateData: any = {
      type: transaction.type,
      amount: transaction.amount,
      category_id: categoryId,
      description: transaction.description,
      date: transaction.scheduledDate,
      goal_id: transaction.goalId
    };

    // Add additional fields if they exist
    if (transaction.parcela) updateData.parcela = transaction.parcela;
    if (transaction.situacao) updateData.situacao = transaction.situacao;
    if (transaction.phone) updateData.phone = transaction.phone;
    if (transaction.aba) updateData.aba = transaction.aba;
    if (transaction.recurrence) updateData.recurrence = transaction.recurrence;
    if (transaction.status) updateData.status = transaction.status;

    console.log('Update data with all fields:', updateData);

    const { data, error } = await supabase
      .from("poupeja_transactions")
      .update(updateData)
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
      scheduledDate: data.date,
      recurrence: 'once' as const,
      goalId: data.goal_id,
      status: (data.description?.includes('[PAID]') ? 'paid' : 'pending') as 'pending' | 'paid' | 'overdue' | 'upcoming',
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
    // Get current description to preserve it
    const { data: currentTransaction, error: selectError } = await supabase
      .from("poupeja_transactions")
      .select("description")
      .eq("id", transactionId)
      .single();

    if (selectError) throw selectError;

    // Add [PAID] marker to description to mark as paid
    const currentDesc = currentTransaction.description || "";
    const updatedDescription = currentDesc.includes("[PAID]") 
      ? currentDesc 
      : currentDesc + " [PAID]";

    const { error } = await supabase
      .from("poupeja_transactions")
      .update({
        description: updatedDescription
      })
      .eq("id", transactionId);

    if (error) throw error;

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
