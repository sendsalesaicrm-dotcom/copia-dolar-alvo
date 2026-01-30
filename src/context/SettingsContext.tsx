import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type SettingsContextValue = {
  timezone: string;
  setTimezone: (tz: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const STORAGE_KEY = 'app.timezone';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const [timezone, setTimezoneState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || systemTz;
    } catch {
      return systemTz;
    }
  });

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
    try {
      localStorage.setItem(STORAGE_KEY, tz);
    } catch {}
  };

  useEffect(() => {
    // Keep storage in sync if it was empty initially
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) localStorage.setItem(STORAGE_KEY, timezone);
    } catch {}
  }, [timezone]);

  return (
    <SettingsContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
