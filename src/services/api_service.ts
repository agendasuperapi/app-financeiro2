// Serviço de API para buscar e combinar dados das tabelas poupeja_users e poupeja_subscriptions

import { supabase } from '@/integrations/supabase/client';

export interface UserData {
  id: string;
  name: string | null;
  phone: string | null;
  created_at: string | null;
  email: string;
  current_period_end?: string | null;
  status?: string;
  cancel_at_period_end?: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  noSubscriptions: number;
}

export class UserManagementService {
  
/**
 * Busca todos os usuários com suas assinaturas (com permissões configuradas)
 */
static async getAllUsersWithSubscriptions(): Promise<UserData[]> {
  try {
    console.log('🔄 Buscando dados de usuários via função admin...');

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    // Call admin function to get all users (bypasses RLS)
    const { data, error } = await supabase.functions.invoke('admin-get-all-users', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Erro ao buscar usuários via função admin:', error);
      throw new Error(`Erro na função admin: ${error.message}`);
    }

    if (!data?.success) {
      console.error('Função admin retornou erro:', data);
      throw new Error(data?.error || 'Erro desconhecido na função admin');
    }

    const users = data.users || [];
    console.log(`✅ ${users.length} usuários encontrados via função admin`);

    // Convert the data to the expected format
    const combinedData: UserData[] = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      created_at: user.created_at,
      email: user.email,
      current_period_end: user.current_period_end,
      status: user.status,
      cancel_at_period_end: user.cancel_at_period_end
    }));

    console.log(`✅ Dados processados: ${combinedData.length} usuários com assinaturas`);
    return combinedData;
  } catch (error) {
    console.error('❌ Erro no serviço de usuários:', error);
    throw error;
  }
}

  /**
   * Busca estatísticas dos usuários
   */
  static async getUserStats(): Promise<UserStats> {
    try {
      const users = await this.getAllUsersWithSubscriptions();
      
      const stats: UserStats = {
        totalUsers: users.length,
        activeSubscriptions: 0,
        expiredSubscriptions: 0,
        noSubscriptions: 0
      };

      const currentDate = new Date();
      console.log('📊 Calculando estatísticas para', users.length, 'usuários');

      users.forEach(user => {
        console.log(`👤 Usuário ${user.name}: status="${user.status}", vencimento="${user.current_period_end}"`);
        
        // Se não tem assinatura ou status indica sem assinatura
        if (!user.current_period_end || user.status === 'Sem assinatura' || !user.status) {
          stats.noSubscriptions++;
          console.log('   ➜ Sem assinatura');
        } else {
          const expirationDate = new Date(user.current_period_end);
          const isExpired = expirationDate < currentDate;
          
          // Considera ativas: status 'active' ou 'ativo' E não expirada
          if ((user.status === 'active' || user.status === 'ativo') && !isExpired) {
            stats.activeSubscriptions++;
            console.log('   ➜ Assinatura ativa');
          } else {
            stats.expiredSubscriptions++;
            console.log('   ➜ Assinatura expirada/cancelada');
          }
        }
      });

      console.log('📊 Estatísticas finais:', stats);
      return stats;
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      throw error;
    }
  }

  /**
   * Busca usuários com assinaturas vencidas
   */
  static async getExpiredSubscriptions(): Promise<UserData[]> {
    try {
      const users = await this.getAllUsersWithSubscriptions();
      const currentDate = new Date();

      return users.filter(user => {
        if (!user.current_period_end) return false;
        const expirationDate = new Date(user.current_period_end);
        return expirationDate < currentDate;
      });
    } catch (error) {
      console.error('Erro ao buscar assinaturas vencidas:', error);
      throw error;
    }
  }

  /**
   * Busca usuários com assinaturas ativas
   */
  static async getActiveSubscriptions(): Promise<UserData[]> {
    try {
      const users = await this.getAllUsersWithSubscriptions();
      const currentDate = new Date();

      return users.filter(user => {
        if (!user.current_period_end || user.status !== 'ativo') return false;
        const expirationDate = new Date(user.current_period_end);
        return expirationDate >= currentDate;
      });
    } catch (error) {
      console.error('Erro ao buscar assinaturas ativas:', error);
      throw error;
    }
  }

  /**
   * Formata data para exibição
   */
  static formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  }

  /**
   * Retorna a cor do status baseada no valor
   */
  static getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'ativo':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'disabled':
      case 'desativado':
        return 'text-red-700 bg-red-50 border-red-300';
      case 'canceled':
      case 'cancelado':
        return 'text-gray-700 bg-gray-100 border-gray-200';
      case 'past_due':
      case 'unpaid':
      case 'expirado':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'incomplete':
        return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'trialing':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'sem assinatura':
        return 'text-slate-700 bg-slate-100 border-slate-200';
      case 'admin':
        return 'text-purple-700 bg-purple-100 border-purple-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  }

  /**
   * Atualiza a data de vencimento de uma assinatura
   */
  static async updateSubscriptionExpirationDate(userId: string, newExpirationDate: Date): Promise<boolean> {
    try {
      console.log(`Atualizando data de vencimento para usuário ${userId}:`, newExpirationDate.toISOString());

      // Get current user session for admin function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('poupeja_subscriptions')
        .update({ 
          current_period_end: newExpirationDate.toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao atualizar data de vencimento:', error);
        throw error;
      }

      console.log('✅ Data de vencimento atualizada com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar data de vencimento:', error);
      throw error;
    }
  }

  /**
   * Alterna o status de uma assinatura entre active/disabled
   */
  static async toggleUserStatus(userId: string, currentStatus: string): Promise<boolean> {
    try {
      // Determinar o novo status
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      console.log(`Alternando status do usuário ${userId}: ${currentStatus} → ${newStatus}`);

      const { error } = await supabase
        .from('poupeja_subscriptions')
        .update({ 
          status: newStatus
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
      }

      console.log('✅ Status atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw error;
    }
  }
}