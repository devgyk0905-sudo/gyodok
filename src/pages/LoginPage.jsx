import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [name,    setName]    = useState('');
  const [code,    setCode]    = useState('');
  const [error,   setError]   = useState(null);   // 'NOT_FOUND' | 'WRONG_CODE' | 'UNKNOWN'
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await login(name, code);
      navigate('/home', { replace: true });
    } catch (e) {
      setError(e.message || 'UNKNOWN');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const errorMessages = {
    NOT_FOUND:  '존재하지 않는 계정입니다.',
    WRONG_CODE: '코드가 올바르지 않습니다.',
    UNKNOWN:    '오류가 발생했습니다. 다시 시도해 주세요.',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
    }}>

      {/* 로고 */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          width: 60, height: 60,
          borderRadius: 18,
          background: 'var(--accent-green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 10px',
        }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <path d="M7 22 L15 8 L23 22"
              stroke="var(--accent-green-dark)" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <rect x="11" y="15" width="8" height="7" rx="1.5"
              fill="var(--accent-green-dark)" opacity="0.45"/>
          </svg>
        </div>
        <div style={{
          fontSize: 22, fontWeight: 500,
          color: 'var(--text-primary)',
          textAlign: 'center', letterSpacing: '-0.02em',
        }}>
          교독
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text-tertiary)',
          textAlign: 'center', marginTop: 4,
        }}>
          함께 읽는 교환 독서
        </div>
      </div>

      {/* 로그인 카드 */}
      <div style={{
        width: '100%', maxWidth: 320,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '0.5px solid var(--border-default)',
        padding: '24px 20px 20px',
        marginTop: 24,
        boxShadow: 'var(--shadow-card)',
      }}>

        {/* 이름 필드 */}
        <div style={{ marginBottom: 14 }}>
          <label style={{
            display: 'block', fontSize: 12,
            color: 'var(--text-secondary)', marginBottom: 5,
          }}>
            이름
          </label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder=""
            style={{
              width: '100%', height: 42,
              borderRadius: 'var(--radius-sm)',
              border: `0.5px solid ${error === 'NOT_FOUND' ? '#c87070' : 'var(--border-input)'}`,
              background: 'var(--bg-input)',
              padding: '0 12px',
              fontSize: 14, color: 'var(--text-primary)',
              transition: 'border-color var(--transition-fast)',
            }}
          />
        </div>

        {/* 코드 필드 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block', fontSize: 12,
            color: 'var(--text-secondary)', marginBottom: 5,
          }}>
            코드
          </label>
          <input
            type="password"
            value={code}
            onChange={e => { setCode(e.target.value); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="****"
            maxLength={4}
            style={{
              width: '100%', height: 42,
              borderRadius: 'var(--radius-sm)',
              border: `0.5px solid ${error === 'WRONG_CODE' ? '#c87070' : 'var(--border-input)'}`,
              background: 'var(--bg-input)',
              padding: '0 12px',
              fontSize: 14, color: 'var(--text-primary)',
              letterSpacing: '0.2em',
              transition: 'border-color var(--transition-fast)',
            }}
          />
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div style={{
            background: '#8b1c1c',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            padding: '9px 12px',
            fontSize: 12,
            marginBottom: 14,
            animation: 'fadeIn 0.15s ease',
          }}>
            {errorMessages[error] || errorMessages.UNKNOWN}
          </div>
        )}

        {/* 로그인 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !code.trim()}
          style={{
            width: '100%', height: 44,
            borderRadius: 'var(--radius-md)',
            background: (loading || !name.trim() || !code.trim())
              ? 'var(--border-strong)'
              : 'var(--accent-primary)',
            color: '#fff',
            fontSize: 14, fontWeight: 500,
            border: 'none', cursor: 'pointer',
            transition: 'background var(--transition-fast)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {loading ? '확인 중...' : '로그인'}
        </button>
      </div>

      {/* 안내 문구 */}
      <div style={{
        marginTop: 16, fontSize: 11,
        color: 'var(--text-hint)', textAlign: 'center',
        lineHeight: 1.6,
      }}>
        관리자로부터 부여받은 계정으로만<br />로그인할 수 있습니다.
      </div>

    </div>
  );
}
