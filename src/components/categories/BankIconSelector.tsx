import React from 'react';
import { 
  Wallet,
  CreditCard,
  Banknote,
  Building2,
  Landmark,
  DollarSign,
  PiggyBank,
  QrCode,
  LucideProps
} from 'lucide-react';

interface BankIconSelectorProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

type LucideIconComponent = React.ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
>;

interface IconOption {
  name: string;
  component?: LucideIconComponent;
  text?: string;
  color?: string;
  bgColor?: string;
}

const icons: IconOption[] = [
  // Ícones gerais
  { name: 'wallet', component: Wallet },
  { name: 'credit-card', component: CreditCard },
  { name: 'banknote', component: Banknote },
  { name: 'qr-code', component: QrCode },
  { name: 'landmark', component: Landmark },
  { name: 'building-2', component: Building2 },
  { name: 'piggy-bank', component: PiggyBank },
  { name: 'dollar-sign', component: DollarSign },
  
  // Bancos brasileiros com iniciais
  { name: 'banco-do-brasil', text: 'BB', color: '#FFFF00', bgColor: '#003087' },
  { name: 'caixa', text: 'CEF', color: '#FFFFFF', bgColor: '#0066A1' },
  { name: 'itau', text: 'Itaú', color: '#FFFFFF', bgColor: '#EC7000' },
  { name: 'bradesco', text: 'Brad', color: '#FFFFFF', bgColor: '#CC092F' },
  { name: 'santander', text: 'Sant', color: '#FFFFFF', bgColor: '#EC0000' },
  { name: 'nubank', text: 'Nu', color: '#FFFFFF', bgColor: '#820AD1' },
  { name: 'inter', text: 'Inter', color: '#FFFFFF', bgColor: '#FF7A00' },
  { name: 'pix', text: 'PIX', color: '#FFFFFF', bgColor: '#32BCAD' },
];

const BankIconSelector: React.FC<BankIconSelectorProps> = ({ selectedIcon, onSelectIcon }) => {
  return (
    <div className="grid grid-cols-6 gap-2 py-2">
      {icons.map((icon) => {
        const isSelected = selectedIcon === icon.name;
        
        if (icon.component) {
          const IconComponent = icon.component;
          return (
            <button
              key={icon.name}
              type="button"
              onClick={() => onSelectIcon(icon.name)}
              className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${
                isSelected ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <IconComponent size={20} />
            </button>
          );
        }
        
        // Render text-based bank icons
        return (
          <button
            key={icon.name}
            type="button"
            onClick={() => onSelectIcon(icon.name)}
            className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-xs transition-all ${
              isSelected ? 'ring-2 ring-primary' : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: icon.bgColor,
              color: icon.color,
            }}
          >
            {icon.text}
          </button>
        );
      })}
    </div>
  );
};

export default BankIconSelector;
