import { supabase } from '@/integrations/supabase/client';

interface AccountBalance {
  conta: string;
  total: number;
}

export const getSaldoByAccount = async (): Promise<AccountBalance[]> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Query to get account balances grouped by 'conta_id' with join to tbl_contas
    const { data, error } = await supabase
      .from('poupeja_transactions')
      .select('conta_id, amount, tbl_contas(name)')
      .eq('user_id', user.id)
      .not('conta_id', 'is', null)
      .not('conta_id', 'eq', '');

    if (error) {
      console.error('Erro ao buscar saldos por conta:', error);
      throw error;
    }

    // Group by account and sum amounts
    const accountBalances: { [key: string]: number } = {};
    
    data?.forEach((transaction: any) => {
      const contaName = transaction.tbl_contas?.name;
      const amount = transaction.amount || 0;
      
      if (contaName) {
        accountBalances[contaName] = (accountBalances[contaName] || 0) + amount;
      }
    });

    // Convert to array and sort by total descending
    return Object.entries(accountBalances)
      .map(([conta, total]) => ({ conta, total }))
      .sort((a, b) => b.total - a.total);

  } catch (error) {
    console.error('Erro no getSaldoByAccount:', error);
    throw error;
  }
};