import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Topbar } from '../../components/Topbar';
import { Sidebar } from '../../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { OnboardingModal } from './OnboardingModal';

interface AppLayoutProps {
    children: React.ReactNode;
}

// Rotas que fazem parte do fluxo de Onboarding
const ONBOARDING_ROUTES = ['/settings', '/suitability', '/goals'];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const { profile, isAuthenticated, loading, refreshProfile } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    const onboardingIncomplete = isAuthenticated && !loading && profile && !profile.onboarding_completed;
    
    // O modal deve ser exibido se o onboarding estiver incompleto E a rota atual NÃO for uma rota de onboarding.
    // Isso evita que o modal cubra a página onde o usuário precisa agir (ex: /settings).
    const showOnboardingModal = onboardingIncomplete && !ONBOARDING_ROUTES.includes(location.pathname);

    return (
        <div className="bg-background text-foreground font-sans min-h-screen flex tracking-tighter-6">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
            
            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
                <Topbar onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
            
            {/* Onboarding Modal Overlay */}
            {showOnboardingModal && profile && (
                <OnboardingModal 
                    profile={profile} 
                    refreshProfile={refreshProfile} 
                />
            )}
        </div>
    );
};