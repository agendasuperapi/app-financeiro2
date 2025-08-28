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
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [editingEmail, setEditingEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDate, setNewClientDate] = useState<Date | undefined>();
  const [newClientStatus, setNewClientStatus] = useState('active');

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
    let filtered = userData;

    // Filtro por termo de busca (nome, telefone ou email)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user => 
        (user.name && user.name.toLowerCase().includes(searchLower)) ||
        (user.phone && user.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))) ||
        (user.email && user.email.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por status de assinatura
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
  }, [searchTerm, statusFilter, userData]);

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
    setNewPassword('');
    setIsEditDialogOpen(true);
  };

  // Função para salvar as alterações
  const handleSaveChanges = async () => {
    if (selectedUser && expirationDate) {
      try {
        console.log('Salvando alterações:', {
          userId: selectedUser.id,
          newExpirationDate: expirationDate,
          newEmail: editingEmail,
          hasNewPassword: !!newPassword
        });

        // Atualizar a data de vencimento no Supabase
        await UserManagementService.updateSubscriptionExpirationDate(selectedUser.id, expirationDate);
        
        // Atualizar o email se foi alterado
        if (editingEmail && editingEmail !== selectedUser.email) {
          const { error: emailError } = await supabase
            .from('poupeja_users')
            .update({ email: editingEmail })
            .eq('id', selectedUser.id);
            
          if (emailError) {
            console.error('Erro ao atualizar email:', emailError);
            alert('Data de vencimento atualizada, mas erro ao atualizar email: ' + emailError.message);
          }
        }
        
        // Atualizar a senha se foi informada
        if (newPassword && newPassword.trim() !== '') {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(
            selectedUser.id,
            { password: newPassword }
          );
            
          if (passwordError) {
            console.error('Erro ao atualizar senha:', passwordError);
            alert('Outras alterações salvas, mas erro ao atualizar senha: ' + passwordError.message);
          }
        }
        
        // Recarregar os dados para refletir as mudanças
        await fetchUserData();
        
        // Fechar o dialog
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        setExpirationDate(undefined);
        setEditingEmail('');
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

  // Função para adicionar novo cliente
  const handleAddClient = async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) {
      alert('Nome e telefone são obrigatórios');
      return;
    }

    try {
      // Gerar UUID válido e email único
      const clientId = uuidv4();
      const tempEmail = `cliente_${Date.now()}@poupeja.local`;

      // Inserir na tabela poupeja_users
      const { data, error } = await supabase
        .from('poupeja_users')
        .insert({
          id: clientId,
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          email: tempEmail,
          created_at: newClientDate ? newClientDate.toISOString() : new Date().toISOString()
        })
        .select();

      if (error) {
        throw error;
      }

      // Criar entrada na tabela de assinaturas
      if (data && data[0]) {
        const subscriptionData = {
          user_id: data[0].id,
          status: newClientStatus,
          plan_type: 'basic',
          current_period_start: new Date().toISOString(),
          current_period_end: newClientDate ? newClientDate.toISOString() : null,
          created_at: new Date().toISOString()
        };

        const { error: subError } = await supabase
          .from('poupeja_subscriptions')
          .insert(subscriptionData);

        if (subError) {
          console.error('Erro ao criar assinatura:', subError);
          alert('Cliente criado, mas erro ao criar assinatura: ' + subError.message);
        }
      }

      alert('Cliente adicionado com sucesso!');
      
      // Limpar formulário e fechar dialog
      setNewClientName('');
      setNewClientPhone('');
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
                
                <div className="w-full sm:w-40 lg:w-56">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 lg:h-10 text-sm">
                      <Filter className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="sem_assinatura">Sem Assinatura</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                      <SelectItem value="expirado">Vencido</SelectItem>
                      {getUniqueStatuses().map(statusObj => (
                        <SelectItem key={statusObj.value} value={statusObj.value}>
                          {statusObj.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-3 lg:p-6 pt-0">
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
                        <TableHead className="min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">Nome</span>
                            <span className="sm:hidden">Usuário</span>
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[120px] hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Telefone
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[100px] hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Ativação
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[100px] hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Vencimento
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Status
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[80px]">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/50">
                           <TableCell className="font-medium">
                             <div className="flex flex-col">
                               <span className="font-semibold">{user.name || 'N/A'}</span>
                               <span className="text-sm text-muted-foreground sm:hidden">
                                 {user.phone || 'N/A'}
                               </span>
                             </div>
                           </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {user.phone || 'N/A'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {UserManagementService.formatDate(user.created_at)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
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
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                onClick={() => handleEditUser(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                                onClick={() => handleToggleStatus(user)}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
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

          {/* Dialog para editar data de vencimento */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Data de Vencimento</DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Usuário:</h4>
                    <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Email Atual:</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.email || 'Sem email definido'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Novo Email:</h4>
                    <Input
                      type="email"
                      placeholder="Digite o novo email"
                      value={editingEmail}
                      onChange={(e) => setEditingEmail(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Nova Senha:</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Por segurança, a senha atual não é exibida. Deixe em branco para manter a senha atual.
                    </p>
                    <Input
                      type="password"
                      placeholder="Digite a nova senha (opcional)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Data de Vencimento Atual:</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.current_period_end 
                        ? UserManagementService.formatDate(selectedUser.current_period_end)
                        : 'Sem data definida'
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Nova Data de Vencimento:</h4>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !expirationDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expirationDate ? format(expirationDate, "dd/MM/yyyy") : "Selecionar data"}
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

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditDialogOpen(false);
                        setSelectedUser(null);
                        setExpirationDate(undefined);
                        setEditingEmail('');
                        setNewPassword('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveChanges}
                      disabled={!expirationDate || !editingEmail.trim()}
                    >
                      Salvar
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
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Data de Vencimento
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newClientDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newClientDate ? format(newClientDate, "dd/MM/yyyy") : "Selecionar data"}
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
        </div>
      )}
    </div>
  );
};