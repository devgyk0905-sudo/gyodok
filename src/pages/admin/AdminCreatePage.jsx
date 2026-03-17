import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import TopBar from '../../components/layout/TopBar';
import { createGyodok, getAllUsers } from '../../supabase/db';

export default function AdminCreatePage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [title,       setTitle]       = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [allUsers,    setAllUsers]    = useState([]);
  const [selected,    setSelected]    = useState([]);
  const [saving,      setSaving]      = useState(false);

  // 전체 계정 목록 로드
  useEffect(() => {
    getAllUsers()
      .then(users => setAllUsers(users))
      .catch(console.error);
  }, []);

  const toggleUser = (uid) => {
    setSelected(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!title.trim() || !startDate || selected.length < 2) return;
    setSaving(true);
    try {
      const newDoc = await createGyodok({
        title:          title.trim(),
        status:         new Date(startDate) <= new Date() ? 'active' : 'upcoming',
        startDate:      new Date(startDate),
        endDate:        endDate ? new Date(endDate) : null,
        participantIds: selected,
        editableIds:    selected,
        checkpoints:    [],
        bookCovers:     [],
        createdBy:      user.id,
      });
      navigate(`/gyodok/${newDoc.id}`, { replace: true });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const isValid = title.trim() && startDate && selected.length >= 2;

  return (
    <div className="page">
      <TopBar title="교독 생성" showBack
        right={<AdminBadge />}
      />
      <div className="page-content fade-in">

        <FormSection label="교독 타이틀">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예: 동갑내기자리 3회차"
            style={inputStyle}
          />
        </FormSection>

        <FormSection label="시작일자">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </FormSection>

        <FormSection label={<>종료일자 <span style={{ fontSize: 10, color: 'var(--text-hint)', fontWeight: 400 }}>(추후 설정 가능)</span></>}>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{ ...inputStyle, borderStyle: 'dashed', color: endDate ? 'var(--text-primary)' : 'var(--text-hint)' }}
          />
        </FormSection>

        <FormSection label={`참여자 추가 (최소 2명, 현재 ${selected.length}명 선택)`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {allUsers.map(u => {
              const isChecked = selected.includes(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: `0.5px solid ${isChecked ? 'var(--accent-green)' : 'var(--border-input)'}`,
                    background: isChecked ? 'var(--accent-green)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: isChecked ? 'var(--accent-green-dark)' : 'var(--bg-surface-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: isChecked ? 'var(--accent-green)' : 'var(--text-tertiary)',
                    fontWeight: 500, flexShrink: 0,
                  }}>
                    {u.name?.charAt(0)}
                  </div>
                  <span style={{
                    fontSize: 13, flex: 1,
                    color: isChecked ? 'var(--accent-green-dark)' : 'var(--text-primary)',
                    fontWeight: isChecked ? 500 : 400,
                  }}>
                    {u.name}
                    {u.isAdmin && <span style={{ fontSize: 10, color: 'var(--accent-amber-text)', marginLeft: 5 }}>(관리자)</span>}
                  </span>
                  {isChecked && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 3" stroke="var(--accent-green-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </FormSection>

        <div style={{ height: '0.5px', background: 'var(--border-default)', margin: '14px 0' }} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              flex: 1, height: 42, borderRadius: 'var(--radius-md)',
              border: '0.5px solid var(--border-input)',
              background: 'var(--bg-surface-secondary)',
              fontSize: 13, color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={!isValid || saving}
            style={{
              flex: 2, height: 42, borderRadius: 'var(--radius-md)',
              background: isValid && !saving ? 'var(--accent-primary)' : 'var(--border-strong)',
              border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 500,
              cursor: isValid ? 'pointer' : 'default',
              fontFamily: 'var(--font-sans)',
              transition: 'background var(--transition-fast)',
            }}
          >
            {saving ? '생성 중...' : '교독 생성하기'}
          </button>
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function FormSection({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function AdminBadge() {
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 'var(--radius-full)',
      background: 'var(--accent-amber)', border: '0.5px solid var(--border-input)',
      fontSize: 10, color: 'var(--accent-amber-text)', fontWeight: 500,
    }}>
      관리자
    </span>
  );
}

const inputStyle = {
  width: '100%', height: 40,
  borderRadius: 'var(--radius-sm)',
  border: '0.5px solid var(--border-input)',
  background: 'var(--bg-input)',
  padding: '0 12px',
  fontSize: 13, color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
};
