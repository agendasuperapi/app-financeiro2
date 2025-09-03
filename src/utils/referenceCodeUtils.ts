import { supabase } from "@/integrations/supabase/client";

// Function to get next reference code for both transactions and scheduled transactions
export const getNextReferenceCode = async (): Promise<number> => {
  try {
    // Get the highest reference code from both scheduled and regular transactions
    const [scheduledResult, transactionResult] = await Promise.all([
      supabase
        .from("poupeja_scheduled_transactions")
        .select("reference_code")
        .order("reference_code", { ascending: false })
        .limit(1),
      supabase
        .from("poupeja_transactions")
        .select("reference_code")
        .order("reference_code", { ascending: false })
        .limit(1)
    ]);

    let maxCode = 10000000; // Default starting number

    // Check scheduled transactions
    if (scheduledResult.data && scheduledResult.data.length > 0) {
      const scheduledMax = (scheduledResult.data[0] as any)?.reference_code;
      if (typeof scheduledMax === 'number') {
        maxCode = Math.max(maxCode, scheduledMax);
      }
    }

    // Check regular transactions
    if (transactionResult.data && transactionResult.data.length > 0) {
      const transactionMax = (transactionResult.data[0] as any)?.reference_code;
      if (typeof transactionMax === 'number') {
        maxCode = Math.max(maxCode, transactionMax);
      }
    }

    return maxCode + 1;
  } catch (error) {
    console.error("Error in getNextReferenceCode:", error);
    return 10000000; // Fallback to starting number
  }
};