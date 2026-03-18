import React, { useState } from 'react';
import { acceptInvite, declineInvite } from '../../supabase/db';

export default function NotificationModal({ invites, userId, onClose, onUpdate }) {
  const [processing, setProcessing] = useState(null); // gyodokId

  const handleAccept = async (gyodokId) => {
    setProcessing(gyodokId);
    try {
      await acceptInvite(gyodokId, userId);
      onUpdate();
    } catch (e) { console.error(e); }
    finally { setProcessing(null); }
  };

  const handleDecline = async (gyodokId) => {
    setProcessing(gyodokId);
    try {
      await declineInvite(gyodokId, userId);
      onUpdate();
    } catch (e) { console.error(e); }
    finally { setProcessing(null); }
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 'var(--app-width)', bottom: 0,
        zIndex: 200, background: 'rgba(0,0,0,0.28)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={onClose}
    >
      <div style={{ height: 52, flexShrink: 0 }} />
      <div
        className="slide-up"
        onClick={e => e.stopPropagation()}
        style={{
          flex: 1, background: 'var(--bg-surface)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* 헤더 */}
        <div style={{
          padding: '12px 14px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '0.5px solid var(--border-default)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            알림
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          {invites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
              새 알림이 없습니다
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                교독 초대 {invites.length}건
              </div>
              {invites.map(g => (
                <div
                  key={g.id}
                  style={{
                    background: 'var(--bg-surface-secondary)',
                    border: '0.5px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--accent-amber)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 0v6m0 0l2.5-2.5M8 8l-2.5-2.5" stroke="var(--accent-amber-text)" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                        교독 초대
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 500, color: 'var(--accent-primary)' }}>{g.title}</span>에<br />초대되었습니다
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button
                      onClick={() => handleDecline(g.id)}
                      disabled={processing === g.id}
                      style={{
                        flex: 1, height: 34, borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface)',
                        border: '0.5px solid var(--border-input)',
                        fontSize: 12, color: 'var(--text-tertiary)',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      거절
                    </button>
                    <button
                      onClick={() => handleAccept(g.id)}
                      disabled={processing === g.id}
                      style={{
                        flex: 2, height: 34, borderRadius: 'var(--radius-sm)',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        fontSize: 12, color: '#fff', fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {processing === g.id ? '처리 중...' : '수락하기'}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
