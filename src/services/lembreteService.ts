import { supabase } from '@/integrations/supabase/client';

export interface Lembrete {
  id: string;
  user_id: string;
  codigo_trans?: string;
  name?: string;
  amount?: number;
  description: string;
  date: string;
  status?: string;
  situacao?: string;
  reference_code?: string;
  phone?: string;
  recurrence?: string;
  created_at?: string;
}

export const getLembretes = async (userId: string): Promise<Lembrete[]> => {
  const { data, error } = await supabase
    .from('tbl_lembrete' as any)
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching lembretes:', error);
    throw error;
  }

  return (data as any[]) || [];
};

export const createLembrete = async (lembrete: Partial<Lembrete>): Promise<Lembrete> => {
  const { data, error } = await supabase
    .from('tbl_lembrete' as any)
    .insert([lembrete])
    .select()
    .single();

  if (error) {
    console.error('Error creating lembrete:', error);
    throw error;
  }

  return data as any;
};

export const updateLembrete = async (id: string, updates: Partial<Lembrete>): Promise<Lembrete> => {
  const { data, error } = await supabase
    .from('tbl_lembrete' as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating lembrete:', error);
    throw error;
  }

  return data as any;
};

export const deleteLembrete = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tbl_lembrete' as any)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting lembrete:', error);
    throw error;
  }

  return true;
};

export const deleteMultipleLembretes = async (ids: string[]): Promise<boolean> => {
  const { error } = await supabase
    .from('tbl_lembrete' as any)
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting multiple lembretes:', error);
    throw error;
  }

  return true;
};

export const markLembreteAsPaid = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tbl_lembrete' as any)
    .update({ 
      status: 'completed',
      situacao: 'concluido'
    })
    .eq('id', id);

  if (error) {
    console.error('Error marking lembrete as paid:', error);
    throw error;
  }

  return true;
};
