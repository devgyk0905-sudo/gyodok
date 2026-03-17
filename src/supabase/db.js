import { supabase } from './client';

// ===== 사용자 =====

export const getUser = async (userId) => {
  const { data } = await supabase
    .from('users').select('*').eq('id', userId).single();
  return data;
};

export const getUserByName = async (name) => {
  const { data } = await supabase
    .from('users').select('*').eq('name', name.trim()).single();
  return data;
};

export const updateUser = async (userId, fields) => {
  const { error } = await supabase
    .from('users').update(snakeCase(fields)).eq('id', userId);
  if (error) throw error;
};

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(camelCase);
};

export const createUser = async (fields) => {
  const { data, error } = await supabase
    .from('users').insert(snakeCase(fields)).select().single();
  if (error) throw error;
  return data;
};

// ===== 교독 =====

export const getGyodoks = async (userId) => {
  const { data, error } = await supabase
    .from('gyodoks')
    .select('*')
    .contains('participant_ids', [userId])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(camelCase);
};

export const getGyodok = async (gyodokId) => {
  const { data, error } = await supabase
    .from('gyodoks').select('*').eq('id', gyodokId).single();
  if (error) throw error;
  return camelCase(data);
};

export const createGyodok = async (fields) => {
  const { data, error } = await supabase
    .from('gyodoks').insert(snakeCase(fields)).select().single();
  if (error) throw error;
  return camelCase(data);
};

export const updateGyodok = async (gyodokId, fields) => {
  const { error } = await supabase
    .from('gyodoks').update(snakeCase(fields)).eq('id', gyodokId);
  if (error) throw error;
};

export const deleteGyodok = async (gyodokId) => {
  const { data: books } = await supabase
    .from('books').select('isbn').eq('gyodok_id', gyodokId);
  if (books?.length) {
    const isbns = books.map(b => b.isbn).filter(Boolean);
    if (isbns.length) {
      await supabase.from('wishlist').delete().in('isbn', isbns);
    }
  }
  const { error } = await supabase
    .from('gyodoks').delete().eq('id', gyodokId);
  if (error) throw error;
};

// ===== 책 =====

export const getBooks = async (gyodokId) => {
  const { data, error } = await supabase
    .from('books').select('*').eq('gyodok_id', gyodokId)
    .order('round', { ascending: true });
  if (error) throw error;
  return (data || []).map(camelCase);
};

export const addBook = async (gyodokId, fields) => {
  const { data, error } = await supabase
    .from('books').insert({ ...snakeCase(fields), gyodok_id: gyodokId }).select().single();
  if (error) throw error;
  return camelCase(data);
};

export const updateBook = async (bookId, fields) => {
  const { error } = await supabase
    .from('books').update(snakeCase(fields)).eq('id', bookId);
  if (error) throw error;
};

// ===== 책 상태 =====

export const getBookStatus = async (gyodokId, bookId, userId) => {
  const { data } = await supabase
    .from('book_statuses')
    .select('*')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .single();
  return data
    ? { isRead: data.is_read, isSent: data.is_sent, isArrived: data.is_arrived }
    : { isRead: false, isSent: false, isArrived: false };
};

export const updateBookStatus = async (gyodokId, bookId, userId, fields) => {
  const payload = {
    book_id:    bookId,
    gyodok_id:  gyodokId,
    user_id:    userId,
    is_read:    fields.isRead    ?? false,
    is_sent:    fields.isSent    ?? false,
    is_arrived: fields.isArrived ?? false,
    updated_at: new Date().toISOString(),
    ...(fields.isRead    ? { read_at:    new Date().toISOString() } : {}),
    ...(fields.isSent    ? { sent_at:    new Date().toISOString() } : {}),
    ...(fields.isArrived ? { arrived_at: new Date().toISOString() } : {}),
  };
  const { error } = await supabase
    .from('book_statuses')
    .upsert(payload, { onConflict: 'book_id,user_id' });
  if (error) throw error;
};

// ===== 중간 점검 =====

export const getCheckpoints = async (gyodokId) => {
  const { data, error } = await supabase
    .from('checkpoints').select('*').eq('gyodok_id', gyodokId)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data || []).map(camelCase);
};

export const addCheckpoint = async (gyodokId, fields) => {
  const { data, error } = await supabase
    .from('checkpoints').insert({ ...snakeCase(fields), gyodok_id: gyodokId }).select().single();
  if (error) throw error;
  return camelCase(data);
};

// ===== 위시리스트 =====

export const getWishlist = async (userId) => {
  const { data, error } = await supabase
    .from('wishlist').select('*').eq('user_id', userId)
    .order('added_at', { ascending: false }).limit(5);
  if (error) throw error;
  return (data || []).map(camelCase);
};

export const addToWishlist = async (fields) => {
  const { data, error } = await supabase
    .from('wishlist').insert(snakeCase(fields)).select().single();
  if (error) throw error;
  return camelCase(data);
};

export const removeFromWishlist = async (wishlistId) => {
  const { error } = await supabase
    .from('wishlist').delete().eq('id', wishlistId);
  if (error) throw error;
};

// ===== 피드 =====

export const getFeed = async (gyodokId) => {
  const { data, error } = await supabase
    .from('feed').select('*').eq('gyodok_id', gyodokId)
    .order('created_at', { ascending: false }).limit(10);
  if (error) throw error;
  return (data || []).map(camelCase);
};

export const addFeedItem = async (fields) => {
  const { error } = await supabase
    .from('feed').insert(snakeCase(fields));
  if (error) throw error;
};

// ===== 실시간 구독 =====

export const subscribeToBooks = (gyodokId, callback) => {
  const channel = supabase
    .channel(`books:${gyodokId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'books',
      filter: `gyodok_id=eq.${gyodokId}`,
    }, () => {
      getBooks(gyodokId).then(callback);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToBookStatuses = (gyodokId, callback) => {
  const channel = supabase
    .channel(`statuses:${gyodokId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'book_statuses',
      filter: `gyodok_id=eq.${gyodokId}`,
    }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

// ===== Storage (프로필 사진) =====

export const uploadProfileImage = async (userId, file) => {
  const ext  = file.name.split('.').pop();
  const path = `${userId}.${ext}`;
  const { error } = await supabase.storage
    .from('profiles').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('profiles').getPublicUrl(path);
  return data.publicUrl;
};

// ===== 즐겨찾기 =====

export const getFavorites = async (userId) => {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(camelCase);
};

export const addFavorite = async (userId, gyodokId) => {
  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, gyodok_id: gyodokId })
    .select().single();
  if (error) throw error;
  return camelCase(data);
};

export const removeFavorite = async (userId, gyodokId) => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('gyodok_id', gyodokId);
  if (error) throw error;
};

// ===== 유틸: camelCase ↔ snake_case 변환 =====

function snakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/([A-Z])/g, '_$1').toLowerCase(), v,
    ])
  );
}

function camelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v,
    ])
  );
}
