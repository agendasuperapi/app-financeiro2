import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useDependent = () => {
  const [isDependent, setIsDependent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDependentStatus = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setIsDependent(false);
          return;
        }

        // Check if user has dependent status - using a simple approach for now
        // Note: The user mentioned "tbl_depentes" table but it doesn't exist in current schema
        // This will return false until the proper table is created
        setIsDependent(false);
      } catch (error) {
        console.error('Erro ao verificar status de dependente:', error);
        setIsDependent(false);
      } finally {
        setLoading(false);
      }
    };

    checkDependentStatus();
  }, []);

  return { isDependent, loading };
};