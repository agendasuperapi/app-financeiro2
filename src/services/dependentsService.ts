import { supabase } from '@/integrations/supabase/client';

export interface Dependent {
  id: string;
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

  static async addDependent(userId: string, depName: string, phone: string): Promise<Dependent> {
    try {
      const newDependent = {
        id: userId,
        dep_name: depName,
        dep_phone: phone.replace(/\D/g, '') // Remove non-digits
      };

      // Insert the dependent
      const { data, error } = await (supabase as any)
        .from('tbl_depentes')
        .insert([newDependent])
        .select()
        .single();

      if (error) throw error;

      // Update user's dependente status to true
      const { error: updateError } = await (supabase as any)
        .from('poupeja_users')
        .update({ dependente: true })
        .eq('id', userId);

      if (updateError) throw updateError;

      return data as Dependent;
    } catch (error) {
      console.error('Error adding dependent:', error);
      throw error;
    }
  }

  static async updateDependent(original: Dependent, depName: string, phone: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('tbl_depentes')
        .update({
          dep_name: depName,
          dep_phone: phone.replace(/\D/g, '') // Remove non-digits
        })
        .match({
          id: original.id,
          dep_name: original.dep_name,
          dep_phone: original.dep_phone,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating dependent:', error);
      throw error;
    }
  }

  static async deleteDependent(original: Dependent): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('tbl_depentes')
        .delete()
        .match({
          id: original.id,
          dep_name: original.dep_name,
          dep_phone: original.dep_phone,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting dependent:', error);
      throw error;
    }
  }
}