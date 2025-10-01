
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
  Circle,
  Home,
  ShoppingBag,
  Car,
  FilmIcon,
  Activity,
  BookOpen,
  FileText,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  PlusCircle,
  Utensils,
  Coffee,
  Smartphone,
  Scissors,
  Shirt,
  Plane,
  LucideProps
} from 'lucide-react';

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: number;
}

// Define a type that matches the Lucide components structure
type LucideIconComponent = React.ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
>;

// Create the icon map with the correct type
const iconMap: Record<string, LucideIconComponent> = {
  'wallet': Wallet,
  'credit-card': CreditCard,
  'banknote': Banknote,
  'qr-code': QrCode,
  'landmark': Landmark,
  'building-2': Building2,
  'piggy-bank': PiggyBank,
  'dollar-sign': DollarSign,
  'circle': Circle,
  'home': Home,
  'shopping-bag': ShoppingBag,
  'car': Car,
  'film': FilmIcon,
  'activity': Activity,
  'book': BookOpen,
  'file-text': FileText,
  'more-horizontal': MoreHorizontal,
  'briefcase': Briefcase,
  'laptop': Laptop,
  'trending-up': TrendingUp,
  'gift': Gift,
  'plus-circle': PlusCircle,
  'utensils': Utensils,
  'coffee': Coffee,
  'smartphone': Smartphone,
  'scissors': Scissors,
  'shirt': Shirt,
  'plane': Plane
};

// Bank text icons with their colors
const bankIcons: Record<string, { text: string; color: string; bgColor: string }> = {
  'banco-do-brasil': { text: 'BB', color: '#FFFF00', bgColor: '#003087' },
  'caixa': { text: 'CEF', color: '#FFFFFF', bgColor: '#0066A1' },
  'itau': { text: 'Itaú', color: '#FFFFFF', bgColor: '#EC7000' },
  'bradesco': { text: 'Brad', color: '#FFFFFF', bgColor: '#CC092F' },
  'santander': { text: 'Sant', color: '#FFFFFF', bgColor: '#EC0000' },
  'nubank': { text: 'Nu', color: '#FFFFFF', bgColor: '#820AD1' },
  'inter': { text: 'Inter', color: '#FFFFFF', bgColor: '#FF7A00' },
  'pix': { text: 'PIX', color: '#FFFFFF', bgColor: '#32BCAD' },
};

const CategoryIcon: React.FC<CategoryIconProps> = ({ icon, color, size = 20 }) => {
  // Check if it's a bank icon
  const bankIcon = bankIcons[icon];
  
  if (bankIcon) {
    return (
      <div 
        className="flex items-center justify-center rounded-full font-bold text-xs"
        style={{ 
          backgroundColor: bankIcon.bgColor,
          color: bankIcon.color,
          width: size + 10, 
          height: size + 10,
          fontSize: size * 0.4
        }}
      >
        {bankIcon.text}
      </div>
    );
  }
  
  // Regular Lucide icon
  const IconComponent = iconMap[icon] || Circle;

  return (
    <div className="flex items-center justify-center rounded-full" style={{ backgroundColor: color, width: size + 10, height: size + 10 }}>
      <IconComponent className="text-white" size={size} />
    </div>
  );
};

export default CategoryIcon;
