import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserByName } from '../supabase/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // 세션 복원
  useEffect(() => {
    const saved = localStorage.getItem('gyodok_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); }
      catch { localStorage.removeItem('gyodok_user'); }
    }
    setLoading(false);
  }, []);

  // 로그인: 이름 + 코드 검증
  const login = async (name, code) => {
    const userData = await getUserByName(name.trim());
    if (!userData)                  throw new Error('NOT_FOUND');
    if (userData.code !== code.trim()) throw new Error('WRONG_CODE');

    localStorage.setItem('gyodok_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('gyodok_user');
    setUser(null);
  };

  const refreshUser = (updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('gyodok_user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
