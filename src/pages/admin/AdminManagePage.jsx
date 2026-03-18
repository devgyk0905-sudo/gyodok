import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getGyodok, updateGyodok, getAllUsers, deleteGyodok,
  inviteUser, cancelInvite, leaveGyodok,
} from '../../supabase/db';
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
  const { user } = useAuth();

  const [gyodok,         setGyodok]         = useState(null);
  const [allUsers,       setAllUsers]       = useState([]);
  const [status,         setStatus]         = useState('active');
  const [title,          setTitle]          = useState('');
  const [startDate,      setStartDate]      = useState('');
  const [endDate,        setEndDate]        = useState('');
  const [editableIds,    setEditableIds]    = useState([]);
  const [checkpoints,    setCheckpoints]    = useState([]);
  const [saving,         setSaving]         = useState(false);
  const [loading,        setLoading]        = useState(true);

  const [participantIds, setParticipantIds] = useState([]);
  const [pendingIds,     setPendingIds]     = useState([]);
  const [inviting,       setInviting]       = useState(null);
  const [kicking,        setKicking]        = useState(null);

  const isAdmin = user?.isAdmin || user?.is_admin;

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
          setParticipantIds(g.participantIds || []);
          setPendingIds(g.pendingIds || []);
        }
        setAllUsers(users);
      }).finally(() => setLoading(false));
  }, [id]);

  const toggleEditable = (uid) =>
    setEditableIds(prev => prev.includes(uid) ? prev.filter(i => i !== uid) : [...prev, uid]);

  const addCheckpoint = () =>
    setCheckpoints(prev => [...prev, { id: Date.now(), label: '', date: '' }]);

  const updateCheckpoint = (idx, field, value) =>
    setCheckpoints(prev => prev.map((cp, i) => i === idx ? { ...cp, [field]: value } : cp));

  const removeCheckpoint = (idx) =>
    setCheckpoints(prev => prev.filter((_, i) => i !== idx));

  const handleInvite = async (userId) => {
    setInviting(userId);
    try {
      await inviteUser(id, userId);
      setPendingIds(prev => [...prev, userId]);
    } catch (e) {
      if (e.message === 'ALREADY_PARTICIPANT') alert('이미 참여 중인 사용자입니다.');
      else if (e.message === 'ALREADY_INVITED') alert('이미 초대된 사용자입니다.');
      else console.error(e);
    } finally { setInviting(null); }
  };

  const handleCancelInvite = async (userId) => {
    setInviting(userId);
    try {
      await cancelInvite(id, userId);
      setPendingIds(prev => prev.filter(pid => pid !== userId));
    } catch (e) { console.error(e); }
    finally { setInviting(null); }
  };

  const handleKick = async (userId) => {
    const userName = allUsers.find(u => u.id === userId)?.name || '이 참여자';
    if (!window.confirm(`${userName}님을 교독에서 내보내시겠습니까?`)) return;
    setKicking(userId);
    try {
      await leaveGyodok(id, userId, true);
      setParticipantIds(prev => prev.filter(pid => pid !== userId));
      setEditableIds(prev => prev.filter(eid => eid !== userId));
    } catch (e) { console.error(e); }
    finally { setKicking(null); }
  };

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

  const handleDelete = async () => {
    if (!window.confirm('교독을 삭제하면 연결된 모든 책과 기록이 삭제됩니다.\n정말 삭제하시겠습니까?')) return;
    try {
      await deleteGyodok(id);
      navigate('/gyodok', { replace: true });
    } catch (e) { console.error(e); alert('삭제 중 오류가 발생했습니다.'); }
  };

  if (loading) return <div className="page"><TopBar title="교독 관리" showBack /></div>;

  const isHost = gyodok?.createdBy === user?.id;

  const invitableUsers   = allUsers.filter(u => !participantIds.includes(u.id) && !pendingIds.includes(u.id));
  const pendingUsers     = allUsers.filter(u => pendingIds.includes(u.id));
  const participantUsers = allUsers.filter(u => participantIds.includes(u.id));

  return (
    <div className="page">
      <TopBar
        title="교독 관리" showBack
        right={
          <span style={{
            padding: '3px 8px', borderRadius: 'var(--radius-full)',
            background: isAdmin ? 'var(--accent-amber)' : 'var(--accent-green)',
            fontSize: 10,
            color: isAdmin ? 'var(--accent-amber-text)' : 'var(--accent-green-dark)',
            fontWeight: 500,
          }}>
            {isAdmin ? '관리자' : '방장'}
          </span>
        }
      />

      <div className="page-content fade-in">

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

        <SectionLabel style={{ marginTop: 6 }}>기본 정보 수정</SectionLabel>
        <FormField label="교독 타이틀" value={title} onChange={setTitle} placeholder="교독 타이틀" />
        <FormField label="시작일자" value={startDate} onChange={setStartDate} type="date" />
        <FormField label="종료일자" value={endDate} onChange={setEndDate} type="date" />

        <Divider style={{ marginTop: 14, marginBottom: 14 }} />

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
            border: '0.5px solid var(--border-default)', padding: '10px 12px', marginBottom: 8,
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

        <SectionLabel>참여자 초대</SectionLabel>

        {pendingUsers.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-hint)', marginBottom: 6 }}>수락 대기 중</div>
            {pendingUsers.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 11px', background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--accent-amber)',
                marginBottom: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--accent-amber-text)', fontWeight: 500 }}>
                    {u.name?.charAt(0)}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--accent-amber-text)', background: 'var(--accent-amber)', padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>대기 중</span>
                </div>
                <button
                  onClick={() => handleCancelInvite(u.id)}
                  disabled={inviting === u.id}
                  style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                    background: 'transparent', border: '0.5px solid var(--border-input)',
                    fontSize: 11, color: 'var(--text-tertiary)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  취소
                </button>
              </div>
            ))}
          </div>
        )}

        {invitableUsers.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text-hint)', marginBottom: 6 }}>초대 가능</div>
            {invitableUsers.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 11px', background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-default)',
                marginBottom: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--accent-green-dark)', fontWeight: 500 }}>
                    {u.name?.charAt(0)}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.name}</span>
                </div>
                <button
                  onClick={() => handleInvite(u.id)}
                  disabled={inviting === u.id}
                  style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-primary)', border: 'none',
                    fontSize: 11, color: '#fff', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  {inviting === u.id ? '...' : '초대'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-hint)', textAlign: 'center', padding: '10px 0', marginBottom: 16 }}>
            초대 가능한 사용자가 없습니다
          </div>
        )}

        <Divider style={{ marginBottom: 14 }} />

        <SectionLabel>현재 참여자</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {participantUsers.map(u => {
            const on = editableIds.includes(u.id);
            const isKicking = kicking === u.id;
            const isThisHost = gyodok?.createdBy === u.id;
            return (
              <div key={u.id} style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-default)',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--accent-green-dark)', fontWeight: 500 }}>
                      {u.name?.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{u.name}</span>
                    {isThisHost && (
                      <span style={{ fontSize: 10, color: 'var(--accent-green-dark)', background: 'var(--accent-green)', padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>방장</span>
                    )}
                    {u.isAdmin && !isThisHost && (
                      <span style={{ fontSize: 10, color: 'var(--accent-amber-text)', background: 'var(--accent-amber)', padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>관리자</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>수정</span>
                    <div onClick={() => toggleEditable(u.id)} style={{
                      width: 36, height: 20, borderRadius: 10,
                      background: on ? 'var(--accent-green)' : 'var(--status-pending)',
                      border: `0.5px solid ${on ? 'var(--border-default)' : 'var(--border-strong)'}`,
                      position: 'relative', cursor: 'pointer', transition: 'background var(--transition-base)',
                    }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: on ? 19 : 3, transition: 'left var(--transition-base)', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
                    </div>
                  </div>
                </div>

                {/* 추방 — 방장/관리자 본인 제외 */}
                {!isThisHost && !u.isAdmin && (
                  <div style={{ borderTop: '0.5px solid var(--border-default)', padding: '6px 11px' }}>
                    <button
                      onClick={() => handleKick(u.id)}
                      disabled={isKicking}
                      style={{
                        width: '100%', height: 28, borderRadius: 'var(--radius-sm)',
                        background: 'transparent', border: '0.5px solid #c87070',
                        fontSize: 11, color: '#c87070',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {isKicking ? '처리 중...' : '교독에서 내보내기'}
                    </button>
                  </div>
                )}
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

        <button onClick={handleDelete} style={{
          width: '100%', height: 40, borderRadius: 'var(--radius-md)',
          background: 'transparent', border: '0.5px solid #c87070',
          fontSize: 13, color: '#c87070', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', marginTop: 8,
        }}>
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
