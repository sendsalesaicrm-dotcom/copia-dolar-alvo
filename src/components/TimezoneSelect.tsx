import React, { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';

// Curated list of timezones + system tz
const COMMON_TZS = [
  'America/Sao_Paulo',
  'America/New_York',
  'Europe/Lisbon',
  'Europe/London',
  'UTC',
];

export const TimezoneSelect: React.FC = () => {
  const { timezone, setTimezone } = useSettings();
  const systemTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  const options = useMemo(() => {
    const set = new Set([systemTz, ...COMMON_TZS]);
    return Array.from(set.values());
  }, [systemTz]);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-foreground mb-1" htmlFor="timezone-select">
        Fuso horário do aplicativo
      </label>
      <select
        id="timezone-select"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        className="block w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
      >
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {tz === systemTz ? `${tz} (Sistema)` : tz}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted-foreground">
        Usado para marcar dias e renderizar o calendário. Persistido no dispositivo.
      </p>
    </div>
  );
};

export default TimezoneSelect;
