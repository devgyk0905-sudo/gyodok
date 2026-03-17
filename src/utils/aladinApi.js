/**
 * 알라딘 오픈 API 연동
 * API 키: 환경변수 REACT_APP_ALADIN_API_KEY
 *
 * CORS 문제로 직접 호출 불가 → 프록시 경유 필요
 * 개발: package.json "proxy" 설정
 * 배포: Vercel rewrites 설정
 */

const API_KEY = process.env.REACT_APP_ALADIN_API_KEY;
const BASE    = '/aladin-api';   // proxy 경유

/**
 * 책 검색
 * @param {string} query   검색어
 * @param {number} page    페이지 (1~)
 * @param {number} maxResults 결과 수 (최대 50)
 */
export async function searchBooks(query, page = 1, maxResults = 10, queryType = 'Keyword') {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    ttbkey:      API_KEY,
    Query:       query,
    QueryType:   'Keyword',
    MaxResults:  maxResults,
    start:       page,
    SearchTarget: 'Book',
    output:      'js',
    Version:     '20131101',
    Cover:       'Big',
  });

  const res  = await fetch(`${BASE}/ItemSearch.aspx?${params}`);
  const text = await res.text();

  // JSONP 형식 처리 (알라딘 API는 콜백 없으면 순수 JSON)
  const data = JSON.parse(text);
  return (data.item || []).map(normalizeBook);
}

/**
 * ISBN으로 책 상세 조회
 */
export async function getBookByISBN(isbn) {
  const params = new URLSearchParams({
    ttbkey:      API_KEY,
    itemIdType:  'ISBN13',
    ItemId:      isbn,
    output:      'js',
    Version:     '20131101',
    Cover:       'Big',
    OptResult:   'description',
  });

  const res  = await fetch(`${BASE}/ItemLookUp.aspx?${params}`);
  const data = await res.json();
  if (!data.item || data.item.length === 0) return null;
  return normalizeBook(data.item[0]);
}

/**
 * 알라딘 응답 → 앱 내부 형식 변환
 */
function normalizeBook(item) {
  return {
    isbn:        item.isbn13 || item.isbn || '',
    title:       item.title || '',
    author:      item.author || '',
    publisher:   item.publisher || '',
    publishDate: item.pubDate || '',
    coverUrl:    item.cover || '',
    description: item.description || '',
    price:       item.priceSales || item.priceStandard || 0,
    link:        item.link || '',
  };
}
