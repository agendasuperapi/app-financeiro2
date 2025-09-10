
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

// Função para converter valores de inglês para português para salvar no banco
const convertRecurrenceToPortuguese = (recurrence: string | null | undefined): string => {
  if (!recurrence) return 'Uma vez';
  
  const recurrenceMap: { [key: string]: string } = {
    'once': 'Uma vez',
    'daily': 'Diário',
    'weekly': 'Semanal',
    'monthly': 'Mensal',
    'yearly': 'Anual',
    // Valores já em português permanecem iguais
    'Uma vez': 'Uma vez',
    'Diário': 'Diário', 
    'Semanal': 'Semanal',
    'Mensal': 'Mensal',
    'Anual': 'Anual'
  };
  
  return recurrenceMap[recurrence] || 'Uma vez';
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

    // Filtrar apenas transações com status pending ou paid e amount > 0
    const filteredData = data.filter((item: any) => 
      (item.status === 'pending' || item.status === 'paid') && item.amount > 0
    );

    return filteredData.map((item: any) => ({
      id: item.id,
      type: item.type as 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros',
      amount: item.amount,
      category: item.category?.name || "Outros",
      category_id: item.category_id,
      categoryIcon: item.category?.icon || "circle",
      categoryColor: item.category?.color || "#607D8B",
      description: item.description || "",
      scheduledDate: item.date,
      recurrence: 'once' as const,
      goalId: item.goal_id,
      status: (item.status as 'pending' | 'paid' | 'overdue' | 'upcoming') || 'pending',
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
    installments?: number;
  }
): Promise<ScheduledTransaction | null> => {
  try {
    console.log('🚀 Starting addScheduledTransaction with:', transaction);
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('❌ User not authenticated');
      throw new Error("User not authenticated");
    }
    
    console.log('✅ User authenticated:', session.user.id);

    // Get category ID - if it's already an ID, use it directly, otherwise find by name
    let categoryId = transaction.category_id;
    
    if (!categoryId) {
      // For reminders/lembretes, allow null category_id
      if (transaction.type === 'lembrete' || transaction.type === 'reminder') {
        console.log('🔔 Setting null category_id for reminder/lembrete');
        categoryId = null;
      } else {
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
    }
    
    console.log('🎯 Final category_id for transaction:', categoryId);
    
    // Generate next reference code (shared for all installments)
    const referenceCode = await getNextScheduledReferenceCode();
    console.log("Generated reference code:", referenceCode);
    
    // Check if it's installments - create multiple records
    const numberOfInstallments = transaction.installments || 1;
    const isInstallments = transaction.recurrence === 'installments' && numberOfInstallments > 1;
    
    console.log(`🔍 Debug installments detection:`);
    console.log(`- transaction.installments: ${transaction.installments}`);
    console.log(`- numberOfInstallments: ${numberOfInstallments}`);
    console.log(`- transaction.recurrence: ${transaction.recurrence}`);
    console.log(`- isInstallments: ${isInstallments}`);
    
    if (isInstallments) {
      console.log(`🆕 Creating ${numberOfInstallments} installments`);
      
      const installmentsData = [];
      const startDate = new Date(transaction.scheduledDate);
      
      for (let i = 0; i < numberOfInstallments; i++) {
        const installmentDate = new Date(startDate);
        installmentDate.setMonth(installmentDate.getMonth() + i);
        
        // Generate unique reference code for each installment
        const uniqueReferenceCode = `${String.fromCharCode(65 + i)}${referenceCode}`;
        
        const installmentData = {
          id: uuidv4(),
          user_id: session.user.id,
          type: transaction.type,
          amount: transaction.amount,
          category_id: categoryId,
          description: `${transaction.description} (${i + 1}/${numberOfInstallments})`,
          date: installmentDate.toISOString(),
          goal_id: transaction.goalId,
          reference_code: uniqueReferenceCode,
          status: 'pending',
          parcela: `${i + 1}`,
          situacao: transaction.situacao || 'ativo',
          phone: transaction.phone,
          aba: transaction.aba,
          recurrence: convertRecurrenceToPortuguese('once') // Convert to Portuguese
        };
        
        // Ensure no unwanted properties are added
        delete (installmentData as any).total_parcelas;
        
        installmentsData.push(installmentData);
      }
      
      console.log('🎯 Creating installments data:', installmentsData);
      
      const { data, error } = await supabase
        .from("poupeja_transactions")
        .insert(installmentsData)
        .select(`
          *,
          category:poupeja_categories(id, name, icon, color, type)
        `);

      if (error) {
        console.error('❌ Error inserting installments:', error);
        throw error;
      }
      
      console.log('✅ Successfully created installments:', data);
      
      // Return the first installment as the main transaction
      const firstInstallment = data[0];
      return {
        id: firstInstallment.id,
        type: firstInstallment.type as 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros',
        amount: firstInstallment.amount,
        category: firstInstallment.category?.name || "Outros",
        category_id: firstInstallment.category_id,
        categoryIcon: firstInstallment.category?.icon || "circle",
        categoryColor: firstInstallment.category?.color || "#607D8B",
        description: firstInstallment.description || "",
        scheduledDate: firstInstallment.date,
        recurrence: 'once' as const,
        goalId: firstInstallment.goal_id,
        status: 'pending',
        paidDate: undefined,
        paidAmount: undefined,
        lastExecutionDate: undefined,
        nextExecutionDate: undefined,
      };
    } else {
      // Single transaction
      console.log('🔴 Creating single transaction (not installments)');
      const newId = uuidv4();
      
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
        reference_code: referenceCode,
        status: 'pending'
      };

      // Add additional fields if they exist
      if (transaction.parcela) insertData.parcela = transaction.parcela;
      if (transaction.situacao) insertData.situacao = transaction.situacao;
      if (transaction.phone) insertData.phone = transaction.phone;
      if (transaction.aba) insertData.aba = transaction.aba;
      // Always convert recurrence to Portuguese, with default value
      insertData.recurrence = convertRecurrenceToPortuguese(transaction.recurrence);

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
        type: data.type as 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros',
        amount: data.amount,
        category: data.category?.name || "Outros",
        category_id: data.category_id,
        categoryIcon: data.category?.icon || "circle",
        categoryColor: data.category?.color || "#607D8B",
        description: data.description || "",
        scheduledDate: data.date,
        recurrence: 'once' as const,
        goalId: data.goal_id,
        status: 'pending',
        paidDate: undefined,
        paidAmount: undefined,
        lastExecutionDate: undefined,
        nextExecutionDate: undefined,
      };
    }
  } catch (error) {
    console.error("❌ Error in addScheduledTransaction:", error);
    console.error("❌ Transaction data that failed:", transaction);
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
      // For reminders/lembretes, allow null category_id
      if (transaction.type === 'lembrete' || transaction.type === 'reminder') {
        categoryId = null;
      } else {
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
    // Always convert recurrence to Portuguese
    updateData.recurrence = convertRecurrenceToPortuguese(transaction.recurrence);
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
      type: data.type as 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros',
      amount: data.amount,
      category: data.category?.name || "Outros",
      category_id: data.category_id,
      categoryIcon: data.category?.icon || "circle",
      categoryColor: data.category?.color || "#607D8B",
      description: data.description || "",
      scheduledDate: data.date,
      recurrence: 'once' as const,
      goalId: data.goal_id,
      status: ((data as any).status as 'pending' | 'paid' | 'overdue' | 'upcoming') || 'pending',
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
    const { error } = await supabase
      .from("poupeja_transactions")
      .update({
        status: "paid"
      } as any)
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
