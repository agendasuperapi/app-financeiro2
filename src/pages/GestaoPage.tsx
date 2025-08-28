import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedGestaoComponent } from '@/components/admin/enhanced_gestao_component';
import { Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AdminOptimizedProvider } from '@/contexts/AdminOptimizedContext';

const GestaoPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToAdmin = () => {
    navigate('/admin');
  };

  return (
    <AdminOptimizedProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBackToAdmin}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Admin
              </Button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                Gestão de Usuários
              </h1>
            </div>
            <p className="text-muted-foreground">
              Gerencie usuários, assinaturas e dados do sistema
            </p>
          </div>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Painel de Gestão</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedGestaoComponent />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminOptimizedProvider>
  );
};

export default GestaoPage;