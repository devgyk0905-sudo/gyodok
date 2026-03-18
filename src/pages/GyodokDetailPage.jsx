import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import {
  Card, Pill, Divider, Spinner, EmptyState, Toast,
  ProfileCircle, BookCover, StatusButton,
} from '../components/common';
import {
  getGyodok, getBooks, getBookStatus, updateBookStatus,
  addFeedItem, getAllUsers, addBook, addToWishlist, deleteBook,
  removeFromWishlistByIsbn,
} from '../supabase/db';
import { searchBooks } from '../utils/aladinApi';
import { getBookCardState, calcGyodokStatus } from '../utils/statusCalc';

export default function GyodokDetailPage() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gyodok,         setGyodok]         = useState(null);
  const [books,          setBooks]          = useState([]);
  const [allStatuses,    setAllStatuses]    = useState({});
  const [loading,        setLoading]        = useState(true);
  const [selectedBook,   setSelectedBook]   = useState(null);
  const [userMap,        setUserMap]        = useState({});
  const [showBookSearch, setShowBookSearch] = useState(false);
  const [showBookSelect, setShowBookSelect] = useState(null);
  const [toast,          setToast]          = useState({ msg: '', type: 'error' });
  const [selectedMember, setSelectedMember] = useState(null);

  const isAdmin = user?.isAdmin || user?.is_admin;

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'error' }), 4800);
  };

  const load = useCallback(async () => {
    try {
      const [g, bks, users] = await Promise.all([
        getGyodok(id), getBooks(id), getAllUsers(),
      ]);
      setGyodok(g);
      setBooks(bks);
      const map = {};
      users.forEach(u => { map[u.id] = u; });
      setUserMap(map);

      const statusMap = {};
      for (const book of bks) {
        statusMap[book.id] = {};
        for (const pid of (g?.participantIds || [])) {
          statusMap[book.id][pid] = await getBookStatus(id, book.id, pid);
        }
      }
      setAllStatuses(statusMap);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (book, field) => {
    if (!user) return;
    const current = allStatuses[book.id]?.[user.id] || {};
    const updated  = { ...current, [field]: !current[field] };
    if (field === 'isSent' && !updated.isSent) updated.isArrived = false;
    await updateBookStatus(id, book.id, user.id, updated);
    if (updated[field]) {
      const types = { isRead: 'read', isSent: 'sent', isArrived: 'arrived' };
      await addFeedItem({ gyodokId: id, userId: user.id, userName: user.name, type: types[field], bookTitle: book.title || '' });
    }
    setAllStatuses(prev => ({ ...prev, [book.id]: { ...prev[book.id], [user.id]: updated } }));
    if (selectedBook?.id === book.id) setSelectedBook(prev => ({ ...prev, _status: updated }));
  };

  const doAddBook = async (bookData, round) => {
  try {
    const payload = {
      ...bookData,
      ownerId: user.id,
      round,
      exchangeOrder: [user.id],
      id: undefined,
      gyodokId: undefined,
    };
    console.log('addBook payload:', payload);  // ← 추가
    await addBook(id, payload);

      // 위시리스트에 있으면 조용히 자동 삭제
      if (bookData.isbn) {
        await removeFromWishlistByIsbn(user.id, bookData.isbn);
      }
      await load();
      setShowBookSelect(null);
      setShowBookSearch(false);
      showToast(`${round}차 책을 등록했습니다`, 'success');
    } catch (e) { console.error(e); }
  };

  const checkWishAndAdd = async (bookData, round) => {
    await doAddBook(bookData, round);
  };

  const handleSelectBook = async (book, round) => {
    await checkWishAndAdd(book, round);
  };

  const handleAddBook = async (bookData) => {
    const myBook = books.find(b => b.ownerId === user.id && b.round === 1);
    if (myBook) {
      showToast('등록한 책을 먼저 삭제 후 추가해 주세요');
      return;
    }
    await checkWishAndAdd(bookData, 1);
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('이 책을 삭제하시겠습니까?')) return;
    try {
      await deleteBook(bookId);
      setSelectedBook(null);
      await load();
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="page"><TopBar title="교독 상세" showBack /><Spinner /><BottomNav /></div>
  );
  if (!gyodok) return (
    <div className="page"><TopBar title="교독 상세" showBack /><EmptyState message="교독 정보를 불러올 수 없습니다" /><BottomNav /></div>
  );

  const canEdit     = isAdmin || gyodok.editableIds?.includes(user?.id);
  const totalRounds = gyodok.participantIds?.length || 3;

  const gyodokStatus = calcGyodokStatus(
    (gyodok.participantIds || []).map(uid => ({ id: uid })),
    books, allStatuses, totalRounds
  );

  // 본인을 맨 위로 정렬
  const sortedParticipants = [
    ...(gyodok.participantIds || []).filter(pid => pid === user?.id),
    ...(gyodok.participantIds || []).filter(pid => pid !== user?.id),
  ];

  return (
    <div className="page">
      <TopBar title="교독 상세" showBack />

      <div className="page-content fade-in">
        {/* 교독 헤더 */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <CollageImage books={books} />
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 5 }}>
              <Pill variant="green">📖 {statusLabel(gyodok.status)}</Pill>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {gyodok.title}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
              {formatDate(gyodok.startDate)}{gyodok.endDate ? ` ~ ${formatDate(gyodok.endDate)}` : ''}
            </div>
            <div style={{ display: 'flex', marginTop: 6 }}>
              {(gyodok.participantIds || []).slice(0, 4).map((pid, i) => (
                <div key={pid} style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: ['var(--accent-green)', 'var(--accent-amber)', 'var(--accent-primary)', 'var(--color-beige)'][i % 4],
                  border: '1.5px solid var(--bg-page)', marginLeft: i > 0 ? -6 : 0,
                }} />
              ))}
            </div>
          </div>

          {/* 우측 버튼 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {isAdmin && (
              <button
                onClick={() => navigate(`/admin/manage/${id}`)}
                style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: 'var(--accent-amber)',
                  border: '0.5px solid var(--border-strong)',
                  fontSize: 11, color: 'var(--accent-amber-text)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                }}
              >
                교독 관리
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setShowBookSearch(true)}
                style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: 'var(--bg-surface-secondary)',
                  border: '0.5px solid var(--border-input)',
                  fontSize: 11, color: 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                }}
              >
                + 책 등록
              </button>
            )}
          </div>
        </div>

        <Divider />
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 10 }}>진행 현황</div>

        {sortedParticipants.length === 0 && <EmptyState message="참여자가 없습니다" />}

        {sortedParticipants.map((pid, pidIdx) => {
          const isMe       = pid === user?.id;
          const isLast     = pidIdx === sortedParticipants.length - 1;
          const memberName = userMap[pid]?.name || pid;
          const memberData = userMap[pid];
          const myBooks    = Array.from({ length: totalRounds }, (_, i) => {
            const round = i + 1;
            return books.find(b => b.round === round && b.ownerId === pid) || null;
          });

          return (
            <div key={pid} style={{
              marginBottom: isLast ? 0 : 14, paddingBottom: isLast ? 0 : 14,
              borderBottom: isLast ? 'none' : '0.5px solid var(--border-default)',
            }}>
              {/* 프로필 + 책 가로 배치 */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {/* 프로필 (세로: 이미지 + 이름) */}
                <div
                  onClick={() => !isMe && setSelectedMember(memberData)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, width: 44, flexShrink: 0,
                    cursor: isMe ? 'default' : 'pointer',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: isMe ? 'var(--accent-primary)' : 'var(--accent-green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 500,
                    color: isMe ? '#fff' : 'var(--accent-green-dark)',
                    overflow: 'hidden', flexShrink: 0,
                    border: isMe ? '2px solid var(--accent-primary)' : '2px solid var(--accent-green)',
                  }}>
                    {memberData?.profileImage
                      ? <img src={memberData.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : memberName?.charAt(0)
                    }
                  </div>
                  <span style={{
                    fontSize: 9, color: 'var(--text-secondary)',
                    textAlign: 'center', lineHeight: 1.3,
                    maxWidth: 44, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {isMe ? `${user.name} (나)` : memberName}
                  </span>
                </div>

                {/* 책 목록 */}
                <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                  {myBooks.map((book, i) => {
                    const round = i + 1;
                    const state = getBookCardState(round, gyodokStatus.round);
                    const st    = book ? allStatuses[book.id]?.[pid] : null;
                    // 내 책이고 비어있고 round > 1이면 선택 가능
                    const canSelect = isMe && !book && round > 1;
                    return (
                      <div key={round} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div
                          onClick={canSelect ? () => setShowBookSelect(round) : undefined}
                          style={{ cursor: canSelect ? 'pointer' : 'default' }}
                        >
                          {canSelect ? (
                            <div style={{
                              width: 44, height: 60, borderRadius: 6,
                              border: '1.5px dashed var(--accent-primary)',
                              background: 'var(--bg-surface-secondary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 3v10M3 8h10" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </div>
                          ) : (
                            <BookCover
                              coverUrl={book?.coverUrl}
                              state={state}
                              width={44}
                              height={60}
                              onClick={book ? () => setSelectedBook({ ...book, _ownerIs: pid, _status: allStatuses[book.id]?.[pid] }) : undefined}
                            />
                          )}
                        </div>
                        <span style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>{round}차</span>
                        <BookStatusBadge round={round} currentRound={gyodokStatus.round} status={st} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ height: 16 }} />
      </div>

      <BottomNav />

      {/* 토스트 메시지 */}
      <Toast message={toast.msg} type={toast.type} />

      {/* 참여자 프로필 팝업 */}
      {selectedMember && (
        <MemberProfileSheet
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {selectedBook && (
        <BookFullSheet
          book={selectedBook}
          status={selectedBook._status}
          ownerUserId={selectedBook._ownerIs}
          currentUserId={user?.id}
          ownerName={userMap[selectedBook._ownerIs]?.name || selectedBook._ownerIs}
          isAdmin={isAdmin}
          onClose={() => setSelectedBook(null)}
          onStatusChange={(field) => handleStatusChange(selectedBook, field)}
          onDeleteBook={() => handleDeleteBook(selectedBook.id)}
          userMap={userMap}
        />
      )}

      {/* 2/3차 책 선택 시트 */}
      {showBookSelect && (
        <BookSelectSheet
          round={showBookSelect}
          books={books}
          userId={user?.id}
          userMap={userMap}
          participantIds={gyodok.participantIds || []}
          onClose={() => setShowBookSelect(null)}
          onSelect={(book) => handleSelectBook(book, showBookSelect)}
        />
      )}

      {showBookSearch && (
        <BookSearchSheet
          onClose={() => setShowBookSearch(false)}
          onAddBook={handleAddBook}
          onAddWish={async (book) => {
            try {
              await addToWishlist({ userId: user?.id, ...book });
              showToast('위시리스트에 추가했습니다', 'success');
            } catch (e) {
              if (e.message === 'ALREADY_EXISTS') {
                showToast('이미 위시리스트에 있는 책입니다', 'error');
              } else { console.error(e); }
            }
          }}
        />
      )}
    </div>
  );
}

function CollageImage({ books }) {
  const n = Math.min(Math.max(books.length, 2), 4);
  const covers = books.slice(0, n);
  const colors = ['var(--color-papaya-whip)', 'var(--color-beige)', 'var(--accent-green)', 'var(--accent-amber)'];
  const W = 150; const H = 104; const bookW = 82;
  const offset = n === 1 ? 0 : (W - bookW) / (n - 1);

  return (
    <div style={{ width: W, height: H, flexShrink: 0, position: 'relative' }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: i * offset,
          top: 0,
          width: bookW,
          height: H,
          borderRadius: 7,
          background: covers[i]?.coverUrl ? 'transparent' : colors[i % colors.length],
          boxShadow: '3px 3px 6px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {covers[i]?.coverUrl && (
            <img src={covers[i].coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function BookStatusBadge({ round, currentRound, status }) {
  if (round < currentRound) return <Pill variant="gray" style={{ fontSize: 8, padding: '1px 5px' }}>완료</Pill>;
  if (round > currentRound) return <span style={{ fontSize: 8, color: 'var(--text-hint)' }}>예정</span>;
  if (!status)              return <Pill variant="gray" style={{ fontSize: 8, padding: '1px 5px' }}>미시작</Pill>;
  if (status.isArrived)     return <Pill variant="green" style={{ fontSize: 8, padding: '1px 5px' }}>교환완료</Pill>;
  if (status.isSent)        return <Pill variant="green" style={{ fontSize: 8, padding: '1px 5px' }}>발송</Pill>;
  if (status.isRead)        return <Pill variant="green" style={{ fontSize: 8, padding: '1px 5px' }}>완독</Pill>;
  return <Pill variant="amber" style={{ fontSize: 8, padding: '1px 5px' }}>읽는 중</Pill>;
}

function BookFullSheet({ book, status, ownerUserId, currentUserId, ownerName, isAdmin, onClose, onStatusChange, onDeleteBook, userMap }) {
  const isMyBook  = ownerUserId === currentUserId;
  const canDelete = isMyBook || isAdmin;

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 'var(--app-width)',
      bottom: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column',
    }} onClick={onClose}>
      <div style={{ height: 52, flexShrink: 0 }} />
      <div className="slide-up" onClick={e => e.stopPropagation()}
        style={{ flex: 1, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '12px 14px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '0.5px solid var(--border-default)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>책 상세</span>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '13px 14px 20px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 58, height: 78, borderRadius: 7, background: 'var(--accent-green)', flexShrink: 0, overflow: 'hidden' }}>
              {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 4 }}>
                {book.title || '제목 없음'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
                {book.author} · {book.publisher}<br />
                {book.publishDate && `출판일: ${book.publishDate}`}<br />
                {book.isbn && `ISBN: ${book.isbn}`}
              </div>
              {book.price > 0 && (
                <div style={{ fontSize: 13, color: '#185fa5', fontWeight: 500, marginTop: 4 }}>
                  {book.price.toLocaleString()}원
                </div>
              )}
            </div>
          </div>
          <Divider />
          {isMyBook ? (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                상태 변경 <span style={{ color: 'var(--accent-green-dark)' }}>— 내 책</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <StatusButton label="다 읽었어요!" active={!!status?.isRead} onClick={() => onStatusChange('isRead')} />
                <StatusButton label="발송했어요!" active={!!status?.isSent} onClick={() => onStatusChange('isSent')} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <StatusButton label="도착했어요!" active={!!status?.isArrived} disabled={!status?.isSent} onClick={() => onStatusChange('isArrived')} />
              </div>
              {!status?.isSent && (
                <div style={{ fontSize: 10, color: 'var(--text-hint)', textAlign: 'center', marginTop: 4 }}>
                  발송 완료 후 활성화됩니다
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 7 }}>
                현재 상태 <span style={{ color: 'var(--accent-primary)' }}>— 조회만 가능</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1, padding: 8, borderRadius: 10, background: 'var(--bg-surface-secondary)', border: '0.5px solid var(--border-default)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>독서</div>
                  <Pill variant={status?.isRead ? 'green' : 'gray'} style={{ fontSize: 10 }}>{status?.isRead ? '완독' : '미완독'}</Pill>
                </div>
                <div style={{ flex: 1, padding: 8, borderRadius: 10, background: 'var(--bg-surface-secondary)', border: '0.5px solid var(--border-default)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>발송</div>
                  <Pill variant={status?.isSent ? 'green' : 'gray'} style={{ fontSize: 10 }}>{status?.isSent ? '발송함' : '미발송'}</Pill>
                </div>
              </div>
            </>
          )}
          <Divider />
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>책 주인</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ProfileCircle name={ownerName} isMe={ownerUserId === currentUserId} size={24} />
            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
              {ownerUserId === currentUserId ? `${ownerName} (나)` : ownerName}
            </span>
          </div>
          {book.exchangeOrder?.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>교환 순서</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {book.exchangeOrder.map((uid, i) => (
                  <React.Fragment key={uid}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <ProfileCircle name={userMap[uid]?.name || uid} isMe={uid === currentUserId} size={26}
                        style={uid === currentUserId ? { outline: '2px solid var(--accent-primary)', outlineOffset: 1 } : {}} />
                      <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                        {userMap[uid]?.name || uid.slice(0, 6)}
                      </span>
                    </div>
                    {i < book.exchangeOrder.length - 1 && (
                      <div style={{ flex: 1, borderTop: '0.5px dashed var(--border-input)', maxWidth: 30 }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <Divider />
            </>
          )}
          {book.description && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 5 }}>책 소개</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                {book.description.length > 150 ? book.description.slice(0, 150) + '...' : book.description}
              </div>
            </>
          )}
          {canDelete && (
            <>
              <Divider />
              <button onClick={onDeleteBook} style={{
                width: '100%', height: 40, borderRadius: 'var(--radius-md)',
                background: 'transparent', border: '0.5px solid #c87070',
                fontSize: 13, color: '#c87070',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', marginTop: 8,
              }}>
                {isAdmin && !isMyBook ? '책 삭제하기 (관리자)' : '책 삭제하기'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BookSearchSheet({ onClose, onAddBook, onAddWish }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try { setResults(await searchBooks(query)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 'var(--app-width)',
      bottom: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column',
    }} onClick={onClose}>
      <div style={{ height: 52, flexShrink: 0 }} />
      <div className="slide-up" onClick={e => e.stopPropagation()}
        style={{ flex: 1, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '12px 14px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '0.5px solid var(--border-default)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>도서 검색</span>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '13px 14px' }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
            <input type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="책 제목/저자/출판사 검색"
              style={{
                flex: 1, height: 38, borderRadius: 'var(--radius-sm)',
                border: '0.5px solid var(--border-input)',
                background: 'var(--bg-input)', padding: '0 10px',
                fontSize: 13, color: 'var(--text-primary)',
              }}
            />
            <button onClick={handleSearch} style={{
              width: 38, height: 38, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-primary)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="4" stroke="#fff" strokeWidth="1.3"/>
                <path d="M10 10l2.5 2.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 20 }}>검색 중...</div>}
          {results.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 8 }}>검색 결과 {results.length}건</div>
          )}
          {results.map((book, i) => (
            <div key={book.isbn || i} style={{
              display: 'flex', gap: 10, padding: '10px 0',
              borderBottom: i < results.length - 1 ? '0.5px solid var(--border-default)' : 'none',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: 46, height: 62, borderRadius: 5,
                border: '0.5px solid var(--border-input)',
                flexShrink: 0, overflow: 'hidden', background: 'var(--accent-green)',
              }}>
                {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 3 }}>
                  {book.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                  {book.author} · {book.publisher}<br />{book.publishDate}
                </div>
                {book.price > 0 && (
                  <div style={{ fontSize: 11, color: '#185fa5', fontWeight: 500, marginTop: 2 }}>
                    {book.price.toLocaleString()}원
                  </div>
                )}
                <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                  <button onClick={() => onAddBook(book)} style={{
                    flex: 1, height: 28, borderRadius: 7,
                    background: 'var(--accent-green)', border: '0.5px solid var(--border-default)',
                    fontSize: 10, color: 'var(--accent-green-dark)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}>교독에 추가</button>
                  <button onClick={() => onAddWish(book)} style={{
                    flex: 1, height: 28, borderRadius: 7,
                    background: 'var(--bg-surface-secondary)', border: '0.5px solid var(--border-input)',
                    fontSize: 10, color: 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}>위시에 추가</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 2/3차 책 선택 시트 ── */
function BookSelectSheet({ round, books, userId, userMap, participantIds, onClose, onSelect }) {
  // 다른 참여자들의 1차 책 목록 (내 책 제외, 아직 내 round에 없는 것)
  const myBooks = books.filter(b => b.ownerId === userId);
  const myBookOwnerIds = myBooks.map(b => b.ownerId);

  const candidates = books.filter(b =>
    b.round === 1 &&
    b.ownerId !== userId &&
    !myBooks.find(mb => mb.isbn && mb.isbn === b.isbn) // 이미 내가 등록한 책 제외
  );

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 'var(--app-width)',
        bottom: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column',
      }}
      onClick={onClose}
    >
      <div style={{ height: 52, flexShrink: 0 }} />
      <div
        className="slide-up"
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{
          padding: '12px 14px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '0.5px solid var(--border-default)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            {round}차 책 선택
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 14 }}>
            다른 참여자가 등록한 책 중에서 선택해 주세요
          </div>

          {candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
              선택 가능한 책이 없습니다{'\n'}다른 참여자가 먼저 책을 등록해야 합니다
            </div>
          ) : (
            candidates.map((book, i) => {
              const ownerName = userMap[book.ownerId]?.name || '참여자';
              return (
                <div key={book.id} style={{
                  display: 'flex', gap: 12, padding: '12px 0',
                  borderBottom: i < candidates.length - 1 ? '0.5px solid var(--border-default)' : 'none',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: 50, height: 68, borderRadius: 6,
                    background: 'var(--accent-green)', flexShrink: 0, overflow: 'hidden',
                  }}>
                    {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 3 }}>
                      {book.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                      {book.author} · {book.publisher}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 500 }}>
                      {ownerName}님의 책
                    </div>
                  </div>
                  <button
                    onClick={() => onSelect(book)}
                    style={{
                      padding: '7px 14px', borderRadius: 8,
                      background: 'var(--accent-green)',
                      border: '0.5px solid var(--border-default)',
                      fontSize: 11, color: 'var(--accent-green-dark)', fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'var(--font-sans)', flexShrink: 0,
                    }}
                  >
                    선택
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function MemberProfileSheet({ member, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 'var(--app-width)',
        bottom: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column',
      }}
      onClick={onClose}
    >
      <div style={{ height: 52, flexShrink: 0 }} />
      <div
        className="slide-up"
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{
          padding: '12px 14px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '0.5px solid var(--border-default)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>참여자 정보</span>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          {/* 프로필 이미지 + 이름 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--accent-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 500, color: 'var(--accent-green-dark)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {member.profileImage
                ? <img src={member.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : member.name?.charAt(0)
              }
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-primary)' }}>{member.name}</div>
            </div>
          </div>

          {/* 정보 카드 */}
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '0.5px solid var(--border-default)',
            overflow: 'hidden',
          }}>
            <InfoRow label="핸드폰 번호" value={member.phone || '미등록'} />
            <div style={{ height: '0.5px', background: 'var(--border-default)' }} />
            <InfoRow label="배송 주소" value={
              member.address
                ? <>
                    {(member.zipCode || member.zip_code) && (
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>
                        [{member.zipCode || member.zip_code}]
                      </span>
                    )}
                    <span>{member.address}{member.addressDetail ? ',' : ''}</span>
                    {member.addressDetail && (
                      <span style={{ display: 'block' }}>{member.addressDetail}</span>
                    )}
                  </>
                : '미등록'
            } />
            {member.deliveryMemo && (
              <>
                <div style={{ height: '0.5px', background: 'var(--border-default)' }} />
                <InfoRow label="배송 메모" value={member.deliveryMemo} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function statusLabel(status) {
  const labels = { active: '교독 진행 중', completed: '교독 완료!', upcoming: '교독 예정' };
  return labels[status] || '진행 중';
}

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch { return ''; }
}
