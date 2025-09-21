import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClientView } from '@/contexts/ClientViewContext';
import { useAppContext } from '@/contexts/AppContext';

// Removed unsafe try/catch around hook usage. The ClientViewProvider wraps the app, so useClientView is always available.


/**
 * Hook que automaticamente busca dados do usuário correto
 * Se estiver na visualização de cliente, busca dados do usuário selecionado
 * Caso contrário, usa dados do contexto normal (usuário logado)
 */
export const useClientAwareData = () => {
  const { selectedUser } = useClientView();
  const appContext = useAppContext();
  const [clientTransactions, setClientTransactions] = useState<any[]>([]);
  const [clientGoals, setClientGoals] = useState<any[]>([]);
  const [clientNotes, setClientNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Determinar qual usuário usar
  const targetUserId = selectedUser?.id || appContext.user?.id;
  const isClientView = !!selectedUser;

  // Buscar transações do usuário selecionado com query otimizada
  const fetchClientTransactions = useCallback(async () => {
    if (!targetUserId) return [];
    
    try {
      const { data, error } = await supabase
        .from('poupeja_transactions')
        .select(`
          *,
          category:poupeja_categories(id, name, icon, color, type)
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch dependent flag for this user
      const { data: userRow } = await (supabase as any)
        .from('poupeja_users')
        .select('id, dependente')
        .eq('id', targetUserId)
        .single();
      const isDep = userRow?.dependente === true;
      
      return data.map((transaction: any) => ({
        ...transaction,
        category: transaction.category?.name || 'Sem categoria',
        categoryIcon: transaction.category?.icon || 'circle',
        categoryColor: transaction.category?.color || '#607D8B',
        creatorName: transaction.name ? transaction.name : undefined,
      }));
    } catch (error) {
      console.error('Erro ao buscar transações do cliente:', error);
      return [];
    }
  }, [targetUserId]);

  // Buscar metas/limites do usuário selecionado  
  const fetchClientGoals = useCallback(async () => {
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
  }, [targetUserId]);

  // Buscar notas do usuário selecionado
  const fetchClientNotes = useCallback(async () => {
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
  }, [targetUserId]);

  // Função para recarregar dados
  const loadClientData = useCallback(async () => {
    if (!isClientView || !targetUserId) return;
    
    setLoading(true);
    try {
      const [transactions, goals, notes] = await Promise.all([
        fetchClientTransactions(),
        fetchClientGoals(),
        fetchClientNotes()
      ]);
      setClientTransactions(transactions);
      setClientGoals(goals);
      setClientNotes(notes);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    } finally {
      setLoading(false);
    }
  }, [isClientView, targetUserId, fetchClientTransactions, fetchClientGoals, fetchClientNotes]);

  // Carregar dados quando o usuário selecionado mudar
  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // Escutar mudanças no AppContext para recarregar dados do cliente
  useEffect(() => {
    if (isClientView && targetUserId) {
      // Recarregar dados quando transações do AppContext mudam
      // Isso garante sincronização quando novas transações são adicionadas
      const timeoutId = setTimeout(() => {
        loadClientData();
      }, 100); // Pequeno delay para evitar múltiplas chamadas

      return () => clearTimeout(timeoutId);
    }
  }, [appContext.transactions.length, isClientView, targetUserId, loadClientData]);

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
    refetchClientData: loadClientData
  };
};