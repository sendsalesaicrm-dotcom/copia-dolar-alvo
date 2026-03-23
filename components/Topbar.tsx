import React from 'react';
import { Menu, Bot, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import UserMenu from '../src/components/UserMenu';
import { NewsNotification } from '../src/components/NewsNotification';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const showMeuAcessor = location.pathname === '/meu-acessor';
  return (
    <header className="relative z-20 bg-gradient-to-r from-background via-background to-background/80 border-b border-border/50 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          {/* Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Centered page label for Meu Assessor */}
        {showMeuAcessor && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none select-none">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
              <Bot className="w-4 h-4" style={{ color: '#E35C02' }} />
              <span className="text-sm font-semibold text-foreground">Meu Assessor</span>
              <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
            </div>
          </div>
        )}

        {/* Right corner: Notifications and User Menu Dropdown */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <NewsNotification />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};