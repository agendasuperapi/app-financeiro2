
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
  Utensils,
  Coffee,
  Pizza,
  ShoppingCart,
  ShoppingBag,
  Apple,
  Carrot,
  IceCream,
  Beef,
  Car,
  Bike,
  Bus,
  Train,
  Plane,
  Fuel,
  ParkingCircle,
  Ship,
  Heart,
  Pill,
  Stethoscope,
  Syringe,
  Hospital,
  Activity,
  Dumbbell,
  Droplet,
  Gamepad2,
  Film,
  Music,
  Tv,
  Camera,
  Book,
  BookOpen,
  GraduationCap,
  Briefcase,
  FileText,
  Folder,
  Save,
  Tag,
  Gift,
  ShoppingBasket,
  Zap,
  Lightbulb,
  Wifi,
  Phone,
  Mail,
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Baby,
  Dog,
  Cat,
  Shirt,
  Glasses,
  Watch,
  Scissors,
  Wrench,
  Hammer,
  Paintbrush,
  Circle,
  MoreHorizontal,
  Laptop,
  PlusCircle,
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
  // Finanças e Contas
  'wallet': Wallet,
  'credit-card': CreditCard,
  'banknote': Banknote,
  'qr-code': QrCode,
  'landmark': Landmark,
  'building-2': Building2,
  'building': Building,
  'university': University,
  'piggy-bank': PiggyBank,
  'dollar-sign': DollarSign,
  'circle-dollar-sign': CircleDollarSign,
  'badge-dollar-sign': BadgeDollarSign,
  'hand-coins': HandCoins,
  'coins': Coins,
  'arrow-left-right': ArrowLeftRight,
  'receipt': Receipt,
  'trending-up': TrendingUp,
  'store': Store,
  
  // Alimentação
  'utensils': Utensils,
  'coffee': Coffee,
  'pizza': Pizza,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  'apple': Apple,
  'carrot': Carrot,
  'ice-cream': IceCream,
  'beef': Beef,
  'shopping-basket': ShoppingBasket,
  
  // Transporte
  'car': Car,
  'bike': Bike,
  'bus': Bus,
  'train': Train,
  'plane': Plane,
  'fuel': Fuel,
  'parking-circle': ParkingCircle,
  'ship': Ship,
  
  // Saúde
  'heart': Heart,
  'pill': Pill,
  'stethoscope': Stethoscope,
  'syringe': Syringe,
  'hospital': Hospital,
  'activity': Activity,
  'dumbbell': Dumbbell,
  'droplet': Droplet,
  
  // Lazer e Entretenimento
  'gamepad-2': Gamepad2,
  'film': Film,
  'music': Music,
  'tv': Tv,
  'camera': Camera,
  
  // Educação
  'book': Book,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  
  // Trabalho
  'briefcase': Briefcase,
  'file-text': FileText,
  'folder': Folder,
  
  // Moradia e Utilidades
  'home': Home,
  'zap': Zap,
  'lightbulb': Lightbulb,
  'wifi': Wifi,
  
  // Comunicação
  'smartphone': Smartphone,
  'phone': Phone,
  'mail': Mail,
  
  // Organização
  'calendar': Calendar,
  'clock': Clock,
  'map-pin': MapPin,
  'save': Save,
  'tag': Tag,
  
  // Pessoas e Família
  'users': Users,
  'user': User,
  'baby': Baby,
  'dog': Dog,
  'cat': Cat,
  
  // Vestuário e Acessórios
  'shirt': Shirt,
  'glasses': Glasses,
  'watch': Watch,
  
  // Outros
  'gift': Gift,
  'scissors': Scissors,
  'wrench': Wrench,
  'hammer': Hammer,
  'paintbrush': Paintbrush,
  'circle': Circle,
  'more-horizontal': MoreHorizontal,
  'laptop': Laptop,
  'plus-circle': PlusCircle,
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
