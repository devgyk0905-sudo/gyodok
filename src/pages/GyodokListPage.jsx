import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import { Pill, Spinner, EmptyState } from '../components/common';
import { getGyodoks, getFavorites, addFavorite, removeFavorite, getBooks } from '../supabase/db';

const TABS = [
  { key: 'all',       label: '전체' },
  { key: 'active',    label: '진행 중' },
  { key: 'completed', label: '종료' },
  { key: 'upcoming',  label: '예정' },
];

const STATUS_PILL = {
  active:    { label: '진행 중', variant: 'green' },
  completed: { label: '종료',   variant: 'gray' },
  upcoming:  { label: '예정',   variant: 'amber' },
};

const STATUS_ORDER = { active: 0, upcoming: 1, completed: 2 };

export default function GyodokListPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [tab,       setTab]       = useState('all');
  const [list,      setList]      = useState([]);
  const [booksMap,  setBooksMap]  = useState({});  // gyodokId → books
  const [favIds,    setFavIds]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getGyodoks(user.id), getFavorites(user.id)])
      .then(async ([gyodoks, favs]) => {
        setList(gyodoks);
        setFavIds(favs.map(f => f.gyodokId));
        // 각 교독의 책 로드
        const map = {};
        await Promise.all(gyodoks.map(async g => {
          const bks = await getBooks(g.id);
          map[g.id] = bks;
        }));
        setBooksMap(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleFavorite = async (e, gyodokId) => {
    e.stopPropagation();
    const isFav = favIds.includes(gyodokId);

    if (isFav) {
      await removeFavorite(user.id, gyodokId);
      setFavIds(prev => prev.filter(id => id !== gyodokId));
    } else {
      if (favIds.length >= 3) {
        alert('즐겨찾기는 최대 3개까지 가능합니다.\n기존 즐겨찾기를 해제 후 추가해 주세요.');
        return;
      }
      await addFavorite(user.id, gyodokId);
      setFavIds(prev => [...prev, gyodokId]);
    }
  };

  const filtered = (tab === 'all' ? list : list.filter(g => g.status === tab))
    .sort((a, b) => {
      const statusDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      const da = a.startDate ? new Date(a.startDate) : new Date(0);
      const db = b.startDate ? new Date(b.startDate) : new Date(0);
      return db - da;
    });

  return (
    <div className="page">
      <TopBar
        title="교독"
        right={
          user?.isAdmin || user?.is_admin ? (
            <button
              onClick={() => navigate('/admin/create')}
              style={{
                padding: '5px 12px', borderRadius: 'var(--radius-full)',
                background: 'var(--accent-primary)', border: 'none',
                fontSize: 12, color: '#fff', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              + 교독 생성
            </button>
          ) : null
        }
      />

      {/* 탭 필터 */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 14px', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flexShrink: 0, padding: '5px 14px',
              borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 500,
              border: `0.5px solid ${tab === t.key ? 'var(--accent-green)' : 'var(--border-input)'}`,
              background: tab === t.key ? 'var(--accent-green)' : 'var(--bg-page)',
              color: tab === t.key ? 'var(--accent-green-dark)' : 'var(--text-tertiary)',
              cursor: 'pointer', transition: 'all var(--transition-fast)', fontFamily: 'var(--font-sans)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 14px' }}>
        {loading && <Spinner />}
        {!loading && filtered.length === 0 && (
          <EmptyState message="교독 모임이 없습니다" sub={tab === 'all' ? '관리자가 모임을 생성하면 여기에 표시됩니다' : ''} />
        )}
        {filtered.map(g => (
          <GyodokCard
            key={g.id}
            gyodok={g}
            books={booksMap[g.id] || []}
            isFav={favIds.includes(g.id)}
            onFavorite={(e) => handleFavorite(e, g.id)}
            onClick={() => navigate(`/gyodok/${g.id}`)}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}

function GyodokCard({ gyodok, books, isFav, onFavorite, onClick }) {
  const pill = STATUS_PILL[gyodok.status] || STATUS_PILL.upcoming;
  const isCompleted = gyodok.status === 'completed';
  const collageColors = ['var(--accent-green)', 'var(--accent-amber)', 'var(--color-beige)', 'var(--color-papaya-whip)'];
  const n = Math.min(Math.max(gyodok.participantIds?.length || 3, 2), 4);
  const covers = books.slice(0, n);

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        border: '0.5px solid var(--border-default)', padding: 12, marginBottom: 8,
        display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
        opacity: isCompleted ? 0.75 : 1, transition: 'opacity var(--transition-fast)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* 책 콜라주 */}
      {(() => {
        const W = 90; const H = 78; const bookW = 56;
        const offset = n === 1 ? 0 : (W - bookW) / (n - 1);
        return (
          <div style={{ width: W, height: H, flexShrink: 0, position: 'relative' }}>
            {Array.from({ length: n }, (_, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: i * offset, top: 0,
                width: bookW, height: H,
                borderRadius: 5,
                background: covers[i]?.coverUrl ? 'transparent' : collageColors[i % collageColors.length],
                boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                overflow: 'hidden',
              }}>
                {covers[i]?.coverUrl && (
                  <img src={covers[i].coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <Pill variant={pill.variant}>{pill.label}</Pill>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {gyodok.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
          {gyodok.startDate && formatDate(gyodok.startDate)}
          {gyodok.endDate ? ` ~ ${formatDate(gyodok.endDate)}` : ''}
        </div>
        {gyodok.participantIds?.length > 0 && (
          <div style={{ display: 'flex', marginTop: 6 }}>
            {gyodok.participantIds.slice(0, 3).map((pid, i) => (
              <div key={pid} style={{
                width: 18, height: 18, borderRadius: '50%',
                background: ['var(--accent-green)', 'var(--accent-amber)', 'var(--accent-primary)'][i % 3],
                border: '1.5px solid var(--bg-page)', marginLeft: i > 0 ? -5 : 0,
              }} />
            ))}
            {gyodok.participantIds.length > 3 && (
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--border-strong)', border: '1.5px solid var(--bg-page)', marginLeft: -5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, color: 'var(--text-secondary)',
              }}>
                +{gyodok.participantIds.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 즐겨찾기 별표 */}
      <button
        onClick={onFavorite}
        style={{
          flexShrink: 0, width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 4,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 1.5l2.09 4.26 4.71.68-3.4 3.32.8 4.69L9 12l-4.2 2.45.8-4.69-3.4-3.32 4.71-.68z"
            fill={isFav ? '#d4a373' : 'none'}
            stroke={isFav ? '#d4a373' : 'var(--text-tertiary)'}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch { return ''; }
}
