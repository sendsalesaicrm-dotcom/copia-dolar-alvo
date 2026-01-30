import React from 'react';
import UserManagement from '../components/UserManagement';

const AdminPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">Painel Administrativo</h1>
      <UserManagement />
    </div>
  );
};

export default AdminPage;