import { supabase } from '@/integrations/supabase/client';

export interface DependentUser {
  name: string;
  phone: string;
}

export const getDependentUsers = async (): Promise<DependentUser[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('view_cadastros_unificados')
      .select('name, phone')
      .order('name');
    
    if (error) throw error;
    
    // Filter out entries with missing name or phone
    return (data || []).filter((user: any) => user.name && user.phone);
  } catch (error) {
    console.error('Error fetching dependent users:', error);
    return [];
  }
};

export const checkIfUserIsDependent = async (userId: string): Promise<boolean> => {
  try {
    const { data: userData, error } = await (supabase as any)
      .from("poupeja_users")
      .select("dependente")
      .eq("id", userId)
      .single();
    
    if (error) throw error;
    
    const dependenteValue = (userData as any)?.dependente;
    // Accept true, "true", 1, "1" as truthy values
    return dependenteValue === true || dependenteValue === "true" || dependenteValue === 1 || dependenteValue === "1";
  } catch (error) {
    console.error('Error checking if user is dependent:', error);
    return false;
  }
};