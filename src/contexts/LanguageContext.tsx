import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, Language, getLanguageByCode } from '@/lib/languages';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (code: string) => void;
  availableLanguages: Language[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'care-language-preference';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(
    getLanguageByCode(DEFAULT_LANGUAGE)
  );

  // Load saved language preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      setCurrentLanguage(getLanguageByCode(saved));
    }
  }, []);

  const setLanguage = (code: string) => {
    const language = getLanguageByCode(code);
    setCurrentLanguage(language);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const availableLanguages = Object.values(SUPPORTED_LANGUAGES);

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
