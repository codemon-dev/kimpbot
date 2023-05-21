import React from 'react';
import { Navigation } from './components/nav';
import { Routes, Route, HashRouter } from 'react-router-dom';
import { Auth } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import { AuthProvider } from './provider/AuthProvider';
import { ProtectedRoute } from './pages/ProtectedRoute';
import 'semantic-ui-css/semantic.min.css'
import { StoreProvider } from './provider/StoreProvider';

export const AuthContext = React.createContext(null);
export const StoreContext = React.createContext(null);

export const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <StoreProvider>
          <Navigation />
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="auth" element={<Auth />} />
            <Route path="dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
          </Routes>
        </StoreProvider>
      </AuthProvider>
    </HashRouter>
  );
}
