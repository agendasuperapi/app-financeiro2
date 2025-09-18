import { supabase } from '@/integrations/supabase/client';

interface AccountBalance {
  conta: string;
  total: number;
}

interface UserSpending {
  name: string;
  phone: string;
  amount: number;
}

interface AccountUserSpending {
  conta: string;
  users: UserSpending[];
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

export const getUserSpendingByAccount = async (): Promise<AccountUserSpending[]> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Query to get transactions with user information
    const { data, error } = await supabase
      .from('poupeja_transactions')
      .select('conta, amount, phone, dependent_name')
      .eq('user_id', user.id)
      .not('conta', 'is', null)
      .not('conta', 'eq', '');

    if (error) {
      console.error('Erro ao buscar gastos por usuário:', error);
      throw error;
    }

    // Get unique phones to fetch user names
    const transactionsWithPhone = (data as any[]).filter(item => item.phone);
    const sanitize = (p: string) => (p || '').toString().replace(/\D/g, '');
    const uniquePhones = Array.from(new Set(transactionsWithPhone.map((t: any) => sanitize(t.phone)).filter(Boolean)));
    
    let usersMap = new Map<string, string>();

    if (uniquePhones.length > 0) {
      try {
        const { data: usersList, error: usersError } = await (supabase as any)
          .from('view_cadastros_unificados')
          .select('name, phone')
          .in('phone', uniquePhones);
          
        if (usersError) throw usersError;
        
        (usersList || []).forEach((u: any) => {
          const key = sanitize(u.phone);
          if (key && u.name) {
            usersMap.set(key, u.name);
          }
        });
      } catch (e) {
        console.error('❌ Erro ao buscar nomes na view:', e);
      }
    }

    // Group by account and user
    const accountUserSpending: { [account: string]: { [user: string]: { phone: string; amount: number } } } = {};
    
    data?.forEach((transaction: any) => {
      const conta = transaction.conta;
      const amount = transaction.amount || 0;
      const phone = transaction.phone;
      const dependentName = transaction.dependent_name;
      
      if (conta && phone) {
        const sanitizedPhone = sanitize(phone);
        const userName = dependentName || usersMap.get(sanitizedPhone) || `Usuário ${sanitizedPhone}`;
        
        if (!accountUserSpending[conta]) {
          accountUserSpending[conta] = {};
        }
        
        if (!accountUserSpending[conta][userName]) {
          accountUserSpending[conta][userName] = { phone: sanitizedPhone, amount: 0 };
        }
        
        accountUserSpending[conta][userName].amount += amount;
      }
    });

    // Convert to array format
    return Object.entries(accountUserSpending).map(([conta, users]) => ({
      conta,
      users: Object.entries(users).map(([name, data]) => ({
        name,
        phone: data.phone,
        amount: data.amount
      })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)) // Sort by absolute amount descending
    }));

  } catch (error) {
    console.error('Erro no getUserSpendingByAccount:', error);
    throw error;
  }
};