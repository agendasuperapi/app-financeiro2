
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePreferences } from '@/contexts/PreferencesContext';
import { formatBrazilTime } from '@/utils/timezoneUtils';

export const useDateFormat = () => {
  const { language } = usePreferences();

  const formatDate = (date: Date | string, formatString: string = 'dd/MM/yyyy') => {
    // Use Brasília timezone for display
    if (language === 'pt') {
      return formatBrazilTime(date, formatString);
    }
    
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    return format(dateObject, formatString);
  };

  const formatMonth = (date: Date | string) => {
    // Use Brasília timezone for display
    if (language === 'pt') {
      return formatBrazilTime(date, 'MMMM yyyy');
    }
    
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    return format(dateObject, 'MMMM yyyy');
  };

  const formatShortDate = (date: Date | string) => {
    // Use Brasília timezone for display
    if (language === 'pt') {
      return formatBrazilTime(date, "d 'de' MMM");
    }
    
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    return format(dateObject, 'MMM d');
  };

  return {
    formatDate,
    formatMonth,
    formatShortDate
  };
};
