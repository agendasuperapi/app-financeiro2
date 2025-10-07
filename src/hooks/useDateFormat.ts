import { useState, useEffect } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { formatInTimeZone } from 'date-fns-tz';
import { usePreferences } from '@/contexts/PreferencesContext';
import { supabase } from '@/integrations/supabase/client';

export const useDateFormat = () => {
  const { language } = usePreferences();
  const [timezone, setTimezone] = useState<string>('America/Sao_Paulo');

  useEffect(() => {
    loadTimezone();
  }, []);

  const loadTimezone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('poupeja_users')
        .select('fuso')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading timezone:', error);
        return;
      }
      
      if (data && (data as any).fuso) {
        setTimezone((data as any).fuso);
      }
    } catch (error) {
      console.error('Error loading timezone:', error);
    }
  };

  const formatDate = (date: Date | string, formatString: string = 'dd/MM/yyyy') => {
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    
    if (language === 'pt') {
      return formatInTimeZone(dateObject, timezone, formatString, { locale: ptBR });
    }
    
    return formatInTimeZone(dateObject, timezone, formatString);
  };

  const formatMonth = (date: Date | string) => {
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    
    if (language === 'pt') {
      return formatInTimeZone(dateObject, timezone, 'MMMM yyyy', { locale: ptBR });
    }
    
    return formatInTimeZone(dateObject, timezone, 'MMMM yyyy');
  };

  const formatShortDate = (date: Date | string) => {
    const dateObject = typeof date === 'string' ? new Date(date) : date;
    
    if (language === 'pt') {
      return formatInTimeZone(dateObject, timezone, "d 'de' MMM", { locale: ptBR });
    }
    
    return formatInTimeZone(dateObject, timezone, 'MMM d');
  };

  return {
    formatDate,
    formatMonth,
    formatShortDate,
    timezone
  };
};
