import React, { useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { Input } from '../../components/Input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';

export const AccountDeletion: React.FC = () => {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const isScheduled = !!profile?.deletion_scheduled_at;

    const handleScheduleDeletion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !password) return;

        setLoading(true);
        setPasswordError('');
        const toastId = showLoading('Verificando credenciais...');

        try {
            // 1. Verify password by re-authenticating
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: password,
            });

            if (authError) {
                setPasswordError('Senha incorreta. Por favor, tente novamente.');
                dismissToast(toastId);
                setLoading(false);
                return;
            }

            // 2. Schedule deletion
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ deletion_scheduled_at: new Date().toISOString() })
                .eq('id', user.id);

            if (updateError) throw updateError;

            dismissToast(toastId);
            showSuccess('Sua conta foi programada para exclusão e será encerrada.');
            setIsModalOpen(false);

            // Auto sign out after scheduling
            setTimeout(() => {
                signOut();
            }, 2000);

        } catch (error: any) {
            dismissToast(toastId);
            showError('Erro ao processar solicitação: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelDeletion = async () => {
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

        } catch (error: any) {
            dismissToast(toastId);
            showError('Erro ao restaurar conta: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-card rounded-xl border border-destructive/20 overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Trash2 className="w-6 h-6 text-destructive" />
                    <h2 className="text-xl font-bold text-foreground">Zona de Perigo</h2>
                </div>

                <p className="text-muted-foreground mb-6 max-w-md">
                    Ao encerrar sua conta, todos os seus dados serão programados para exclusão definitiva.
                    Você terá um prazo de <strong>30 dias</strong> para cancelar esta ação caso mude de ideia.
                </p>

                {isScheduled ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 w-full flex flex-col items-center">
                        <div className="flex gap-3 justify-center">
                            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                            <div className="text-left">
                                <p className="text-destructive font-semibold">Exclusão em andamento</p>
                                <p className="text-sm text-destructive/80">
                                    Sua conta está programada para ser excluída. Acesso limitado será aplicado.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCancelDeletion}
                            disabled={loading}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Cancelar Exclusão e Restaurar Conta
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-all font-semibold shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        Encerrar minha conta
                    </button>
                )}
            </div>



            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmar Encerramento de Conta</DialogTitle>
                        <DialogDescription>
                            Para sua segurança, por favor insira sua senha para confirmar que deseja encerrar sua conta.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleScheduleDeletion} className="space-y-4 py-4">
                        <Input
                            id="confirm-password-deletion"
                            label="Sua Senha"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (passwordError) setPasswordError('');
                            }}
                            placeholder="Digite sua senha atual"
                            icon={<Lock className="w-5 h-5 text-muted-foreground" />}
                            error={passwordError}
                            required
                        />
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !password}
                                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-all font-semibold flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar e Encerrar Conta
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
