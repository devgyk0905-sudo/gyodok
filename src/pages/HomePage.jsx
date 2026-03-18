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
  getPersonalCurrentRound,
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
    <div className="page">
      <TopBar
        title="홈"
        notificationCount={pendingInvites.length}
        onNotificationClick={() => setShowNotification(true)}
      />

      {/* 프로필 미완성 팝업 */}
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

      <div className="page-content fade-in">

        {/* 초대 배너 */}
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

          // 개인별 현재 차수 기준으로 내 책 찾기
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
              <div
                onClick={() => navigate(`/gyodok/${g.id}`)}
                style={{
                  background: 'linear-gradient(135deg, #ccd5ae 0%, #faedcd 60%, #fefae0 100%)',
                  padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: '#5a6030', lineHeight: 1.8 }}>{g.title}</div>
                  <div style={{ fontSize: 26, fontWeight: 500, color: '#3a4028', lineHeight: 1.1 }}>{dd || '—'}</div>
                  {cp && (
                    <div style={{ fontSize: 10, color: '#5a6030', lineHeight: 1.8 }}>
                      ~ {cp.date}<br />
                      <span style={{ color: '#3a4028', fontWeight: 500 }}>{cp.label}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  <Pill variant={g.status === 'active' ? 'green' : g.status === 'upcoming' ? 'amber' : 'gray'}>
                    {g.status === 'active' ? '진행 중' : g.status === 'upcoming' ? '예정' : '종료'}
                  </Pill>
                  <div style={{ fontSize: 10, color: '#3a4028', fontWeight: 500, marginTop: 2 }}>{gs.statusText}</div>
                </div>
              </div>

              {/* 내 상태 */}
              <div style={{ padding: '14px 16px', borderTop: '0.5px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>내 상태</div>
                  <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 500 }}>
                    {bks.length === 0 ? '책 등록 대기 중' : getMyStatusText(personalRound, myStatus)}
                  </div>
                </div>
                <MyBooksRow books={bks} currentRound={personalRound} userId={user.id} totalRounds={totalRounds} />

                {/* 1차: 읽기 + 발송 */}
                {isFirstRound && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <StatusButton label="다 읽었어요!" active={!!myStatus?.isRead} onClick={() => handleStatusChange(g.id, 'isRead')} />
                    <StatusButton label="발송했어요!" active={!!myStatus?.isSent} onClick={() => handleStatusChange(g.id, 'isSent')} />
                  </div>
                )}

                {/* 중간차: 도착(풀) → 읽기 + 발송 */}
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

                {/* 마지막차: 도착(풀) + 읽기 */}
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

              {/* 독서 현황 */}
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

        {/* 위시리스트 */}
        <SectionHeader>내 다음 책 후보</SectionHeader>
        <Card style={{ padding: '8px 12px' }}>
          {wishlist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>위시리스트가 비어 있습니다</div>
              <div style={{ fontSize: 11, color: 'var(--text-hint)' }}>서재에서 읽고 싶은 책을 추가해 보세요</div>
            </div>
          ) : (
            <>
              {wishlist.map((item, idx) => (
                <WishItem key={item.id} item={item} isLast={idx === wishlist.length - 1} />
              ))}
              <div style={{ fontSize: 10, color: 'var(--text-hint)', textAlign: 'right', marginTop: 6 }}>최신 5개 표시</div>
            </>
          )}
        </Card>

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

function MemberRow({ userId, userName, books, allStatuses, isMe, isLast, totalRounds }) {
  // 개인별 현재 차수 기준으로 상태 표시
  const personalRound = getPersonalCurrentRound(userId, books, allStatuses, totalRounds);
  const currentBook = books.find(b => b.round === personalRound && b.exchangeOrder?.includes(userId));
  const status = currentBook ? allStatuses[currentBook.id]?.[userId] : null;
  const { label, variant } = getMemberStatus(status);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      paddingBottom: isLast ? 0 : 10, marginBottom: isLast ? 0 : 10,
      borderBottom: isLast ? 'none' : '0.5px solid var(--border-default)',
    }}>
      <ProfileCircle name={userName || userId} isMe={isMe} size={26} />
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: totalRounds }, (_, i) => {
          const round = i + 1;
          const book  = books.find(b => b.round === round && b.exchangeOrder?.includes(userId));
          const state = getBookCardState(round, personalRound);
          return <BookCover key={round} coverUrl={book?.coverUrl} state={state} width={44} height={60} />;
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: variant === 'green' ? 'var(--accent-green)' : 'var(--status-pending)',
          border: variant !== 'green' ? '0.5px solid var(--border-strong)' : 'none',
        }} />
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
    </div>
  );
}

function WishItem({ item, isLast }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: isLast ? 'none' : '0.5px solid var(--border-default)' }}>
      <div style={{ width: 26, height: 36, borderRadius: 3, background: item.coverUrl ? 'transparent' : 'var(--accent-amber)', flexShrink: 0, overflow: 'hidden' }}>
        {item.coverUrl && <img src={item.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{item.title}</div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.author}</div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.publisher}</div>
      </div>
    </div>
  );
}
