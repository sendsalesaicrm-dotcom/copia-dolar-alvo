import React from 'react';
import { ProfileForm } from '../components/ProfileForm';
import { PasswordForm } from '../components/PasswordForm';
import { ThemeToggle } from '../components/ThemeToggle';


const SettingsPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Configurações</h1>
          <ThemeToggle />
        </div>
        
        <div className="space-y-8">
          <ProfileForm />
          <PasswordForm />
        </div>
      </div>
      <footer className="text-center mt-8 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Dolar Alvo. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SettingsPage;