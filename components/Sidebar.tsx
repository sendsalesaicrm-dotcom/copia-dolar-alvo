import React from 'react';
import { NavLink as RouterNavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Calculator, X, LogOut, Goal, Users, Wallet, PiggyBank, Bot } from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import { showSuccess } from '../src/utils/toast';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface NavLinkProps {
    to: string;
    children: React.ReactNode;
    icon: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children, icon }) => (
    <RouterNavLink 
        to={to} 
        className={({ isActive }) => 
            `flex items-center p-2 text-base font-normal rounded-lg transition-colors ${
                isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent group'
            }`
        }
    >
        {icon}
        <span className="ml-3">{children}</span>
    </RouterNavLink>
);


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        const success = await signOut();
        if (success) {
            showSuccess('Você saiu da sua conta.');
            navigate('/login');
        }
    };

    return (
        <>
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                aria-label="Sidebar"
            >
                <div className="h-full px-3 py-4 overflow-y-auto flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <span className="self-center text-xl font-semibold whitespace-nowrap text-sidebar-foreground">Dolar Alvo</span>
                            <button onClick={() => setIsOpen(false)} className="md:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground p-1 rounded-md">
                            <X className="w-6 h-6" />
                            </button>
                        </div>
                        <ul className="space-y-2">
                            <li>
                                <NavLink to="/" icon={<LayoutDashboard className="w-5 h-5" />}>Dashboard</NavLink>
                            </li>
                            <li>
                                <NavLink to="/planner" icon={<Calculator className="w-5 h-5" />}>Planejador</NavLink>
                            </li>
                            <li>
                                <NavLink to="/goals" icon={<Goal className="w-5 h-5" />}>Metas</NavLink>
                            </li>
                                                        {false && (
                                                            <li>
                                                                <NavLink to="/caixinha" icon={<Wallet className="w-5 h-5" />}>Caixinha</NavLink>
                                                            </li>
                                                        )}
                            <li>
                                <NavLink to="/cofrinho" icon={<PiggyBank className="w-5 h-5" />}>Cofrinho</NavLink>
                            </li>
                            <li>
                                <NavLink to="/meu-acessor" icon={<Bot className="w-5 h-5" />}>Meu Acessor</NavLink>
                            </li>
                            <li>
                            <NavLink to="/settings" icon={<Settings className="w-5 h-5" />}>Configurações</NavLink>
                            </li>
                            {profile?.role === 'admin' && (
                                <li>
                                    <NavLink to="/admin" icon={<Users className="w-5 h-5" />}>Admin</NavLink>
                                </li>
                            )}
                        </ul>
                    </div>
                    
                    {/* Logout Button */}
                    <div className="pt-4 border-t border-sidebar-border">
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full p-2 text-base font-normal rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent group"
                        >
                            <LogOut className="w-5 h-5 text-destructive" />
                            <span className="ml-3">Sair</span>
                        </button>
                    </div>
                </div>
            </aside>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-foreground/50 md:hidden"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}
        </>
    );
};