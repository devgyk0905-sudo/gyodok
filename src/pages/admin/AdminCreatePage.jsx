import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import TopBar from '../../components/layout/TopBar';
import { createGyodok } from '../../supabase/db';

export default function AdminCreatePage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [title,     setTitle]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [saving,    setSaving]    = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !startDate) return;
    setSaving(true);
    try {
      const newDoc = await createGyodok({
        title:          title.trim(),
        status:         new Date(startDate) <= new Date() ? 'active' : 'upcoming',
        startDate:      new Date(startDate),
        endDate:        endDate ? new Date(endDate) : null,
        participantIds: [user.id],
        pendingIds:     [],
        editableIds:    [],
        checkpoints:    [],
        bookCovers:     [],
        createdBy:      user.id,
      });
      navigate(`/gyodok/${newDoc.id}`, { replace: true });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const isValid = title.trim() && startDate;

  return (
    <div className="page">
      <TopBar title="교독 생성" showBack right={<AdminBadge />} />
      <div className="page-content fade-in">

        <FormSection label="교독 타이틀">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder=""
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

        {/* 안내 문구 — 중앙정렬 */}
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-surface-secondary)',
          border: '0.5px solid var(--border-default)',
          fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.7,
          marginBottom: 14, textAlign: 'center',
        }}>
          교독 생성 후 <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>교독 관리</span> 페이지에서<br />
          참여자를 초대할 수 있습니다.
        </div>

        <div style={{ height: '0.5px', background: 'var(--border-default)', margin: '4px 0 14px' }} />

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
