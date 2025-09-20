import { supabase } from '@/integrations/supabase/client';

export interface Dependent {
  id: string;
  primeiro_name: string;
  dep_name: string;
  dep_phone: string;
}

export class DependentsService {
  static async getDependents(userId: string): Promise<Dependent[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('tbl_depentes')
        .select('*')
        .eq('id', userId)
        .order('id', { ascending: true });

      if (error) throw error;
      return (data || []) as Dependent[];
    } catch (error) {
      console.error('Error fetching dependents:', error);
      throw error;
    }
  }

  static async addDependent(userId: string, primeiroName: string, depName: string, phone: string): Promise<Dependent> {
    try {
      const newDependent = {
        id: userId,
        primeiro_name: primeiroName,
        dep_name: depName,
        dep_phone: phone.replace(/\D/g, '') // Remove non-digits
      };

      const { data, error } = await (supabase as any)
        .from('tbl_depentes')
        .insert([newDependent])
        .select()
        .single();

      if (error) throw error;
      return data as Dependent;
    } catch (error) {
      console.error('Error adding dependent:', error);
      throw error;
    }
  }

  static async updateDependent(id: string, primeiroName: string, depName: string, phone: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('tbl_depentes')
        .update({
          primeiro_name: primeiroName,
          dep_name: depName,
          dep_phone: phone.replace(/\D/g, '') // Remove non-digits
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating dependent:', error);
      throw error;
    }
  }

  static async deleteDependent(id: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('tbl_depentes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting dependent:', error);
      throw error;
    }
  }
}