import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ title, showBack = false, right = null }) {
  const navigate = useNavigate();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
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
              <path d="M11 4L6 9l5 5"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
      {right && <div>{right}</div>}
    </header>
  );
}
