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
          // Se não encontrar o usuário, buscar na view e adicionar
          try {
            const { data: viewData, error: viewError } = await (supabase as any)
              .from('view_cadastros_unificados')
              .select('primeiro_name')
              .eq('id', user.id)
              .single();

            if (!viewError && viewData?.primeiro_name) {
              // Inserir o usuário na tabela tbl_depentes
              await (supabase as any)
                .from('tbl_depentes')
                .insert({
                  id: user.id,
                  nome: viewData.primeiro_name,
                  situacao: 'true'
                });
              
              setIsDependent(true);
            } else {
              setIsDependent(false);
            }
          } catch (insertError) {
            console.error('Erro ao inserir dependente:', insertError);
            setIsDependent(false);
          }
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