import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Grid3X3, Plus, Target, Trash2, PiggyBank } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Input } from '../../components/Input';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// Função utilitária para classes condicional (substitui cn)
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
import { utcToZonedTime } from 'date-fns-tz';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

// Helpers para formatação de moeda
const formatToBRL = (value: string | number) => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return '';
  const numericValue = parseInt(cleanValue, 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const parseBRLToNumber = (value: string) => {
  if (!value) return 0;
  const numericString = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(numericString);
};
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

// ...existing code...



// Novo componente CalendarAporteBigCalendar - versão customizada
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];


const CalendarAporteBigCalendar: React.FC<{
  grid: GridValor[];
  cellAnimation: { [cellId: string]: 'modal' | 'modalVideo' | 'gridVideo' | 'selo' | undefined };
  requestConfirm: (cell: GridValor) => void;
  setCellAnimation: React.Dispatch<React.SetStateAction<{ [cellId: string]: 'modal' | 'modalVideo' | 'gridVideo' | 'selo' | undefined }>>;
  confirmImageUrl: string;
  calendarVideoUrl: string;
}> = ({ grid, cellAnimation, requestConfirm, setCellAnimation, confirmImageUrl, calendarVideoUrl }) => {
  // Descobrir todos os meses únicos com aporte
  const monthsWithAporte = useMemo(() => {
    const set = new Set<string>();
    grid.forEach(cell => {
      if (cell.data_prevista) {
        const date = new Date(cell.data_prevista);
        set.add(`${date.getFullYear()}-${date.getMonth()}`);
      }
    });
    // Ordenar meses
    return Array.from(set)
      .map(str => {
        const [year, month] = str.split('-').map(Number);
        return new Date(year, month, 1);
      })
      .sort((a, b) => a.getTime() - b.getTime());
  }, [grid]);

  // Estado para navegação de mês (índice do array monthsWithAporte)
  const [monthIdx, setMonthIdx] = useState(0);
  useEffect(() => { setMonthIdx(0); }, [monthsWithAporte.length]);
  const currentMonth = monthsWithAporte[monthIdx] || new Date();

  // Função para obter todos os dias do mês atual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0 = domingo
  const emptyCells = Array(startDayOfWeek).fill(null);

  // Função para encontrar célula do grid para uma data
  const findCellForDate = (date: Date) => {
    return grid.find((c) => c.data_prevista && isSameDay(new Date(c.data_prevista), date));
  };

  // Renderização da célula do calendário
  const renderCell = (date: Date) => {
    const cell = findCellForDate(date);
    if (!cell) {
      // Célula sem aporte
      return (
        <div className="h-14 sm:h-24 flex items-center justify-center rounded-xl text-muted-foreground bg-muted border border-border text-xs sm:text-base">
          {format(date, 'd', { locale: ptBR })}
        </div>
      );
    }
    const marcado = !!cell.marcado;
    const animState = cellAnimation[cell.id];
    let cellBg = 'bg-background';
    if (marcado && (animState === 'gridVideo' || animState === 'selo')) cellBg = 'bg-orange-custom';

    return (
      <div
        className={cn('relative h-14 sm:h-24 rounded-2xl text-[10px] sm:text-base flex flex-col items-center justify-center transition-colors overflow-hidden', cellBg)}
      >
        <span className="absolute top-0.5 left-1 sm:top-1 sm:left-2 text-[9px] sm:text-xs text-muted-foreground font-bold select-none pointer-events-none">
          {format(date, 'd', { locale: ptBR })}
        </span>
        {!marcado && (
          <button
            onClick={() => requestConfirm(cell)}
            disabled={marcado}
            title={cell.data_prevista ? new Date(cell.data_prevista).toLocaleDateString('pt-BR') : undefined}
            className="absolute inset-0 w-full h-full flex items-center justify-center bg-transparent text-foreground rounded-2xl p-1"
            aria-pressed={marcado}
            aria-label={marcado ? 'Aporte já registrado' : 'Marcar aporte'}
          >
            <span className="text-center font-bold text-[9px] sm:text-sm leading-tight">{formatAmount(Number(cell.valor))}</span>
          </button>
        )}
        {marcado && animState === 'gridVideo' && (
          <video
            className="w-full h-auto max-h-full object-contain p-1"
            style={{ maxHeight: '100%', height: 'auto' }}
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
            <img src={confirmImageUrl} className="w-[80%] h-auto max-h-[80%] object-contain p-1 animate-bounce" style={{ animationIterationCount: 1, animationDuration: '0.5s', maxHeight: '90%', height: 'auto' }} />
            <span className="absolute top-2 right-2 text-green-600 font-bold">✓</span>
          </>
        )}
        {marcado && (!animState || animState === 'modal' || animState === 'modalVideo') && (
          <img src={confirmImageUrl} alt="Porquinho" className="media-content w-full h-auto max-h-full object-contain p-1" style={{ maxHeight: '100%', height: 'auto' }} />
        )}
      </div>
    );
  };

  // Navegação de mês restrita aos meses com aporte
  const handlePrevMonth = () => setMonthIdx((idx) => Math.max(0, idx - 1));
  const handleNextMonth = () => setMonthIdx((idx) => Math.min(monthsWithAporte.length - 1, idx + 1));

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[900px] mb-6 gap-2 sm:gap-4 px-2">
        <button onClick={handlePrevMonth} disabled={monthIdx === 0} className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-primary text-white disabled:opacity-50 text-xs sm:text-sm font-bold shadow-sm" aria-label="Anterior">
          Anterior
        </button>
        <span className="text-sm sm:text-xl font-black capitalize text-center text-foreground tracking-tight">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={handleNextMonth} disabled={monthIdx === monthsWithAporte.length - 1} className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-primary text-white disabled:opacity-50 text-xs sm:text-sm font-bold shadow-sm" aria-label="Próximo">
          Próximo
        </button>
      </div>
      <div className="w-full max-w-[900px] px-1 sm:px-0">
        <div className="grid grid-cols-7 gap-1 sm:gap-4 mb-2 sm:mb-4">
          {WEEKDAYS.map((day) => (
            <div key={day} className="h-8 sm:h-12 flex items-center justify-center text-[10px] sm:text-lg font-bold text-muted-foreground uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-4">
          {emptyCells.map((_, idx) => (
            <div key={`empty-${idx}`} className="h-14 sm:h-24" />
          ))}
          {daysInMonth.map((date) => (
            <React.Fragment key={date.toISOString()}>{renderCell(date)}</React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

const CofrinhoPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { timezone } = useSettings();
  const { theme } = useTheme();

  const [nome, setNome] = useState('');
  const [objetivoTotal, setObjetivoTotal] = useState(formatToBRL(10000));
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

  // URLs dinâmicas baseadas no tema
  const confirmImageUrl = theme === 'dark'
    ? 'https://blobgpedbfdjweiyxbzu.supabase.co/storage/v1/object/public/imagens/porquinho_branco.svg'
    : 'https://blobgpedbfdjweiyxbzu.supabase.co/storage/v1/object/public/imagens/porquinho.svg';

  const calendarVideoUrl = theme === 'dark'
    ? 'https://blobgpedbfdjweiyxbzu.supabase.co/storage/v1/object/public/imagens/porquinho_branco_calendario.webm'
    : 'https://blobgpedbfdjweiyxbzu.supabase.co/storage/v1/object/public/imagens/porquinho_final_calendario.webm';

  const confirmVideoUrl = theme === 'dark'
    ? 'https://blobgpedbfdjweiyxbzu.supabase.co/storage/v1/object/public/imagens/porquinho_branco.webm'
    : 'https://blobgpedbfdjweiyxbzu.supabase.co/storage/v1/object/public/imagens/porquinho_final_limpo.webm';

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

    const objetivo = parseBRLToNumber(objetivoTotal);
    if (isNaN(objetivo) || objetivo <= 0) {
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
      setObjetivoTotal(formatToBRL(10000));
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

      <div className="mb-8 p-4 sm:p-6 bg-card rounded-xl shadow-md border border-border w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">Criar Cofrinho</h2>
        </div>

        <form onSubmit={handleCreateMeta} className="space-y-4">
          <Input id="tabuleiro-nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Viagem, Reserva, iPhone" icon={<Target className="w-5 h-5 text-muted-foreground" />} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="tabuleiro-objetivo"
              label="Objetivo Total (R$)"
              value={objetivoTotal}
              onChange={(e) => setObjetivoTotal(formatToBRL(e.target.value))}
              placeholder="10.000,00"
              inputPrefix={<span className="inline-flex items-center px-3 text-sm text-muted-foreground">R$</span>}
              type="text"
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="tabuleiro-frequencia">Frequência</label>
              <div className="relative rounded-md shadow-sm">
                <select id="tabuleiro-frequencia" value={frequencia} onChange={(e) => setFrequencia(e.target.value as FrequenciaTabuleiro)} className="block w-full pr-4 py-2 border rounded-lg bg-background text-foreground focus:outline-none sm:text-sm border-input focus:ring-ring focus:border-ring">
                  <option value="diaria">Diária</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tabuleiro-data-inicio" className="block text-sm font-medium text-foreground mb-1">
                Data de Início
              </label>
              <input
                id="tabuleiro-data-inicio"
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="block w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none sm:text-sm border-input focus:ring-ring focus:border-ring"
              />
            </div>
            <Input id="tabuleiro-data-fim" label="Data de Fim" value={dataFim} onChange={(e) => setDataFim(e.target.value)} placeholder="" icon={<Target className="w-5 h-5 text-muted-foreground" />} type="date" />
          </div>

          <button type="submit" disabled={creating} className="w-full py-3 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center gap-2 text-base">
            {!creating && <PiggyBank className="w-5 h-5 mr-1" />}
            {creating ? 'Gerando...' : 'Gerar Cofrinho'}
          </button>
        </form>
      </div>


      <div className="p-4 sm:p-6 bg-card rounded-xl shadow-md border border-border min-h-[600px] sm:min-h-[800px] md:min-h-[900px] w-full max-w-4xl mx-auto">
        {metas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[600px]">
            <video
              src="https://blobgpedbfdjweiyxbzu.supabase.co/storage/v1/object/public/imagens/cofre_vazio_reverse.webm"
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-2xl h-[400px] sm:h-[500px] md:h-[600px] object-contain mb-4"
              style={{ background: 'transparent' }}
            />
            <p className="text-lg text-muted-foreground mt-2">Nenhum cofrinho criado ainda.</p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Rodapé removido conforme solicitado */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">Você tem certeza que quer registrar esse aporte?</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">{confirmText}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <div className="animacao-wrapper h-52 flex items-center justify-center overflow-hidden">
              {!confirmShowVideo && (
                <img src={confirmImageUrl} alt="Porquinho" className="media-content w-20 h-20 sm:w-30 sm:h-30 object-contain" />
              )}
              {confirmShowVideo && (
                <video ref={videoRef} className="media-content w-48 h-48 sm:w-56 sm:h-56 object-contain" muted playsInline preload="auto" onLoadedData={() => { if (confirmShowVideo) { try { videoRef.current?.play(); } catch { } } }} onError={async () => { await onVideoEnded(); }} onEnded={onVideoEnded}>
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
