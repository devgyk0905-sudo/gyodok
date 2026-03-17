import React from 'react';

/* ===== Pill 배지 ===== */
export function Pill({ variant = 'green', children, style }) {
  const variants = {
    green:  { bg: 'var(--status-done)',    color: 'var(--status-done-text)' },
    amber:  { bg: 'var(--status-reading)', color: 'var(--status-reading-text)' },
    gray:   { bg: 'var(--status-pending)', color: 'var(--status-pending-text)' },
    bronze: { bg: 'var(--accent-primary)', color: '#fff' },
  };
  const v = variants[variant] || variants.green;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      fontSize: 10, fontWeight: 500,
      background: v.bg, color: v.color,
      ...style,
    }}>
      {children}
    </span>
  );
}

/* ===== 책 썸네일 ===== */
export function BookThumb({
  state = 'pending',   // 'done' | 'current' | 'pending'
  style,
  onClick,
  size = 'md',          // 'sm' | 'md'
}) {
  const heights = { sm: 48, md: 60 };
  const widths  = { sm: 34, md: 44 };
  const h = heights[size];
  const w = widths[size];

  const states = {
    done:    { bg: 'var(--book-done-bg)',    outline: '1.5px solid var(--border-strong)', opacity: 0.65 },
    current: { bg: 'var(--book-current-bg)', outline: '2px solid var(--accent-primary)',  opacity: 1 },
    pending: { bg: 'var(--book-pending-bg)', outline: 'none',                             opacity: 0.35 },
  };
  const s = states[state] || states.pending;

  return (
    <div
      onClick={onClick}
      style={{
        width: w, height: h,
        borderRadius: 'var(--book-radius)',
        background: s.bg,
        outline: s.outline,
        outlineOffset: state === 'current' ? 2 : 2,
        opacity: s.opacity,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'opacity var(--transition-fast)',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}

/* ===== 책 썸네일 (이미지 포함, 실제 표지) ===== */
export function BookCover({
  coverUrl,
  state = 'pending',
  width = 44,
  height = 60,
  onClick,
  style,
}) {
  const outlines = {
    done:    { outline: '1.5px solid var(--border-strong)', outlineOffset: 2, opacity: 0.65 },
    current: { outline: '2px solid var(--accent-primary)',  outlineOffset: 2, opacity: 1 },
    pending: { outline: 'none',                             outlineOffset: 0, opacity: 0.35 },
  };
  const o = outlines[state] || outlines.pending;

  return (
    <div
      onClick={onClick}
      style={{
        width, height,
        borderRadius: 'var(--book-radius)',
        overflow: 'hidden',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--bg-surface-secondary)',
        ...o,
        ...style,
      }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: state === 'current'
            ? 'var(--book-current-bg)'
            : state === 'done'
            ? 'var(--book-done-bg)'
            : 'var(--book-pending-bg)',
        }} />
      )}
    </div>
  );
}

/* ===== 프로필 원형 ===== */
export function ProfileCircle({ name, isMe = false, size = 28, style }) {
  const initial = name ? name.charAt(0) : '?';
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: isMe ? 'var(--accent-primary)' : 'var(--accent-green)',
      color: isMe ? '#fff' : 'var(--accent-green-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 500,
      flexShrink: 0,
      ...style,
    }}>
      {isMe ? '나' : initial}
    </div>
  );
}

/* ===== 상태 버튼 (다 읽었어요 / 발송했어요 / 도착했어요) ===== */
export function StatusButton({ label, active = false, disabled = false, onClick }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        flex: 1,
        height: 36,
        borderRadius: 'var(--radius-sm)',
        border: `0.5px solid ${active ? 'var(--accent-green)' : 'var(--border-input)'}`,
        background: active ? 'var(--status-done)' : 'var(--bg-surface-secondary)',
        color: active ? 'var(--status-done-text)' : 'var(--text-tertiary)',
        fontSize: 12, fontWeight: active ? 500 : 400,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.36 : 1,
        transition: 'all var(--transition-fast)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {label}
    </button>
  );
}

/* ===== 카드 컨테이너 ===== */
export function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '0.5px solid var(--border-default)',
        padding: '12px',
        marginBottom: 10,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ===== 섹션 헤더 ===== */
export function SectionHeader({ children, style }) {
  return (
    <div style={{
      fontSize: 11, color: 'var(--text-tertiary)',
      fontWeight: 500, marginBottom: 8,
      letterSpacing: '0.02em',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ===== 구분선 ===== */
export function Divider({ style }) {
  return (
    <div style={{
      width: '100%', height: '0.5px',
      background: 'var(--border-default)',
      margin: '8px 0',
      ...style,
    }} />
  );
}

/* ===== 풀 시트 모달 ===== */
export function FullSheet({ children, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: '50%',
      transform: 'translateX(-50%)',
      width: '100%', maxWidth: 'var(--app-width)',
      bottom: 0,
      background: 'rgba(0,0,0,0.3)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="slide-up"
        style={{
          marginTop: 52,       /* TopBar 높이만큼 아래에서 시작 */
          flex: 1,
          background: 'var(--bg-surface)',
          borderRadius: '0 0 0 0',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ===== 로딩 스피너 ===== */
export function Spinner() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      alignItems: 'center', padding: '40px 0',
    }}>
      <div style={{
        width: 24, height: 24,
        border: '2px solid var(--border-default)',
        borderTopColor: 'var(--accent-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ===== 빈 상태 ===== */
export function EmptyState({ message, sub }) {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      color: 'var(--text-tertiary)',
    }}>
      <div style={{ fontSize: 13, marginBottom: 4 }}>{message}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-hint)' }}>{sub}</div>}
    </div>
  );
}
