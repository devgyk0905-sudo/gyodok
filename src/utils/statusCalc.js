/**
 * 교독 진행 상태 계산 유틸리티
 *
 * 반환 형식: "독서 중" | "교환 대기" | "교환 중" | "교독 완료!"
 * 앞에 "N/3 " prefix 붙여서 사용 (예: "1/3 독서 중")
 */

/**
 * @param {object[]} participants  참여자 배열 (userId 포함)
 * @param {object[]} books         책 배열 (round, exchangeOrder 포함)
 * @param {object}   allStatuses   { [bookId]: { [userId]: { isRead, isSent, isArrived } } }
 * @param {number}   totalRounds   총 회차 (기본 3)
 * @returns {{ round: number, label: string, statusText: string }}
 */
export function calcGyodokStatus(participants, books, allStatuses, totalRounds = 3) {
  const n = participants.length;

  // 책이 없으면 1차 독서 중으로 표시
  if (!books || books.length === 0) {
    return { round: 1, label: '1/3', statusText: '독서 중' };
  }

  for (let round = 1; round <= totalRounds; round++) {
    const roundBooks = books.filter(b => b.round === round);
    if (roundBooks.length === 0) continue;

    // 이 회차 모든 참여자의 상태 수집
    const statuses = participants.map(p => {
      // 이 참여자가 현재 회차에서 읽고 있는 책 찾기
      const book = roundBooks.find(b =>
        b.exchangeOrder && b.exchangeOrder.includes(p.id)
      );
      if (!book) return { isRead: false, isSent: false, isArrived: false };
      return allStatuses?.[book.id]?.[p.id] || { isRead: false, isSent: false, isArrived: false };
    });

    const readCount    = statuses.filter(s => s.isRead).length;
    const sentCount    = statuses.filter(s => s.isSent).length;
    const arrivedCount = statuses.filter(s => s.isArrived).length;

    // 모두 도착 완료 → 다음 회차로
    if (arrivedCount === n) continue;

    // 상태 판단
    if (readCount < n) {
      return { round, label: `${round}/${totalRounds}`, statusText: '독서 중' };
    }
    if (readCount === n && sentCount === 0) {
      return { round, label: `${round}/${totalRounds}`, statusText: '교환 대기' };
    }
    if (sentCount > 0 && arrivedCount < n) {
      return { round, label: `${round}/${totalRounds}`, statusText: '교환 중' };
    }
  }

  // 모든 회차 완료
  return { round: totalRounds, label: `${totalRounds}/${totalRounds}`, statusText: '교독 완료!' };
}

/**
 * 특정 참여자의 현재 차수 상태 텍스트
 * "1권째 읽는 중" | "2권째 발송 완료" 등
 */
export function getMyStatusText(round, status) {
  const ordinals = ['', '1권째', '2권째', '3권째'];
  const ord = ordinals[round] || `${round}권째`;
  if (!status) return `${ord} 읽는 중`;
  if (status.isArrived) return `${ord} 교환 완료`;
  if (status.isSent)    return `${ord} 발송 완료`;
  if (status.isRead)    return `${ord} 완독 완료`;
  return `${ord} 읽는 중`;
}

/**
 * 모임 현황 각 참여자 독서/발송 상태
 */
export function getMemberStatus(status) {
  if (!status) return { label: '미시작', variant: 'gray' };
  if (status.isArrived) return { label: '교환 완료', variant: 'green' };
  if (status.isSent)    return { label: '발송함',   variant: 'green' };
  if (status.isRead)    return { label: '완독',     variant: 'green' };
  return { label: '미시작', variant: 'gray' };
}

/**
 * 책 카드 상태 (done / current / pending)
 */
export function getBookCardState(bookRound, currentRound) {
  if (bookRound < currentRound)  return 'done';
  if (bookRound === currentRound) return 'current';
  return 'pending';
}

/**
 * D-day 계산
 */
export function calcDday(targetDate) {
  if (!targetDate) return null;
  try {
    const target = new Date(targetDate);
    const now    = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diff > 0)  return `D-${diff}`;
    if (diff === 0) return 'D-Day';
    return `D+${Math.abs(diff)}`;
  } catch { return null; }
}

/**
 * 가장 가까운 체크포인트 찾기
 */
export function getNextCheckpoint(checkpoints) {
  if (!checkpoints || checkpoints.length === 0) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = checkpoints
    .filter(cp => cp.date && new Date(cp.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcoming[0] || checkpoints[checkpoints.length - 1];
}
