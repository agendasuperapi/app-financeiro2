import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, X } from 'lucide-react';
import { useClientView } from '@/contexts/ClientViewContext';

export const ClientView: React.FC = () => {
  const { selectedUser, setSelectedUser } = useClientView();

  if (!selectedUser) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhum usuário selecionado</h3>
          <p className="text-muted-foreground mb-4">
            Selecione um usuário na aba "Gestão" para visualizar o sistema com a perspectiva dele.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com informações do usuário selecionado */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Visualizando como:</CardTitle>
                <p className="text-sm text-muted-foreground">Perspectiva do cliente</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUser(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="font-semibold">{selectedUser.name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
            </div>
            {selectedUser.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Telefone:</p>
                <p className="text-sm font-medium">{selectedUser.phone}</p>
              </div>
            )}
            {selectedUser.status && (
              <Badge 
                variant={selectedUser.status === 'active' ? 'default' : 'secondary'}
                className="ml-auto"
              >
                {selectedUser.status === 'active' ? 'Ativo' : selectedUser.status}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo simulado da visão do cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard do Cliente</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta seção simulará a experiência do usuário selecionado navegando pelo sistema.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Transações</h4>
              <p className="text-sm text-muted-foreground">
                Visualize as transações deste usuário
              </p>
            </Card>
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Categorias</h4>
              <p className="text-sm text-muted-foreground">
                Categorias criadas pelo usuário
              </p>
            </Card>
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Relatórios</h4>
              <p className="text-sm text-muted-foreground">
                Relatórios financeiros do usuário
              </p>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};