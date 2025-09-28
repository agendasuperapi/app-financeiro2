
import { supabase } from "@/integrations/supabase/client";
import { ScheduledTransaction } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getNextReferenceCode } from "@/utils/referenceCodeUtils";

console.log('📋 scheduledTransactionService loaded');


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

export const getScheduledTransactions = async (userId?: string): Promise<ScheduledTransaction[]> => {
  try {
    // Determine target user: explicit userId or current session user
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      targetUserId = session?.user?.id;
    }

    const { data, error } = await supabase
      .from("poupeja_transactions")
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type)
      `)
      .eq('user_id', targetUserId)
      .order("date", { ascending: true });

    if (error) throw error;

    // Filtrar apenas transações com formato "agenda", status pending/paid/recebido e amount ≠ 0
    const filteredData = (data || []).filter((item: any) => 
      item.formato === 'agenda' &&
      (item.status === 'pending' || item.status === 'paid' || item.status === 'recebido') && 
      item.amount !== 0
    );

    console.log("DEBUG Scheduled: Transações carregadas:", filteredData.length);
    console.log("DEBUG Scheduled: Primeira transação:", filteredData[0]);

return filteredData.map((item: any) => {
      const creatorName = item.name ? item.name : undefined;
      
      console.log(`DEBUG Scheduled: Transação ${item.id} - user_id: ${item.user_id}, name: ${item.name}, finalCreator: ${creatorName}`);
      
      // Build typed object first
      const tx: ScheduledTransaction = {
        id: item.id,
        type: item.type as 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros',
        amount: item.amount,
        category: item.category?.name || "Outros",
        category_id: item.category_id,
        categoryIcon: item.category?.icon || "circle",
        categoryColor: item.category?.color || "#607D8B",
        description: item.description || "",
        scheduledDate: item.date,
        recurrence: normalizeRecurrence(item.recurrence) || 'once',
        goalId: item.goal_id,
        status: (item.status as 'pending' | 'paid' | 'overdue' | 'upcoming') || 'pending',
        paidDate: undefined,
        paidAmount: undefined,
        lastExecutionDate: undefined,
        nextExecutionDate: undefined,
        creatorName: creatorName,
        conta: item.conta || undefined,
        phone: item.phone || undefined,
        reference_code: item.reference_code,
      };

      // Attach non-typed fields used elsewhere in the app
      (tx as any)['codigo-trans'] = item['codigo-trans'] ?? item['codigo_trans'] ?? item.codigo_trans ?? null;
      // Provide raw date for compatibility with code that expects `date`
      (tx as any).date = item.date;

      return tx;
    });
  } catch (error) {
    console.error("Error fetching scheduled transactions:", error);
    return [];
  }
};

export const addScheduledTransaction = async (
  transaction: Omit<ScheduledTransaction, "id"> & {
    parcela?: string;
    situacao?: string;
    phone?: string;
    conta?: string;
    recurrence?: string;
    installments?: number;
    user_id?: string;
    creatorName?: string;
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

    // Determine correct user id (client view or current user)
    const targetUserId = transaction.user_id || session.user.id;
    
    // Check if we need to use admin function for different user_id
    const needsAdminFunction = false; // Always insert directly; RLS allows admin to insert for any user

    // Function to create transaction via admin endpoint
    const createViaAdminFunction = async (transactionData: any) => {
      const { data, error } = await supabase.functions.invoke('create-transaction-admin', {
        body: transactionData
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data;
    };

    // Get category ID - if it's already an ID, use it directly, otherwise find by name
    let categoryId = transaction.category_id;
    
    if (!categoryId) {
      // For reminders/lembretes, allow null category_id
      if (transaction.type === 'lembrete' || transaction.type === 'reminder') {
        console.log('🔔 Setting specific category_id for reminder/lembrete');
        categoryId = 'd7ee2418-4782-48c9-8c03-d9699419cad2';
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
    const referenceCode = await getNextReferenceCode();
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
          user_id: targetUserId,
          type: transaction.type,
          amount: transaction.amount,
          category_id: categoryId,
          description: `${transaction.description} (${i + 1}/${numberOfInstallments})`,
          date: installmentDate.toISOString(),
          goal_id: transaction.goalId,
          reference_code: uniqueReferenceCode,
          "codigo-trans": referenceCode, // Store pure reference code without letter
          status: 'pending',
          parcela: `${i + 1}`,
          situacao: transaction.situacao || 'ativo',
          phone: transaction.phone,
          name: transaction.creatorName,
          conta: transaction.conta,
          recurrence: convertRecurrenceToPortuguese('once'), // Convert to Portuguese
          formato: 'agenda' // Transações criadas via agendamento
        };
        
        // Ensure no unwanted properties are added
        delete (installmentData as any).total_parcelas;
        
        installmentsData.push(installmentData);
      }
      
      console.log('🎯 Creating installments data:', installmentsData);
      
      let data, error;
      
      if (needsAdminFunction) {
        console.log('🔐 Using admin function for installments');
        // Insert each installment via admin function
        const results = [];
        for (const installment of installmentsData) {
          const result = await createViaAdminFunction(installment);
          results.push(result);
        }
        data = results;
      } else {
        // Regular insert
        const result = await supabase
          .from("poupeja_transactions")
          .insert(installmentsData)
          .select(`
            *,
            category:poupeja_categories(id, name, icon, color, type)
          `);
        
        if (result.error) {
          console.error('❌ Error inserting installments:', result.error);
          throw result.error;
        }
        data = result.data;
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
        user_id: targetUserId,
        type: transaction.type,
        amount: transaction.amount,
        category_id: categoryId,
        description: transaction.description,
        date: transaction.scheduledDate,
        goal_id: transaction.goalId,
        reference_code: referenceCode,
        "codigo-trans": referenceCode, // Store reference code in codigo-trans column
        status: 'pending',
        formato: 'agenda' // Transações criadas via agendamento
      };

      // Add additional fields if they exist
      if (transaction.parcela) insertData.parcela = transaction.parcela;
      if (transaction.situacao) insertData.situacao = transaction.situacao;
      if (transaction.phone) insertData.phone = transaction.phone;
      if (transaction.creatorName) insertData.name = transaction.creatorName;
      if (transaction.conta) insertData.conta = transaction.conta;
      // Always convert recurrence to Portuguese, with default value
      insertData.recurrence = convertRecurrenceToPortuguese(transaction.recurrence);

      console.log('Insert data with all fields:', insertData);
      
      let data;
      
      if (needsAdminFunction) {
        console.log('🔐 Using admin function for single transaction');
        data = await createViaAdminFunction(insertData);
      } else {
        // Regular insert
        const result = await supabase
          .from("poupeja_transactions")
          .insert(insertData)
          .select(`
            *,
            category:poupeja_categories(id, name, icon, color, type)
          `)
          .single();

        if (result.error) throw result.error;
        data = result.data;
      }

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
    conta?: string;
    recurrence?: string;
    user_id?: string;
    creatorName?: string;
  }
): Promise<ScheduledTransaction | null> => {
  try {
    // Get category ID - if it's already an ID, use it directly, otherwise find by name
    let categoryId = transaction.category_id;
    
    if (!categoryId) {
      // For reminders/lembretes, allow null category_id
      if (transaction.type === 'lembrete' || transaction.type === 'reminder') {
        categoryId = 'd7ee2418-4782-48c9-8c03-d9699419cad2';
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
    if (transaction.creatorName) updateData.name = transaction.creatorName;
    if (transaction.conta) updateData.conta = transaction.conta;
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
  console.log('🔄 markAsPaid called with:', { transactionId, paidAmount });
  try {
    // First, get the original transaction to check recurrence
    const { data: originalTransaction, error: fetchError } = await supabase
      .from("poupeja_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (fetchError) throw fetchError;
    if (!originalTransaction) throw new Error("Transaction not found");

    console.log('📋 Original transaction found:', originalTransaction);

    // Update the original transaction status to "paid"
    const { error: updateError } = await supabase
      .from("poupeja_transactions")
      .update({
        status: "paid"
      } as any)
      .eq("id", transactionId);

    if (updateError) throw updateError;

    return await handleRecurrenceAfterStatusChange(originalTransaction, transactionId);
  } catch (error) {
    console.error("Error marking transaction as paid:", error);
    return false;
  }
};

export const markAsReceived = async (
  transactionId: string,
  receivedAmount?: number
): Promise<boolean> => {
  console.log('🔄 markAsReceived called with:', { transactionId, receivedAmount });
  try {
    // First, get the original transaction to check recurrence
    const { data: originalTransaction, error: fetchError } = await supabase
      .from("poupeja_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (fetchError) throw fetchError;
    if (!originalTransaction) throw new Error("Transaction not found");

    console.log('📋 Original transaction found:', originalTransaction);

    // Update the original transaction status to "recebido"
    const { error: updateError } = await supabase
      .from("poupeja_transactions")
      .update({
        status: "recebido"
      } as any)
      .eq("id", transactionId);

    if (updateError) throw updateError;

    return await handleRecurrenceAfterStatusChange(originalTransaction, transactionId);
  } catch (error) {
    console.error("Error marking transaction as received:", error);
    return false;
  }
};

const handleRecurrenceAfterStatusChange = async (
  originalTransaction: any, 
  transactionId: string
): Promise<boolean> => {
  try {

    // Check if transaction is completed - if so, only change status, don't create new one
    if ((originalTransaction as any).situacao === "concluido") {
      console.log('✅ Transaction marked as completed, no new record needed');
      return true;
    }

    // Check recurrence and create new record if needed
    const recurrence = (originalTransaction as any).recurrence;
    console.log('🔁 Recurrence type:', recurrence);
    
    // For "once" or "uma vez", just mark as paid - no new record needed
    if (recurrence === "once" || recurrence === "uma vez" || !recurrence) {
      console.log('✅ One-time transaction, no new record needed');
      return true;
    }

    // For other recurrence types, create a new record
    const originalDate = new Date(originalTransaction.date);
    let newDate: Date;

    // Calculate new date based on recurrence type
    switch (recurrence.toLowerCase()) {
      case "daily":
      case "diário":
        newDate = new Date(originalDate);
        newDate.setDate(originalDate.getDate() + 1);
        break;
        
      case "weekly":
      case "semanal":
        newDate = new Date(originalDate);
        newDate.setDate(originalDate.getDate() + 7);
        break;
        
      case "monthly":
      case "mensal":
        newDate = new Date(originalDate);
        newDate.setMonth(originalDate.getMonth() + 1);
        // Handle month-end edge cases (e.g., Jan 31 -> Feb 28/29)
        if (newDate.getDate() !== originalDate.getDate()) {
          newDate.setDate(0); // Go to last day of previous month
        }
        break;
        
      case "yearly":
      case "anual":
        newDate = new Date(originalDate);
        newDate.setFullYear(originalDate.getFullYear() + 1);
        // Handle leap year edge case (Feb 29 -> Feb 28)
        if (newDate.getDate() !== originalDate.getDate()) {
          newDate.setDate(0); // Go to last day of previous month (Feb 28)
        }
        break;
        
      default:
        // Unknown recurrence type, just mark as paid without creating new record
        return true;
    }

    // Generate new reference code
    const newReferenceCode = await getNextReferenceCode();

    // Create new transaction record
    const newTransactionData = {
      type: originalTransaction.type,
      amount: originalTransaction.amount,
      category_id: originalTransaction.category_id,
      description: originalTransaction.description,
      date: newDate.toISOString(),
      goal_id: originalTransaction.goal_id,
      recurrence: (originalTransaction as any).recurrence,
      status: "pending",
      situacao: "ativo",
      reference_code: newReferenceCode,
      phone: (originalTransaction as any).phone,
      parcela: (originalTransaction as any).parcela,
      user_id: originalTransaction.user_id,
      formato: 'agenda', // Transações criadas via agendamento
      name: (originalTransaction as any).name, // Copiar campo "name"
      conta: (originalTransaction as any).conta // Copiar campo "conta"
    };

    console.log('📝 Creating new transaction:', newTransactionData);
    const { error: insertError } = await supabase
      .from("poupeja_transactions")
      .insert([newTransactionData]);

    if (insertError) throw insertError;

    console.log('✅ New transaction created successfully');
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
