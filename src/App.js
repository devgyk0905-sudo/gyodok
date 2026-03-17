import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import './styles/global.css';

// 페이지 (lazy import)
import LoginPage      from './pages/LoginPage';
import HomePage       from './pages/HomePage';
import GyodokListPage from './pages/GyodokListPage';
import GyodokDetailPage from './pages/GyodokDetailPage';
import LibraryPage    from './pages/LibraryPage';
import MorePage       from './pages/MorePage';
import ProfilePage    from './pages/ProfilePage';
import AdminCreatePage  from './pages/admin/AdminCreatePage';
import AdminManagePage  from './pages/admin/AdminManagePage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin && !user.is_admin) return <Navigate to="/home" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="app-container">
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route path="/home" element={
                <PrivateRoute><HomePage /></PrivateRoute>
              } />
              <Route path="/gyodok" element={
                <PrivateRoute><GyodokListPage /></PrivateRoute>
              } />
              <Route path="/gyodok/:id" element={
                <PrivateRoute><GyodokDetailPage /></PrivateRoute>
              } />
              <Route path="/library" element={
                <PrivateRoute><LibraryPage /></PrivateRoute>
              } />
              <Route path="/more" element={
                <PrivateRoute><MorePage /></PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute><ProfilePage /></PrivateRoute>
              } />

              {/* 관리자 전용 */}
              <Route path="/admin/create" element={
                <AdminRoute><AdminCreatePage /></AdminRoute>
              } />
              <Route path="/admin/manage/:id" element={
                <AdminRoute><AdminManagePage /></AdminRoute>
              } />

              {/* 기본 리다이렉트 */}
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
