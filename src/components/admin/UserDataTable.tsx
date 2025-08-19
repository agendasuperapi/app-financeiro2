import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Download, Search, UserCheck, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserData {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  subscription_status: string;
  subscription_end_date: string;
  plan_type: string;
  is_active: boolean;
}

const UserDataTable: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Iniciando busca de usuários...');
      
      // Primeiro, tentar buscar todos os usuários sem filtro
      const { data: usersData, error: usersError, count } = await supabase
        .from('poupeja_users')
        .select('id, name, phone, created_at', { count: 'exact' });

      console.log('📊 Resultado da consulta usuários:', { 
        usersData, 
        usersError, 
        count,
        length: usersData?.length 
      });

      if (usersError) {
        console.error('❌ Erro na consulta usuários:', usersError);
        throw usersError;
      }

      // Buscar assinaturas separadamente da tabela correta
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('poupeja_subscriptions')
        .select('user_id, status, current_period_end, plan_type');

      console.log('📊 Resultado da consulta assinaturas:', { 
        subscriptionsData, 
        subscriptionsError,
        length: subscriptionsData?.length 
      });

      if (subscriptionsError) {
        console.error('⚠️ Erro ao buscar assinaturas (não crítico):', subscriptionsError);
      }

      // Combinar dados de usuários com assinaturas
      const formattedUsers = usersData?.map(user => {
        const subscription = subscriptionsData?.find((sub: any) => sub.user_id === user.id);
        
        return {
          id: user.id,
          name: user.name || 'N/A',
          phone: user.phone || 'N/A',
          created_at: user.created_at,
          subscription_status: subscription?.status || 'free',
          subscription_end_date: subscription?.current_period_end || 'N/A',
          plan_type: subscription?.plan_type || 'free',
          is_active: true // Por padrão, todos os usuários estão ativos
        };
      }) || [];

      console.log('✅ Usuários formatados:', { 
        formattedUsers, 
        length: formattedUsers.length 
      });

      setUsers(formattedUsers);
    } catch (error) {
      console.error('💥 Erro geral ao buscar usuários:', error);
      toast.error('Erro ao carregar dados dos usuários');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  const formatDate = (dateString: string) => {
    if (dateString === 'N/A') return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      free: 'bg-gray-100 text-gray-800'
    };

    const statusLabels = {
      active: 'Ativo',
      canceled: 'Cancelado',
      past_due: 'Vencido',
      free: 'Gratuito'
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.free}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      // Atualizar o estado local imediatamente para UX melhor
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_active: newStatus }
            : user
        )
      );

      // Aqui você pode adicionar a lógica para atualizar no banco de dados
      // quando tiver o campo is_active na tabela poupeja_users
      
      toast.success(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error('Erro ao alterar status do usuário');
      
      // Reverter mudança em caso de erro
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_active: currentStatus }
            : user
        )
      );
    }
  };

  const getActiveStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {isActive ? 'Ativo' : 'Inativo'}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Telefone', 'Data Ativação', 'Status', 'Vencimento', 'Plano', 'Ativo'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => [
        user.name,
        user.phone,
        formatDate(user.created_at),
        user.subscription_status,
        formatDate(user.subscription_end_date),
        user.plan_type,
        user.is_active ? 'Ativo' : 'Inativo'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <CardTitle>Dados dos Usuários</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchUsers}>
              Atualizar
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2">Carregando dados...</span>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Nome</TableHead>
                   <TableHead>Telefone</TableHead>
                   <TableHead>Data Ativação</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Vencimento</TableHead>
                   <TableHead>Plano</TableHead>
                   <TableHead>Status Ativo</TableHead>
                   <TableHead>Ações</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                 {filteredUsers.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                       {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                     </TableCell>
                   </TableRow>
                 ) : (
                   filteredUsers.map((user) => (
                     <TableRow key={user.id}>
                       <TableCell className="font-medium">{user.name}</TableCell>
                       <TableCell>{user.phone}</TableCell>
                       <TableCell>{formatDate(user.created_at)}</TableCell>
                       <TableCell>{getStatusBadge(user.subscription_status)}</TableCell>
                       <TableCell>{formatDate(user.subscription_end_date)}</TableCell>
                       <TableCell className="capitalize">{user.plan_type}</TableCell>
                       <TableCell>{getActiveStatusBadge(user.is_active)}</TableCell>
                       <TableCell>
                         <Button
                           variant={user.is_active ? "destructive" : "default"}
                           size="sm"
                           onClick={() => toggleUserStatus(user.id, user.is_active)}
                           className="flex items-center gap-1"
                         >
                           {user.is_active ? (
                             <>
                               <UserX className="h-3 w-3" />
                               Desativar
                             </>
                           ) : (
                             <>
                               <UserCheck className="h-3 w-3" />
                               Ativar
                             </>
                           )}
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))
                 )}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-4 text-sm text-gray-600">
          Total de usuários: {filteredUsers.length}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserDataTable;