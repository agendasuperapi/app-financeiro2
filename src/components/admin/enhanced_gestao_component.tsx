import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Calendar, 
  Phone, 
  User, 
  CreditCard, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { UserManagementService, UserData, UserStats } from '../../services/api_service';
import { supabase } from '@/integrations/supabase/client';

export const EnhancedGestaoComponent = () => {
  const [showTable, setShowTable] = useState(false);
  const [userData, setUserData] = useState<UserData[]>([]);
  const [filteredData, setFilteredData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUserData = async () => {
    setLoading(true);
    try {
      console.log('Buscando dados reais das tabelas poupeja_users e poupeja_subscriptions...');
      
      const [users, userStats] = await Promise.all([
        UserManagementService.getAllUsersWithSubscriptions(),
        UserManagementService.getUserStats()
      ]);
      
      setUserData(users);
      setFilteredData(users);
      setStats(userStats);
      setShowTable(true);
      
      console.log('Dados reais carregados com sucesso:', {
        totalUsers: users.length,
        stats: userStats
      });
      
    } catch (error) {
      console.error('Erro ao buscar dados das tabelas:', error);
      
      // Se há erro de RLS, tentar buscar apenas usuários primeiro
      try {
        console.log('Tentando buscar apenas usuários...');
        const { data: users, error: usersError } = await supabase
          .from('poupeja_users')
          .select('*');
          
        if (usersError) {
          console.error('Erro ao buscar tabela poupeja_users:', usersError);
          throw usersError;
        }
        
        console.log('Usuários encontrados na tabela:', users?.length || 0);
        
        // Transformar dados para o formato esperado
        const userData: UserData[] = users?.map(user => ({
          id: user.id,
          name: user.name,
          phone: user.phone,
          created_at: user.created_at,
          email: user.email,
          current_period_end: null,
          status: 'Sem assinatura'
        })) || [];
        
        setUserData(userData);
        setFilteredData(userData);
        setStats({
          totalUsers: userData.length,
          activeSubscriptions: 0,
          expiredSubscriptions: 0,
          noSubscriptions: userData.length
        });
        setShowTable(true);
        
      } catch (fallbackError) {
        console.error('Erro no fallback para buscar usuários:', fallbackError);
        
        // Mostrar erro para o usuário
        setUserData([]);
        setFilteredData([]);
        setStats({
          totalUsers: 0,
          activeSubscriptions: 0,
          expiredSubscriptions: 0,
          noSubscriptions: 0
        });
        setShowTable(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtrar dados baseado na busca e filtro de status
  useEffect(() => {
    let filtered = userData;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.phone && user.phone.includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (statusFilter === 'sem_assinatura') {
          return user.status === 'Sem assinatura';
        }
        return user.status === statusFilter;
      });
    }

    setFilteredData(filtered);
  }, [searchTerm, statusFilter, userData]);

  const exportToCSV = () => {
    const headers = ['Nome', 'Telefone', 'Email', 'Data Ativação', 'Vencimento', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(user => [
        user.name || '',
        user.phone || '',
        user.email || '',
        UserManagementService.formatDate(user.created_at),
        UserManagementService.formatDate(user.current_period_end),
        user.status || 'Sem assinatura'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_gestao_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUniqueStatuses = () => {
    const statuses = [...new Set(userData.map(user => user.status))];
    return statuses.filter(status => status && status !== 'Sem assinatura');
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={fetchUserData}
        disabled={loading}
        className="w-full flex items-center gap-2"
        variant="outline"
      >
        <Users className="h-4 w-4" />
        {loading ? 'Carregando...' : 'Gestão'}
      </Button>

      {showTable && (
        <div className="space-y-4">
          {/* Cards de Estatísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Assinaturas Ativas</p>
                      <p className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Assinaturas Vencidas</p>
                      <p className="text-2xl font-bold text-red-600">{stats.expiredSubscriptions}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Sem Assinatura</p>
                      <p className="text-2xl font-bold text-muted-foreground">{stats.noSubscriptions}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Controles de Filtro e Busca */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Dashboard de Usuários ({filteredData.length})
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={fetchUserData}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    size="sm"
                    disabled={filteredData.length === 0}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, telefone ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="w-full sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="sem_assinatura">Sem Assinatura</SelectItem>
                      {getUniqueStatuses().map(status => (
                        <SelectItem key={status} value={status || ''}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="overflow-x-auto">
                {userData.length === 0 && !loading && (
                  <div className="text-center py-8 space-y-4">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-muted-foreground">Configuração Necessária</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Para exibir dados das tabelas, configure as políticas RLS no Supabase:
                      </p>
                      <div className="bg-muted p-4 rounded-lg mt-4 text-left">
                        <p className="text-xs font-mono">
                          CREATE POLICY "Admins can view all users" ON poupeja_users<br/>
                          FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {userData.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Nome
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Telefone
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Data Ativação
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Vencimento
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Status
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                          <TableCell>{user.phone || 'N/A'}</TableCell>
                          <TableCell>{UserManagementService.formatDate(user.created_at)}</TableCell>
                          <TableCell>{UserManagementService.formatDate(user.current_period_end)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary" 
                              className={UserManagementService.getStatusColor(user.status || 'Sem assinatura')}
                            >
                              {user.status || 'Sem assinatura'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              
              {filteredData.length === 0 && !loading && userData.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Nenhum usuário encontrado com os filtros aplicados' 
                    : 'Nenhum usuário encontrado'
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};