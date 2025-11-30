
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
  ShoppingBagIcon,
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
  LucideProps
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  // Finanças e Contas
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
  { name: 'trending-up', component: TrendingUp },
  { name: 'store', component: Store },
  
  // Alimentação
  { name: 'utensils', component: Utensils },
  { name: 'coffee', component: Coffee },
  { name: 'pizza', component: Pizza },
  { name: 'shopping-cart', component: ShoppingCart },
  { name: 'shopping-bag', component: ShoppingBag },
  { name: 'apple', component: Apple },
  { name: 'carrot', component: Carrot },
  { name: 'ice-cream', component: IceCream },
  { name: 'beef', component: Beef },
  { name: 'shopping-basket', component: ShoppingBasket },
  
  // Transporte
  { name: 'car', component: Car },
  { name: 'bike', component: Bike },
  { name: 'bus', component: Bus },
  { name: 'train', component: Train },
  { name: 'plane', component: Plane },
  { name: 'fuel', component: Fuel },
  { name: 'parking-circle', component: ParkingCircle },
  { name: 'ship', component: Ship },
  
  // Saúde
  { name: 'heart', component: Heart },
  { name: 'pill', component: Pill },
  { name: 'stethoscope', component: Stethoscope },
  { name: 'syringe', component: Syringe },
  { name: 'hospital', component: Hospital },
  { name: 'activity', component: Activity },
  { name: 'dumbbell', component: Dumbbell },
  { name: 'droplet', component: Droplet },
  
  // Lazer e Entretenimento
  { name: 'gamepad-2', component: Gamepad2 },
  { name: 'film', component: Film },
  { name: 'music', component: Music },
  { name: 'tv', component: Tv },
  { name: 'camera', component: Camera },
  
  // Educação
  { name: 'book', component: Book },
  { name: 'book-open', component: BookOpen },
  { name: 'graduation-cap', component: GraduationCap },
  
  // Trabalho
  { name: 'briefcase', component: Briefcase },
  { name: 'file-text', component: FileText },
  { name: 'folder', component: Folder },
  
  // Moradia e Utilidades
  { name: 'home', component: Home },
  { name: 'zap', component: Zap },
  { name: 'lightbulb', component: Lightbulb },
  { name: 'wifi', component: Wifi },
  
  // Comunicação
  { name: 'smartphone', component: Smartphone },
  { name: 'phone', component: Phone },
  { name: 'mail', component: Mail },
  
  // Organização
  { name: 'calendar', component: Calendar },
  { name: 'clock', component: Clock },
  { name: 'map-pin', component: MapPin },
  { name: 'save', component: Save },
  { name: 'tag', component: Tag },
  
  // Pessoas e Família
  { name: 'users', component: Users },
  { name: 'user', component: User },
  { name: 'baby', component: Baby },
  { name: 'dog', component: Dog },
  { name: 'cat', component: Cat },
  
  // Vestuário e Acessórios
  { name: 'shirt', component: Shirt },
  { name: 'glasses', component: Glasses },
  { name: 'watch', component: Watch },
  
  // Outros
  { name: 'gift', component: Gift },
  { name: 'scissors', component: Scissors },
  { name: 'wrench', component: Wrench },
  { name: 'hammer', component: Hammer },
  { name: 'paintbrush', component: Paintbrush },
];

const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelectIcon }) => {
  return (
    <ScrollArea className="h-[240px] w-full rounded-md border">
      <div className="grid grid-cols-6 gap-2 p-4">
        {icons.map((icon) => {
          const IconComponent = icon.component;
          return (
            <button
              key={icon.name}
              type="button"
              onClick={() => onSelectIcon(icon.name)}
              className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                selectedIcon === icon.name ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <IconComponent size={18} />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default IconSelector;
