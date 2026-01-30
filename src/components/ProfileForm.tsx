import React, { useState, useEffect } from 'react';
import { User, Mail, Loader2 } from 'lucide-react';
import { Input } from '../../components/Input';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { showError, showSuccess, showLoading, dismissToast } from '../utils/toast';
import { AvatarUpload } from './AvatarUpload';

export const ProfileForm: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setEmail(profile.email || user?.email || '');
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile, user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const toastId = showLoading('Atualizando perfil...');

    try {
      // 1. Update profiles table (first_name and last_name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
            first_name: firstName.trim(),
            last_name: lastName.trim(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Update auth.users table (email) if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        showSuccess('Email de verificação enviado! Verifique sua caixa de entrada.');
      }

      dismissToast(toastId);
      showSuccess('Perfil atualizado com sucesso!');
      refreshProfile(user.id); // Passa o user.id explicitamente

    } catch (error) {
      dismissToast(toastId);
      console.error('Profile update error:', error);
      showError('Falha ao atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSuccess = (newUrl: string) => {
    setAvatarUrl(newUrl);
    refreshProfile(); // Refresh context to update profile data
  };

  return (
    <div className="space-y-6 p-6 bg-card rounded-xl shadow-md border border-border">
      <h2 className="text-2xl font-semibold text-foreground">Informações Pessoais</h2>
      
      {user && (
        <AvatarUpload 
          userId={user.id} 
          avatarUrl={avatarUrl} 
          onUploadSuccess={handleAvatarSuccess} 
        />
      )}

      <form onSubmit={handleProfileUpdate} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
            id="first-name"
            label="Nome"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Seu nome"
            icon={<User className="w-5 h-5 text-muted-foreground" />}
            />
            <Input
            id="last-name"
            label="Sobrenome"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Seu sobrenome"
            icon={<User className="w-5 h-5 text-muted-foreground" />}
            />
        </div>
        <Input
          id="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu.email@exemplo.com"
          icon={<Mail className="w-5 h-5 text-muted-foreground" />}
          type="email"
          helperText={email !== user?.email ? 'Uma verificação será enviada para o novo email.' : undefined}
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            'Salvar Alterações'
          )}
        </button>
      </form>
    </div>
  );
};