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
}

export interface UserStats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  noSubscriptions: number;
}

export class UserManagementService {
  
  /**
   * Busca todos os usuários com suas assinaturas
   */
  static async getAllUsersWithSubscriptions(): Promise<UserData[]> {
    try {
      // Buscar usuários
      const { data: users, error: usersError } = await supabase
        .from('poupeja_users')
        .select('id, name, phone, created_at, email')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
        throw new Error('Erro ao buscar usuários');
      }

      // Buscar assinaturas
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('poupeja_subscriptions')
        .select('user_id, current_period_end, status');

      if (subscriptionsError) {
        console.error('Erro ao buscar assinaturas:', subscriptionsError);
        // Não lançar erro aqui, pois alguns usuários podem não ter assinaturas
      }

      // Combinar dados
      const combinedData: UserData[] = users?.map(user => {
        const subscription = subscriptions?.find(sub => sub.user_id === user.id);
        return {
          ...user,
          current_period_end: subscription?.current_period_end || undefined,
          status: subscription?.status || 'Sem assinatura'
        };
      }) || [];

      return combinedData;
    } catch (error) {
      console.error('Erro no serviço de usuários:', error);
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

      users.forEach(user => {
        if (!user.current_period_end || user.status === 'Sem assinatura') {
          stats.noSubscriptions++;
        } else {
          const expirationDate = new Date(user.current_period_end);
          if (user.status === 'ativo' && expirationDate >= currentDate) {
            stats.activeSubscriptions++;
          } else {
            stats.expiredSubscriptions++;
          }
        }
      });

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
      case 'ativo':
        return 'text-green-600 bg-green-100';
      case 'inativo':
        return 'text-red-600 bg-red-100';
      case 'pendente':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelado':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  }
}