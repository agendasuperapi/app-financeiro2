import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getNextReferenceCode } from "@/utils/referenceCodeUtils";

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    // Buscar transações e categoria
    const { data, error } = await supabase
      .from("poupeja_transactions")
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const txs = (data as any[]) || [];
    console.log("DEBUG: Transações carregadas:", txs.length);
    console.log("DEBUG: Primeira transação:", txs[0]);

    // Buscar o status "dependente" dos donos das transações (poupeja_users)
    const userIds = Array.from(new Set(txs.map((t: any) => t.user_id).filter(Boolean)));
    let depMap = new Map<string, boolean>();

    console.log("DEBUG: UserIDs únicos encontrados:", userIds);

    if (userIds.length > 0) {
      try {
        console.log("DEBUG: Tentando buscar dados de poupeja_users para userIds:", userIds);
        const { data: usersRows, error: usersError } = await (supabase as any)
          .from('poupeja_users')
          .select('id, dependente')
          .in('id', userIds);

        if (usersError) {
          console.error("DEBUG: ERRO ao buscar poupeja_users:", usersError);
          console.error("DEBUG: Isso pode ser um problema de RLS (Row Level Security)");
        } else {
          console.log("DEBUG: Dados dos usuários (poupeja_users) - SUCCESS:", usersRows);
        }

        (usersRows || []).forEach((u: any) => {
          depMap.set(String(u.id), u.dependente === true);
          console.log(`DEBUG: User ${u.id} dependente: ${u.dependente}`);
        });
      } catch (e) {
        console.error('DEBUG: EXCEPTION ao carregar dependente de poupeja_users:', e);
        console.error('DEBUG: Provavelmente falta permissão RLS para poupeja_users');
      }
    }

    console.log("DEBUG: Mapa de dependentes:", Object.fromEntries(depMap));

    return txs.map((item: any) => {
      const creatorName = item.name ? item.name : undefined;
      
      console.log(`DEBUG: Transação ${item.id} - user_id: ${item.user_id}, name: ${item.name}, finalCreator: ${creatorName}`);
      
      return {
        id: item.id,
        type: item.type as 'income' | 'expense',
        amount: item.amount,
        category: item.category?.name || "Outros",
        categoryIcon: item.category?.icon || "circle",
        categoryColor: item.category?.color || "#607D8B",
        description: item.description || "",
        date: item.date,
        goalId: item.goal_id || undefined,
        // Campos adicionais necessários para edição correta
        category_id: item.category_id || undefined,
        created_at: item.created_at || undefined,
        // Mostrar nome de quem adicionou quando houver nome na transação
        creatorName: creatorName,
        conta_id: item.conta_id || undefined,
        sub_conta: item.sub_conta || undefined,
        formato: item.formato || undefined,
      } as Transaction;
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
};

export const addTransaction = async (transaction: Omit<Transaction, "id">): Promise<Transaction | null> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      throw new Error("You must be logged in to add a transaction");
    }

    const userId = authData.user.id;
    
    // Map the Transaction interface to the createTransactionForUser interface
    return await createTransactionForUser({ 
      type: transaction.type,
      amount: transaction.amount,
      category_id: transaction.category_id || transaction.category,
      description: transaction.description,
      date: transaction.date,
      goalId: transaction.goalId,
      user_id: userId,
      conta_id: transaction.conta_id || '',
      sub_conta: (transaction as any).sub_conta,
      name: (transaction as any).name,
      phone: (transaction as any).phone,
      status: (transaction as any).status, // Pass status field
    });
  } catch (error) {
    console.error("Error adding transaction:", error);
    return null;
  }
};

