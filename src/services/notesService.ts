import { supabase } from '@/integrations/supabase/client';

export interface Note {
  id: string;
  user_id: string;
  data: string;
  descricao: string;
  notas: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteData {
  data: string;
  descricao: string;
  notas: string;
}

export interface UpdateNoteData {
  data?: string;
  descricao?: string;
  notas?: string;
}

export class NotesService {
  /**
   * Buscar todas as notas do usuário atual
   */
  static async getUserNotes(): Promise<Note[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('financeiro_notas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      throw error;
    }
  }

  /**
   * Criar uma nova nota
   */
  static async createNote(noteData: CreateNoteData): Promise<Note> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await (supabase as any)
        .from('financeiro_notas')
        .insert([
          {
            user_id: user.id,
            ...noteData
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar nota:', error);
      throw error;
    }
  }

  /**
   * Atualizar uma nota existente
   */
  static async updateNote(id: string, noteData: UpdateNoteData): Promise<Note> {
    try {
      const { data, error } = await (supabase as any)
        .from('financeiro_notas')
        .update(noteData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      throw error;
    }
  }

  /**
   * Deletar uma nota
   */
  static async deleteNote(id: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('financeiro_notas')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao deletar nota:', error);
      throw error;
    }
  }

  /**
   * Buscar notas por termo de pesquisa
   */
  static async searchNotes(searchTerm: string): Promise<Note[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('financeiro_notas')
        .select('*')
        .or(`descricao.ilike.%${searchTerm}%,notas.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao pesquisar notas:', error);
      throw error;
    }
  }
}