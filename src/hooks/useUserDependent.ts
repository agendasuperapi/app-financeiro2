import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserDependent = () => {
  const [isDependente, setIsDependente] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDependenteStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsDependente(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('poupeja_users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao verificar status de dependente:', error);
          setIsDependente(false);
        } else {
          // Check if dependente column exists and is true
          setIsDependente((data as any)?.dependente === true);
        }
      } catch (error) {
        console.error('Erro ao verificar status de dependente:', error);
        setIsDependente(false);
      } finally {
        setLoading(false);
      }
    };

    checkDependenteStatus();
  }, []);

  return { isDependente, loading };
};