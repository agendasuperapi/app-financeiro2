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

        // Check if user has dependent status in tbl_depentes
        const { data, error } = await (supabase as any)
          .from('tbl_depentes')
          .select('situacao')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao verificar status de dependente:', error);
          setIsDependent(false);
          return;
        }

        setIsDependent(data?.situacao === 'true' || data?.situacao === true);
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