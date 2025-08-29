
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePreferences } from '@/contexts/PreferencesContext';
import { convertUTCToBrasilia } from '@/utils/timezoneUtils';

export const useDateFormat = () => {
  const { language } = usePreferences();

  const formatDate = (date: Date | string, formatString: string = 'dd/MM/yyyy') => {
    // Converte para horário de Brasília antes de formatar
    const brasiliaDate = convertUTCToBrasilia(date);
    
    if (language === 'pt') {
      return format(brasiliaDate, formatString, { locale: ptBR });
    }
    
    return format(brasiliaDate, formatString);
  };

  const formatMonth = (date: Date | string) => {
    // Converte para horário de Brasília antes de formatar
    const brasiliaDate = convertUTCToBrasilia(date);
    
    if (language === 'pt') {
      return format(brasiliaDate, 'MMMM yyyy', { locale: ptBR });
    }
    
    return format(brasiliaDate, 'MMMM yyyy');
  };

  const formatShortDate = (date: Date | string) => {
    // Converte para horário de Brasília antes de formatar
    const brasiliaDate = convertUTCToBrasilia(date);
    
    if (language === 'pt') {
      return format(brasiliaDate, "d 'de' MMM", { locale: ptBR });
    }
    
    return format(brasiliaDate, 'MMM d');
  };

  return {
    formatDate,
    formatMonth,
    formatShortDate
  };
};
