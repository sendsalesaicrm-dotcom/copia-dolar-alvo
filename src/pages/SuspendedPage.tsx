import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

const SuspendedPage: React.FC = () => {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRestore = async () => {
        if (!user) return;

        setLoading(true);
        const toastId = showLoading('Restaurando sua conta...');

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ deletion_scheduled_at: null })
                .eq('id', user.id);

            if (error) throw error;

            dismissToast(toastId);
            showSuccess('Conta restaurada com sucesso!');
            await refreshProfile();
            navigate('/');

        } catch (error: any) {
            dismissToast(toastId);
            showError('Erro ao restaurar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (!profile?.deletion_scheduled_at) {
        return null;
    }

    const deletionDate = new Date(profile.deletion_scheduled_at);
    const finalDeletionDate = new Date(deletionDate);
    finalDeletionDate.setDate(finalDeletionDate.getDate() + 30);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full bg-card rounded-2xl shadow-xl border border-border p-8 text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-12 h-12 text-destructive" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-4">Conta Suspensa</h1>

                <p className="text-muted-foreground mb-6">
                    Sua conta está programada para ser excluída permanentemente em:
                    <br />
                    <strong className="text-foreground">
                        {finalDeletionDate.toLocaleDateString('pt-BR')}
                    </strong>
                </p>

                <p className="text-sm text-muted-foreground mb-8">
                    Você ainda pode restaurar sua conta e recuperar todos os seus dados antes desta data.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={handleRestore}
                        disabled={loading}
                        className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        Restaurar Minha Conta
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full py-3 bg-muted text-muted-foreground font-semibold rounded-xl hover:bg-muted/80 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5" />
                        Sair
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuspendedPage;
