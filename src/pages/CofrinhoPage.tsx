import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Grid3X3, Plus, Target, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Input } from '../../components/Input';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { utcToZonedTime } from 'date-fns-tz';
import { useSettings } from '../context/SettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from '../components/ui/dialog';
import { dismissToast, showError, showLoading, showSuccess } from '../utils/toast';
import type { GridValor, MetaTabuleiro } from '@/types';

type FrequenciaTabuleiro = 'diaria' | 'semanal' | 'mensal';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatAmount = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (iso?: string) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
};

const formatFrequenciaLabel = (f?: FrequenciaTabuleiro) => {
  switch (f) {
    case 'diaria':
      return 'diária';
    case 'semanal':
      return 'semanal';
    case 'mensal':
      return 'mensal';
    default:
      return '-';
  }
};

const locales = { 'pt-BR': ptBR } as const;
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

const parseLocalDate = (iso: string) => {
  const base = iso.slice(0, 10);
  const [y, m, d] = base.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
};

const CalendarToolbar: React.FC<any> = (toolbar) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  return (
    <div className="rbc-toolbar flex items-center justify-center gap-4 my-3">
      <button
        type="button"
        className="px-3 py-1 rounded"
        style={{ backgroundColor: '#E35C02', color: '#ffffff' }}
        onClick={goToBack}
      >
        Anterior
      </button>
      <span className="text-foreground font-medium">{toolbar.label}</span>
      <button
        type="button"
        className="px-3 py-1 rounded"
        style={{ backgroundColor: '#E35C02', color: '#ffffff' }}
        onClick={goToNext}
      >
        Próximo
      </button>
    </div>
  );
};

type CalendarProps = {
  startDate: string;
  endDate: string;
  entries: GridValor[];
  frequencia: FrequenciaTabuleiro;
  onRequestConfirm: (cell: GridValor) => void;
};

