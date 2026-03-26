import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Trash2, TrendingDown, TrendingUp, Calendar, Wallet, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { showError, showSuccess } from '../utils/toast';
import { useTheme } from '../context/ThemeContext';

interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string | null;
  expense_date: string;
  created_at: string;
}

interface Ganho {
  id: string;
  user_id: string;
  amount: number;
  category: string | null;
  description: string | null;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  { name: 'Alimentação', color: '#ef6037' },
  { name: 'Transporte', color: '#3b82f6' },
  { name: 'Lazer', color: '#8b5cf6' },
  { name: 'Moradia', color: '#10b981' },
  { name: 'Saúde', color: '#f59e0b' },
  { name: 'Educação', color: '#6366f1' },
  { name: 'Compras', color: '#ec4899' },
  { name: 'Outros', color: '#6b7280' },
];

const INCOME_CATEGORIES = [
  { name: 'Salário', color: '#10b981' },
  { name: 'Freelance', color: '#3b82f6' },
  { name: 'Investimentos', color: '#6366f1' },
  { name: 'Presente', color: '#ec4899' },
  { name: 'Venda', color: '#f59e0b' },
  { name: 'Outros', color: '#6b7280' },
];

const getCategoryColor = (cat: string, categories: { name: string; color: string }[]) =>
  categories.find(c => c.name === cat)?.color || '#6b7280';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const GastosPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ganhos, setGanhos] = useState<Ganho[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Tabs
  const [chartTab, setChartTab] = useState<'saidas' | 'entradas'>('saidas');
  const [historyTab, setHistoryTab] = useState<'gastos' | 'entradas'>('gastos');

  // Form state
  const [recordType, setRecordType] = useState<'saida' | 'entrada'>('saida');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [incomeCategory, setIncomeCategory] = useState('Salário');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false });
    if (!error) setExpenses((data as Expense[]) || []);
  }, [user]);

  const fetchGanhos = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('ganhos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setGanhos((data as Ganho[]) || []);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchExpenses(), fetchGanhos()]);
      setLoading(false);
    };
    load();
  }, [fetchExpenses, fetchGanhos]);

  const handleSave = async () => {
    if (!user) return;
    const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Informe um valor válido.');
      return;
    }
    setSaving(true);

    if (recordType === 'saida') {
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        amount: numAmount,
        category,
        description: description.trim() || null,
        expense_date: expenseDate,
      });
      if (error) { showError('Erro ao salvar gasto: ' + error.message); }
      else { showSuccess('Saída registrada!'); await fetchExpenses(); }
    } else {
      const { error } = await supabase.from('ganhos').insert({
        user_id: user.id,
        amount: numAmount,
        category: incomeCategory,
        description: description.trim() || null,
      });
      if (error) { showError('Erro ao salvar entrada: ' + error.message); }
      else { showSuccess('Entrada registrada!'); await fetchGanhos(); }
    }

    setAmount('');
    setDescription('');
    setCategory('Alimentação');
    setIncomeCategory('Salário');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setShowForm(false);
    setSaving(false);
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) showError('Erro ao excluir: ' + error.message);
    else setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleDeleteGanho = async (id: string) => {
    const { error } = await supabase.from('ganhos').delete().eq('id', id);
    if (error) showError('Erro ao excluir: ' + error.message);
    else setGanhos(prev => prev.filter(g => g.id !== id));
  };

  const formatInputCurrency = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    const num = parseInt(clean, 10) / 100;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  // Stats for current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthExpenses = useMemo(
    () => expenses.filter(e => {
      const d = new Date(e.expense_date + 'T00:00:00');
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }),
    [expenses, currentMonth, currentYear]
  );

  const monthGanhos = useMemo(
    () => ganhos.filter(g => {
      const d = new Date(g.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }),
    [ganhos, currentMonth, currentYear]
  );

  const totalSaidas = useMemo(() => monthExpenses.reduce((s, e) => s + Number(e.amount), 0), [monthExpenses]);
  const totalEntradas = useMemo(() => monthGanhos.reduce((s, g) => s + Number(g.amount), 0), [monthGanhos]);
  const saldo = totalEntradas - totalSaidas;

  // Pie charts
  const pieExpenses = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach(e => map.set(e.category, (map.get(e.category) || 0) + Number(e.amount)));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  const pieGanhos = useMemo(() => {
    const map = new Map<string, number>();
    monthGanhos.forEach(g => {
      const cat = g.category || 'Outros';
      map.set(cat, (map.get(cat) || 0) + Number(g.amount));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthGanhos]);

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const currentCategories = recordType === 'saida' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-foreground'}`}>
            Minha Carteira
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{monthNames[currentMonth]} de {currentYear}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold shadow-lg hover:opacity-90 transition-all"
          style={{ backgroundColor: '#ef6037' }}
        >
          <Plus className="w-4 h-4" />
          Novo Registro
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-emerald-500/10"><ArrowUpCircle className="w-4 h-4 text-emerald-500" /></div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-card-foreground/50">Entradas do Mês</span>
          </div>
          <p className="text-2xl font-black text-emerald-500 mt-2">{formatCurrency(totalEntradas)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-red-500/10"><ArrowDownCircle className="w-4 h-4 text-red-500" /></div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-card-foreground/50">Saídas do Mês</span>
          </div>
          <p className="text-2xl font-black text-red-500 mt-2">{formatCurrency(totalSaidas)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-2 rounded-lg ${saldo >= 0 ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
              <Wallet className={`w-4 h-4 ${saldo >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-card-foreground/50">Saldo Líquido</span>
          </div>
          <p className={`text-2xl font-black mt-2 ${saldo >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>{formatCurrency(saldo)}</p>
        </motion.div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
        {/* Chart Panel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          {/* Chart Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setChartTab('saidas')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${chartTab === 'saidas' ? 'bg-red-500 text-white' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
            >
              Por Saídas
            </button>
            <button
              onClick={() => setChartTab('entradas')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${chartTab === 'entradas' ? 'bg-emerald-500 text-white' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
            >
              Por Entradas
            </button>
          </div>

          {chartTab === 'saidas' ? (
            pieExpenses.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Nenhuma saída este mês</div>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieExpenses} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                        {pieExpenses.map((entry, i) => (
                          <Cell key={i} fill={getCategoryColor(entry.name, EXPENSE_CATEGORIES)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: '13px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {pieExpenses.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(entry.name, EXPENSE_CATEGORIES) }} />
                        <span className="text-card-foreground font-medium">{entry.name}</span>
                      </div>
                      <span className="font-bold text-card-foreground">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            pieGanhos.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Nenhuma entrada este mês</div>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieGanhos} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                        {pieGanhos.map((entry, i) => (
                          <Cell key={i} fill={getCategoryColor(entry.name, INCOME_CATEGORIES)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: '13px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {pieGanhos.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(entry.name, INCOME_CATEGORIES) }} />
                        <span className="text-card-foreground font-medium">{entry.name}</span>
                      </div>
                      <span className="font-bold text-card-foreground">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </motion.div>

        {/* History Panel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex gap-2">
            <button
              onClick={() => setHistoryTab('gastos')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${historyTab === 'gastos' ? 'bg-red-500 text-white' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
            >
              Saídas
            </button>
            <button
              onClick={() => setHistoryTab('entradas')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${historyTab === 'entradas' ? 'bg-emerald-500 text-white' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
            >
              Entradas
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : historyTab === 'gastos' ? (
            expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <TrendingDown className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma saída registrada.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(e.category, EXPENSE_CATEGORIES) }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-card-foreground truncate">{e.description || e.category}</p>
                        <p className="text-xs text-muted-foreground">{e.category} · {new Date(e.expense_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-black text-red-500">- {formatCurrency(Number(e.amount))}</span>
                      <button onClick={() => handleDeleteExpense(e.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all" title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            ganhos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma entrada registrada.<br />Fale com o Meu Assessor para registrar!</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {ganhos.map((g) => (
                  <div key={g.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(g.category || 'Outros', INCOME_CATEGORIES) }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-card-foreground truncate">{g.description || g.category || 'Entrada'}</p>
                        <p className="text-xs text-muted-foreground">{g.category || 'Outros'} · {new Date(g.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-black text-emerald-500">+ {formatCurrency(Number(g.amount))}</span>
                      <button onClick={() => handleDeleteGanho(g.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all" title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-3xl shadow-2xl p-8 ${theme === 'dark' ? 'bg-[#1a1a14] border border-white/10' : 'bg-white'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-foreground">Novo Registro</h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Type toggle */}
              <div className="flex gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setRecordType('saida')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${recordType === 'saida' ? 'bg-red-500 text-white border-red-500' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'}`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Saída
                </button>
                <button
                  type="button"
                  onClick={() => setRecordType('entrada')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${recordType === 'entrada' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'}`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Entrada
                </button>
              </div>

              <div className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-foreground/50 mb-1.5">Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={e => setAmount(formatInputCurrency(e.target.value))}
                    placeholder="0,00"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-lg font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-foreground/50 mb-1.5">Categoria</label>
                  <div className="relative">
                    <select
                      value={recordType === 'saida' ? category : incomeCategory}
                      onChange={e => recordType === 'saida' ? setCategory(e.target.value) : setIncomeCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 bg-background text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                      style={{ borderColor: getCategoryColor(recordType === 'saida' ? category : incomeCategory, currentCategories) }}
                    >
                      {currentCategories.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-foreground/50 mb-1.5">Descrição (opcional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={recordType === 'saida' ? 'Ex: iFood, Uber, aluguel...' : 'Ex: salário de março, venda de produto...'}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Date (only for expenses) */}
                {recordType === 'saida' && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-foreground/50 mb-1.5">Data</label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSave}
                  disabled={saving || !amount}
                  className="w-full py-3.5 rounded-xl text-white font-black text-base shadow-lg hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: recordType === 'saida' ? '#ef4444' : '#10b981' }}
                >
                  {saving ? 'Salvando...' : recordType === 'saida' ? 'Registrar Saída' : 'Registrar Entrada'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GastosPage;
