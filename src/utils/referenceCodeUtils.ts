import { supabase } from "@/integrations/supabase/client";

// Function to get next reference code for both transactions and scheduled transactions
export const getNextReferenceCode = async (maxRetries: number = 3): Promise<number> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
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

      // Add some randomization to avoid collisions when multiple requests happen simultaneously
      const randomOffset = Math.floor(Math.random() * 100) + 1;
      return maxCode + randomOffset;
    } catch (error) {
      console.error(`Error in getNextReferenceCode (attempt ${attempt + 1}):`, error);
      
      if (attempt === maxRetries - 1) {
        // Last attempt, return fallback with timestamp to ensure uniqueness
        const timestamp = Date.now();
        const fallbackCode = 10000000 + (timestamp % 1000000);
        return fallbackCode;
      }
      
      // Wait a bit before retrying to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  
  // Fallback (should never reach here)
  return 10000000 + Date.now() % 1000000;
};