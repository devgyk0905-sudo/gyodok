import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ title, showBack = false, right = null, notificationCount = 0, onNotificationClick }) {
  const navigate = useNavigate();

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 'var(--app-width)',
      zIndex: 50,
      height: 'var(--top-bar-height)',
      background: 'var(--bg-page)',
      borderBottom: '0.5px solid var(--border-default)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            style={{ padding: '4px 4px 4px 0', color: 'var(--text-secondary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        <span style={{
          fontSize: 16,
          fontWeight: 500,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}>
          {title}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* 알림 아이콘 */}
        {onNotificationClick && (
          <button
            onClick={onNotificationClick}
            style={{
              position: 'relative', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z"
                stroke={notificationCount > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
                strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
              />
              <path d="M8 15.5a2 2 0 004 0"
                stroke={notificationCount > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
                strokeWidth="1.3"
              />
            </svg>
            {notificationCount > 0 && (
              <div style={{
                position: 'absolute', top: 3, right: 3,
                width: 14, height: 14, borderRadius: '50%',
                background: '#e76f51',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, color: '#fff', fontWeight: 700,
                border: '1.5px solid var(--bg-page)',
              }}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
            )}
          </button>
        )}
        {right && <div>{right}</div>}
      </div>
    </header>
  );
}