const BigCalendarInline: React.FC<CalendarProps> = ({ startDate, endDate, entries, frequencia, onRequestConfirm }) => {
  const { timezone } = useSettings();
  const startBoundary = useMemo(() => parseLocalDate(startDate), [startDate]);
  const endBoundary = useMemo(() => parseLocalDate(endDate), [endDate]);
  const [currentDate, setCurrentDate] = useState<Date>(startBoundary);
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  useEffect(() => {
    setCurrentDate(startBoundary);
  }, [startBoundary]);

  const events = useMemo(() => {
    return entries
      .filter((e) => e.data_prevista)
      .map((e) => {
        const start = parseLocalDate(e.data_prevista!);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return {
          id: e.id,
          title: `${formatAmount(Number(e.valor))}`,
          start,
          end,
          allDay: true,
          extendedProps: e,
        } as any;
      });
  }, [entries]);

  const onSelectEvent = (event: any) => {
    const ext = (event && event.extendedProps) as GridValor | undefined;
    if (ext) {
      onRequestConfirm(ext);
      return;
    }
    const byId = entries.find((e) => e.id === event?.id);
    if (byId) onRequestConfirm(byId);
  };

  const findEntryForDate = useCallback(
    (date: Date): GridValor | undefined => {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      return entries.find((e) => {
        if (!e.data_prevista) return false;
        const ed = parseLocalDate(e.data_prevista);
        const edDay = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate(), 0, 0, 0, 0);
        return edDay.getTime() === d.getTime();
      });
    },
    [entries]
  );

  const onSelectSlot = ({ start }: { start: Date }) => {
    const entry = findEntryForDate(start);
    if (entry) onRequestConfirm(entry);
  };

  const EventItem: React.FC<{ event: any }> = ({ event }) => {
    const cell = (event?.extendedProps ?? null) as GridValor | null;
    const marcado = !!cell?.marcado;
    return (
      <div
        className={
          'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ' +
          (marcado ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-900')
        }
      >
        {marcado && <Check className="w-3.5 h-3.5" />}
        <span>{event.title}</span>
      </div>
    );
  };

  return (
    <div className="no-time-grid">
      <Calendar
        localizer={localizer}
        events={events}
        date={currentDate}
        view={currentView}
        defaultView={currentView}
        onView={(v) => setCurrentView(v as any)}
        views={['month']}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        culture="pt-BR"
        components={{ toolbar: CalendarToolbar as any, event: EventItem as any }}
        formats={{
          weekdayFormat: (date, culture, l) => {
            const full = l.format(date, 'EEEE', culture);
            return full.replace('-feira', '');
          },
          dayFormat: (date, culture, l) => l.format(date, 'd', culture),
          monthHeaderFormat: (date, culture, l) => l.format(date, 'MMMM yyyy', culture),
          timeGutterFormat: () => '',
          dateFormat: (date, culture, l) => {
            const isOffMonth =
              date.getMonth() !== currentDate.getMonth() ||
              date.getFullYear() !== currentDate.getFullYear();
            if (currentView === 'month' && isOffMonth) return '';
            return l.format(date, 'dd', culture);
          },
        }}
        step={1440}
        timeslots={1}
        messages={{
          next: 'Próximo',
          previous: 'Anterior',
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          day: 'Dia',
          agenda: 'Agenda',
        }}
        eventPropGetter={(event: any) => {
          if (currentView === 'month') {
            const start = event.start as Date;
            const isOffMonth =
              start.getMonth() !== currentDate.getMonth() ||
              start.getFullYear() !== currentDate.getFullYear();
            if (isOffMonth) return { style: { display: 'none' } } as any;
          }
          const marcado = !!event?.extendedProps?.marcado;
          if (marcado) {
            return { style: { cursor: 'not-allowed', opacity: 0.9, pointerEvents: 'none' } } as any;
          }
          return {} as any;
        }}
        dayPropGetter={(date) => {
          if (currentView === 'month') {
            const isOffMonth =
              date.getMonth() !== currentDate.getMonth() ||
              date.getFullYear() !== currentDate.getFullYear();
            if (isOffMonth) {
              return { style: { backgroundColor: 'transparent' } };
            }
          }
          const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
          const startDay = new Date(
            startBoundary.getFullYear(),
            startBoundary.getMonth(),
            startBoundary.getDate(),
            0, 0, 0, 0
          );
          const endDay = new Date(
            endBoundary.getFullYear(),
            endBoundary.getMonth(),
            endBoundary.getDate(),
            23, 59, 59, 999
          );

          if (d < startDay || d > endDay) {
            return { style: { backgroundColor: 'rgba(0,0,0,0.03)' } };
          }
          return {};
        }}
        getNow={() => {
          const zoned = utcToZonedTime(new Date(), timezone);
          return new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), 12);
        }}
        onNavigate={(date) => setCurrentDate(date)}
        onSelectEvent={onSelectEvent}
        selectable
        onSelectSlot={onSelectSlot as any}
      />
    </div>
  );
};


