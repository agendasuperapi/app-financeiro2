import { supabase } from '@/integrations/supabase/client';

export interface Dependent {
  id?: number;
  user_id: string;
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
        .eq('user_id', userId)
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
        .eq('user_id', userId)
        .order('dep_numero', { ascending: false })
        .limit(1);

      if (countError) throw countError;

      const nextNumber = existingDependents && existingDependents.length > 0 
        ? (existingDependents[0] as any).dep_numero + 1 
        : 1;

      const newDependent = {
        user_id: userId,
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
      return data as Dependent;
    } catch (error) {
      console.error('Error adding dependent:', error);
      throw error;
    }
  }

  static async deleteDependent(id: number): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('tbl_depentes')
        .delete()
        .eq('id', String(id));

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting dependent:', error);
      throw error;
    }
  }
}