import { supabase } from '@/integrations/supabase/client';

export interface CadastroUnificado {
  id: string;
  primeiro_name: string;
  email: string;
  phone: string;
  created_at: string;
  [key: string]: any; // For additional fields that might exist in the view
}

export const cadastrosService = {
  async getCadastrosUnificados(): Promise<CadastroUnificado[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('view_cadastros_unificados')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar dados de cadastros unificados:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro no serviço de cadastros unificados:', error);
      return [];
    }
  },

  async getCadastroById(id: string): Promise<CadastroUnificado | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('view_cadastros_unificados')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar cadastro por ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro no serviço de cadastro por ID:', error);
      return null;
    }
  }
};