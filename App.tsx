import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './src/components/ProtectedRoute';
import { AuthRedirect } from './src/components/AuthRedirect'; // New import
import { AppLayout } from './src/components/AppLayout';
import { SettingsProvider } from './src/context/SettingsContext';

// Pages
import DashboardPage from './pages/DashboardPage';
import PlannerPage from './pages/PlannerPage';
import LoginPage from './src/pages/LoginPage';
import SignupPage from './src/pages/SignupPage';
import ForgotPasswordPage from './src/pages/ForgotPasswordPage';
import UpdatePasswordPage from './src/pages/UpdatePasswordPage';
import SettingsPage from './src/pages/SettingsPage';
import SuitabilityPage from './src/pages/SuitabilityPage';
import FinancialGoalsPage from './src/pages/FinancialGoalsPage';
import CofrinhoPage from './src/pages/CofrinhoPage';
import AdminPage from './src/pages/AdminPage'; // New import
import MeuAcessorPage from './src/pages/MeuAcessorPage';
import SuspendedPage from './src/pages/SuspendedPage';

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <Router>
        <Routes>
          {/* Suspended Account Route */}
          <Route path="/suspended" element={<SuspendedPage />} />

          {/* Public Auth Routes (Blocked if authenticated) */}
          <Route
            path="/login"
            element={
              <AuthRedirect>
                <LoginPage />
              </AuthRedirect>
            }
          />
          <Route
            path="/signup"
            element={
              <AuthRedirect>
                <SignupPage />
              </AuthRedirect>
            }
          />

          {/* Password reset routes usually don't need AuthRedirect */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PlannerPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <FinancialGoalsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cofrinho"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CofrinhoPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suitability"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SuitabilityPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* Admin Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AppLayout>
                  <AdminPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/meu-acessor"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <MeuAcessorPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </SettingsProvider>
  );
};

export default App;