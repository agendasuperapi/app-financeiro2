import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Info,
  Crown,
  Tag,
  CreditCard,
  Users,
  Bell,
  Key,
  Settings,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

interface SettingsOption {
  id: string;
  label: string;
  icon: React.ElementType;
  tab: string;
}

const settingsOptions: SettingsOption[] = [
  {
    id: 'info',
    label: 'Informações',
    icon: Info,
    tab: 'info'
  },
  {
    id: 'plans',
    label: 'Planos',
    icon: Crown,
    tab: 'plans'
  },
  {
    id: 'categories',
    label: 'Categorias',
    icon: Tag,
    tab: 'categories'
  },
  {
    id: 'contas',
    label: 'Contas',
    icon: CreditCard,
    tab: 'contas'
  },
  {
    id: 'dependents',
    label: 'Dependentes',
    icon: Users,
    tab: 'dependents'
  },
  {
    id: 'notifications',
    label: 'Notificações',
    icon: Bell,
    tab: 'notifications'
  },
  {
    id: 'password',
    label: 'Senha',
    icon: Key,
    tab: 'password'
  },
  {
    id: 'preferences',
    label: 'Preferências',
    icon: Settings,
    tab: 'preferences'
  }
];

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      staggerChildren: 0.03
    }
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.95,
    transition: {
      duration: 0.15
    }
  }
};

const itemVariants = {
  hidden: {
    opacity: 0,
    x: -10
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2
    }
  }
};

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onOpenChange, trigger }) => {
  const navigate = useNavigate();

  const handleOptionClick = (tab: string) => {
    console.log('Settings option clicked:', tab);
    
    // Salvar a aba no localStorage para que o ProfilePage abra nela
    localStorage.setItem('profileActiveTab', tab);
    
    // Fechar o popup primeiro
    onOpenChange(false);
    
    // Navegar para o profile após um pequeno delay
    setTimeout(() => {
      navigate('/profile');
    }, 100);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
      
      <PopoverContent 
        side="top" 
        align="end" 
        className="w-[280px] p-0 mb-2 shadow-lg border-2"
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="font-semibold text-base">Configurações</h3>
        </div>
        
        <div className="py-1 max-h-[400px] overflow-y-auto">
          {settingsOptions.map((option, index) => (
            <React.Fragment key={option.id}>
              <Button
                variant="ghost"
                className="w-full justify-between px-4 py-3 h-auto rounded-none hover:bg-accent"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOptionClick(option.tab);
                }}
              >
                <div className="flex items-center gap-3">
                  <option.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-normal">{option.label}</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </Button>
              {index < settingsOptions.length - 1 && (
                <Separator className="my-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SettingsDrawer;
