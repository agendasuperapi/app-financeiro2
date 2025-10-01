
import React from 'react';
import { 
  Wallet,
  CreditCard,
  Banknote,
  Building2,
  Landmark,
  DollarSign,
  PiggyBank,
  Receipt,
  QrCode,
  Smartphone,
  ArrowLeftRight,
  CircleDollarSign,
  BadgeDollarSign,
  HandCoins,
  Coins,
  TrendingUp,
  Building,
  Store,
  Home,
  University,
  LucideProps
} from 'lucide-react';

interface IconSelectorProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

// Define a type that matches the Lucide components structure
type LucideIconComponent = React.ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
>;

// Update the icons array with the correct type
const icons: { name: string, component: LucideIconComponent }[] = [
  { name: 'wallet', component: Wallet },
  { name: 'credit-card', component: CreditCard },
  { name: 'banknote', component: Banknote },
  { name: 'qr-code', component: QrCode },
  { name: 'landmark', component: Landmark },
  { name: 'building-2', component: Building2 },
  { name: 'building', component: Building },
  { name: 'university', component: University },
  { name: 'piggy-bank', component: PiggyBank },
  { name: 'dollar-sign', component: DollarSign },
  { name: 'circle-dollar-sign', component: CircleDollarSign },
  { name: 'badge-dollar-sign', component: BadgeDollarSign },
  { name: 'hand-coins', component: HandCoins },
  { name: 'coins', component: Coins },
  { name: 'arrow-left-right', component: ArrowLeftRight },
  { name: 'receipt', component: Receipt },
  { name: 'smartphone', component: Smartphone },
  { name: 'trending-up', component: TrendingUp },
  { name: 'store', component: Store },
  { name: 'home', component: Home }
];

const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelectIcon }) => {
  return (
    <div className="grid grid-cols-6 gap-2 py-2">
      {icons.map((icon) => {
        const IconComponent = icon.component;
        return (
          <button
            key={icon.name}
            type="button"
            onClick={() => onSelectIcon(icon.name)}
            className={`w-8 h-8 rounded-md flex items-center justify-center ${
              selectedIcon === icon.name ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            <IconComponent size={16} />
          </button>
        );
      })}
    </div>
  );
};

export default IconSelector;
