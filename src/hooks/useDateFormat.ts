
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePreferences } from '@/contexts/PreferencesContext';

export const useDateFormat = () => {
  const { language } = usePreferences();

  const formatDate = (date: Date | string, formatString: string = 'dd/MM/yyyy') => {
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    
    if (language === 'pt') {
      return format(dateObject, formatString, { locale: ptBR });
    }
    
    return format(dateObject, formatString);
  };

  const formatMonth = (date: Date | string) => {
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    
    if (language === 'pt') {
      return format(dateObject, 'MMMM yyyy', { locale: ptBR });
    }
    
    return format(dateObject, 'MMMM yyyy');
  };

  const formatShortDate = (date: Date | string) => {
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    
    if (language === 'pt') {
      return format(dateObject, "d 'de' MMM", { locale: ptBR });
    }
    
    return format(dateObject, 'MMM d');
  };

  return {
    formatDate,
    formatMonth,
    formatShortDate
  };
};