// Novo componente CalendarAporteBigCalendar
const CalendarAporteBigCalendar: React.FC<{
  grid: GridValor[];
  cellAnimation: { [cellId: string]: 'modal' | 'modalVideo' | 'gridVideo' | 'selo' | undefined };
  requestConfirm: (cell: GridValor) => void;
  setCellAnimation: React.Dispatch<React.SetStateAction<{ [cellId: string]: 'modal' | 'modalVideo' | 'gridVideo' | 'selo' | undefined }>>;
  confirmImageUrl: string;
  calendarVideoUrl: string;
}> = ({ grid, cellAnimation, requestConfirm, setCellAnimation, confirmImageUrl, calendarVideoUrl }) => {
  // Estado para navegação de data e view
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [currentView, setCurrentView] = React.useState<'month' | 'week' | 'day'>('month');

  // Monta os eventos para o Big Calendar
  const events = React.useMemo(() => {
    return grid.map(cell => {
      if (!cell.data_prevista) return null;
      const start = parseLocalDate(cell.data_prevista);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return {
        id: cell.id,
        title: formatAmount(Number(cell.valor)),
        start,
        end,
        allDay: true,
        marcado: cell.marcado,
        animState: cellAnimation[cell.id],
        cell,
      };
    }).filter(Boolean);
  }, [grid, cellAnimation]);

  // Customização do evento (quadradinho)
  const EventCell: React.FC<{ event: any }> = ({ event }) => {
    const { cell, marcado, animState } = event;
    let cellBg = 'bg-background';
    if (marcado && animState === 'gridVideo') cellBg = 'bg-green-50';
    else if (marcado && animState === 'selo') cellBg = 'bg-green-100';
    return (
      <div
        className={`relative aspect-square min-h-20 rounded-2xl text-xs md:text-base flex items-center justify-center transition-colors overflow-hidden ${cellBg}`}
      >
        {/* Removido o span da data */}
        {!marcado && (
          <button
            onClick={() => requestConfirm(cell)}
            disabled={marcado}
            title={cell.data_prevista ? new Date(cell.data_prevista).toLocaleDateString('pt-BR') : undefined}
            className={`absolute inset-0 w-full h-full flex items-center justify-center bg-transparent text-foreground rounded-2xl`}
            aria-pressed={marcado}
            aria-label={marcado ? 'Aporte já registrado' : 'Marcar aporte'}
          >
            <span className="text-center font-semibold">{formatAmount(Number(cell.valor))}</span>
          </button>
        )}
        {marcado && animState === 'gridVideo' && (
          <video
            className="w-full h-full max-h-full object-contain p-1"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => {
              setCellAnimation((prev) => ({ ...prev, [cell.id]: 'selo' }));
            }}
            onError={() => {
              setCellAnimation((prev) => ({ ...prev, [cell.id]: 'selo' }));
            }}
          >
            <source src={calendarVideoUrl} type="video/webm" />
          </video>
        )}
        {marcado && animState === 'selo' && (
          <>
            <img src={"https://pmcupvcxgtjhswijbjbw.supabase.co/storage/v1/object/public/galeria/calendario.svg"} className="w-full h-full max-h-full object-contain p-1 animate-bounce" style={{ animationIterationCount: 1, animationDuration: '0.5s' }} />
            <span className="absolute top-2 right-2 text-green-600 font-bold">✓</span>
          </>
        )}
        {marcado && (!animState || animState === 'modal' || animState === 'modalVideo') && (
          <img src={confirmImageUrl} alt="Porquinho" className="media-content w-full h-full max-h-full object-contain p-1" />
        )}
      </div>
    );
  };

  // Customização do slot vazio (dia sem célula)
  const DayPropGetter = (date: Date) => {
    const cell = grid.find(c => c.data_prevista && parseLocalDate(c.data_prevista).toDateString() === date.toDateString());
    if (!cell) {
      return { className: 'bg-muted border-dashed border-border', style: { border: '1px dashed #e5e7eb', background: '#f3f4f6' } };
    }
    return {};
  };

  // Ao clicar no dia
  const onSelectSlot = (slotInfo: any) => {
    const date = slotInfo.start;
    const cell = grid.find(c => c.data_prevista && parseLocalDate(c.data_prevista).toDateString() === date.toDateString());
    if (cell) requestConfirm(cell);
  };

  // Manipuladores de navegação
  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };
  const handleView = (view: any) => {
    setCurrentView(view);
  };

  // Estilo responsivo para o calendário
  React.useEffect(() => {
    const styleId = 'calendar-responsive-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        /* Garante que o calendário ocupe o espaço disponível sem overflow */
        .rbc-month-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 700px !important;
          height: 700px !important;
        }

        /* Faz com que cada linha de semana tenha o mesmo peso proporcional */
        .rbc-month-row {
          flex: 1 0 0px;
          min-height: 80px;
        }

        /* Ajusta o conteúdo para não vazar da célula */
        .rbc-row-content {
          height: 100%;
        }

        /* Remove bordas duplas e ajusta estética */
        .rbc-off-range-bg {
          background: rgba(0,0,0,0.02);
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  return (
    <div className="w-full flex justify-center items-center">
      {/* Corrigido: altura automática para o calendário não sumir */}
      <div className="w-full min-h-[700px] max-w-4xl mx-auto">
        <Calendar
          localizer={localizer}
          events={events as any}
          startAccessor="start"
          endAccessor="end"
          style={{ width: '100%', height: 'auto', minHeight: 400 }}
          culture="pt-BR"
          views={['month', 'week', 'day']}
          view={currentView}
          date={currentDate}
          onNavigate={handleNavigate}
          onView={handleView}
          components={{
            event: EventCell,
            toolbar: CalendarToolbar as any,
          }}
          selectable
          onSelectSlot={onSelectSlot}
          popup={false}
          dayPropGetter={DayPropGetter}
          messages={{
            next: 'Próximo',
            previous: 'Anterior',
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
          }}
        />
      </div>
    </div>
  );
};

const CofrinhoPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { timezone } = useSettings();

  const [nome, setNome] = useState('');
  const [objetivoTotal, setObjetivoTotal] = useState('10000');
  const [frequencia, setFrequencia] = useState<FrequenciaTabuleiro>('diaria');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [creating, setCreating] = useState(false);

  const [metas, setMetas] = useState<MetaTabuleiro[]>([]);
  const [selectedMetaId, setSelectedMetaId] = useState<string | null>(null);
  const [grid, setGrid] = useState<GridValor[]>([]);
  // Estado para controlar animação por célula (undefined | 'modal' | 'modalVideo' | 'gridVideo' | 'selo')
  const [cellAnimation, setCellAnimation] = useState<{ [cellId: string]: 'modal' | 'modalVideo' | 'gridVideo' | 'selo' | undefined }>({});
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  // Carregar do localStorage ao trocar de meta
  useEffect(() => {
    if (!selectedMetaId) return;
    const key = `cofrinho_anim_${selectedMetaId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) setCellAnimation(JSON.parse(raw));
      else setCellAnimation({});
    } catch {
      setCellAnimation({});
    }
  }, [selectedMetaId]);

  // Salvar no localStorage ao mudar cellAnimation
  useEffect(() => {
    if (!selectedMetaId) return;
    const key = `cofrinho_anim_${selectedMetaId}`;
    localStorage.setItem(key, JSON.stringify(cellAnimation));
  }, [cellAnimation, selectedMetaId]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCell, setConfirmCell] = useState<GridValor | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [confirmShowVideo, setConfirmShowVideo] = useState(false);
  const [confirmBtnDisabled, setConfirmBtnDisabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const confirmImageUrl = 'https://pmcupvcxgtjhswijbjbw.supabase.co/storage/v1/object/public/galeria/path1.svg';
  // URL da animação para o calendário (após aporte confirmado)
  const calendarVideoUrl = 'https://pmcupvcxgtjhswijbjbw.supabase.co/storage/v1/object/public/galeria/porquinho_final_calendario.webm';
  // URL da animação para o modal de confirmação (mantém a anterior se necessário)
  const confirmVideoUrl = 'https://pmcupvcxgtjhswijbjbw.supabase.co/storage/v1/object/public/galeria/porquinho_final_limpo2%20(1).webm';

  const selectedMeta = useMemo(
    () => metas.find((m) => m.id === selectedMetaId) ?? null,
    [metas, selectedMetaId]
  );

  const fetchMetas = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('metas')
      .select('id, user_id, nome, objetivo_total, status, frequencia, data_inicio, data_fim, created_at')
      .eq('user_id', userId)
      .eq('tipo', 'tabuleiro')
      .not('objetivo_total', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching metas cofrinho:', error);
      showError('Erro ao carregar seus cofrinhos.');
      return [];
    }

    return (data ?? []) as MetaTabuleiro[];
  }, []);

  const fetchGrid = useCallback(async (metaId: string) => {
    const { data, error } = await supabase
      .from('grid_valores')
      .select('id, meta_id, valor, marcado, posicao, data_prevista')
      .eq('meta_id', metaId)
      .order('posicao', { ascending: true });

    if (error) {
      console.error('Error fetching grid:', error);
      showError('Erro ao carregar o tabuleiro.');
      return [];
    }

    return (data ?? []) as GridValor[];
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setMetas([]);
      setSelectedMetaId(null);
      setGrid([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchMetas(user.id)
      .then((fetched) => {
        setMetas(fetched);
        setSelectedMetaId((prev) => prev ?? (fetched[0]?.id ?? null));
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, fetchMetas]);

  useEffect(() => {
    if (!selectedMetaId) {
      setGrid([]);
      return;
    }
    fetchGrid(selectedMetaId).then(setGrid);
  }, [selectedMetaId, fetchGrid]);

  useEffect(() => {
    if (!user || !selectedMetaId) return;

    const channel = supabase
      .channel(`grid_valores_${selectedMetaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grid_valores', filter: `meta_id=eq.${selectedMetaId}` },
        (payload) => {
          const next = payload.new as GridValor | null;
          const prev = payload.old as GridValor | null;

          setGrid((current) => {
            if (payload.eventType === 'INSERT' && next) {
              const merged = [...current, next];
              merged.sort((a, b) => a.posicao - b.posicao);
              return merged;
            }
            if (payload.eventType === 'UPDATE' && next) {
              return current.map((c) => (c.id === next.id ? { ...c, ...next } : c));
            }
            if (payload.eventType === 'DELETE' && prev) {
              return current.filter((c) => c.id !== prev.id);
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedMetaId]);

  const progress = useMemo(() => {
    if (!selectedMeta) return null;
    const objetivo = Number(selectedMeta.objetivo_total);
    const totalMarcado = grid.filter((g) => g.marcado).reduce((sum, g) => sum + Number(g.valor), 0);
    const pct = objetivo > 0 ? Math.min(100, (totalMarcado / objetivo) * 100) : 0;
    return { objetivo, totalMarcado, pct, restante: Math.max(0, objetivo - totalMarcado) };
  }, [grid, selectedMeta]);

  const handleCreateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!nome.trim()) {
      showError('Informe o nome da meta.');
      return;
    }

    const objetivo = Number(objetivoTotal);
    if (!Number.isFinite(objetivo) || objetivo <= 0) {
      showError('Informe um objetivo total válido.');
      return;
    }

    if (!dataInicio || !dataFim) {
      showError('Informe data de início e fim.');
      return;
    }

    if (new Date(dataFim) < new Date(dataInicio)) {
      showError('A data final deve ser maior ou igual à data inicial.');
      return;
    }

    setCreating(true);
    const toastId = showLoading('Criando meta e gerando tabuleiro...');

    try {
      // Use midday UTC to avoid timezone shifts that can subtract a day
      const { data, error } = await supabase.rpc('create_meta_with_grid_periods', {
        p_nome: nome.trim(),
        p_objetivo_total: objetivo,
        p_frequencia: frequencia,
        p_data_inicio: `${dataInicio}T12:00:00Z`,
        p_data_fim: `${dataFim}T12:00:00Z`,
      });

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Meta criada! Tabuleiro gerado.');

      const metaId = data as unknown as string;

      const fetched = await fetchMetas(user.id);
      setMetas(fetched);
      setSelectedMetaId(metaId || fetched[0]?.id || null);

      setNome('');
      setObjetivoTotal('10000');
      setFrequencia('diaria');
      setDataInicio('');
      setDataFim('');

    } catch (err: any) {
      dismissToast(toastId);
      console.error('Create meta tabuleiro error:', err);
      showError('Falha ao criar a meta.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMeta = async () => {
    if (!user || !selectedMetaId) return;

    const confirmDelete = window.confirm('Excluir este cofrinho? Isso apagará todos os quadradinhos marcados/não marcados.');
    if (!confirmDelete) return;

    const toastId = showLoading('Excluindo tabuleiro...');
    try {
      const { error } = await supabase.from('metas').delete().eq('id', selectedMetaId);
      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Cofrinho excluído.');

      const fetched = await fetchMetas(user.id);
      setMetas(fetched);
      setSelectedMetaId(fetched[0]?.id ?? null);
      setGrid([]);
    } catch (err) {
      dismissToast(toastId);
      console.error('Delete cofrinho error:', err);
      showError('Falha ao excluir o cofrinho.');
    }
  };

  const markAporte = async (cell: GridValor) => {
    if (cell.marcado) return;
    setGrid((prev) => prev.map((c) => (c.id === cell.id ? { ...c, marcado: true } : c)));
    // Iniciar animação para a célula marcada
    setCellAnimation((prev) => ({ ...prev, [cell.id]: 'gridVideo' }));
    const { error } = await supabase.from('grid_valores').update({ marcado: true }).eq('id', cell.id);
    if (error) {
      console.error('Mark aporte error:', error);
      showError('Falha ao registrar o aporte.');
      setGrid((prev) => prev.map((c) => (c.id === cell.id ? { ...c, marcado: false } : c)));
      setCellAnimation((prev) => {
        const next = { ...prev };
        delete next[cell.id];
        return next;
      });
    }
  };

  // Ao clicar no quadrado, abre modal (imagem)
  const requestConfirm = (cell: GridValor) => {
    if (cell.marcado) { showSuccess('Aporte já registrado para esta data.'); return; }
    setConfirmCell(cell);
    setSelectedCellId(cell.id);
    setConfirmText('Confirmar aporte desta data?');
    setConfirmOpen(true);
    setConfirmShowVideo(false);
    setConfirmBtnDisabled(false);
    setCellAnimation((prev) => ({ ...prev, [cell.id]: 'modal' }));
  };

  const handleConfirm = async () => {
    if (confirmCell) await markAporte(confirmCell);
    setConfirmOpen(false);
    setConfirmCell(null);
    setConfirmText('');
    setConfirmShowVideo(false);
    setConfirmBtnDisabled(false);
  };

  // Ao clicar "Sim" no modal, troca para vídeo no modal
  const startConfirmAnimation = async () => {
    setConfirmBtnDisabled(true);
    setConfirmShowVideo(true);
    if (selectedCellId) {
      setCellAnimation((prev) => ({ ...prev, [selectedCellId]: 'modalVideo' }));
    }
  };

  // Quando vídeo do modal termina, fecha modal e inicia vídeo no grid
  const onVideoEnded = async () => {
    setConfirmShowVideo(false);
    setConfirmBtnDisabled(false);
    setConfirmOpen(false);
    if (selectedCellId) {
      setCellAnimation((prev) => ({ ...prev, [selectedCellId]: 'gridVideo' }));
      // Marca aporte no banco
      const cell = grid.find((c) => c.id === selectedCellId);
      if (cell) await markAporte(cell);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (confirmShowVideo && v) {
      const tryPlay = async () => {
        try { await v.play(); }
        catch (err) { console.error('Video play failed:', err); await handleConfirm(); }
      };
      const t = setTimeout(tryPlay, 50);
      return () => clearTimeout(t);
    }
  }, [confirmShowVideo]);

  return (
    <div className="w-full px-0">
      {/* Header removido conforme solicitado */}

      <div className="mb-8 p-6 bg-card rounded-xl shadow-md border border-border w-full">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">Criar Cofrinho</h2>
        </div>

        <form onSubmit={handleCreateMeta} className="space-y-4">
          <Input id="tabuleiro-nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Viagem, Reserva, iPhone" icon={<Target className="w-5 h-5 text-muted-foreground" />} />
          <Input id="tabuleiro-objetivo" label="Objetivo Total (R$)" value={objetivoTotal} onChange={(e) => setObjetivoTotal(e.target.value)} placeholder="10000" prefix={<span className="inline-flex items-center px-3 text-sm text-muted-foreground">R$</span>} type="number" helperText="O cofrinho terá 1 quadradinho por período (dia/semana/mês)." />
          <div className="grid grid-cols-1 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="tabuleiro-frequencia">Frequência</label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center"><Target className="w-5 h-5 text-muted-foreground" /></div>
                <select id="tabuleiro-frequencia" value={frequencia} onChange={(e) => setFrequencia(e.target.value as FrequenciaTabuleiro)} className="block w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-foreground focus:outline-none sm:text-sm border-input focus:ring-ring focus:border-ring">
                  <option value="diaria">Diária</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="tabuleiro-data-inicio" label="Data de Início" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} placeholder="" icon={<Target className="w-5 h-5 text-muted-foreground" />} type="date" />
              <Input id="tabuleiro-data-fim" label="Data de Fim" value={dataFim} onChange={(e) => setDataFim(e.target.value)} placeholder="" icon={<Target className="w-5 h-5 text-muted-foreground" />} type="date" />
            </div>
          </div>

          <button type="submit" disabled={creating} className="w-full py-3 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center gap-2 text-base">
            {!creating && <Grid3X3 className="w-5 h-5 mr-1" />}
            {creating ? 'Gerando...' : 'Gerar Cofrinho'}
          </button>
        </form>
      </div>


      <div className="p-6 bg-card rounded-xl shadow-md border border-border min-h-[900px]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="text-sm">
            <div className="text-foreground"><span className="font-medium">tipo de aporte :</span> {formatFrequenciaLabel(selectedMeta?.frequencia as FrequenciaTabuleiro)}</div>
            <div className="text-foreground"><span className="font-medium">data de início:</span> {formatDate(selectedMeta?.data_inicio)}</div>
            <div className="text-foreground"><span className="font-medium">data do término:</span> {formatDate(selectedMeta?.data_fim)}</div>
            <p className="mt-2 text-muted-foreground">Clique nos quadradinhos para marcar.</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="block text-xs text-muted-foreground mb-1">Selecionar Meta</label>
            <select value={selectedMetaId ?? ''} onChange={(e) => setSelectedMetaId(e.target.value || null)} className="px-3 py-2 border rounded-lg bg-background text-foreground border-input">
              {metas.length === 0 ? (
                <option value="">Nenhuma meta</option>
              ) : (
                metas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome ?? 'Meta'}</option>
                ))
              )}
            </select>
            <button type="button" onClick={handleDeleteMeta} disabled={!selectedMetaId} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: '#E35C02' }} aria-label="Excluir cofrinho" title="Excluir cofrinho">
              <Trash2 className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          </div>
        </div>

        {/* Grid de dias do mês atual, com animação e marcação */}

        <CalendarAporteBigCalendar
          grid={grid}
          cellAnimation={cellAnimation}
          requestConfirm={requestConfirm}
          setCellAnimation={setCellAnimation}
          confirmImageUrl={confirmImageUrl}
          calendarVideoUrl={calendarVideoUrl}
        />

      </div>

      {/* Rodapé removido conforme solicitado */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Você tem certeza que quer registrar esse aporte?</DialogTitle>
            <DialogDescription className="text-center">{confirmText}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <div className="animacao-wrapper h-52 flex items-center justify-center overflow-hidden">
              {!confirmShowVideo && (
                <img src={confirmImageUrl} alt="Porquinho" className="media-content w-20 h-20 sm:w-30 sm:h-30 object-contain" />
              )}
              {confirmShowVideo && (
                <video ref={videoRef} className="media-content w-48 h-48 sm:w-56 sm:h-56 object-contain" muted playsInline preload="auto" onLoadedData={() => { if (confirmShowVideo) { try { videoRef.current?.play(); } catch {} } }} onError={async () => { await onVideoEnded(); }} onEnded={onVideoEnded}>
                  <source src={confirmVideoUrl} type="video/webm" />
                  Seu navegador não suporta vídeos.
                </video>
              )}
            </div>
          </div>
          <DialogFooter className="justify-center gap-3 sm:gap-6">
            <button type="button" onClick={startConfirmAnimation} disabled={confirmBtnDisabled} className="px-6 py-2 rounded-full text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed" style={{ backgroundColor: '#E35C02' }}>Sim</button>
            <DialogClose asChild>
              <button type="button" className="px-6 py-2 rounded-full bg-muted text-foreground font-semibold hover:bg-muted/70">Não</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CofrinhoPage;
