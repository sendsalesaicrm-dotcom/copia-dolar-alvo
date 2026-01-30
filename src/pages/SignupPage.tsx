import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Input } from '../../components/Input';
import { AuthLayout } from '../components/AuthLayout';
import { supabase } from '../lib/supabase';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = showLoading('Cadastrando...');

    const { error } = await supabase.auth.signUp({ email, password });

    dismissToast(toastId);
    setLoading(false);

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Cadastro realizado! Verifique seu email para confirmar sua conta.');
      navigate('/login');
    }
  };

  return (
    <AuthLayout title="Crie sua conta" subtitle="Comece a planejar seu futuro financeiro hoje.">
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
          placeholder="Mínimo 6 caracteres"
          icon={<Lock className="w-5 h-5 text-muted-foreground" />}
          type="password"
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            'Cadastrar'
          )}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Já tem uma conta?{' '}
        <Link to="/login" className="font-medium text-primary hover:text-primary/90 transition-colors">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
};

export default SignupPage;