export const createTransactionForUser = async (transactionData: {
  type: 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros';
  amount: number;
  category_id: string;
  description?: string;
  date: string;
  goalId?: string;
  user_id: string;
  conta_id: string;
  sub_conta?: string;
  name?: string;
  phone?: string;
  status?: string;
}): Promise<Transaction | null> => {
  try {
    const newId = uuidv4();

    // Generate next reference code
    const referenceCode = await getNextReferenceCode();
    console.log("Generated reference code:", referenceCode);

    // Get category ID - if it's already an ID, use it directly, otherwise find by name
    let categoryId = transactionData.category_id;
    
    // Check if the category is actually a category ID by trying to find it
    const { data: categoryCheck } = await supabase
      .from("poupeja_categories")
      .select("id")
      .eq("id", transactionData.category_id)
      .single();
    
    if (!categoryCheck) {
      // If not found by ID, try to find by name
      const { data: categoryByName } = await supabase
        .from("poupeja_categories")
        .select("id")
        .eq("name", transactionData.category_id)
        .eq("type", transactionData.type)
        .single();
      
      if (categoryByName) {
        categoryId = categoryByName.id;
      } else {
        // Fallback to default "Outros" category
        const defaultCategoryId = transactionData.type === 'income' ? 'other-income' : 'other-expense';
        categoryId = defaultCategoryId;
      }
    }

    // Resolve phone from view if not provided
    let phoneValue = transactionData.phone;
    if (!phoneValue && transactionData.name) {
      try {
        const { data: viewRow, error: viewError } = await (supabase as any)
          .from('view_cadastros_unificados')
          .select('phone')
          .eq('id', transactionData.user_id)
          .eq('primeiro_name', transactionData.name)
          .maybeSingle();
        if (!viewError && (viewRow as any)?.phone) {
          phoneValue = (viewRow as any).phone as string;
        } else if (viewError) {
          console.warn('createTransactionForUser: Could not fetch phone from view', viewError);
        }
      } catch (e) {
        console.warn('createTransactionForUser: Exception fetching phone from view', e);
      }
    }

    const { data, error } = await supabase
      .from("poupeja_transactions")
      .insert({
        id: newId,
        type: transactionData.type,
        amount: transactionData.amount,
        category_id: categoryId,
        description: transactionData.description || '',
        date: transactionData.date,
        goal_id: transactionData.goalId,
        user_id: transactionData.user_id,
        reference_code: referenceCode,
        conta_id: transactionData.conta_id,
        sub_conta: transactionData.sub_conta,
        name: transactionData.name,
        phone: phoneValue,
        status: transactionData.status, // Add status field
        formato: 'transacao', // Transações criadas manualmente
      })
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type)
      `)
      .single();

    if (error) throw error;

    // If this is an income transaction linked to a goal, update the goal's current amount
    if (transactionData.type === 'income' && transactionData.goalId) {
      console.log("Updating goal current amount for income transaction");
      const { error: goalError } = await supabase.rpc('update_goal_amount', {
        p_goal_id: transactionData.goalId,
        p_amount_change: transactionData.amount
      });
      
      if (goalError) {
        console.error("Error updating goal amount:", goalError);
      } else {
        console.log("Goal amount updated successfully");
      }
    }

    // Dispatch custom event to update UI immediately
    console.log("🚀 Dispatching transaction-created event");
    window.dispatchEvent(new CustomEvent('transaction-created', { 
      detail: { transaction: data } 
    }));

    return {
      id: data.id,
      type: data.type as 'income' | 'expense',
      amount: data.amount,
      category: data.category?.name || "Outros",
      categoryIcon: data.category?.icon || "circle",
      categoryColor: data.category?.color || "#607D8B",
      description: data.description || "",
      date: data.date,
      goalId: data.goal_id || undefined,
      conta_id: (data as any).conta_id || undefined,
      sub_conta: (data as any).sub_conta || undefined,
      creatorName: (data as any).name || undefined,
      formato: (data as any).formato || undefined,
    };
  } catch (error) {
    console.error("Error creating transaction for user:", error);
    return null;
  }
};

export const updateTransaction = async (transaction: Transaction): Promise<Transaction | null> => {
  try {
    // First, get the old transaction to check if goal_id or amount changed
    const { data: oldTransaction } = await supabase
      .from("poupeja_transactions")
      .select("goal_id, amount, type")
      .eq("id", transaction.id)
      .single();

    // Get category ID - if it's already an ID, use it directly, otherwise find by name
    let categoryId = transaction.category;
    
    // Check if the category is actually a category ID by trying to find it
    const { data: categoryCheck } = await supabase
      .from("poupeja_categories")
      .select("id")
      .eq("id", transaction.category)
      .single();
    
    if (!categoryCheck) {
      // If not found by ID, try to find by name
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
        date: transaction.date,
        goal_id: transaction.goalId,
        conta_id: transaction.conta_id,
        sub_conta: transaction.sub_conta,
        name: (transaction as any).creatorName,
        phone: (transaction as any).phone,
        reference_code: await getNextReferenceCode(), // Generate new reference code for updates
        formato: 'transacao', // Mantém como transacao em atualizações
      })
      .eq("id", transaction.id)
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type)
      `)
      .single();

    if (error) throw error;

    // Update goal amounts if needed
    if (oldTransaction) {
      // If old transaction was income and linked to a goal, subtract the old amount
      if (oldTransaction.type === 'income' && oldTransaction.goal_id) {
        await supabase.rpc('update_goal_amount', {
          p_goal_id: oldTransaction.goal_id,
          p_amount_change: -oldTransaction.amount
        });
      }

      // If new transaction is income and linked to a goal, add the new amount
      if (transaction.type === 'income' && transaction.goalId) {
        await supabase.rpc('update_goal_amount', {
          p_goal_id: transaction.goalId,
          p_amount_change: transaction.amount
        });
      }
    }

    return {
      id: data.id,
      type: data.type as 'income' | 'expense',
      amount: data.amount,
      category: data.category?.name || "Outros",
      categoryIcon: data.category?.icon || "circle",
      categoryColor: data.category?.color || "#607D8B",
      description: data.description || "",
      date: data.date,
      goalId: data.goal_id || undefined,
      conta_id: (data as any).conta_id || undefined,
      sub_conta: (data as any).sub_conta || undefined,
      creatorName: (data as any).name || undefined,
      formato: (data as any).formato || undefined,
    } as Transaction;
  } catch (error) {
    console.error("Error updating transaction:", error);
    return null;
  }
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  try {
    // First, get the transaction to check if it's linked to a goal
    const { data: transactionToDelete } = await supabase
      .from("poupeja_transactions")
      .select("goal_id, amount, type")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("poupeja_transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // If this was an income transaction linked to a goal, subtract the amount from the goal
    if (transactionToDelete && transactionToDelete.type === 'income' && transactionToDelete.goal_id) {
      await supabase.rpc('update_goal_amount', {
        p_goal_id: transactionToDelete.goal_id,
        p_amount_change: -transactionToDelete.amount
      });
    }

    return true;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return false;
  }
};

// Function to check if there are multiple transactions with the same codigo-trans
export const checkRelatedTransactions = async (transactionId: string): Promise<{ hasRelated: boolean, count: number, codigoTrans?: string }> => {
  // Temporarily disable bulk edit functionality to avoid TypeScript recursion issues
  // TODO: Re-implement with proper typing once TypeScript issues are resolved
  return { hasRelated: false, count: 0 };
};

// Function to update all transactions with the same codigo-trans
export const updateRelatedTransactions = async (
  transactionId: string,
  codigoTrans: string,
  updateData: Partial<Transaction>,
  updateAllFuture: boolean = false
): Promise<boolean> => {
  // Temporarily disable bulk update functionality to avoid TypeScript recursion issues
  // TODO: Re-implement with proper typing once TypeScript issues are resolved
  console.log("Bulk update temporarily disabled due to TypeScript issues");
  return false;
};