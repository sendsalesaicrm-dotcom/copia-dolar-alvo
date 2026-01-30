import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import { Input } from '../../components/Input';
import { AuthLayout } from '../components/AuthLayout';
import { supabase } from '../lib/supabase';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = showLoading('Enviando link...');

    // Supabase requires a redirect URL configured in the project settings
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password',
    });

    dismissToast(toastId);
    setLoading(false);

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Link de recuperação enviado! Verifique seu email.');
      setMessageSent(true);
    }
  };

  return (
    <AuthLayout title="Recuperar Senha" subtitle="Insira seu email para receber um link de redefinição.">
      {messageSent ? (
        <div className="text-center p-4 bg-muted rounded-lg text-muted-foreground">
            <p>Se o email estiver cadastrado, você receberá um link para redefinir sua senha em breve.</p>
            <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary/90 transition-colors">
                Voltar para o Login
            </Link>
        </div>
      ) : (
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
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              'Enviar Link de Recuperação'
            )}
          </button>
          <div className="text-center">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancelar
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;