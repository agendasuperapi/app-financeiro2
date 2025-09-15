import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClientView } from '@/contexts/ClientViewContext';
import { useAppContext } from '@/contexts/AppContext';

// Safe hook to check if ClientViewContext is available
const useSafeClientView = () => {
  try {
    return useClientView();
  } catch {
    return { selectedUser: null, setSelectedUser: () => {} };
  }
};

/**
 * Hook que automaticamente busca dados do usuário correto
 * Se estiver na visualização de cliente, busca dados do usuário selecionado
 * Caso contrário, usa dados do contexto normal (usuário logado)
 */
export const useClientAwareData = () => {
  const { selectedUser } = useSafeClientView();
  const appContext = useAppContext();
  const [clientTransactions, setClientTransactions] = useState<any[]>([]);
  const [clientGoals, setClientGoals] = useState<any[]>([]);
  const [clientNotes, setClientNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Determinar qual usuário usar
  const targetUserId = selectedUser?.id || appContext.user?.id;
  const isClientView = !!selectedUser;

  // Buscar transações do usuário selecionado
  const fetchClientTransactions = async () => {
    if (!targetUserId) return [];
    
    try {
      const { data, error } = await supabase
        .from('poupeja_transactions')
        .select(`
          *,
          categories:category_id(name, icon, color)
        `)
        .eq('user_id', targetUserId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      return data.map(transaction => ({
        ...transaction,
        category: transaction.categories?.name || 'Sem categoria',
        categoryIcon: transaction.categories?.icon || 'circle',
        categoryColor: transaction.categories?.color || '#607D8B'
      }));
    } catch (error) {
      console.error('Erro ao buscar transações do cliente:', error);
      return [];
    }
  };

  // Buscar metas/limites do usuário selecionado  
  const fetchClientGoals = async () => {
    if (!targetUserId) return [];
    
    try {
      const { data, error } = await supabase
        .from('poupeja_goals')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar metas do cliente:', error);
      return [];
    }
  };

  // Buscar notas do usuário selecionado
  const fetchClientNotes = async () => {
    if (!targetUserId) return [];
    
    try {
      // Usar a mesma tabela que o NotesService usa
      const { data, error } = await (supabase as any)
        .from('financeiro_notas')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar notas do cliente:', error);
      return [];
    }
  };

  // Carregar dados quando o usuário selecionado mudar
  useEffect(() => {
    if (isClientView && targetUserId) {
      setLoading(true);
      
      Promise.all([
        fetchClientTransactions(),
        fetchClientGoals(),
        fetchClientNotes()
      ]).then(([transactions, goals, notes]) => {
        setClientTransactions(transactions);
        setClientGoals(goals);
        setClientNotes(notes);
        setLoading(false);
      }).catch(error => {
        console.error('Erro ao carregar dados do cliente:', error);
        setLoading(false);
      });
    }
  }, [targetUserId, isClientView]);

  // Retornar dados apropriados baseado no contexto
  return {
    // Dados
    transactions: isClientView ? clientTransactions : appContext.transactions,
    goals: isClientView ? clientGoals : appContext.goals,
    notes: clientNotes,
    
    // Metadados
    isClientView,
    selectedUser,
    targetUserId,
    loading: isClientView ? loading : false,
    
    // Funções de atualização (delegam para o contexto normal se não for client view)
    deleteTransaction: appContext.deleteTransaction,
    deleteGoal: appContext.deleteGoal,
    getGoals: appContext.getGoals,
    
    // Função para refetch dos dados do cliente
    refetchClientData: async () => {
      if (isClientView && targetUserId) {
        setLoading(true);
        const [transactions, goals, notes] = await Promise.all([
          fetchClientTransactions(),
          fetchClientGoals(), 
          fetchClientNotes()
        ]);
        setClientTransactions(transactions);
        setClientGoals(goals);
        setClientNotes(notes);
        setLoading(false);
      }
    }
  };
};