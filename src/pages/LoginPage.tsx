import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Input } from '../../components/Input';
import { AuthLayout } from '../components/AuthLayout';
import { supabase } from '../lib/supabase';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = showLoading('Entrando...');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    dismissToast(toastId);
    setLoading(false);

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Login realizado com sucesso!');
      navigate('/'); // Redireciona para a rota protegida
    }
  };

  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre na sua conta para acessar o planejador.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu.email@exemplo.com"
          icon={<Mail className="w-5 h-5 text-muted-foreground" />}
          type="email"
        />
        <Input
          id="password"
          label="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          icon={<Lock className="w-5 h-5 text-muted-foreground" />}
          type="password"
          showPasswordToggle
        />
        
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/90 transition-colors">
            Esqueceu a senha?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            'Entrar'
          )}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Não tem uma conta?{' '}
        <Link to="/signup" className="font-medium text-primary hover:text-primary/90 transition-colors">
          Cadastre-se
        </Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;