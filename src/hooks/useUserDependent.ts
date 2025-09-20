import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';

export const useUserDependent = () => {
  const { user } = useAppContext();
  const [isDependent, setIsDependent] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUserDependent = async () => {
      if (!user) {
        setIsDependent(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData, error } = await (supabase as any)
          .from('poupeja_users')
          .select('dependente')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking user dependent status:', error);
          setIsDependent(false);
        } else {
          setIsDependent(userData?.dependente === true);
        }
      } catch (error) {
        console.error('Exception checking user dependent status:', error);
        setIsDependent(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserDependent();
  }, [user]);

  return { isDependent, isLoading };
};