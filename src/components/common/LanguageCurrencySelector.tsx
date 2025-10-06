
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferences, Currency, Language } from '@/contexts/PreferencesContext';
import { Flag, Globe, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LanguageCurrencySelector = () => {
  const { currency, setCurrency, language, setLanguage, t } = usePreferences();
  const [timezone, setTimezone] = useState<string>('America/Sao_Paulo');
  const [loading, setLoading] = useState(true);

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
        .single();

      if (error) throw error;
      
      if (data && (data as any).fuso) {
        setTimezone((data as any).fuso);
      }
    } catch (error) {
      console.error('Error loading timezone:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value as Currency);
  };
  
  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

  const handleTimezoneChange = async (value: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('poupeja_users')
        .update({ fuso: value } as any)
        .eq('id', user.id);

      if (error) throw error;

      setTimezone(value);
      toast.success('Fuso horário atualizado com sucesso');
    } catch (error) {
      console.error('Error updating timezone:', error);
      toast.error('Erro ao atualizar fuso horário');
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col space-y-2">
        <label htmlFor="language-select" className="text-sm font-medium">
          {t('settings.language')}
        </label>
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger id="language-select" className="w-[200px]">
            <Globe className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t('settings.language')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex flex-col space-y-2">
        <label htmlFor="currency-select" className="text-sm font-medium">
          {t('settings.currency')}
        </label>
        <Select value={currency} onValueChange={handleCurrencyChange}>
          <SelectTrigger id="currency-select" className="w-[200px]">
            <Flag className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t('settings.currency')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="BRL">BRL (R$)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col space-y-2">
        <label htmlFor="timezone-select" className="text-sm font-medium">
          Fuso Horário
        </label>
        <Select value={timezone} onValueChange={handleTimezoneChange} disabled={loading}>
          <SelectTrigger id="timezone-select" className="w-[280px]">
            <Clock className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Selecione o fuso horário" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="America/Sao_Paulo">Brasil (UTC-3) - São Paulo</SelectItem>
              <SelectItem value="America/Manaus">Brasil (UTC-4) - Manaus</SelectItem>
              <SelectItem value="America/Rio_Branco">Brasil (UTC-5) - Acre</SelectItem>
              <SelectItem value="America/Noronha">Brasil (UTC-2) - Fernando de Noronha</SelectItem>
              <SelectItem value="America/New_York">EUA (UTC-5) - New York</SelectItem>
              <SelectItem value="America/Los_Angeles">EUA (UTC-8) - Los Angeles</SelectItem>
              <SelectItem value="Europe/London">Reino Unido (UTC+0) - London</SelectItem>
              <SelectItem value="Europe/Paris">França (UTC+1) - Paris</SelectItem>
              <SelectItem value="Asia/Tokyo">Japão (UTC+9) - Tokyo</SelectItem>
              <SelectItem value="Australia/Sydney">Austrália (UTC+10) - Sydney</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default LanguageCurrencySelector;
