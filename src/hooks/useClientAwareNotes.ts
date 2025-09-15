import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClientView } from '@/contexts/ClientViewContext';
import { NotesService, Note } from '@/services/notesService';

// Safe hook to check if ClientViewContext is available
const useSafeClientView = () => {
  try {
    return useClientView();
  } catch {
    return { selectedUser: null, setSelectedUser: () => {} };
  }
};

/**
 * Hook específico para notas que considera visualização de cliente
 */
export const useClientAwareNotes = () => {
  const { selectedUser } = useSafeClientView();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  
  const isClientView = !!selectedUser;
  const targetUserId = selectedUser?.id;

  // Buscar notas do usuário selecionado
  const fetchClientNotes = async () => {
    if (!targetUserId) return [];
    
    try {
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

  // Carregar notas baseado no contexto
  const loadNotes = async () => {
    setLoading(true);
    try {
      let data: Note[];
      
      if (isClientView && targetUserId) {
        // Visualização de cliente - buscar dados do usuário selecionado
        data = await fetchClientNotes();
      } else {
        // Visualização normal - usar o service padrão
        data = await NotesService.getUserNotes();
      }
      
      setNotes(data);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  // Recarregar quando o usuário selecionado mudar
  useEffect(() => {
    loadNotes();
  }, [targetUserId, isClientView]);

  return {
    notes,
    loading,
    isClientView,
    selectedUser,
    loadNotes,
    
    // Funções de CRUD (apenas funcionam na visualização normal)
    createNote: isClientView ? null : NotesService.createNote,
    updateNote: isClientView ? null : NotesService.updateNote,
    deleteNote: isClientView ? null : NotesService.deleteNote,
    searchNotes: isClientView ? null : NotesService.searchNotes
  };
};