import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import './styles/global.css';

import LoginPage        from './pages/LoginPage';
import HomePage         from './pages/HomePage';
import GyodokListPage   from './pages/GyodokListPage';
import GyodokDetailPage from './pages/GyodokDetailPage';
import LibraryPage      from './pages/LibraryPage';
import MorePage         from './pages/MorePage';
import ProfilePage      from './pages/ProfilePage';
import AdminCreatePage  from './pages/admin/AdminCreatePage';
import AdminManagePage  from './pages/admin/AdminManagePage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

// 교독 관리(수정/삭제/추방)는 관리자 또는 방장만 — 라우트 레벨에선 로그인 여부만 체크
// 방장 여부는 AdminManagePage 내부에서 처리
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
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

              {/* 교독 생성 — 모든 로그인 유저 */}
              <Route path="/admin/create" element={
                <PrivateRoute><AdminCreatePage /></PrivateRoute>
              } />

              {/* 교독 관리 — 로그인 유저 (방장/관리자 여부는 페이지 내부에서 처리) */}
              <Route path="/admin/manage/:id" element={
                <AdminRoute><AdminManagePage /></AdminRoute>
              } />

              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
