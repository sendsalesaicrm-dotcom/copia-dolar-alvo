import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl shadow-2xl border border-border">
        <div className="text-center">
          <Link to="/" className="text-2xl font-bold text-primary hover:text-primary/90 transition-colors notranslate" translate="no">
            Dólar Alvo
          </Link>
          <h2 className="mt-4 text-3xl font-extrabold text-foreground">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
};