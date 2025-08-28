import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface UserData {
  id: string;
  name: string;
  phone?: string;
  email: string;
  created_at: string;
  subscription_end_date?: string;
  subscription_status?: string;
}

const UserDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      console.log('Buscando usuários...');
      
      // Buscar usuários da tabela poupeja_users
      const { data: users, error: usersError } = await supabase
        .from('poupeja_users')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Resposta usuários:', { users, usersError });

      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
        return;
      }

      // Buscar dados de assinatura
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('poupeja_subscriptions')
        .select('user_id, current_period_end, status');

      console.log('Resposta assinaturas:', { subscriptions, subscriptionsError });

      if (subscriptionsError) {
        console.error('Erro ao buscar assinaturas:', subscriptionsError);
      }

      // Combinar dados
      const usersWithSubscriptions = users?.map(user => {
        const subscription = subscriptions?.find(sub => sub.user_id === user.id);
        
        return {
          id: user.id,
          name: user.name || user.email || 'Usuário sem nome',
          phone: user.phone,
          email: user.email,
          created_at: user.created_at,
          subscription_end_date: subscription?.current_period_end,
          subscription_status: subscription?.status
        };
      }) || [];

      console.log('Usuários processados:', usersWithSubscriptions);
      setUsers(usersWithSubscriptions);
    } catch (error) {
      console.error('Erro ao buscar dados dos usuários:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status?: string, endDate?: string) => {
    if (!status) return <Badge variant="secondary">Sem assinatura</Badge>;
    
    const isExpired = endDate && new Date(endDate) < new Date();
    
    switch (status) {
      case 'active':
        return <Badge variant={isExpired ? "destructive" : "default"}>
          {isExpired ? 'Expirado' : 'Ativo'}
        </Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'trialing':
        return <Badge variant="secondary">Teste</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Dashboard de Usuários</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum usuário encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Data de Ativação</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>{formatDate(user.subscription_end_date)}</TableCell>
                    <TableCell>
                      {getStatusBadge(user.subscription_status, user.subscription_end_date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        <div className="mt-4 text-sm text-muted-foreground">
          Total de usuários: {users.length}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserDashboard;