import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGyodok, updateGyodok, getAllUsers, deleteGyodok } from '../../supabase/db';
import TopBar from '../../components/layout/TopBar';
import { Divider } from '../../components/common';

const STATUS_OPTIONS = [
  { key: 'active',    label: '📖 교독 진행 중', bg: 'var(--accent-green)',   color: 'var(--accent-green-dark)' },
  { key: 'completed', label: '🤍 교독 완료!',   bg: 'var(--status-pending)', color: 'var(--text-tertiary)' },
  { key: 'upcoming',  label: '✨ 교독 예정',    bg: 'var(--accent-amber)',   color: 'var(--accent-amber-text)' },
];

export default function AdminManagePage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const handleDelete = async () => {
    if (!window.confirm('교독을 삭제하면 연결된 모든 책과 기록이 삭제됩니다.\n정말 삭제하시겠습니까?')) return;
    try {
     await deleteGyodok(id);
     navigate('/gyodok', { replace: true });
    } catch (e) { console.error(e); alert('삭제 중 오류가 발생했습니다.'); }
  };

  const [gyodok,      setGyodok]      = useState(null);
  const [allUsers,    setAllUsers]    = useState([]);
  const [status,      setStatus]      = useState('active');
  const [title,       setTitle]       = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [editableIds, setEditableIds] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);  // D-day 체크포인트
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getGyodok(id), getAllUsers()])
      .then(([g, users]) => {
        if (g) {
          setGyodok(g);
          setStatus(g.status || 'active');
          setTitle(g.title || '');
          setStartDate(g.startDate ? toInputDate(g.startDate) : '');
          setEndDate(g.endDate ? toInputDate(g.endDate) : '');
          setEditableIds(g.editableIds || []);
          setCheckpoints(g.checkpoints || []);
        }
        setAllUsers(users.filter(u => g?.participantIds?.includes(u.id)));
      }).finally(() => setLoading(false));
  }, [id]);

  const toggleEditable = (uid) =>
    setEditableIds(prev => prev.includes(uid) ? prev.filter(i => i !== uid) : [...prev, uid]);

  // 체크포인트 추가
  const addCheckpoint = () =>
    setCheckpoints(prev => [...prev, { id: Date.now(), label: '', date: '' }]);

  // 체크포인트 수정
  const updateCheckpoint = (idx, field, value) =>
    setCheckpoints(prev => prev.map((cp, i) => i === idx ? { ...cp, [field]: value } : cp));

  // 체크포인트 삭제
  const removeCheckpoint = (idx) =>
    setCheckpoints(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGyodok(id, {
        status,
        title: title.trim(),
        startDate: startDate ? new Date(startDate) : null,
        endDate:   endDate   ? new Date(endDate)   : null,
        editableIds,
        checkpoints: checkpoints.filter(cp => cp.label && cp.date),
      });
      navigate(-1);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page"><TopBar title="교독 관리" showBack /></div>;

  return (
    <div className="page">
      <TopBar
        title="교독 관리" showBack
        right={
          <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'var(--accent-amber)', fontSize: 10, color: 'var(--accent-amber-text)', fontWeight: 500 }}>
            관리자
          </span>
        }
      />

      <div className="page-content fade-in">

        {/* 교독 상태 */}
        <SectionLabel>교독 상태</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {STATUS_OPTIONS.map(opt => {
            const active = status === opt.key;
            return (
              <div key={opt.key} onClick={() => setStatus(opt.key)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
                borderRadius: 'var(--radius-sm)',
                background: active ? opt.bg : 'var(--bg-surface-secondary)',
                border: `0.5px solid ${active ? 'transparent' : 'var(--border-default)'}`,
                cursor: 'pointer', transition: 'all var(--transition-fast)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? opt.color : 'var(--border-strong)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1, color: active ? opt.color : 'var(--text-tertiary)', fontWeight: active ? 500 : 400 }}>{opt.label}</span>
                {active && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3" stroke={opt.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <Divider />

        {/* 기본 정보 수정 */}
        <SectionLabel style={{ marginTop: 6 }}>기본 정보 수정</SectionLabel>
        <FormField label="교독 타이틀" value={title} onChange={setTitle} placeholder="교독 타이틀" />
        <FormField label="시작일자" value={startDate} onChange={setStartDate} type="date" />
        <FormField label="종료일자" value={endDate} onChange={setEndDate} type="date" />

        <Divider style={{ marginTop: 14, marginBottom: 14 }} />

        {/* D-day 체크포인트 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <SectionLabel style={{ marginBottom: 0 }}>D-day 체크포인트</SectionLabel>
          <button onClick={addCheckpoint} style={{
            padding: '4px 10px', borderRadius: 'var(--radius-full)',
            background: 'var(--accent-green)', border: 'none',
            fontSize: 11, color: 'var(--accent-green-dark)', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            + 추가
          </button>
        </div>

        {checkpoints.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-hint)', textAlign: 'center', padding: '12px 0', marginBottom: 8 }}>
            체크포인트를 추가하면 홈에서 D-day가 표시됩니다
          </div>
        )}

        {checkpoints.map((cp, idx) => (
          <div key={cp.id || idx} style={{
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
            border: '0.5px solid var(--border-default)', padding: '10px 12px',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
              <input
                type="text" value={cp.label}
                onChange={e => updateCheckpoint(idx, 'label', e.target.value)}
                placeholder="예: 1차 중간점검 / 1/3 배송"
                style={{ ...inputSt, flex: 1 }}
              />
              <button onClick={() => removeCheckpoint(idx)} style={{
                width: 32, height: 36, borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface-secondary)', border: '0.5px solid var(--border-input)',
                color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <input
              type="date" value={cp.date}
              onChange={e => updateCheckpoint(idx, 'date', e.target.value)}
              style={inputSt}
            />
          </div>
        ))}

        <Divider style={{ marginTop: 6, marginBottom: 14 }} />

        {/* 참여자 수정 권한 */}
        <SectionLabel>참여자 수정 권한</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {allUsers.map(u => {
            const on = editableIds.includes(u.id);
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 11px', background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-default)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--accent-green-dark)', fontWeight: 500 }}>
                    {u.name?.charAt(0)}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.name}</span>
                </div>
                <div onClick={() => toggleEditable(u.id)} style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: on ? 'var(--accent-green)' : 'var(--status-pending)',
                  border: `0.5px solid ${on ? 'var(--border-default)' : 'var(--border-strong)'}`,
                  position: 'relative', cursor: 'pointer', transition: 'background var(--transition-base)',
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: on ? 19 : 3, transition: 'left var(--transition-base)', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', height: 44, borderRadius: 'var(--radius-md)',
          background: saving ? 'var(--border-strong)' : 'var(--accent-primary)',
          border: 'none', color: '#fff', fontSize: 14, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
          transition: 'background var(--transition-fast)',
        }}>
          {saving ? '저장 중...' : '저장하기'}
        </button>

        <button
          onClick={handleDelete}
          style={{
            width: '100%', height: 40, borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: '0.5px solid #c87070',
            fontSize: 13, color: '#c87070',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            marginTop: 8,
          }}
        >
          교독 삭제하기
        </button>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function SectionLabel({ children, style }) {
  return <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 8, ...style }}>{children}</div>;
}

function FormField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inputSt} />
    </div>
  );
}

const inputSt = {
  width: '100%', height: 36, borderRadius: 'var(--radius-sm)',
  border: '0.5px solid var(--border-input)', background: 'var(--bg-input)',
  padding: '0 12px', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
};

function toInputDate(ts) {
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toISOString().split('T')[0];
  } catch { return ''; }
}
