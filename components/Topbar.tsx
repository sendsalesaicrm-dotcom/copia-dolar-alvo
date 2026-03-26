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
  const showMeuAcessor = location.pathname === '/meu-assessor';
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



        {/* Right corner: Notifications and User Menu Dropdown */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <NewsNotification />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};