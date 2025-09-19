
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getNextReferenceCode } from "@/utils/referenceCodeUtils";

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    // Get transactions with creator info
    const { data, error } = await supabase
      .from("poupeja_transactions")
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type),
        creator:poupeja_users(name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Check if current user is a dependent (check if they exist in tbl_depentes)
    const { data: authData } = await supabase.auth.getUser();
    let isDependent = false;
    
    console.log("Current user ID:", authData?.user?.id);
    
    if (authData?.user) {
      try {
        const { data: dependentData } = await (supabase as any)
          .from('tbl_depentes')
          .select('id')
          .eq('user_id', authData.user.id)
          .limit(1);
        
        isDependent = dependentData && dependentData.length > 0;
        console.log("Is dependent:", isDependent, "dependentData:", dependentData);
      } catch (depError) {
        console.log("Error checking dependent status (table might not exist):", depError);
        isDependent = false;
      }
    }

    console.log("Raw transaction data sample:", data?.[0]);

    return data.map((item: any) => {
      const result = {
        id: item.id,
        type: item.type as 'income' | 'expense',
        amount: item.amount,
        category: item.category?.name || "Outros",
        categoryIcon: item.category?.icon || "circle",
        categoryColor: item.category?.color || "#607D8B",
        description: item.description || "",
        date: item.date,
        goalId: item.goal_id || undefined,
        // Show creator name only if current user is a dependent
        creatorName: isDependent ? item.creator?.name : undefined
      };
      
      if (isDependent) {
        console.log("Transaction creator info:", {
          transactionId: item.id,
          creatorName: item.creator?.name,
          fullCreator: item.creator
        });
      }
      
      return result;
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
      conta: (transaction as any).conta || ''
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
  conta: string;
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
        conta: transactionData.conta
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

    return {
      id: data.id,
      type: data.type as 'income' | 'expense',
      amount: data.amount,
      category: data.category?.name || "Outros",
      categoryIcon: data.category?.icon || "circle",
      categoryColor: data.category?.color || "#607D8B",
      description: data.description || "",
      date: data.date,
      goalId: data.goal_id || undefined
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
        conta: transaction.conta,
        reference_code: await getNextReferenceCode() // Generate new reference code for updates
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
      goalId: data.goal_id || undefined
    };
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
