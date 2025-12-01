
import React, { createContext, useState, useContext, useEffect } from 'react';
import translations from '@/translations';

// Define available language types
export type Language = 'pt' | 'en';

// Define the Currency type
export type Currency = 'USD' | 'BRL';

interface PreferencesContextProps {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, fallback?: string) => string;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const PreferencesContext = createContext<PreferencesContextProps>({
  language: 'pt',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  currency: 'BRL',
  setCurrency: () => {},
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

  // Debug: log translations on mount
  useEffect(() => {
    console.log('🌍 PreferencesProvider mounted', { 
      language, 
      currency,
      translationsAvailable: !!translations,
      translationsKeys: Object.keys(translations || {}),
      ptAvailable: !!translations?.pt,
      enAvailable: !!translations?.en
    });
  }, [language, currency]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  // Create translation function that supports multiple languages and fallback
  const t = (key: string, fallback?: string) => {
    try {
      // Verify translations object exists
      if (!translations) {
        console.error('❌ Translations object is undefined');
        return fallback || key;
      }

      // Get language translations
      const langTranslations = translations[language];
      if (!langTranslations) {
        console.error(`❌ Translations for language '${language}' not found`);
        return fallback || key;
      }

      // Navigate through nested keys
      const keyParts = key.split('.');
      let value: any = langTranslations;
      
      for (const k of keyParts) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Key not found
          return fallback || key;
        }
      }
      
      // Return string value or fallback
      return typeof value === 'string' ? value : (fallback || key);
    } catch (error) {
      console.error('❌ Translation error:', error, { key, language });
      return fallback || key;
    }
  };

  return (
    <PreferencesContext.Provider value={{ 
      language,
      setLanguage,
      t,
      currency,
      setCurrency 
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
