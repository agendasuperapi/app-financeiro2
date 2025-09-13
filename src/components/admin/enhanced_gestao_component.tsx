import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Phone, 
  User, 
  CreditCard, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  UserX,
  Pencil,
  Plus
} from 'lucide-react';
import { UserManagementService, UserData, UserStats } from '../../services/api_service';
import { supabase } from '@/integrations/supabase/client';

export const EnhancedGestaoComponent = () => {
  const [userData, setUserData] = useState<UserData[]>([]);
  const [filteredData, setFilteredData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'phone' | 'email'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [editingEmail, setEditingEmail] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingPhone, setEditingPhone] = useState('');
  const [editingPlanId, setEditingPlanId] = useState('');
  const [editingCoupon, setEditingCoupon] = useState('');
  const [editingStatus, setEditingStatus] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('1234567');
  const [newClientPlanId, setNewClientPlanId] = useState('49');
  const [newClientCoupon, setNewClientCoupon] = useState('0');
  const [newClientDate, setNewClientDate] = useState<Date | undefined>();
  const [newClientStatus, setNewClientStatus] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isInspectDialogOpen, setIsInspectDialogOpen] = useState(false);
  const [inspectedUser, setInspectedUser] = useState<UserData | null>(null);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Paginação
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Iniciando busca de dados com permissões configuradas...');
      
      const [users, userStats] = await Promise.all([
        UserManagementService.getAllUsersWithSubscriptions(),
        UserManagementService.getUserStats()
      ]);
      
      setUserData(users);
      setFilteredData(users);
      setStats(userStats);
      
      console.log('✅ Dados carregados:', {
        totalUsers: users.length,
        hasSubscriptions: users.filter(u => u.status !== 'Sem assinatura').length,
        stats: userStats
      });
      
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
      
      // Mostrar erro para o usuário mas ainda exibir a interface
      setUserData([]);
      setFilteredData([]);
      setStats({
        totalUsers: 0,
        activeSubscriptions: 0,
        expiredSubscriptions: 0,
        noSubscriptions: 0
      });
      
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados automaticamente quando o componente é montado
  useEffect(() => {
    fetchUserData();
  }, []);

  // Filtrar dados baseado na busca e filtro de status
  useEffect(() => {
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    let filtered = userData;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      const searchNormalized = normalize(searchLower);

      filtered = filtered.filter(user => {
        const nameNorm = user.name ? normalize(user.name) : '';
        const emailNorm = user.email ? normalize(user.email) : '';
        const phoneDigits = (user.phone || '').replace(/\D/g, '');
        const termDigits = searchTerm.replace(/\D/g, '');

        const byName = (searchField === 'all' || searchField === 'name') && nameNorm.includes(searchNormalized);
        const byEmail = (searchField === 'all' || searchField === 'email') && emailNorm.includes(searchNormalized);
        const byPhone = (searchField === 'all' || searchField === 'phone') && (termDigits.length > 0 ? phoneDigits.includes(termDigits) : false);

        return byName || byEmail || byPhone;
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'sem_assinatura':
            return !user.status || user.status === 'Sem assinatura';
          case 'ativo':
            return user.status === 'active' || user.status === 'ativo';
          case 'cancelado':
            return user.status === 'canceled' || user.status === 'cancelado';
          case 'expirado':
            return user.status === 'past_due' || user.status === 'unpaid' || user.status === 'expirado';
          default:
            return user.status === statusFilter;
        }
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [searchTerm, searchField, statusFilter, userData]);

  // Exportação CSV com dados corretos das tabelas
  const exportToCSV = () => {
    if (filteredData.length === 0) {
      console.log('Nenhum dado para exportar');
      return;
    }

    const headers = ['Nome', 'Telefone', 'Email', 'Data Ativação', 'Vencimento', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(user => [
        `"${user.name || 'N/A'}"`,
        `"${user.phone || 'N/A'}"`,
        `"${user.email || 'N/A'}"`,
        `"${UserManagementService.formatDate(user.created_at)}"`,
        `"${UserManagementService.formatDate(user.current_period_end)}"`,
        `"${user.status || 'Sem assinatura'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_poupeja_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`Exportados ${filteredData.length} usuários para CSV`);
  };

  // Obter status únicos para filtros
  const getUniqueStatuses = () => {
    const statuses = [...new Set(userData.map(user => user.status).filter(Boolean))];
    const statusMapping = {
      'active': 'Ativo',
      'ativo': 'Ativo', 
      'canceled': 'Cancelado',
      'cancelado': 'Cancelado',
      'past_due': 'Vencido',
      'unpaid': 'Vencido',
      'expirado': 'Vencido',
      'incomplete': 'Incompleto',
      'trialing': 'Teste'
    };
    
    return statuses
      .filter(status => status && status !== 'Sem assinatura')
      .map(status => ({
        value: status,
        label: statusMapping[status as keyof typeof statusMapping] || status
      }));
  };

  // Função para abrir o dialog de edição
  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setExpirationDate(user.current_period_end ? new Date(user.current_period_end) : undefined);
    setEditingEmail(user.email || '');
    setEditingName(user.name || '');
    setEditingPhone(user.phone || '');
    setEditingPlanId('49'); // Valor padrão, pois não temos esse campo na UserData
    setEditingCoupon('0'); // Valor padrão, pois não temos esse campo na UserData
    setEditingStatus(user.status || 'active');
    setNewPassword('');
    setIsEditDialogOpen(true);
  };

  // Função para salvar as alterações
  const handleSaveChanges = async () => {
    if (selectedUser && expirationDate) {
      try {
        console.log('Salvando alterações:', {
          userId: selectedUser.id,
          newName: editingName,
          newPhone: editingPhone,
          newEmail: editingEmail,
          newPlanId: editingPlanId,
          newCoupon: editingCoupon,
          newStatus: editingStatus,
          newExpirationDate: expirationDate,
          hasNewPassword: !!newPassword
        });

        // Atualizar dados do usuário na tabela poupeja_users
        const { error: userUpdateError } = await supabase
          .from('poupeja_users')
          .update({
            name: editingName,
            phone: editingPhone,
            email: editingEmail,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedUser.id);

        if (userUpdateError) {
          console.error('Erro ao atualizar dados do usuário:', userUpdateError);
          alert('Erro ao atualizar dados do usuário: ' + userUpdateError.message);
          return;
        }

        // Atualizar a data de vencimento e status na assinatura
        const { error: subscriptionError } = await supabase
          .from('poupeja_subscriptions')
          .update({
            current_period_end: expirationDate.toISOString(),
            status: editingStatus,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', selectedUser.id);

        if (subscriptionError) {
          console.error('Erro ao atualizar assinatura:', subscriptionError);
          alert('Dados do usuário atualizados, mas erro na assinatura: ' + subscriptionError.message);
        }
        
        // Atualizar a senha se foi informada
        if (newPassword && newPassword.trim() !== '' && newPassword !== 'reset') {
          // Alterar senha diretamente via Auth API  
          const response = await fetch('https://gpttodmpflpzhbgzagcc.supabase.co/auth/v1/admin/users/' + selectedUser.id, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHRvZG1wZmxwemhiZ3phZ2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzU2MTcsImV4cCI6MjA3MDg1MTYxN30.Ro2k_slVwV7hsGDM1YNcNP3csi876LPuAwFSBpxJN2I'
            },
            body: JSON.stringify({
              password: newPassword.trim()
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao alterar senha via API:', errorData);
            alert('Outras alterações salvas, mas erro ao alterar senha: ' + (errorData.msg || response.statusText));
          } else {
            alert('Dados atualizados e senha alterada com sucesso!');
          }
        } else if (newPassword === 'reset') {
          // Enviar email de reset de senha
          const { error: passwordError } = await supabase.auth.resetPasswordForEmail(
            editingEmail,
            {
              redirectTo: `${window.location.origin}/reset-password`
            }
          );
            
          if (passwordError) {
            console.error('Erro ao enviar reset de senha:', passwordError);
            alert('Outras alterações salvas, mas erro ao enviar email de reset: ' + passwordError.message);
          } else {
            alert('Dados atualizados! Email de redefinição de senha enviado para o usuário!');
          }
        } else {
          alert('Dados do usuário atualizados com sucesso!');
        }
        
        // Recarregar os dados para refletir as mudanças
        await fetchUserData();
        
        // Fechar o dialog
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        setExpirationDate(undefined);
        setEditingEmail('');
        setEditingName('');
        setEditingPhone('');
        setEditingPlanId('');
        setEditingCoupon('');
        setEditingStatus('');
        setNewPassword('');

        console.log('✅ Alterações salvas com sucesso');
      } catch (error) {
        console.error('❌ Erro ao salvar alterações:', error);
        alert('Erro ao salvar alterações: ' + (error as Error).message);
      }
    }
  };

  // Função para alternar o status do usuário
  const handleToggleStatus = async (user: UserData) => {
    try {
      console.log('Alternando status do usuário:', user.id, 'Status atual:', user.status);
      
      // Alternar o status no Supabase
      await UserManagementService.toggleUserStatus(user.id, user.status || '');
      
      // Recarregar os dados para refletir as mudanças
      await fetchUserData();
      
      console.log('✅ Status alternado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao alternar status:', error);
    }
  };

  // Função para inspecionar usuário e buscar suas transações
  const handleInspectUser = async (user: UserData) => {
    setInspectedUser(user);
    setIsInspectDialogOpen(true);
    setLoadingTransactions(true);

    try {
      // Buscar transações do usuário
      const { data: transactions, error } = await supabase
        .from('poupeja_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar transações:', error);
        setUserTransactions([]);
      } else {
        setUserTransactions(transactions || []);
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      setUserTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Função para adicionar novo cliente via Supabase Auth API
  const handleAddClient = async () => {
    if (!newClientName.trim() || !newClientPhone.trim() || !newClientEmail.trim()) {
      alert('Nome, telefone e email são obrigatórios');
      return;
    }

    try {
      console.log('Criando usuário via Supabase Auth API...');

      // Criar usuário via Supabase Auth API
      const response = await fetch('https://gpttodmpflpzhbgzagcc.supabase.co/auth/v1/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHRvZG1wZmxwemhiZ3phZ2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzU2MTcsImV4cCI6MjA3MDg1MTYxN30.Ro2k_slVwV7hsGDM1YNcNP3csi876LPuAwFSBpxJN2I'
        },
        body: JSON.stringify({
          email: newClientEmail.trim(),
          password: newClientPassword,
          data: {
            full_name: newClientName.trim(),
            phone: newClientPhone.trim(),
            id_plano_preco: newClientPlanId,
            uuid_cupom: newClientCoupon
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro na API: ${errorData.msg || response.statusText}`);
      }

      const authData = await response.json();
      console.log('Usuário criado via Auth API:', authData);

      if (authData.user?.id) {
        // Inserir dados adicionais na tabela poupeja_users
        const { error: userError } = await supabase
          .from('poupeja_users')
          .insert({
            id: authData.user.id,
            name: newClientName.trim(),
            phone: newClientPhone.trim(),
            email: newClientEmail.trim(),
            created_at: newClientDate ? newClientDate.toISOString() : new Date().toISOString()
          });

        if (userError) {
          console.error('Erro ao inserir na tabela poupeja_users:', userError);
        }

        // Criar assinatura se especificada
        if (newClientDate) {
          const subscriptionData = {
            user_id: authData.user.id,
            status: newClientStatus,
            plan_type: 'basic',
            current_period_start: new Date().toISOString(),
            current_period_end: newClientDate.toISOString(),
            created_at: new Date().toISOString()
          };

          const { error: subError } = await supabase
            .from('poupeja_subscriptions')
            .insert(subscriptionData);

          if (subError) {
            console.error('Erro ao criar assinatura:', subError);
          }
        }
      }

      alert('Cliente adicionado com sucesso via Auth API!');
      
      // Limpar formulário e fechar dialog
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewClientPassword('1234567');
      setNewClientPlanId('49');
      setNewClientCoupon('0');
      setNewClientDate(undefined);
      setNewClientStatus('active');
      setIsAddClientDialogOpen(false);
      
      // Recarregar dados
      await fetchUserData();
      
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      alert('Erro ao adicionar cliente: ' + (error as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dados dos usuários...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cards de Estatísticas */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
              <Card>
                <CardContent className="p-2 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-muted-foreground">Total de Usuários</p>
                      <p className="text-lg lg:text-2xl font-bold">{stats.totalUsers}</p>
                    </div>
                    <Users className="h-5 w-5 lg:h-8 lg:w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-muted-foreground">Assinaturas Ativas</p>
                      <p className="text-lg lg:text-2xl font-bold text-green-600">{stats.activeSubscriptions}</p>
                    </div>
                    <TrendingUp className="h-5 w-5 lg:h-8 lg:w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-muted-foreground">Assinaturas Vencidas</p>
                      <p className="text-lg lg:text-2xl font-bold text-red-600">{stats.expiredSubscriptions}</p>
                    </div>
                    <TrendingDown className="h-5 w-5 lg:h-8 lg:w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-muted-foreground">Sem Assinatura</p>
                      <p className="text-lg lg:text-2xl font-bold text-muted-foreground">{stats.noSubscriptions}</p>
                    </div>
                    <AlertCircle className="h-5 w-5 lg:h-8 lg:w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Controles de Filtro e Busca */}
          <Card>
            <CardHeader className="p-3 lg:p-6">
              <CardTitle className="flex items-center justify-between text-sm lg:text-base">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 lg:h-5 lg:w-5" />
                  Dashboard de Usuários ({filteredData.length})
                </span>
                <div className="flex gap-1 lg:gap-2">
                  <Button
                    onClick={() => setIsAddClientDialogOpen(true)}
                    variant="default"
                    size="sm"
                    className="h-7 w-7 lg:h-9 lg:w-auto lg:px-3"
                  >
                    <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className="hidden lg:inline ml-1">Adicionar Cliente</span>
                  </Button>
                  <Button
                    onClick={fetchUserData}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="h-7 w-7 lg:h-9 lg:w-auto lg:px-3"
                  >
                    <RefreshCw className={`h-3 w-3 lg:h-4 lg:w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden lg:inline ml-1">Atualizar</span>
                  </Button>
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    size="sm"
                    disabled={filteredData.length === 0}
                    className="h-7 w-7 lg:h-9 lg:w-auto lg:px-3"
                  >
                    <Download className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className="hidden lg:inline ml-1">Exportar</span>
                  </Button>
                </div>
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-4 mt-2 lg:mt-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 lg:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, telefone ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 lg:pl-10 h-8 lg:h-10 text-sm"
                    />
                  </div>
                </div>
                
                <div className="w-full sm:w-40 lg:w-48">
                  <Select value={searchField} onValueChange={(v) => setSearchField(v as any)}>
                    <SelectTrigger className="h-8 lg:h-10 text-sm">
                      <SelectValue placeholder="Campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="name">Nome</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full sm:w-40 lg:w-56">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 lg:h-10 text-sm">
                      <Filter className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                      <SelectItem value="expirado">Vencido</SelectItem>
                      <SelectItem value="sem_assinatura">Sem assinatura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-3 lg:p-6 pt-0">
              <div className="overflow-x-auto">
                {userData.length === 0 && !loading && (
                  <div className="text-center py-8 space-y-4">
                    <UserX className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-muted-foreground">Nenhum usuário encontrado</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Não foi possível carregar os dados dos usuários. Verifique sua conexão ou tente atualizar.
                      </p>
                      <Button 
                        onClick={fetchUserData} 
                        variant="outline" 
                        className="mt-4"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar Novamente
                      </Button>
                    </div>
                  </div>
                )}
                
                {userData.length > 0 && (
                  <div className="min-w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px] sm:w-[180px]">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="hidden sm:inline">Nome</span>
                              <span className="sm:hidden">Usuário</span>
                            </div>
                          </TableHead>
                          <TableHead className="w-[120px] hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Telefone
                            </div>
                          </TableHead>
                          <TableHead className="w-[100px] hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              Ativação
                            </div>
                          </TableHead>
                          <TableHead className="w-[100px] hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              Vencimento
                            </div>
                          </TableHead>
                          <TableHead className="w-[100px]">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Status
                            </div>
                          </TableHead>
                          <TableHead className="w-[100px] text-center">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((user) => (
                          <TableRow key={user.id} className="hover:bg-muted/50">
                             <TableCell className="font-medium">
                               <div className="flex flex-col">
                                 <span className="font-semibold text-sm">{user.name || 'N/A'}</span>
                                 <span className="text-xs text-muted-foreground sm:hidden">
                                   {user.phone || 'N/A'}
                                 </span>
                               </div>
                             </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">
                              {user.phone || 'N/A'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {UserManagementService.formatDate(user.created_at)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">
                              {UserManagementService.formatDate(user.current_period_end)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`${UserManagementService.getStatusColor(user.status || 'Sem assinatura')} text-xs`}
                              >
                                {user.status || 'Sem assinatura'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-600 border-green-200"
                                  onClick={() => handleInspectUser(user)}
                                  title="Inspecionar usuário"
                                >
                                  <Search className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600 border-blue-200"
                                  onClick={() => handleEditUser(user)}
                                  title="Editar usuário"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 border-red-200"
                                  onClick={() => handleToggleStatus(user)}
                                  title="Alterar status"
                                >
                                  <UserX className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
              
              {/* Controles de Paginação */}
              {filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-3 lg:px-6 py-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Itens por página:</span>
                    <Select value={itemsPerPage === filteredData.length ? 'all' : itemsPerPage.toString()} onValueChange={(value) => {
                      if (value === 'all') {
                        setItemsPerPage(filteredData.length || 1);
                      } else {
                        setItemsPerPage(Number(value));
                      }
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} itens
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      ‹
                    </Button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Mostrar apenas páginas próximas à atual
                      if (
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-1">...</span>;
                      }
                      return null;
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      ›
                    </Button>
                  </div>
                </div>
              )}
              
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

          {/* Dialog para editar data de vencimento */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Cliente</DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="editName" className="text-sm font-medium">
                      Nome do Cliente *
                    </label>
                    <Input
                      id="editName"
                      type="text"
                      placeholder="Digite o nome completo"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="editPhone" className="text-sm font-medium">
                      Telefone *
                    </label>
                    <Input
                      id="editPhone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      value={editingPhone}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                        
                        // Limita a 11 dígitos
                        if (value.length > 11) {
                          value = value.slice(0, 11);
                        }
                        
                        // Formata automaticamente
                        if (value.length >= 11) {
                          value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                        } else if (value.length >= 7) {
                          value = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
                        } else if (value.length >= 3) {
                          value = value.replace(/(\d{2})(\d+)/, '($1) $2');
                        } else if (value.length >= 1) {
                          value = value.replace(/(\d+)/, '($1');
                        }
                        
                        setEditingPhone(value);
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="editEmail" className="text-sm font-medium">
                      Email *
                    </label>
                    <Input
                      id="editEmail"
                      type="email"
                      placeholder="cliente@email.com"
                      value={editingEmail}
                      onChange={(e) => setEditingEmail(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="editPlanId" className="text-sm font-medium">
                      ID do Plano
                    </label>
                    <Input
                      id="editPlanId"
                      type="text"
                      placeholder="49"
                      value={editingPlanId}
                      onChange={(e) => setEditingPlanId(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="editCoupon" className="text-sm font-medium">
                      UUID do Cupom
                    </label>
                    <Input
                      id="editCoupon"
                      type="text"
                      placeholder="0"
                      value={editingCoupon}
                      onChange={(e) => setEditingCoupon(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Data de Vencimento *
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="DD/MM/AAAA"
                        value={expirationDate ? format(expirationDate, "dd/MM/yyyy") : ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Formatar automaticamente enquanto digita
                          let formatted = value.replace(/\D/g, '');
                          if (formatted.length >= 2) {
                            formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
                          }
                          if (formatted.length >= 5) {
                            formatted = formatted.slice(0, 5) + '/' + formatted.slice(5, 9);
                          }
                          
                          // Tentar converter para data quando completo
                          if (formatted.length === 10) {
                            const [day, month, year] = formatted.split('/');
                            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            
                            // Verificar se a data é válida
                            if (!isNaN(date.getTime()) && 
                                date.getDate() === parseInt(day) &&
                                date.getMonth() === parseInt(month) - 1 &&
                                date.getFullYear() === parseInt(year)) {
                              setExpirationDate(date);
                            }
                          }
                          
                          // Atualizar o valor do input (mesmo que temporariamente para formatação)
                          e.target.value = formatted;
                        }}
                        className="w-full pr-10"
                        maxLength={10}
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={expirationDate}
                            onSelect={setExpirationDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Status *
                    </label>
                    <Select value={editingStatus} onValueChange={setEditingStatus}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>  
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                        <SelectItem value="past_due">Past Due</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alterar Senha</label>
                    <div className="space-y-3">
                      <div>
                        <Input
                          type="password"
                          placeholder="Nova senha (deixe em branco para não alterar)"
                          value={newPassword !== 'reset' ? newPassword : ''}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          Ou envie um email de redefinição de senha:
                        </p>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="resetPassword"
                            checked={newPassword === 'reset'}
                            onChange={(e) => setNewPassword(e.target.checked ? 'reset' : '')}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="resetPassword" className="text-sm">
                            Enviar email de redefinição de senha
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditDialogOpen(false);
                        setSelectedUser(null);
                        setExpirationDate(undefined);
                        setEditingEmail('');
                        setEditingName('');
                        setEditingPhone('');
                        setEditingPlanId('');
                        setEditingCoupon('');
                        setEditingStatus('');
                        setNewPassword('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveChanges}
                      disabled={!expirationDate || !editingEmail.trim() || !editingName.trim() || !editingPhone.trim()}
                    >
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog para adicionar novo cliente */}
          <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="clientName" className="text-sm font-medium">
                    Nome do Cliente *
                  </label>
                  <Input
                    id="clientName"
                    type="text"
                    placeholder="Digite o nome completo"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="clientPhone" className="text-sm font-medium">
                    Telefone *
                  </label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    value={newClientPhone}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      
                      // Limita a 11 dígitos
                      if (value.length > 11) {
                        value = value.slice(0, 11);
                      }
                      
                      // Formata automaticamente
                      if (value.length >= 11) {
                        value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                      } else if (value.length >= 7) {
                        value = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
                      } else if (value.length >= 3) {
                        value = value.replace(/(\d{2})(\d+)/, '($1) $2');
                      } else if (value.length >= 1) {
                        value = value.replace(/(\d+)/, '($1');
                      }
                      
                      setNewClientPhone(value);
                    }}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="clientEmail" className="text-sm font-medium">
                    Email *
                  </label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="cliente@email.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="clientPassword" className="text-sm font-medium">
                    Senha
                  </label>
                  <Input
                    id="clientPassword"
                    type="text"
                    placeholder="Senha padrão"
                    value={newClientPassword}
                    onChange={(e) => setNewClientPassword(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="clientPlanId" className="text-sm font-medium">
                    ID do Plano
                  </label>
                  <Input
                    id="clientPlanId"
                    type="text"
                    placeholder="49"
                    value={newClientPlanId}
                    onChange={(e) => setNewClientPlanId(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="clientCoupon" className="text-sm font-medium">
                    UUID do Cupom
                  </label>
                  <Input
                    id="clientCoupon"
                    type="text"
                    placeholder="0"
                    value={newClientCoupon}
                    onChange={(e) => setNewClientCoupon(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Data de Vencimento
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="DD/MM/AAAA"
                      value={newClientDate ? format(newClientDate, "dd/MM/yyyy") : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Formatar automaticamente enquanto digita
                        let formatted = value.replace(/\D/g, '');
                        if (formatted.length >= 2) {
                          formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
                        }
                        if (formatted.length >= 5) {
                          formatted = formatted.slice(0, 5) + '/' + formatted.slice(5, 9);
                        }
                        
                        // Tentar converter para data quando completo
                        if (formatted.length === 10) {
                          const [day, month, year] = formatted.split('/');
                          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          
                          // Verificar se a data é válida
                          if (!isNaN(date.getTime()) && 
                              date.getDate() === parseInt(day) &&
                              date.getMonth() === parseInt(month) - 1 &&
                              date.getFullYear() === parseInt(year)) {
                            setNewClientDate(date);
                          }
                        }
                        
                        // Atualizar o valor do input (mesmo que temporariamente para formatação)
                        e.target.value = formatted;
                      }}
                      className="w-full pr-10"
                      maxLength={10}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newClientDate}
                          onSelect={setNewClientDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Status
                  </label>
                  <Select value={newClientStatus} onValueChange={setNewClientStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecionar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>  
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddClientDialogOpen(false);
                      setNewClientName('');
                      setNewClientPhone('');
                      setNewClientEmail('');
                      setNewClientPassword('1234567');
                      setNewClientPlanId('49');
                      setNewClientCoupon('0');
                      setNewClientDate(undefined);
                      setNewClientStatus('active');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('🔘 Botão Adicionar Cliente clicado!');
                      handleAddClient();
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Cliente
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog para inspecionar usuário e suas transações */}
          <Dialog open={isInspectDialogOpen} onOpenChange={setIsInspectDialogOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Inspeção de Conta - {inspectedUser?.name}
                </DialogTitle>
              </DialogHeader>
              
              {inspectedUser && (
                <div className="space-y-6">
                  {/* Informações do Cliente */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Informações do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Nome</label>
                        <p className="text-sm">{inspectedUser.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                        <p className="text-sm">{inspectedUser.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-sm">{inspectedUser.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <Badge 
                          variant="outline" 
                          className={`${UserManagementService.getStatusColor(inspectedUser.status || 'Sem assinatura')}`}
                        >
                          {inspectedUser.status || 'Sem assinatura'}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
                        <p className="text-sm">{UserManagementService.formatDate(inspectedUser.created_at)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Vencimento</label>
                        <p className="text-sm">{UserManagementService.formatDate(inspectedUser.current_period_end)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lançamentos/Transações */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Lançamentos ({userTransactions.length})</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInspectUser(inspectedUser)}
                        disabled={loadingTransactions}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingTransactions ? 'animate-spin' : ''}`} />
                        Atualizar
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loadingTransactions ? (
                        <div className="text-center py-8">
                          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Carregando transações...</p>
                        </div>
                      ) : userTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-sm mt-2">Nenhuma transação encontrada</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Categoria</TableHead>
                                  <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {userTransactions.map((transaction) => (
                                  <TableRow key={transaction.id}>
                                    <TableCell className="font-medium">
                                      {transaction.description || 'Sem descrição'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                      R$ {Number(transaction.amount || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      {transaction.date ? new Date(transaction.date).toLocaleDateString('pt-BR') : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      {transaction.category_name || 'Sem categoria'}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => {
                                            // Aqui você pode adicionar a lógica para editar a transação
                                            console.log('Editar transação:', transaction.id);
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsInspectDialogOpen(false);
                        setInspectedUser(null);
                        setUserTransactions([]);
                      }}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};