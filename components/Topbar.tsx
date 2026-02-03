import React from 'react';
import { Menu, Bot } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import UserMenu from '../src/components/UserMenu'; // Import UserMenu

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const showMeuAcessor = location.pathname === '/meu-acessor';
  return (
    <header className="relative z-20 bg-card shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
            {/* Sidebar Toggle */}
            <button
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground rounded-md"
            >
            <Menu className="w-6 h-6" />
            </button>
        </div>

        {/* Centered page label for Meu Assessor */}
        {showMeuAcessor && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none select-none">
            <Bot className="w-5 h-5" style={{ color: '#E35C02' }} />
            <span className="text-lg font-semibold text-foreground">Meu Assessor</span>
          </div>
        )}

        {/* Right corner: User Menu Dropdown */}
        <div className="flex items-center space-x-4">
            <UserMenu />
        </div>
      </div>
    </header>
  );
};