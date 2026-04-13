import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import NotificationModal from '../components/common/NotificationModal';
import {
  Card, SectionHeader, Pill, Divider, Spinner, EmptyState,
  ProfileCircle, BookCover, StatusButton,
} from '../components/common';
import {
  getGyodoks, getBooks, getBookStatus, updateBookStatus,
  getWishlist, addFeedItem, getAllUsers, getFavorites,
  getPendingInvites,
} from '../supabase/db';
import {
  calcGyodokStatus, getMyStatusText, getMemberStatus,
  getBookCardState, calcDday, getNextCheckpoint,
  getPersonalCurrentRound, isRoundComplete,
} from '../utils/statusCalc';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [favGyodoks,       setFavGyodoks]       = useState([]);
  const [favBooks,         setFavBooks]         = useState({});
  const [favStatuses,      setFavStatuses]      = useState({});
  const [userMap,          setUserMap]          = useState({});
  const [wishlist,         setWishlist]         = useState([]);
  const [pendingInvites,   setPendingInvites]   = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [showProfileAlert, setShowProfileAlert] = useState(false);

  useEffect(() => {
    if (!user) return;
    const dismissed = sessionStorage.getItem('gyodok_profile_alert');
    if (!dismissed && (!user.address || !user.phone)) {
      setShowProfileAlert(true);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [gyodoks, users, favs, wl, invites] = await Promise.all([
        getGyodoks(user.id), getAllUsers(), getFavorites(user.id),
        getWishlist(user.id), getPendingInvites(user.id),
      ]);
      const map = {};
      users.forEach(u => { map[u.id] = u; });
      setUserMap(map);
      setWishlist(wl);
      setPendingInvites(invites);

      const favList = favs
        .map(f => gyodoks.find(g => g.id === f.gyodokId))
        .filter(Boolean)
        .slice(0, 3);
      setFavGyodoks(favList);

      const booksMap = {};
      const statusesMap = {};
      for (const g of favList) {
        const bks = await getBooks(g.id);
        booksMap[g.id] = bks;
        const sm = {};
        for (const book of bks) {
          sm[book.id] = {};
          for (const pid of (g.participantIds || [])) {
            sm[book.id][pid] = await getBookStatus(g.id, book.id, pid);
          }
        }
        statusesMap[g.id] = sm;
      }
      setFavBooks(booksMap);
      setFavStatuses(statusesMap);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        getPendingInvites(user.id).then(setPendingInvites);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  const handleStatusChange = async (gyodokId, field) => {
    if (!user) return;
    const g   = favGyodoks.find(g => g.id === gyodokId);
    const bks = favBooks[gyodokId] || [];
    const sm  = favStatuses[gyodokId] || {};
    const totalRounds = g?.participantIds?.length || 3;

    const personalRound = getPersonalCurrentRound(user.id, bks, sm, totalRounds);
    const myCurrentBook = bks.find(
      b => b.round === personalRound && b.exchangeOrder?.includes(user.id)
    );
    if (!myCurrentBook) return;

    const current = sm[myCurrentBook.id]?.[user.id] || {};
    const updated  = { ...current, [field]: !current[field] };
    if (field === 'isSent' && !updated.isSent) updated.isArrived = false;
    if (field === 'isArrived' && !updated.isArrived) {
      updated.isRead = false;
      updated.isSent = false;
    }

    await updateBookStatus(gyodokId, myCurrentBook.id, user.id, updated);

    const feedTypes = { isRead: 'read', isSent: 'sent', isArrived: 'arrived' };
    if (updated[field]) {
      await addFeedItem({ gyodokId, userId: user.id, userName: user.name, type: feedTypes[field], bookTitle: myCurrentBook.title || '' });
    }

    setFavStatuses(prev => ({
      ...prev,
      [gyodokId]: {
        ...prev[gyodokId],
        [myCurrentBook.id]: { ...prev[gyodokId]?.[myCurrentBook.id], [user.id]: updated },
      },
    }));
  };

  if (loading) return (
    <div className="page"><TopBar title="홈" /><Spinner /><BottomNav /></div>
  );

  return (
    <div className="page-no-topbar">

      {showProfileAlert && (
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 'var(--app-width)', bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 28px',
        }} onClick={() => { sessionStorage.setItem('gyodok_profile_alert', 'true'); setShowProfileAlert(false); }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)', padding: '28px 22px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="var(--accent-amber-text)" strokeWidth="1.5"/>
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="var(--accent-amber-text)" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8 }}>
              최초 프로필 설정이 필요합니다!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
              마이페이지에서 주소 및 전화번호를<br />등록해 주세요.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { sessionStorage.setItem('gyodok_profile_alert', 'true'); setShowProfileAlert(false); }}
                style={{ flex: 1, height: 40, borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-input)', background: 'var(--bg-surface-secondary)', fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                나중에
              </button>
              <button onClick={() => { sessionStorage.setItem('gyodok_profile_alert', 'true'); setShowProfileAlert(false); navigate('/profile'); }}
                style={{ flex: 2, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--accent-primary)', border: 'none', fontSize: 13, color: '#fff', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                설정하러 가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 홈 히어로 배너 */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-raindrops-roses, #E8CDD0) 0%, var(--color-cloud-dancer, #F0EDE8) 55%, var(--color-ice-melt, #AECDE0) 100%)',
        padding: '16px 14px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-primary)' }}>안녕하세요, {user?.name}님👋</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>오늘도 독서 중이신가요?</div>
        </div>
        <button
          onClick={() => setShowNotification(true)}
          style={{
            position: 'relative', width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 2a6.5 6.5 0 00-6.5 6.5v3L3 14h16l-1.5-2.5V8.5A6.5 6.5 0 0011 2z"
              stroke={pendingInvites.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)'}
              strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
            />
            <path d="M9 17a2 2 0 004 0"
              stroke={pendingInvites.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)'}
              strokeWidth="1.3"
            />
          </svg>
          {pendingInvites.length > 0 && (
            <div style={{
              position: 'absolute', top: 4, right: 4,
              width: 14, height: 14, borderRadius: '50%',
              background: '#e76f51',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: '#fff', fontWeight: 700,
              border: '1.5px solid var(--bg-page)',
            }}>
              {pendingInvites.length > 9 ? '9+' : pendingInvites.length}
            </div>
          )}
        </button>
      </div>

      <div className="page-content fade-in">

        {pendingInvites.length > 0 && (
          <div
            onClick={() => setShowNotification(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--accent-amber)', borderRadius: 'var(--radius-md)',
              padding: '10px 14px', marginBottom: 14, cursor: 'pointer',
              border: '0.5px solid var(--border-strong)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2a5.5 5.5 0 00-5.5 5.5v2.8L2 12.5h14l-1.5-2.2V7.5A5.5 5.5 0 009 2z" stroke="var(--accent-amber-text)" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M7 14.5a2 2 0 004 0" stroke="var(--accent-amber-text)" strokeWidth="1.3"/>
            </svg>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent-amber-text)' }}>
                교독 초대 {pendingInvites.length}건
              </span>
              <span style={{ fontSize: 11, color: 'var(--accent-amber-text)', opacity: 0.8, marginLeft: 6 }}>
                탭하여 확인하세요
              </span>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="var(--accent-amber-text)" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
        )}

        {favGyodoks.length === 0 && (
          <div style={{
            background: 'var(--bg-surface-secondary)',
            borderRadius: 'var(--radius-lg)', padding: '14px',
            marginBottom: 10, textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>즐겨찾기한 교독이 없습니다</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint)' }}>교독 목록에서 ★ 버튼으로 최대 3개를 즐겨찾기하세요</div>
          </div>
        )}

        {favGyodoks.map(g => {
          const bks = favBooks[g.id] || [];
          const sm  = favStatuses[g.id] || {};
          const totalRounds = g.participantIds?.length || 3;

          const gs = calcGyodokStatus(
            (g.participantIds || []).map(id => ({ id })), bks, sm, totalRounds
          );
          const cp = getNextCheckpoint(g.checkpoints);
          const dd = cp ? calcDday(cp.date) : null;

          const personalRound  = getPersonalCurrentRound(user.id, bks, sm, totalRounds);
          const myCurrentBook  = bks.find(b => b.round === personalRound && b.exchangeOrder?.includes(user.id));
          const myStatus       = myCurrentBook ? sm[myCurrentBook.id]?.[user.id] : null;
          const isFirstRound   = personalRound === 1;
          const isLastRound    = personalRound === totalRounds;
          const isMidRound     = !isFirstRound && !isLastRound;

          return (
            <div key={g.id} style={{
              marginBottom: 20, background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border-default)',
              overflow: 'hidden', boxShadow: 'var(--shadow-card)',
            }}>
              {/* D-day 헤더 */}
              <div
                onClick={() => navigate(`/gyodok/${g.id}`)}
                style={{
                  background: 'linear-gradient(135deg, var(--rq-base, #E8CDD0) 0%, var(--cloud-dancer, #F0EDE8) 55%, var(--ice-melt, #AECDE0) 100%)',
                  padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{g.title}</div>
                  <div style={{ fontSize: 26, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.1 }}>{dd || '—'}</div>
                  {cp && (
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                      ~ {cp.date}<br />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{cp.label}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  <Pill variant={g.status === 'active' ? 'green' : g.status === 'upcoming' ? 'amber' : 'gray'}>
                    {g.status === 'active' ? '진행 중' : g.status === 'upcoming' ? '예정' : '종료'}
                  </Pill>
                  <div style={{ fontSize: 10, color: 'var(--text-primary)', fontWeight: 500, marginTop: 2 }}>{gs.statusText}</div>
                </div>
              </div>

              {/* 내 상태 */}
              <div style={{ padding: '14px 16px', borderTop: '0.5px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>내 상태</div>
                  <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 500 }}>
                    {bks.length === 0 ? '책 등록 대기 중' : getMyStatusText(personalRound, myStatus, totalRounds)}
                  </div>
                </div>
                <MyBooksRow books={bks} currentRound={personalRound} userId={user.id} totalRounds={totalRounds} />

                {isFirstRound && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <StatusButton label="다 읽었어요!" active={!!myStatus?.isRead} onClick={() => handleStatusChange(g.id, 'isRead')} />
                    <StatusButton label="발송했어요!" active={!!myStatus?.isSent} onClick={() => handleStatusChange(g.id, 'isSent')} />
                  </div>
                )}

                {isMidRound && (
                  <>
                    <div style={{ display: 'flex', marginTop: 8, marginBottom: 6 }}>
                      <StatusButton label="도착했어요!" active={!!myStatus?.isArrived} onClick={() => handleStatusChange(g.id, 'isArrived')} style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <StatusButton label="다 읽었어요!" active={!!myStatus?.isRead} disabled={!myStatus?.isArrived} onClick={() => handleStatusChange(g.id, 'isRead')} />
                      <StatusButton label="발송했어요!" active={!!myStatus?.isSent} disabled={!myStatus?.isArrived} onClick={() => handleStatusChange(g.id, 'isSent')} />
                    </div>
                    {!myStatus?.isArrived && (
                      <div style={{ fontSize: 10, color: 'var(--text-hint)', textAlign: 'center', marginTop: 4 }}>도착 확인 후 활성화됩니다</div>
                    )}
                  </>
                )}

                {isLastRound && (
                  <>
                    <div style={{ display: 'flex', marginTop: 8, marginBottom: 6 }}>
                      <StatusButton label="도착했어요!" active={!!myStatus?.isArrived} onClick={() => handleStatusChange(g.id, 'isArrived')} style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <StatusButton label="다 읽었어요!" active={!!myStatus?.isRead} disabled={!myStatus?.isArrived} onClick={() => handleStatusChange(g.id, 'isRead')} />
                    </div>
                    {!myStatus?.isArrived && (
                      <div style={{ fontSize: 10, color: 'var(--text-hint)', textAlign: 'center', marginTop: 4 }}>도착 확인 후 활성화됩니다</div>
                    )}
                  </>
                )}
              </div>

              {/* 독서 현황 — 탭 선택 방식 */}
              {(g.participantIds || []).length > 0 && (
                <div style={{ padding: '14px 16px', borderTop: '0.5px solid var(--border-default)' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>독서 현황</div>
                  {(g.participantIds || []).map((pid, idx) => (
                    <MemberRow
                      key={pid}
                      userId={pid}
                      userName={userMap[pid]?.name}
                      books={bks}
                      allStatuses={sm}
                      isMe={pid === user.id}
                      isLast={idx === g.participantIds.length - 1}
                      totalRounds={totalRounds}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <SectionHeader>나의 위시리스트</SectionHeader>
        {wishlist.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
            border: '0.5px solid var(--border-default)', padding: '16px',
            textAlign: 'center', boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>위시리스트가 비어 있습니다</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint)' }}>서재에서 읽고 싶은 책을 추가해 보세요</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {wishlist
            .filter((w, idx, arr) => arr.findIndex(x => x.isbn && x.isbn === w.isbn) === idx)
            .slice(0, 5)
            .map(item => (
              <WishCoverItem key={item.id} item={item} />
            ))}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      <BottomNav />

      {showNotification && (
        <NotificationModal
          invites={pendingInvites}
          userId={user.id}
          onClose={() => setShowNotification(false)}
          onUpdate={() => { setShowNotification(false); loadData(); }}
        />
      )}
    </div>
  );
}

function MyBooksRow({ books, currentRound, userId, totalRounds }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <ProfileCircle name="나" isMe size={32} />
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: totalRounds }, (_, i) => {
          const round = i + 1;
          const book  = books.find(b => b.round === round && b.exchangeOrder?.includes(userId));
          const state = getBookCardState(round, currentRound);
          return <BookCover key={round} coverUrl={book?.coverUrl} state={state} width={44} height={60} />;
        })}
      </div>
    </div>
  );
}

// 독서 현황 — 탭 선택 방식
function MemberRow({ userId, userName, books, allStatuses, isMe, isLast, totalRounds }) {
  const personalRound = getPersonalCurrentRound(userId, books, allStatuses, totalRounds);
  const [selectedRound, setSelectedRound] = useState(personalRound);

  // personalRound 바뀌면 selectedRound도 초기화
  useEffect(() => {
    setSelectedRound(personalRound);
  }, [personalRound]);

  const selectedBook = books.find(b => b.round === selectedRound && b.exchangeOrder?.includes(userId));
  const selectedStatus = selectedBook ? allStatuses[selectedBook.id]?.[userId] : null;

  const isFirst = selectedRound === 1;
  const isLast2 = selectedRound === totalRounds;

  // 선택 라운드별 체크포인트 목록
  const checkpoints = isFirst
    ? [
        { key: 'isRead', label: '완독' },
        { key: 'isSent', label: '발송함' },
      ]
    : isLast2
    ? [
        { key: 'isArrived', label: '받음' },
        { key: 'isRead', label: '완독' },
      ]
    : [
        { key: 'isArrived', label: '받음' },
        { key: 'isRead', label: '완독' },
        { key: 'isSent', label: '발송함' },
      ];

  return (
    <div style={{
      paddingBottom: isLast ? 0 : 12, marginBottom: isLast ? 0 : 12,
      borderBottom: isLast ? 'none' : '0.5px solid var(--border-default)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ProfileCircle name={userName || userId} isMe={isMe} size={26} />

        {/* 책 탭 */}
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: totalRounds }, (_, i) => {
            const round = i + 1;
            const book  = books.find(b => b.round === round && b.exchangeOrder?.includes(userId));
            const isSelected = round === selectedRound;
            return (
              <div
                key={round}
                onClick={() => setSelectedRound(round)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <BookCover
                  coverUrl={book?.coverUrl}
                  state={round === selectedRound ? 'current' : 'pending'}
                  width={38}
                  height={52}
                />
                {isSelected && (
                  <div style={{
                    position: 'absolute', bottom: -3, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4, height: 4, borderRadius: '50%',
                    background: 'var(--accent-primary)',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* 선택된 라운드 상태 */}
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end', flexShrink: 0 }}>
          {checkpoints.map(cp => (
            <div key={cp.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{cp.label}</span>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: selectedStatus?.[cp.key] ? 'var(--accent-primary)' : 'var(--border-strong)',
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WishCoverItem({ item }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <div style={{
        width: 52, height: 72, borderRadius: 7,
        background: 'var(--bg-surface-secondary)',
        border: '0.5px solid var(--border-input)',
        overflow: 'hidden', flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
      }}>
        {item.coverUrl
          ? <img src={item.coverUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'var(--accent-amber)' }} />
        }
      </div>
      <div style={{
        fontSize: 9, color: 'var(--text-secondary)', textAlign: 'center',
        maxWidth: 52, lineHeight: 1.3,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.title}
      </div>
    </div>
  );
}