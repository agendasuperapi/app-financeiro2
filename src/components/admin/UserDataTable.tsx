import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Phone, Mail, Calendar, CreditCard } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  subscription_end_date: string | null;
  subscription_status: string | null;
}

const UserDataTable: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      console.log('UserDataTable: Iniciando busca de usuários...');
      setLoading(true);

      // Buscar usuários com informações de assinatura
      const { data: usersData, error: usersError } = await supabase
        .from('poupeja_users')
        .select(`
          id,
          name,
          email,
          phone,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('UserDataTable: Erro ao buscar usuários:', usersError);
        toast.error('Erro ao carregar usuários');
        return;
      }

      console.log('UserDataTable: Usuários encontrados:', usersData?.length || 0);

      // Buscar informações de assinatura para cada usuário
      const usersWithSubscriptions = await Promise.all(
        (usersData || []).map(async (user) => {
          try {
            const { data: subscriptionData, error: subError } = await supabase
              .from('poupeja_subscriptions')
              .select('current_period_end, status')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (subError && subError.code !== 'PGRST116') {
              console.error(`UserDataTable: Erro ao buscar assinatura do usuário ${user.id}:`, subError);
            }

            return {
              ...user,
              subscription_end_date: subscriptionData?.current_period_end || null,
              subscription_status: subscriptionData?.status || null
            };
          } catch (error) {
            console.error(`UserDataTable: Erro inesperado para usuário ${user.id}:`, error);
            return {
              ...user,
              subscription_end_date: null,
              subscription_status: null
            };
          }
        })
      );

      setUsers(usersWithSubscriptions);
      console.log('UserDataTable: Dados processados:', usersWithSubscriptions);
    } catch (error) {
      console.error('UserDataTable: Erro geral:', error);
      toast.error('Erro inesperado ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setUpdatingUser(userId);
      
      const { error } = await supabase
        .from('poupeja_users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('UserDataTable: Erro ao excluir usuário:', error);
        toast.error('Erro ao excluir usuário');
        return;
      }

      // Remover usuário do estado local
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('Usuário excluído com sucesso');
    } catch (error) {
      console.error('UserDataTable: Erro inesperado ao excluir usuário:', error);
      toast.error('Erro inesperado ao excluir usuário');
    } finally {
      setUpdatingUser(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não informado';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const getSubscriptionBadge = (status: string | null, endDate: string | null) => {
    if (!status) {
      return <Badge variant="secondary">Sem assinatura</Badge>;
    }

    const isExpired = endDate && new Date(endDate) < new Date();
    
    switch (status) {
      case 'active':
        return isExpired 
          ? <Badge variant="destructive">Expirada</Badge>
          : <Badge variant="default">Ativa</Badge>;
      case 'canceled':
        return <Badge variant="outline">Cancelada</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Em atraso</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando usuários...</span>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">Nenhum usuário encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total de {users.length} usuário{users.length !== 1 ? 's' : ''} encontrado{users.length !== 1 ? 's' : ''}
        </p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchUsers}
          disabled={loading}
        >
          Atualizar
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Data de Ativação</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status da Assinatura</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium">{user.name || 'Nome não informado'}</p>
                      <p className="text-xs text-muted-foreground">{user.id}</p>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {user.email}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {user.phone || 'Não informado'}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(user.created_at)}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    {formatDate(user.subscription_end_date)}
                  </div>
                </TableCell>
                
                <TableCell>
                  {getSubscriptionBadge(user.subscription_status, user.subscription_end_date)}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteUser(user.id, user.name)}
                      disabled={updatingUser === user.id}
                    >
                      {updatingUser === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Excluir'
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserDataTable;