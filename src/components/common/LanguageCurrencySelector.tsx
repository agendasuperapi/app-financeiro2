
import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferences, Currency, Language, Timezone } from '@/contexts/PreferencesContext';
import { Flag, Globe, Clock } from 'lucide-react';

const LanguageCurrencySelector = () => {
  const { currency, setCurrency, language, setLanguage, timezone, setTimezone, t } = usePreferences();

  const handleCurrencyChange = (value: string) => {
    setCurrency(value as Currency);
  };
  
  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value as Timezone);
  };

  const timezoneLabels = {
    'America/Sao_Paulo': 'São Paulo (GMT-3)',
    'America/New_York': 'Nova York (GMT-5)',
    'Europe/London': 'Londres (GMT+0)',
    'Europe/Paris': 'Paris (GMT+1)',
    'Asia/Tokyo': 'Tóquio (GMT+9)',
    'Australia/Sydney': 'Sydney (GMT+10)',
    'America/Los_Angeles': 'Los Angeles (GMT-8)',
    'America/Chicago': 'Chicago (GMT-6)',
    'Europe/Berlin': 'Berlim (GMT+1)',
    'Asia/Shanghai': 'Xangai (GMT+8)',
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
          {t('settings.timezone', 'Fuso Horário')}
        </label>
        <Select value={timezone} onValueChange={handleTimezoneChange}>
          <SelectTrigger id="timezone-select" className="w-[200px]">
            <Clock className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t('settings.selectTimezone', 'Selecione o fuso horário')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.entries(timezoneLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default LanguageCurrencySelector;
