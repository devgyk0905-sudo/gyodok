import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import { Spinner, EmptyState, Divider, Toast } from '../components/common';
import {
  getWishlist, removeFromWishlist,
  getGyodoks, getBooks, addToWishlist,
  hideBookForOwner, addBook,
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
  const [gyodoks,      setGyodoks]      = useState([]);
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
      const [wl, gyodokList] = await Promise.all([
        getWishlist(user.id),
        getGyodoks(user.id),
      ]);
      setWishlist(wl);
      setGyodoks(gyodokList);
      const booksAll = [];
      for (const g of gyodokList) {
        const bks = await getBooks(g.id);
        bks.filter(b => b.ownerId === user.id && !b.hiddenForOwner).forEach(b => {
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
        bookId:       b.id,
      });
    });
    wishlist.forEach(w => {
      const key = w.isbn || w.id;
      if (!map.has(key)) map.set(key, { ...w, _gyodokRecords: [], _wishId: w.id, _wishItemId: w.id });
      else { map.get(key)._wishId = w.id; map.get(key)._wishItemId = w.id; }
    });
    return Array.from(map.values());
  };

  const allBooks     = mergeBooks();
  const gyodokOnly   = allBooks.filter(b => b._gyodokRecords?.length > 0);
  const wishOnly     = allBooks.filter(b => b._wishId);
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

  const handleDeleteBook = async (book) => {
    if (book._gyodokRecords?.length > 0) {
      for (const rec of book._gyodokRecords) {
        await hideBookForOwner(rec.bookId);
      }
    }
    if (book._wishId) {
      await removeFromWishlist(book._wishId);
    }
    setSelectedBook(null);
    await load();
    showToast('서재에서 삭제했습니다', 'error');
  };

  const handleAddToGyodok = async (book, gyodokId) => {
    try {
      await addBook(gyodokId, {
        ownerId:       user.id,
        round:         1,
        exchangeOrder: [user.id],
        isbn:          book.isbn,
        title:         book.title,
        author:        book.author,
        publisher:     book.publisher,
        coverUrl:      book.coverUrl,
        description:   book.description,
        price:         book.price,
        publishDate:   book.publishDate,
      });
      showToast('교독에 추가했습니다', 'success');
      setSelectedBook(null);
      await load();
    } catch (e) { console.error(e); }
  };

  const activeGyodoks = gyodoks.filter(g => g.status === 'active' || g.status === 'upcoming');

  return (
    <div className="page">
      <TopBar title="내 서재" />

      {/* ── 서재 히어로 배너 ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-raindrops-roses, #E8CDD0) 0%, var(--color-cloud-dancer, #F0EDE8) 55%, var(--color-ice-melt, #AECDE0) 100%)',
        padding: '16px 14px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>내 서재</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>읽은 책과 읽고 싶은 책을 모아보세요</div>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          style={{
            padding: '6px 12px', borderRadius: 'var(--radius-full)',
            background: 'rgba(255,255,255,0.7)', border: '0.5px solid rgba(255,255,255,0.9)',
            fontSize: 12, color: 'var(--text-primary)', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="var(--text-primary)" strokeWidth="1.4" strokeLinecap="round"/>
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
            background: tab === t.key ? 'var(--accent-primary)' : 'transparent',
            color: tab === t.key ? '#fff' : 'var(--text-tertiary)',
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
          activeGyodoks={activeGyodoks}
          onClose={() => setSelectedBook(null)}
          onWishToggle={() => handleWishToggle(selectedBook)}
          onDelete={() => handleDeleteBook(selectedBook)}
          onAddToGyodok={(gyodokId) => handleAddToGyodok(selectedBook, gyodokId)}
        />
      )}
    </div>
  );
}

function BookItem({ book, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
      <div style={{ width: '100%', height: 90, borderRadius: 6, border: '0.5px solid var(--border-input)', overflow: 'hidden', background: 'var(--bg-surface-secondary)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: 'rgba(0,0,0,0.07)' }} />
        {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {book._wishId && (
          <div style={{ position: 'absolute', top: 4, right: 4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {/* Pantone 2025: Lemon Icing 별 */}
              <path d="M7 1.5l1.4 2.8 3.1.45-2.25 2.2.53 3.1L7 8.6l-2.78 1.45.53-3.1L2.5 4.75l3.1-.45z" fill="var(--lemon-icing, #F5EFB8)" stroke="var(--accent-amber-text, #6A5A10)" strokeWidth="0.5" strokeLinejoin="round"/>
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

function BookDetailSheet({ book, activeGyodoks, onClose, onWishToggle, onDelete, onAddToGyodok }) {
  const isInWish      = !!book._wishId;
  const gyodokRecords = book._gyodokRecords || [];
  const isInGyodok    = gyodokRecords.length > 0;
  const [showGyodokPicker,  setShowGyodokPicker]  = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-default)', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>내 도서 상세</span>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 72, height: 98, borderRadius: 8, background: 'var(--accent-primary)', flexShrink: 0, overflow: 'hidden' }}>
              {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 5 }}>{book.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
                {book.author}<br />
                {book.publisher}{book.publishDate ? ` · ${book.publishDate?.slice(0,4)}` : ''}
              </div>
              {book.price > 0 && <div style={{ fontSize: 13, color: '#185fa5', fontWeight: 500, marginTop: 4 }}>{book.price?.toLocaleString()}원</div>}
            </div>
          </div>

          {book.description && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
              {book.description.length > 120 ? book.description.slice(0, 120) + '...' : book.description}
            </div>
          )}

          <Divider />

          {/* 위시리스트 */}
          <div style={{ padding: '14px 0' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 10 }}>위시리스트</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {isInWish ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'var(--accent-amber)', borderRadius: 20, border: '0.5px solid var(--border-strong)' }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1.5l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="var(--lemon-icing, #F5EFB8)" stroke="var(--accent-amber-text)" strokeWidth="0.5" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 11, color: 'var(--accent-amber-text)', fontWeight: 500 }}>위시리스트에 있음</span>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>위시리스트에 없음</span>
              )}
              <button onClick={onWishToggle} style={{
                padding: '5px 14px', borderRadius: 20,
                background: isInWish ? 'var(--bg-surface-secondary)' : 'var(--accent-amber)',
                border: isInWish ? '0.5px solid var(--border-input)' : '0.5px solid var(--border-strong)',
                fontSize: 11, fontWeight: 500,
                color: isInWish ? 'var(--text-tertiary)' : 'var(--accent-amber-text)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                {isInWish ? '해제' : '+ 위시 추가'}
              </button>
            </div>
          </div>

          <Divider />

          {/* 교독에 추가 + 삭제 */}
          <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px' }}>
            <button
              onClick={() => setShowGyodokPicker(true)}
              style={{
                flex: 1, height: 42, borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary)',
                border: 'none',
                fontSize: 12, color: '#fff', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              + 교독에 추가
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                flex: 1, height: 42, borderRadius: 'var(--radius-md)',
                background: 'transparent', border: '0.5px solid #c87070',
                fontSize: 12, color: '#c87070',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              내 서재에서 삭제하기
            </button>
          </div>

          <Divider />

          {/* 교독 기록 */}
          <div style={{ padding: '14px 0' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 10 }}>
              교독 기록 {gyodokRecords.length}회
            </div>
            {gyodokRecords.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-hint)', padding: '8px 0' }}>교독 기록이 없습니다</div>
            ) : (
              gyodokRecords.map((rec, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < gyodokRecords.length - 1 ? '0.5px solid var(--border-default)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: rec.gyodokStatus === 'active' ? 'var(--accent-primary)' : 'var(--border-strong)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{rec.gyodokTitle}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {rec.startDate ? new Date(rec.startDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}{rec.round ? ` · ${rec.round}차로 읽음` : ''}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 500,
                    background: rec.gyodokStatus === 'active' ? 'var(--status-reading)' : rec.gyodokStatus === 'upcoming' ? 'var(--accent-amber)' : 'var(--bg-surface-secondary)',
                    color: rec.gyodokStatus === 'active' ? 'var(--status-reading-text)' : rec.gyodokStatus === 'upcoming' ? 'var(--accent-amber-text)' : 'var(--text-tertiary)',
                  }}>
                    {rec.gyodokStatus === 'active' ? '진행 중' : rec.gyodokStatus === 'upcoming' ? '예정' : '종료'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showGyodokPicker && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 10 }} onClick={() => setShowGyodokPicker(false)}>
          <div style={{ flex: 1 }} />
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderRadius: '16px 16px 0 0', padding: '16px 16px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>교독 선택</span>
              <button onClick={() => setShowGyodokPicker(false)} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
            {activeGyodoks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>진행 중이거나 예정된 교독이 없습니다</div>
            ) : (
              activeGyodoks.map(g => (
                <div key={g.id} onClick={() => { onAddToGyodok(g.id); setShowGyodokPicker(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid var(--border-default)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{g.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{g.status === 'active' ? '진행 중' : '예정'} · {g.startDate?.slice(0,10)}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 500, background: g.status === 'active' ? 'var(--status-reading)' : 'var(--accent-amber)', color: g.status === 'active' ? 'var(--status-reading-text)' : 'var(--accent-amber-text)' }}>
                    {g.status === 'active' ? '진행 중' : '예정'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 28px', zIndex: 10 }} onClick={() => setShowDeleteConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: '24px 20px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            {isInGyodok && <div style={{ fontSize: 11, color: '#c87070', fontWeight: 500, marginBottom: 8 }}>교독으로 진행했던 책</div>}
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>서재에서 삭제하시겠습니까?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
              {isInGyodok ? '교독으로 진행했던 책입니다. 삭제한 책은 복구가 불가능합니다.' : '위시리스트에서도 함께 삭제됩니다.'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, height: 40, borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-input)', background: 'var(--bg-surface-secondary)', fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>취소</button>
              <button onClick={() => { setShowDeleteConfirm(false); onDelete(); }} style={{ flex: 2, height: 40, borderRadius: 'var(--radius-md)', background: '#c87070', border: 'none', fontSize: 13, color: '#fff', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
    <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'var(--app-width)', bottom: 0, zIndex: 200, background: 'rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column' }} onClick={onClose}>
      <div style={{ height: 52, flexShrink: 0 }} />
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{ flex: 1, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-default)', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>도서 검색</span>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '13px 14px' }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="책 제목/저자/출판사 검색"
              style={{ flex: 1, height: 38, borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-input)', background: 'var(--bg-input)', padding: '0 10px', fontSize: 13, color: 'var(--text-primary)' }} />
            <button onClick={handleSearch} style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: 'var(--accent-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="#fff" strokeWidth="1.3"/><path d="M10 10l2.5 2.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
          </div>
          {loading && <Spinner />}
          {results.length > 0 && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 8 }}>검색 결과 {results.length}건</div>}
          {results.map((book, i) => (
            <div key={book.isbn || i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < results.length - 1 ? '0.5px solid var(--border-default)' : 'none', alignItems: 'flex-start' }}>
              <div style={{ width: 46, height: 62, borderRadius: 5, border: '0.5px solid var(--border-input)', flexShrink: 0, overflow: 'hidden', background: 'var(--bg-surface-secondary)' }}>
                {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 3 }}>{book.title}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{book.author} · {book.publisher}<br />{book.publishDate}</div>
                {book.price > 0 && <div style={{ fontSize: 11, color: '#185fa5', fontWeight: 500, marginTop: 2 }}>{book.price.toLocaleString()}원</div>}
                <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                  <button onClick={() => setSelected(book)} style={{ flex: 1, height: 28, borderRadius: 7, background: 'var(--accent-primary)', border: 'none', fontSize: 10, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>상세 보기</button>
                  <button onClick={() => handleAddWish(book)} style={{ flex: 1, height: 28, borderRadius: 7, background: 'var(--bg-surface-secondary)', border: '0.5px solid var(--border-input)', fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>위시에 추가</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 10 }} onClick={() => setSelected(null)}>
          <div style={{ height: 52, flexShrink: 0 }} />
          <div className="slide-up" onClick={e => e.stopPropagation()} style={{ flex: 1, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-default)', flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>도서 상세</span>
              <button onClick={() => setSelected(null)} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 62, height: 84, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'var(--bg-surface-secondary)' }}>
                  {selected.coverUrl && <img src={selected.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 5 }}>{selected.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>{selected.author} · {selected.publisher}<br />출판일: {selected.publishDate}<br />ISBN: {selected.isbn}</div>
                  {selected.price > 0 && <div style={{ fontSize: 13, color: '#185fa5', fontWeight: 500, marginTop: 5 }}>{selected.price.toLocaleString()}원</div>}
                </div>
              </div>
              <Divider />
              {selected.description && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>책 소개</div><div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{selected.description}</div></div>}
              <button onClick={() => { handleAddWish(selected); setSelected(null); }} style={{ width: '100%', height: 40, borderRadius: 'var(--radius-md)', background: 'var(--accent-primary)', border: 'none', fontSize: 13, color: '#fff', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                위시리스트에 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
