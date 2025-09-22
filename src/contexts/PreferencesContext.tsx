
import React, { createContext, useState, useContext, useEffect } from 'react';
import translations from '@/translations';
import { updateUserTimezone, getUserTimezone } from '@/services/userService';

// Define available language types
export type Language = 'pt' | 'en';

// Define the Currency type
export type Currency = 'USD' | 'BRL';

// Define available timezone types
export type Timezone = 
  | 'America/Sao_Paulo'
  | 'America/New_York'
  | 'Europe/London'
  | 'Europe/Paris'
  | 'Asia/Tokyo'
  | 'Australia/Sydney'
  | 'America/Los_Angeles'
  | 'America/Chicago'
  | 'Europe/Berlin'
  | 'Asia/Shanghai';

interface PreferencesContextProps {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, fallback?: string) => string;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  timezone: Timezone;
  setTimezone: (timezone: Timezone) => void;
}

const PreferencesContext = createContext<PreferencesContextProps>({
  language: 'pt',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  currency: 'BRL',
  setCurrency: () => {},
  timezone: 'America/Sao_Paulo',
  setTimezone: () => {},
});

interface PreferencesProviderProps {
  children: React.ReactNode;
}

const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  // Get language and currency from localStorage or use defaults
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem('language') as Language) || 'pt'
  );
  
  const [currency, setCurrency] = useState<Currency>(
    (localStorage.getItem('currency') as Currency) || 'BRL'
  );
  
  const [timezone, setTimezone] = useState<Timezone>('America/Sao_Paulo');

  // Load timezone from database on mount
  useEffect(() => {
    const loadTimezone = async () => {
      try {
        const userTimezone = await getUserTimezone();
        if (userTimezone) {
          setTimezone(userTimezone as Timezone);
        }
      } catch (error) {
        console.error('Error loading user timezone:', error);
      }
    };

    loadTimezone();
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  // Save timezone to database when it changes
  const handleTimezoneChange = async (newTimezone: Timezone) => {
    setTimezone(newTimezone);
    try {
      await updateUserTimezone(newTimezone);
      console.log('Timezone saved to database:', newTimezone);
    } catch (error) {
      console.error('Error saving timezone to database:', error);
    }
  };

  // Create translation function that supports multiple languages and fallback
  const t = (key: string, fallback?: string) => {
    const keyParts = key.split('.');
    let value: any = translations[language] || translations.pt; // Fallback to PT if language not available
    
    for (const k of keyParts) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k as keyof typeof value];
      } else {
        return fallback || key; // Key not found, return fallback or key itself
      }
    }
    
    return typeof value === 'string' ? value : (fallback || key);
  };

  return (
    <PreferencesContext.Provider value={{ 
      language,
      setLanguage,
      t,
      currency,
      setCurrency,
      timezone,
      setTimezone: handleTimezoneChange 
    }}>
      {children}
    </PreferencesContext.Provider>
  );
};

const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};

export { PreferencesProvider, usePreferences };
