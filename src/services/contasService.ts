import { supabase } from '@/integrations/supabase/client';

export interface Conta {
  id: string;
  name: string;
  color: string;
  icon: string;
  user_id: string;
  isDefault?: boolean;
}

export const getContas = async (): Promise<Conta[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await (supabase as any)
      .from('tbl_contas')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('name');

    if (error) throw error;
    return (data || []) as Conta[];
  } catch (error) {
    console.error('Error fetching contas:', error);
    throw error;
  }
};

export const addConta = async (conta: Omit<Conta, 'id' | 'user_id'>): Promise<Conta | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await (supabase as any)
      .from('tbl_contas')
      .insert([{ ...conta, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data as Conta;
  } catch (error) {
    console.error('Error adding conta:', error);
    throw error;
  }
};

export const updateConta = async (conta: Conta): Promise<Conta | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('tbl_contas')
      .update({
        name: conta.name,
        color: conta.color,
        icon: conta.icon
      })
      .eq('id', conta.id)
      .select()
      .single();

    if (error) throw error;
    return data as Conta;
  } catch (error) {
    console.error('Error updating conta:', error);
    throw error;
  }
};

export const deleteConta = async (id: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('tbl_contas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting conta:', error);
    return false;
  }
};
