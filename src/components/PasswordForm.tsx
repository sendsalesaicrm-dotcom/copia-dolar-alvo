import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { Input } from '../../components/Input';
import { supabase } from '../lib/supabase';
import { showError, showSuccess, showLoading, dismissToast } from '../utils/toast';

export const PasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const toastId = showLoading('Atualizando senha...');

    const { error: updateError } = await supabase.auth.updateUser({ password });

    dismissToast(toastId);
    setLoading(false);

    if (updateError) {
      console.error('Password update error:', updateError);
      showError('Falha ao atualizar a senha. Você precisa estar logado recentemente.');
    } else {
      showSuccess('Senha atualizada com sucesso!');
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="space-y-6 p-6 bg-card rounded-xl shadow-md border border-border">
      <h2 className="text-2xl font-semibold text-foreground">Segurança</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="new-password"
          label="Nova Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          icon={<Lock className="w-5 h-5 text-muted-foreground" />}
          type="password"
          error={error}
          showPasswordToggle
        />
        <Input
          id="confirm-password"
          label="Confirmar Nova Senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a nova senha"
          icon={<Lock className="w-5 h-5 text-muted-foreground" />}
          type="password"
          showPasswordToggle
        />

        <button
          type="submit"
          disabled={loading || !!error}
          className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            'Atualizar Senha'
          )}
        </button>
      </form>
    </div>
  );
};