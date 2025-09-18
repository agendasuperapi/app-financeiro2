import { supabase } from '@/integrations/supabase/client';

export interface Dependent {
  id?: number;
  user_id_ref: string;
  dep_name: string;
  dep_phone: string;
  dep_numero: number;
}

export class DependentsService {
  static async getDependents(userId: string): Promise<Dependent[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('tbl_depentes')
        .select('*')
        .eq('id', userId)
        .order('dep_numero', { ascending: true });

      if (error) throw error;
      return (data || []) as Dependent[];
    } catch (error) {
      console.error('Error fetching dependents:', error);
      throw error;
    }
  }

  static async addDependent(userId: string, name: string, phone: string): Promise<Dependent> {
    try {
      // Get the next dep_numero by counting existing dependents
      const { data: existingDependents, error: countError } = await (supabase as any)
        .from('tbl_depentes')
        .select('dep_numero')
        .eq('id', userId)
        .order('dep_numero', { ascending: false })
        .limit(1);

      if (countError) throw countError;

      const nextNumber = existingDependents && existingDependents.length > 0 
        ? (existingDependents[0] as any).dep_numero + 1 
        : 1;

      const newDependent = {
        id: userId,
        dep_name: name,
        dep_phone: phone.replace(/\D/g, ''), // Remove non-digits
        dep_numero: nextNumber
      };

      const { data, error } = await (supabase as any)
        .from('tbl_depentes')
        .insert([newDependent])
        .select()
        .single();

      if (error) throw error;

      // Update poupeja_users to mark as dependente = true
      const { error: updateError } = await (supabase as any)
        .from('poupeja_users')
        .update({ dependente: true })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user dependente status:', updateError);
        // Don't throw error, just log it as the main operation succeeded
      }

      return data as Dependent;
    } catch (error) {
      console.error('Error adding dependent:', error);
      throw error;
    }
  }

  static async updateDependent(dependentId: number, name: string, phone: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('tbl_depentes')
        .update({
          dep_name: name,
          dep_phone: phone.replace(/\D/g, '') // Remove non-digits
        })
        .eq('dep_numero', dependentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating dependent:', error);
      throw error;
    }
  }

  static async deleteDependent(dependentId: number): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('tbl_depentes')
        .delete()
        .eq('dep_numero', dependentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting dependent:', error);
      throw error;
    }
  }
}