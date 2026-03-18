import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import BottomNav from '../components/layout/BottomNav';
import { Spinner, EmptyState, Divider, Toast } from '../components/common';
import {
  getWishlist, removeFromWishlist,
  getGyodoks, getBooks, addToWishlist,
} from '../supabase/db';
import { searchBooks } from '../utils/aladinApi';

const TABS = [
  { key: 'all',    label: '전체' },
  { key: 'gyodok', label: '교독' },
  { key: 'wish',   label: '위시' },
];

export default function LibraryPage() {
  const { user } = useAuth();

  const [tab,          setTab]          = useState('all');
  const [wishlist,     setWishlist]     = useState([]);
  const [gyodokBooks,  setGyodokBooks]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showSearch,   setShowSearch]   = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [toast,        setToast]        = useState({ msg: '', type: 'error' });

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'error' }), 4800);
  };

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [wl, gyodoks] = await Promise.all([
        getWishlist(user.id),
        getGyodoks(user.id),
      ]);
      setWishlist(wl);
      const booksAll = [];
      for (const g of gyodoks) {
        const bks = await getBooks(g.id);
        bks.filter(b => b.ownerId === user.id).forEach(b => {
          booksAll.push({
            ...b,
            _gyodokTitle:     g.title,
            _gyodokStatus:    g.status,
            _gyodokStartDate: g.startDate,
            _gyodokId:        g.id,
          });
        });
      }
      setGyodokBooks(booksAll);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ISBN 기준 중복 제거 통합
  const mergeBooks = () => {
    const map = new Map();
    gyodokBooks.forEach(b => {
      const key = b.isbn || b.id;
      if (!map.has(key)) map.set(key, { ...b, _gyodokRecords: [], _wishId: null, _wishItemId: null });
      map.get(key)._gyodokRecords.push({
        gyodokId:     b._gyodokId,
        gyodokTitle:  b._gyodokTitle,
        gyodokStatus: b._gyodokStatus,
        startDate:    b._gyodokStartDate,
        round:        b.round,
      });
    });
    wishlist.forEach(w => {
      const key = w.isbn || w.id;
      if (!map.has(key)) map.set(key, { ...w, _gyodokRecords: [], _wishId: w.id, _wishItemId: w.id });
      else { map.get(key)._wishId = w.id; map.get(key)._wishItemId = w.id; }
    });
    return Array.from(map.values());
  };

  const allBooks   = mergeBooks();
  const gyodokOnly = allBooks.filter(b => b._gyodokRecords?.length > 0);
  const wishOnly   = allBooks.filter(b => b._wishId);
  const displayBooks = tab === 'all' ? allBooks : tab === 'gyodok' ? gyodokOnly : wishOnly;

  const handleWishToggle = async (book) => {
    if (book._wishId) {
      await removeFromWishlist(book._wishId);
      setWishlist(prev => prev.filter(w => w.id !== book._wishId));
      setSelectedBook(prev => prev ? { ...prev, _wishId: null, _wishItemId: null } : null);
      showToast('위시리스트에서 제거했습니다', 'error');
    } else {
      try {
        const added = await addToWishlist({
          userId: user.id, isbn: book.isbn, title: book.title,
          author: book.author, publisher: book.publisher,
          coverUrl: book.coverUrl, description: book.description,
          price: book.price, publishDate: book.publishDate,
        });
        setWishlist(prev => [added, ...prev]);
        setSelectedBook(prev => prev ? { ...prev, _wishId: added.id, _wishItemId: added.id } : null);
        showToast('위시리스트에 추가했습니다', 'success');
      } catch (e) {
        if (e.message === 'ALREADY_EXISTS') showToast('이미 위시리스트에 있습니다', 'error');
        else console.error(e);
      }
    }
  };

  return (
    <div className="page">
      {/* 상단 배너 */}
      <div style={{
        background: 'linear-gradient(135deg, #ccd5ae 0%, #e9edc9 60%, #fefae0 100%)',
        padding: '18px 14px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: '#3a4028', marginBottom: 4 }}>내 서재</div>
          <div style={{ fontSize: 12, color: '#6a7040' }}>읽은 책과 읽고 싶은 책을 모아보세요</div>
        </div>
        <button onClick={() => setShowSearch(true)} style={{
          padding: '7px 14px', borderRadius: 'var(--radius-full)',
          background: 'rgba(255,255,255,0.7)', border: '0.5px solid rgba(255,255,255,0.9)',
          fontSize: 12, color: '#3a4028', fontWeight: 500,
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="#3a4028" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          책 추가
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '0.5px solid var(--border-default)', background: 'var(--bg-page)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '4px 12px', borderRadius: 'var(--radius-full)',
            fontSize: 12, fontWeight: 500, border: '0.5px solid transparent',
            background: tab === t.key ? 'var(--accent-green)' : 'transparent',
            color: tab === t.key ? 'var(--accent-green-dark)' : 'var(--text-tertiary)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>{t.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 500 }}>{displayBooks.length}</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>권</span>
        </div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {loading && <Spinner />}
        {!loading && displayBooks.length === 0 && (
          <EmptyState message="책이 없습니다" sub="상단 책 추가 버튼으로 책을 추가해 보세요" />
        )}
        {!loading && displayBooks.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
            {displayBooks.map((book, i) => (
              <BookItem key={book.isbn || book.id || i} book={book} onClick={() => setSelectedBook(book)} />
            ))}
            <div onClick={() => setShowSearch(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <div style={{ width: '100%', height: 90, borderRadius: 6, border: '0.5px dashed var(--border-input)', background: 'var(--bg-surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v12M4 10h12" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>추가</span>
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', padding: '8px 0 16px' }}>
          교독에 사용한 책은 자동으로 서재에 저장됩니다
        </div>
      </div>

      <Toast message={toast.msg} type={toast.type} />
      <BottomNav />

      {showSearch && (
        <BookSearchSheet
          onClose={() => setShowSearch(false)}
          userId={user?.id}
          onAddWish={(book) => { setWishlist(prev => [book, ...prev]); showToast('위시리스트에 추가했습니다', 'success'); }}
          onAddWishError={(msg) => showToast(msg, 'error')}
        />
      )}

      {selectedBook && (
        <BookDetailSheet
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onWishToggle={() => handleWishToggle(selectedBook)}
        />
      )}
    </div>
  );
}

/* ── 책 아이템 ── */
function BookItem({ book, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
      <div style={{ width: '100%', height: 90, borderRadius: 6, border: '0.5px solid var(--border-input)', overflow: 'hidden', background: 'var(--bg-surface-secondary)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: 'rgba(0,0,0,0.07)' }} />
        {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {book._wishId && (
          <div style={{ position: 'absolute', top: 4, right: 4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5l1.4 2.8 3.1.45-2.25 2.2.53 3.1L7 8.6l-2.78 1.45.53-3.1L2.5 4.75l3.1-.45z" fill="#d4a373" stroke="#d4a373" strokeWidth="0.5" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.3, maxWidth: '100%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {book.title}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textAlign: 'center' }}>{book.author}</div>
    </div>
  );
}

/* ── 도서 상세 시트 ── */
function BookDetailSheet({ book, onClose, onWishToggle }) {
  const isInWish     = !!book._wishId;
  const gyodokRecords = book._gyodokRecords || [];

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 'var(--app-width)',
      bottom: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column',
    }} onClick={onClose}>
      <div style={{ height: 52, flexShrink: 0 }} />
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{
        flex: 1, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-default)', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>내 도서 상세</span>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>

          {/* 책 기본 정보 */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 72, height: 98, borderRadius: 8, background: 'var(--accent-green)', flexShrink: 0, overflow: 'hidden' }}>
              {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 5 }}>
                {book.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
                {book.author}<br />
                {book.publisher}{book.publishDate ? ` · ${book.publishDate?.slice(0,4)}` : ''}
              </div>
              {book.price > 0 && (
                <div style={{ fontSize: 13, color: '#185fa5', fontWeight: 500, marginTop: 4 }}>
                  {book.price?.toLocaleString()}원
                </div>
              )}
            </div>
          </div>

          {/* 책 소개 */}
          {book.description && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                {book.description.length > 120 ? book.description.slice(0, 120) + '...' : book.description}
              </div>
              <Divider />
            </>
          )}

          {/* 위시리스트 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 10 }}>위시리스트</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {isInWish ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#faedcd', borderRadius: 20, border: '0.5px solid #e9c97a' }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1.5l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="#d4a373" stroke="#d4a373" strokeWidth="0.5" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 11, color: '#7a5a20', fontWeight: 500 }}>위시리스트에 있음</span>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>위시리스트에 없음</span>
              )}
              <button onClick={onWishToggle} style={{
                padding: '5px 14px', borderRadius: 20,
                background: isInWish ? 'var(--bg-surface-secondary)' : '#faedcd',
                border: isInWish ? '0.5px solid var(--border-input)' : '0.5px solid #e9c97a',
                fontSize: 11, fontWeight: 500,
                color: isInWish ? 'var(--text-tertiary)' : '#7a5a20',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                {isInWish ? '해제' : '+ 위시 추가'}
              </button>
            </div>
          </div>

          <Divider />

          {/* 교독 기록 */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 10 }}>
              교독 기록 {gyodokRecords.length}회
            </div>
            {gyodokRecords.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-hint)', textAlign: 'center', padding: '12px 0' }}>
                교독 기록이 없습니다
              </div>
            ) : (
              gyodokRecords.map((rec, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderBottom: i < gyodokRecords.length - 1 ? '0.5px solid var(--border-default)' : 'none',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: rec.gyodokStatus === 'active' ? 'var(--accent-green)' : 'var(--border-strong)',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {rec.gyodokTitle}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {rec.startDate ? new Date(rec.startDate).getFullYear() + '.' + String(new Date(rec.startDate).getMonth()+1).padStart(2,'0') + '.' + String(new Date(rec.startDate).getDate()).padStart(2,'0') : ''}{rec.round ? ` · ${rec.round}차로 읽음` : ''}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 500,
                    background: rec.gyodokStatus === 'active' ? 'var(--accent-green)' : rec.gyodokStatus === 'upcoming' ? 'var(--accent-amber)' : 'var(--bg-surface-secondary)',
                    color: rec.gyodokStatus === 'active' ? 'var(--accent-green-dark)' : rec.gyodokStatus === 'upcoming' ? 'var(--accent-amber-text)' : 'var(--text-tertiary)',
                  }}>
                    {rec.gyodokStatus === 'active' ? '진행 중' : rec.gyodokStatus === 'upcoming' ? '예정' : '종료'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 도서 검색 시트 ── */
function BookSearchSheet({ onClose, userId, onAddWish, onAddWishError }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try { setResults(await searchBooks(query)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAddWish = async (book) => {
    try {
      const added = await addToWishlist({ userId, ...book });
      if (added) onAddWish({ id: added.id, ...book });
    } catch (e) {
      if (e.message === 'ALREADY_EXISTS') onAddWishError('이미 위시리스트에 있는 책입니다');
      else console.error(e);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 'var(--app-width)',
      bottom: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column',
    }} onClick={onClose}>
      <div style={{ height: 52, flexShrink: 0 }} />
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{ flex: 1, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-default)', flexShrink: 0 }}>
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
              style={{ flex: 1, height: 38, borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-input)', background: 'var(--bg-input)', padding: '0 10px', fontSize: 13, color: 'var(--text-primary)' }}
            />
            <button onClick={handleSearch} style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="4" stroke="#fff" strokeWidth="1.3"/>
                <path d="M10 10l2.5 2.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {loading && <Spinner />}
          {results.length > 0 && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 8 }}>검색 결과 {results.length}건</div>}
          {results.map((book, i) => (
            <div key={book.isbn || i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < results.length - 1 ? '0.5px solid var(--border-default)' : 'none', alignItems: 'flex-start' }}>
              <div style={{ width: 46, height: 62, borderRadius: 5, border: '0.5px solid var(--border-input)', flexShrink: 0, overflow: 'hidden', background: 'var(--accent-green)' }}>
                {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 3 }}>{book.title}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{book.author} · {book.publisher}<br />{book.publishDate}</div>
                {book.price > 0 && <div style={{ fontSize: 11, color: '#185fa5', fontWeight: 500, marginTop: 2 }}>{book.price.toLocaleString()}원</div>}
                <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                  <button onClick={() => setSelected(book)} style={{ flex: 1, height: 28, borderRadius: 7, background: 'var(--accent-green)', border: '0.5px solid var(--border-default)', fontSize: 10, color: 'var(--accent-green-dark)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>상세 보기</button>
                  <button onClick={() => handleAddWish(book)} style={{ flex: 1, height: 28, borderRadius: 7, background: 'var(--bg-surface-secondary)', border: '0.5px solid var(--border-input)', fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>위시에 추가</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <BookDetailInSearch book={selected} onClose={() => setSelected(null)} onAddWish={() => { handleAddWish(selected); setSelected(null); }} />
      )}
    </div>
  );
}

function BookDetailInSearch({ book, onClose, onAddWish }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 10 }} onClick={onClose}>
      <div style={{ height: 52, flexShrink: 0 }} />
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{ flex: 1, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-default)', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>도서 상세</span>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 62, height: 84, borderRadius: 8, border: '0.5px solid var(--border-input)', flexShrink: 0, overflow: 'hidden', background: 'var(--accent-green)' }}>
              {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 5 }}>{book.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>{book.author} · {book.publisher}<br />출판일: {book.publishDate}<br />ISBN: {book.isbn}</div>
              {book.price > 0 && <div style={{ fontSize: 13, color: '#185fa5', fontWeight: 500, marginTop: 5 }}>{book.price.toLocaleString()}원</div>}
            </div>
          </div>
          <Divider />
          {book.description && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>책 소개</div><div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{book.description}</div></div>}
          <button onClick={onAddWish} style={{ width: '100%', height: 40, borderRadius: 'var(--radius-md)', background: 'var(--accent-green)', border: '0.5px solid var(--border-default)', fontSize: 13, color: 'var(--accent-green-dark)', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            위시리스트에 추가
          </button>
        </div>
      </div>
    </div>
  );
}
