import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  {
    path: '/home',
    label: '홈',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="9" width="16" height="10" rx="2"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'} strokeWidth="1.3"/>
        <path d="M5 9V7a5 5 0 0110 0v2"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
          strokeWidth="1.3" fill="none"/>
      </svg>
    ),
  },
  {
    path: '/gyodok',
    label: '교독',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="6" height="9" rx="1.5"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'} strokeWidth="1.3"/>
        <rect x="12" y="2" width="6" height="5" rx="1.5"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'} strokeWidth="1.3"/>
        <rect x="12" y="11" width="6" height="7" rx="1.5"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'} strokeWidth="1.3"/>
        <rect x="2" y="14" width="6" height="4" rx="1.5"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'} strokeWidth="1.3"/>
      </svg>
    ),
  },
  {
    path: '/library',
    label: '서재',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 16V5a1 1 0 011-1h10a1 1 0 011 1v11"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'} strokeWidth="1.3"/>
        <path d="M3 16h14"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
          strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M8 9h4"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
          strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/more',
    label: '마이페이지',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="8" r="3.5"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'} strokeWidth="1.3"/>
        <path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7"
          stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'} strokeWidth="1.3"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 'var(--app-width)',
      height: 'var(--bottom-nav-height)',
      background: '#f5f0d0',
      borderTop: '1px solid #d4c8a0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingBottom: 6,
      zIndex: 100,
    }}>
      {NAV_ITEMS.map(item => {
        const active = pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              fontSize: 10,
              color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              fontWeight: active ? 500 : 400,
              background: 'none',
              border: 'none',
              padding: '4px 12px',
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
            }}
          >
            {item.icon(active)}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
