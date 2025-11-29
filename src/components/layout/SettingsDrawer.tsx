import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();

  const handleOptionClick = (tab: string) => {
    // Salvar a aba no localStorage para que o ProfilePage abra nela
    localStorage.setItem('profileActiveTab', tab);
    // Navegar para o profile
    navigate('/profile');
    // Fechar o drawer
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] sm:w-[340px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-lg font-semibold">Configurações</SheetTitle>
        </SheetHeader>
        
        <div className="py-2">
          {settingsOptions.map((option, index) => (
            <React.Fragment key={option.id}>
              <Button
                variant="ghost"
                className="w-full justify-between px-6 py-4 h-auto rounded-none hover:bg-accent"
                onClick={() => handleOptionClick(option.tab)}
              >
                <div className="flex items-center gap-3">
                  <option.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-base font-normal">{option.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              {index < settingsOptions.length - 1 && (
                <Separator className="my-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsDrawer;
