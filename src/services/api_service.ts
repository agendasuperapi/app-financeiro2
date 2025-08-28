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
 * Busca todos os usuários com suas assinaturas (com permissões configuradas)
 */
static async getAllUsersWithSubscriptions(): Promise<UserData[]> {
  try {
    console.log('Buscando dados das tabelas com permissões configuradas...');

    // Query direta para usuários
    const { data: users, error: usersError } = await supabase
      .from('poupeja_users')
      .select('id, name, phone, created_at, email, updated_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
      
      // Usar dados do usuário atual como fallback
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        console.log('Usando dados do usuário atual como fallback');
        return [
          {
            id: currentUser.id,
            name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Admin',
            phone: currentUser.user_metadata?.phone || null,
            created_at: currentUser.created_at || new Date().toISOString(),
            email: currentUser.email || '',
            current_period_end: null,
            status: 'Admin'
          }
        ];
      }
      
      throw new Error('Não foi possível acessar os dados de usuários');
    }

    console.log(`✅ ${users?.length || 0} usuários encontrados`);

    // Buscar assinaturas separadamente
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('poupeja_subscriptions')
      .select('user_id, current_period_end, status, plan_type');

    if (subscriptionsError) {
      console.log('Erro ao buscar assinaturas, continuando sem elas:', subscriptionsError);
    } else {
      console.log(`✅ ${subscriptions?.length || 0} assinaturas encontradas`);
    }

    // Combinar dados
    const combinedData: UserData[] = users?.map(user => {
      const subscription = subscriptions?.find(sub => sub.user_id === user.id);
      return {
        ...user,
        current_period_end: subscription?.current_period_end || null,
        status: subscription?.status || 'Sem assinatura'
      };
    }) || [];

    console.log(`✅ Dados combinados: ${combinedData.length} usuários com assinaturas`);
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
}