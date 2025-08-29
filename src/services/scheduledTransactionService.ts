
import { supabase } from "@/integrations/supabase/client";
import { ScheduledTransaction } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { convertBrasiliaToUTC } from "@/utils/timezoneUtils";

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
      .from("poupeja_scheduled_transactions")
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type)
      `)
      .order("scheduled_date", { ascending: true });

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
      scheduledDate: item.scheduled_date,
      recurrence: normalizeRecurrence(item.recurrence),
      goalId: item.goal_id,
      status: item.status as 'pending' | 'paid' | 'overdue' | 'upcoming' | undefined,
      paidDate: item.paid_date,
      paidAmount: item.paid_amount,
      lastExecutionDate: item.last_execution_date,
      nextExecutionDate: item.next_execution_date,
    }));
  } catch (error) {
    console.error("Error fetching scheduled transactions:", error);
    return [];
  }
};

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
    
    const { data, error } = await supabase
      .from("poupeja_scheduled_transactions")
      .insert({
        id: newId,
        user_id: session.user.id,
        type: transaction.type,
        amount: transaction.amount,
        category_id: categoryId,
        description: transaction.description,
        scheduled_date: transaction.scheduledDate,
        recurrence: transaction.recurrence,
        goal_id: transaction.goalId,
        status: 'pending',
        next_execution_date: transaction.scheduledDate
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
      scheduledDate: data.scheduled_date,
      recurrence: normalizeRecurrence(data.recurrence),
      goalId: data.goal_id,
      status: data.status as 'pending' | 'paid' | 'overdue' | 'upcoming' | undefined,
      paidDate: data.paid_date,
      paidAmount: data.paid_amount,
      lastExecutionDate: data.last_execution_date,
      nextExecutionDate: data.next_execution_date,
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
      .from("poupeja_scheduled_transactions")
      .update({
        type: transaction.type,
        amount: transaction.amount,
        category_id: categoryId,
        description: transaction.description,
        scheduled_date: transaction.scheduledDate,
        recurrence: transaction.recurrence,
        goal_id: transaction.goalId,
        status: transaction.status,
        paid_date: transaction.paidDate,
        paid_amount: transaction.paidAmount,
        last_execution_date: transaction.lastExecutionDate,
        next_execution_date: transaction.nextExecutionDate,
        updated_at: new Date().toISOString()
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
      scheduledDate: data.scheduled_date,
      recurrence: normalizeRecurrence(data.recurrence),
      goalId: data.goal_id,
      status: data.status as 'pending' | 'paid' | 'overdue' | 'upcoming' | undefined,
      paidDate: data.paid_date,
      paidAmount: data.paid_amount,
      lastExecutionDate: data.last_execution_date,
      nextExecutionDate: data.next_execution_date,
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
    console.log("markAsPaid called with transactionId:", transactionId);
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("User not authenticated");
      throw new Error("User not authenticated");
    }

    console.log("User authenticated:", session.user.id);

    // Get the scheduled transaction
    const { data: scheduledTransaction, error: fetchError } = await supabase
      .from("poupeja_scheduled_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (fetchError) {
      console.error("Error fetching scheduled transaction:", fetchError);
      throw fetchError;
    }

    console.log("Scheduled transaction found:", scheduledTransaction);

    const actualPaidAmount = paidAmount || scheduledTransaction.amount;
    // Converte para UTC mantendo o horário atual de Brasília
    const now = convertBrasiliaToUTC(new Date()).toISOString();

    // Create a real transaction - convert 'outros' and 'reminder' types to 'expense'
    const transactionType = scheduledTransaction.type === 'outros' || scheduledTransaction.type === 'reminder' 
      ? 'expense' 
      : scheduledTransaction.type;

    const { error: transactionError } = await supabase
      .from("poupeja_transactions")
      .insert({
        user_id: session.user.id,
        type: transactionType,
        amount: actualPaidAmount,
        category_id: scheduledTransaction.category_id,
        description: `${scheduledTransaction.description} (Agendado)`,
        date: now,
        goal_id: scheduledTransaction.goal_id
      });

    if (transactionError) throw transactionError;

    // Mark current transaction as paid
    const { error: updateError } = await supabase
      .from("poupeja_scheduled_transactions")
      .update({
        status: 'paid',
        situacao: 'concluido',
        paid_date: now,
        paid_amount: actualPaidAmount,
        last_execution_date: now,
        updated_at: now
      })
      .eq("id", transactionId);

    if (updateError) throw updateError;

    // For recurring transactions, create a new scheduled transaction for the next occurrence
    if (scheduledTransaction.recurrence && scheduledTransaction.recurrence !== 'once') {
      const currentDate = new Date(scheduledTransaction.next_execution_date || scheduledTransaction.scheduled_date);
      
      // Calculate next execution date
      switch (scheduledTransaction.recurrence) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }

      const nextExecutionDate = convertBrasiliaToUTC(currentDate).toISOString();

      // Create new scheduled transaction for next occurrence
      const { error: nextTransactionError } = await supabase
        .from("poupeja_scheduled_transactions")
        .insert({
          user_id: session.user.id,
          type: scheduledTransaction.type,
          amount: scheduledTransaction.amount,
          category_id: scheduledTransaction.category_id,
          description: scheduledTransaction.description,
          scheduled_date: nextExecutionDate,
          recurrence: scheduledTransaction.recurrence,
          goal_id: scheduledTransaction.goal_id,
          status: 'pending',
          next_execution_date: nextExecutionDate
        });

      if (nextTransactionError) throw nextTransactionError;
    }

    return true;
  } catch (error) {
    console.error("Error marking transaction as paid:", error);
    return false;
  }
};

export const deleteScheduledTransaction = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("poupeja_scheduled_transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error deleting scheduled transaction:", error);
    return false;
  }
};
