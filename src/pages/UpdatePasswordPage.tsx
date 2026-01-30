import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Input } from '../../components/Input';
import { AuthLayout } from '../components/AuthLayout';
import { supabase } from '../lib/supabase';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

const UpdatePasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the user is redirected here after password reset email click
    supabase.auth.getSession().then(() => {
        setSessionChecked(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        showError('A senha deve ter no mínimo 6 caracteres.');
        return;
    }

    setLoading(true);
    const toastId = showLoading('Atualizando senha...');

    const { error } = await supabase.auth.updateUser({ password });

    dismissToast(toastId);
    setLoading(false);

    if (error) {
      showError('Erro ao atualizar senha: ' + error.message);
    } else {
      showSuccess('Senha atualizada com sucesso! Você está logado.');
      navigate('/');
    }
  };

  if (!sessionChecked) {
    // Avoid rendering a spinner during session bootstrap.
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <AuthLayout title="Nova Senha" subtitle="Defina sua nova senha.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="password"
          label="Nova Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          icon={<Lock className="w-5 h-5 text-muted-foreground" />}
          type="password"
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center"
        >
          {loading ? 'Atualizando...' : 'Atualizar Senha'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default UpdatePasswordPage;