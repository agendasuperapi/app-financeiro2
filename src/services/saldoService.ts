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

    // Query to get account balances grouped by 'conta'
    const { data, error } = await supabase
      .from('poupeja_transactions')
      .select('conta, amount')
      .eq('user_id', user.id)
      .not('conta', 'is', null)
      .not('conta', 'eq', '');

    if (error) {
      console.error('Erro ao buscar saldos por conta:', error);
      throw error;
    }

    // Group by account and sum amounts
    const accountBalances: { [key: string]: number } = {};
    
    data?.forEach((transaction: any) => {
      const conta = transaction.conta;
      const amount = transaction.amount || 0;
      
      if (conta) {
        accountBalances[conta] = (accountBalances[conta] || 0) + amount;
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