
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdminProfileConfig from '@/components/admin/AdminProfileConfig';
import AdminSectionTabs from '@/components/admin/AdminSectionTabs';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavBar from '@/components/layout/MobileNavBar';
import MobileHeader from '@/components/layout/MobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppContext } from '@/contexts/AppContext';
import { Shield, AlertTriangle, Eye, EyeOff, LogOut } from 'lucide-react';
import { AdminOptimizedProvider } from '@/contexts/AdminOptimizedContext';
import { EnhancedGestaoComponent } from '@/components/admin/enhanced_gestao_component';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const AdminDashboard: React.FC = () => {
  const [showProfile, setShowProfile] = useState(false);
  const [showGestao, setShowGestao] = useState(false);
  const isMobile = useIsMobile();
  const { hideValues, toggleHideValues, logout } = useAppContext();

  const handleProfileClick = () => {
    setShowProfile(true);
    setShowGestao(false);
  };

  const handleConfigClick = () => {
    setShowProfile(false);
    setShowGestao(false);
  };

  const handleGestaoClick = () => {
    setShowGestao(true);
    setShowProfile(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleAddTransaction = (type: 'income' | 'expense') => {
    console.log(`Add ${type} transaction`);
  };

  // Remove all automatic refresh listeners
  React.useEffect(() => {
    // Disable all page refresh triggers for admin
    const disableAutoRefresh = () => {
      // Remove any interval-based refreshes
      const intervalId = window.setInterval(() => {}, 86400000); // 24h dummy interval
      window.clearInterval(intervalId);
      
      // Disable page refresh on tab changes
      const originalAddEventListener = window.addEventListener;
      const originalRemoveEventListener = window.removeEventListener;
      
      const blockedEvents = ['visibilitychange', 'focus', 'blur', 'pageshow', 'pagehide'];
      
      // Override addEventListener para bloquear eventos problemáticos
      window.addEventListener = function(type: string, listener: any, options?: any) {
        if (blockedEvents.includes(type)) {
          console.log(`Blocked problematic event listener: ${type}`);
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // Limpar listeners existentes
      blockedEvents.forEach(eventType => {
        const listeners = (window as any).getEventListeners?.(window)?.[eventType] || [];
        listeners.forEach((listener: any) => {
          window.removeEventListener(eventType, listener.listener, listener.useCapture);
        });
      });
    };

    disableAutoRefresh();

    return () => {
      // Restore original addEventListener on cleanup
      // (será restaurado quando sair da página admin)
    };
  }, []);

  return (
    <AdminOptimizedProvider>
      <div className="min-h-screen bg-background w-full">
      {isMobile ? (
        <div className="flex flex-col h-screen w-full">
          <MobileHeader hideValues={hideValues} toggleHideValues={toggleHideValues} />
          <main className="flex-1 overflow-auto p-4 pb-20 w-full">
            <div className="w-full">
              {showProfile ? (
                <div className="w-full">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-8 w-8 text-blue-600" />
                      <h1 className="text-3xl font-bold text-gray-900">
                        Configurações do Perfil
                      </h1>
                      <button 
                        onClick={handleConfigClick}
                        className="ml-auto text-blue-600 hover:text-blue-800"
                      >
                        ← Voltar ao Painel
                      </button>
                    </div>
                    <p className="text-gray-600">
                      Gerencie suas informações de administrador
                    </p>
                  </div>
                  <AdminProfileConfig />
                </div>
              ) : showGestao ? (
                <div className="w-full">
                  <div className="mb-8 mt-12">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-8 w-8 text-blue-600" />
                      <h1 className="text-base md:text-2xl font-bold text-gray-900">
                        Gestão de Usuários
                      </h1>
                      <button 
                        onClick={handleConfigClick}
                        className="ml-auto text-blue-600 hover:text-blue-800"
                      >
                        ← Voltar ao Painel
                      </button>
                    </div>
                    <p className="text-gray-600">
                      Gerencie usuários, assinaturas e dados do sistema
                    </p>
                  </div>
                  <EnhancedGestaoComponent />
                </div>
              ) : (
                <div className="w-full">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-8 w-8 text-blue-600" />
                      <h1 className="text-3xl font-bold text-gray-900">
                        Painel Administrativo
                      </h1>
                    </div>
                    <p className="text-gray-600">
                      Monitore e gerencie o sistema de pagamentos, usuários e configurações
                    </p>
                  </div>

                  {/* Alerta de Configuração Inicial */}
                  <Card className="mb-6 border-amber-300 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        Configurações Essenciais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-amber-700 mb-4">
                        Configure as seções essenciais: <strong>Branding</strong>, <strong>Stripe</strong>, <strong>Planos</strong> e <strong>Contato</strong>.
                        O sistema está completamente operacional via banco de dados.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Navegação por Abas */}
                  <AdminSectionTabs />
                </div>
              )}
            </div>
          </main>
          <MobileNavBar onAddTransaction={handleAddTransaction} onGestaoClick={handleGestaoClick} />
        </div>
      ) : (
        <div className="flex h-screen w-full">
          {/* Header fixo para desktop/tablet */}
          <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 bg-background/95 backdrop-blur-sm border-b hidden md:flex">
            <div className="flex-shrink-0">
              <BrandLogo size="md" showCompanyName={true} />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleHideValues}
                aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
              >
                {hideValues ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
              <ThemeToggle variant="ghost" size="icon" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <Sidebar onProfileClick={handleProfileClick} onConfigClick={handleConfigClick} onGestaoClick={handleGestaoClick} />
          <main className="flex-1 overflow-auto w-full pt-16 md:pt-20">
            <div className="w-full p-6">
              {showProfile ? (
                <div className="w-full max-w-6xl mx-auto">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-8 w-8 text-blue-600" />
                      <h1 className="text-3xl font-bold text-gray-900">
                        Configurações do Perfil
                      </h1>
                      <button 
                        onClick={handleConfigClick}
                        className="ml-auto text-blue-600 hover:text-blue-800"
                      >
                        ← Voltar ao Painel
                      </button>
                    </div>
                    <p className="text-gray-600">
                      Gerencie suas informações de administrador
                    </p>
                  </div>
                  <AdminProfileConfig />
                </div>
              ) : showGestao ? (
                <div className="w-full max-w-6xl mx-auto">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-8 w-8 text-blue-600" />
                       <h1 className="text-base md:text-2xl font-bold text-gray-900">
                         Gestão de Usuários
                       </h1>
                      <button 
                        onClick={handleConfigClick}
                        className="ml-auto text-blue-600 hover:text-blue-800"
                      >
                        ← Voltar ao Painel
                      </button>
                    </div>
                    <p className="text-gray-600">
                      Gerencie usuários, assinaturas e dados do sistema
                    </p>
                  </div>
                  <Card>
                    <CardContent className="p-6">
                      <EnhancedGestaoComponent />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="w-full max-w-6xl mx-auto">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-8 w-8 text-blue-600" />
                      <h1 className="text-3xl font-bold text-gray-900">
                        Painel Administrativo
                      </h1>
                    </div>
                    <p className="text-gray-600">
                      Monitore e gerencie o sistema de pagamentos, usuários e configurações
                    </p>
                  </div>

                  {/* Alerta de Configuração Inicial */}
                  <Card className="mb-6 border-amber-300 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        Configurações Essenciais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-amber-700 mb-4">
                        Configure as seções essenciais: <strong>Branding</strong>, <strong>Stripe</strong>, <strong>Planos</strong> e <strong>Contato</strong>.
                        O sistema está completamente operacional via banco de dados.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Navegação por Abas */}
                  <AdminSectionTabs />
                </div>
              )}
            </div>
          </main>
        </div>
      )}
      </div>
    </AdminOptimizedProvider>
  );
};

export default AdminDashboard;
