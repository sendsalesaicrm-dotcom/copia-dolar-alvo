import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

type GridValor = {
  id: string;
  meta_id: string;
  valor: number | string;
  marcado: boolean;
  posicao?: number;
  data_prevista?: string | null;
};

interface Props {
  startDate: string; // ISO date
  endDate: string; // ISO date
  entries: GridValor[];
  onToggle: (cell: GridValor) => void;
}

const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const formatAmount = (value: number | string) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
};

export const CalendarGrid: React.FC<Props> = ({ startDate, endDate, entries, onToggle }) => {
  const metaStart = useMemo(() => (startDate ? new Date(startDate) : null), [startDate]);
  const metaEnd = useMemo(() => (endDate ? new Date(endDate) : null), [endDate]);

  const initial = metaStart ?? new Date();
  const [displayedMonth, setDisplayedMonth] = useState<Date>(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const month = displayedMonth.getMonth();
  const year = displayedMonth.getFullYear();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDayOfMonth.getDay();

  // map entries by date ISO
  const mapByDate = useMemo(() => {
    const m: Record<string, GridValor> = {};
    for (const e of entries) {
      if (e.data_prevista) {
        const key = e.data_prevista.slice(0, 10);
        m[key] = e;
      }
    }
    return m;
  }, [entries]);

  // build cells for the month (based on displayedMonth)
  const cells: Array<{ date: Date | null; iso?: string }> = [];

  for (let i = 0; i < leadingBlanks; i++) cells.push({ date: null });
  for (let d = 1; d <= lastDayOfMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, iso: toISODate(date) });
  }

  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push({ date: null });

  const goPrev = () => setDisplayedMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => setDisplayedMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={goPrev} aria-label="Mês anterior" className="p-2 rounded hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-semibold">{displayedMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={goNext} aria-label="Próximo mês" className="p-2 rounded hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground mb-2">
        {weekdayLabels.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-4">
        {cells.map((c, idx) => {
          if (!c.date) return <div key={idx} />;

          const iso = c.iso!;
          const isWithin = new Date(iso) >= new Date(startDate) && new Date(iso) <= new Date(endDate);
          const entry = mapByDate[iso];
          const marked = !!entry && Boolean(entry.marcado);

          const baseClasses =
            'aspect-square rounded-2xl border flex items-center justify-center p-0 transition-colors relative overflow-hidden';

          const dayNumber = new Date(iso).getDate();

          if (!isWithin) {
            return (
              <div key={iso} className={`${baseClasses} border-border bg-transparent text-muted-foreground`}>
                <div className="absolute top-2 left-2 text-sm">{dayNumber}</div>
              </div>
            );
          }

          return (
            <button
              key={iso}
              onClick={() => entry && onToggle(entry)}
              className={`${baseClasses} ${
                marked ? 'bg-green-50 border-green-200' : 'bg-primary/5 border-border'
              } hover:brightness-95 text-foreground`}
              aria-pressed={marked}
            >
              <div className="absolute top-2 left-2 text-sm font-medium">{dayNumber}</div>

              <div className="flex items-center justify-center w-full h-full px-2">
                {entry ? (
                  <div className="text-sm font-semibold text-center">{formatAmount(entry.valor)}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">-</div>
                )}
              </div>

              {marked && (
                <div className="absolute top-2 right-2 text-green-600">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
