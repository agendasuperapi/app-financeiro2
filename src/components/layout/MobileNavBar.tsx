
import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useAppContext } from '@/contexts/AppContext';
import { LayoutDashboard, Receipt, Settings, Crown, Plus, Calendar, Clock, Shield, User, FileText, Tag, Users, AlertTriangle, CreditCard } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileNavBarProps {
  onAddTransaction?: (type: 'income' | 'expense') => void;
  onGestaoClick?: () => void;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({
  onAddTransaction,
  onGestaoClick
}) => {
  const { t } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { user } = useAppContext();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [activeAdminSection, setActiveAdminSection] = useState<string>('gestao');
  
  // Redirecionar para login se não estiver logado
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Verificar se estamos na página de administração
  const isAdminPage = location.pathname === '/admin';

  const quickActionItems = [
    {
      icon: Receipt,
      label: 'Transações',
      action: () => {
        navigate('/transactions');
        setIsQuickActionsOpen(false);
      },
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100'
    },
    {
      icon: FileText,
      label: 'Anotações',
      action: () => {
        navigate('/notes');
        setIsQuickActionsOpen(false);
      },
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100'
    },
    {
      icon: Calendar,
      label: t('schedule.title'),
      action: () => {
        navigate('/schedule');
        setIsQuickActionsOpen(false);
      },
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100'
    },
    {
      icon: AlertTriangle,
      label: 'Metas/Limites',
      action: () => {
        navigate('/limits');
        setIsQuickActionsOpen(false);
      },
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 hover:bg-yellow-100'
    },
    {
      icon: Clock,
      label: 'Lembretes',
      action: () => {
        navigate('/lembrar');
        setIsQuickActionsOpen(false);
      },
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 hover:bg-amber-100'
    },
    {
      icon: FileText,
      label: 'Relatórios',
      action: () => {
        navigate('/reports');
        setIsQuickActionsOpen(false);
      },
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100'
    },
    {
      icon: Tag,
      label: 'Categorias',
      action: () => {
        navigate('/categories');
        setIsQuickActionsOpen(false);
      },
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100'
    },
    {
      icon: Settings,
      label: t('nav.settings'),
      action: () => {
        navigate('/settings');
        setIsQuickActionsOpen(false);
      },
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100'
    }
  ];

  // Se for admin na página de admin, mostrar apenas menu administrativo
  if (isAdmin && isAdminPage) {
    const adminMenuItems = [
      {
        id: 'gestao',
        icon: Users,
        label: 'Gestão',
        action: () => {
          setActiveAdminSection('gestao');
          if (onGestaoClick) {
            onGestaoClick();
          }
        }
      },
      {
        id: 'profile',
        icon: User,
        label: t('nav.profile'),
        href: '/profile'
      }
    ];

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
        <nav className="flex items-center justify-around py-2">
          {adminMenuItems.map((item) => {
            // Se o item tem uma ação (como Gestão), renderizar como button
            if (item.action) {
              return (
                <button
                  key={`action-${item.id}`}
                  onClick={item.action}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground min-w-0",
                    activeAdminSection === item.id
                      ? "bg-green-600 text-white shadow-md"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            }
            
            // Se o item tem href, renderizar como NavLink
            return (
              <NavLink
                key={item.href}
                to={item.href!}
                className={() =>
                  cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground min-w-0",
                    activeAdminSection === item.id
                      ? "bg-green-600 text-white shadow-md" 
                      : "text-muted-foreground"
                  )
                }
                onClick={() => {
                  setActiveAdminSection(item.id);
                }}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    );
  }

  // Menu padrão para usuários normais
  const defaultMenuItems = [
    {
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      href: '/dashboard'
    },
    {
      icon: Receipt,
      label: t('nav.transactions'),
      href: '/transactions'
    },
    {
      type: 'quick-actions',
      icon: Plus,
      label: '',
      href: '#'
    },
    {
      icon: Crown,
      label: t('nav.plans'),
      href: '/plans'
    },
    {
      icon: User,
      label: t('nav.profile'),
      href: '/profile'
    }
  ];
  
  // Determinar quais itens de menu mostrar
  let menuItems = defaultMenuItems;
  
  // Se for admin mas não estiver na página de admin, adicionar o item admin ao menu
  if (isAdmin && !isAdminPage) {
    const adminMenuItem = {
      icon: Shield,
      label: 'Admin',
      href: '/admin'
    };
    
    // Adicionar o item admin antes do último item (profile)
    menuItems = [...defaultMenuItems.slice(0, -1), adminMenuItem, defaultMenuItems[defaultMenuItems.length - 1]];
  }

  const containerVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.2,
        staggerChildren: 0.05
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 10
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <nav className="flex items-center justify-around py-2">
        {menuItems.map((item, index) => {
          if (item.type === 'quick-actions') {
            return (
              <Popover key="quick-actions" open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
                <PopoverTrigger asChild>
                  <button className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors", "hover:bg-accent hover:text-accent-foreground min-w-0", isQuickActionsOpen ? "bg-green-600 text-white shadow-md" : "text-muted-foreground")}>
                    <div className="rounded-full bg-primary text-primary-foreground p-1">
                      <Plus className="h-8 w-8 py-0" />
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 mb-2" align="center" side="top">
                  <AnimatePresence>
                    {isQuickActionsOpen && (
                      <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-1">
                        {quickActionItems.map(quickItem => (
                          <motion.div key={quickItem.label} variants={itemVariants}>
                            <Button variant="ghost" onClick={quickItem.action} className={`w-full justify-start gap-3 ${quickItem.bgColor} ${quickItem.color}`}>
                              <quickItem.icon className="h-4 w-4" />
                              <span>{quickItem.label}</span>
                            </Button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </PopoverContent>
              </Popover>
            );
          }
          return (
            <NavLink key={item.href} to={item.href} className={({
              isActive
            }) => cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors", "hover:bg-accent hover:text-accent-foreground min-w-0", isActive ? "bg-green-600 text-white shadow-md" : "text-muted-foreground")}>
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNavBar;
