import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, ChevronDown, Calculator, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { showSuccess } from '../utils/toast';

const UserMenu: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.first_name || user?.email || 'Usuário';
  const avatarUrl = profile?.avatar_url;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    const success = await signOut();
    if (success) {
        showSuccess('Você saiu da sua conta.');
        navigate('/login');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar Display */}
        <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <User className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right bg-card border border-border rounded-lg shadow-xl z-50 p-2">
          <div className="px-3 py-2 border-b border-border mb-2">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          
          <div className="space-y-1">
            <Link
              to="/suitability"
              onClick={handleLinkClick}
              className="flex items-center w-full px-3 py-2 text-sm text-foreground rounded-md hover:bg-muted transition-colors"
            >
              <Calculator className="w-4 h-4 mr-2 text-primary" />
              Perfil de Investidor
            </Link>
            <Link
              to="/settings"
              onClick={handleLinkClick}
              className="flex items-center w-full px-3 py-2 text-sm text-foreground rounded-md hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
              Configurações
            </Link>
            
            {/* Theme Toggle Item */}
            <div className="flex items-center justify-between w-full px-3 py-2 text-sm text-foreground rounded-md hover:bg-muted transition-colors">
                <span>Alterar Tema</span>
                <ThemeToggle />
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-2 mt-2 border-t border-border">
            <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 text-sm text-destructive rounded-md hover:bg-destructive/10 transition-colors"
            >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;