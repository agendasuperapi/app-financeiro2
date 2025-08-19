import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Download, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  subscription_status: string;
  subscription_end_date: string;
  plan_type: string;
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
      
      // Buscar usuários com dados de assinatura
      const { data: usersData, error: usersError } = await supabase
        .from('poupeja_users')
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          subscriptions (
            status,
            current_period_end,
            plan_type
          )
        `)
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      const formattedUsers = usersData?.map(user => ({
        id: user.id,
        name: user.name || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        created_at: user.created_at,
        subscription_status: (user.subscriptions as any)?.[0]?.status || 'free',
        subscription_end_date: (user.subscriptions as any)?.[0]?.current_period_end || 'N/A',
        plan_type: (user.subscriptions as any)?.[0]?.plan_type || 'free'
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar dados dos usuários');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Data Ativação', 'Status', 'Vencimento', 'Plano'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => [
        user.name,
        user.email,
        user.phone,
        formatDate(user.created_at),
        user.subscription_status,
        formatDate(user.subscription_end_date),
        user.plan_type
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
            placeholder="Buscar por nome, email ou telefone..."
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
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Data Ativação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Plano</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>{getStatusBadge(user.subscription_status)}</TableCell>
                      <TableCell>{formatDate(user.subscription_end_date)}</TableCell>
                      <TableCell className="capitalize">{user.plan_type}</TableCell>
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