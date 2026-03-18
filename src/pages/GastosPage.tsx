import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Trash2, TrendingDown, Calendar, DollarSign, X } from 'lucide-react';
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

const CATEGORIES = [
  { name: 'Alimentação', color: '#ef6037' },
  { name: 'Transporte', color: '#3b82f6' },
  { name: 'Lazer', color: '#8b5cf6' },
  { name: 'Moradia', color: '#10b981' },
  { name: 'Saúde', color: '#f59e0b' },
  { name: 'Educação', color: '#6366f1' },
  { name: 'Compras', color: '#ec4899' },
  { name: 'Outros', color: '#6b7280' },
];

const getCategoryColor = (cat: string) => CATEGORIES.find(c => c.name === cat)?.color || '#6b7280';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const GastosPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
    } else {
      setExpenses((data as Expense[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSave = async () => {
    if (!user) return;
    const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Informe um valor válido.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      amount: numAmount,
      category,
      description: description.trim() || null,
      expense_date: expenseDate,
    });
    if (error) {
      showError('Erro ao salvar gasto: ' + error.message);
    } else {
      showSuccess('Gasto registrado!');
      setAmount('');
      setDescription('');
      setCategory('Alimentação');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setShowForm(false);
      fetchExpenses();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      showError('Erro ao excluir: ' + error.message);
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const formatInputCurrency = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    const num = parseInt(clean, 10) / 100;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  // --- Stats ---
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

  const totalMonth = useMemo(() => monthExpenses.reduce((s, e) => s + Number(e.amount), 0), [monthExpenses]);

  const startOfWeek = useMemo(() => {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const totalWeek = useMemo(
    () => expenses.filter(e => new Date(e.expense_date + 'T00:00:00') >= startOfWeek).reduce((s, e) => s + Number(e.amount), 0),
    [expenses, startOfWeek]
  );

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const avgDaily = totalMonth / (now.getDate());

  // --- Pie Chart ---
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-foreground'}`}>
            Meus Gastos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{monthNames[currentMonth]} de {currentYear}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold shadow-lg hover:opacity-90 transition-all"
          style={{ backgroundColor: '#ef6037' }}
        >
          <Plus className="w-4 h-4" />
          Novo Gasto
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-red-500/10"><TrendingDown className="w-4 h-4 text-red-500" /></div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-card-foreground/50">Total do Mês</span>
          </div>
          <p className="text-2xl font-black text-card-foreground mt-2">{formatCurrency(totalMonth)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="w-4 h-4 text-blue-500" /></div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-card-foreground/50">Total da Semana</span>
          </div>
          <p className="text-2xl font-black text-card-foreground mt-2">{formatCurrency(totalWeek)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-emerald-500/10"><DollarSign className="w-4 h-4 text-emerald-500" /></div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-card-foreground/50">Média Diária</span>
          </div>
          <p className="text-2xl font-black text-card-foreground mt-2">{formatCurrency(avgDaily || 0)}</p>
        </motion.div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h2 className="text-lg font-bold text-card-foreground mb-4">Por Categoria</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Nenhum gasto este mês</div>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={getCategoryColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: '13px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(entry.name) }} />
                      <span className="text-card-foreground font-medium">{entry.name}</span>
                    </div>
                    <span className="font-bold text-card-foreground">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Expense List */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-card-foreground">Histórico de Gastos</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <TrendingDown className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum gasto registrado.<br/>Clique em "Novo Gasto" para começar.</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(e.category) }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-card-foreground truncate">
                        {e.description || e.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.category} · {new Date(e.expense_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-black text-red-500">- {formatCurrency(Number(e.amount))}</span>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Expense Modal */}
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
                <h3 className="text-xl font-black text-foreground">Novo Gasto</h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
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
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setCategory(c.name)}
                        className={`px-2 py-2 rounded-xl text-xs font-bold transition-all border ${category === c.name
                          ? 'text-white border-transparent shadow-md scale-105'
                          : 'bg-muted/30 border-border text-card-foreground hover:bg-muted/50'
                        }`}
                        style={category === c.name ? { backgroundColor: c.color } : {}}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-foreground/50 mb-1.5">Descrição (opcional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ex: iFood, Uber, aluguel..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-foreground/50 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSave}
                  disabled={saving || !amount}
                  className="w-full py-3.5 rounded-xl text-white font-black text-base shadow-lg hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#ef6037' }}
                >
                  {saving ? 'Salvando...' : 'Registrar Gasto'}
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
