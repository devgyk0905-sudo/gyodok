export function calcGyodokStatus(participants, books, allStatuses, totalRounds = 3) {
  const n = participants.length;

  if (!books || books.length === 0) {
    return { round: 1, label: `1/${totalRounds}`, statusText: '독서 중' };
  }

  for (let round = 1; round <= totalRounds; round++) {
    const roundBooks = books.filter(b => b.round === round);
    if (roundBooks.length === 0) continue;

    const isLastRound = round === totalRounds;

    const statuses = participants.map(p => {
      const book = roundBooks.find(b =>
        b.exchangeOrder && b.exchangeOrder.includes(p.id)
      );
      if (!book) return { isRead: false, isSent: false, isArrived: false };
      return allStatuses?.[book.id]?.[p.id] || { isRead: false, isSent: false, isArrived: false };
    });

    const readCount    = statuses.filter(s => s.isRead).length;
    const sentCount    = statuses.filter(s => s.isSent).length;
    const arrivedCount = statuses.filter(s => s.isArrived).length;

    if (isLastRound) {
      // 마지막 차수: 도착 + 완독이면 완료 (발송 불필요)
      if (arrivedCount === n && readCount === n) continue;
      if (arrivedCount < n) {
        return { round, label: `${round}/${totalRounds}`, statusText: '교환 중' };
      }
      if (readCount < n) {
        return { round, label: `${round}/${totalRounds}`, statusText: '독서 중' };
      }
    } else if (round === 1) {
      // 1차: 읽기 + 발송이면 다음 차수로
      if (readCount === n && sentCount === n) continue;
      if (readCount < n) {
        return { round, label: `${round}/${totalRounds}`, statusText: '독서 중' };
      }
      if (sentCount === 0) {
        return { round, label: `${round}/${totalRounds}`, statusText: '교환 대기' };
      }
      return { round, label: `${round}/${totalRounds}`, statusText: '교환 중' };
    } else {
      // 중간 차수: 도착 + 읽기 + 발송이면 다음 차수로
      if (arrivedCount === n && readCount === n && sentCount === n) continue;
      if (arrivedCount < n) {
        return { round, label: `${round}/${totalRounds}`, statusText: '교환 중' };
      }
      if (readCount < n) {
        return { round, label: `${round}/${totalRounds}`, statusText: '독서 중' };
      }
      if (sentCount === 0) {
        return { round, label: `${round}/${totalRounds}`, statusText: '교환 대기' };
      }
      return { round, label: `${round}/${totalRounds}`, statusText: '교환 중' };
    }
  }

  return { round: totalRounds, label: `${totalRounds}/${totalRounds}`, statusText: '교독 완료!' };
}

/** 책 카드 상태: 현재 차수 기준 */
export function getBookCardState(round, currentRound) {
  if (round < currentRound) return 'done';
  if (round === currentRound) return 'current';
  return 'pending';
}

/** 내 상태 텍스트 */
export function getMyStatusText(currentRound, myStatus) {
  if (!myStatus) return '독서 중';
  if (myStatus.isArrived) return '책 도착 완료';
  if (myStatus.isSent) return '발송 완료, 배송 중';
  if (myStatus.isRead) return '완독 · 발송 대기';
  return '독서 중';
}

/** 멤버 상태 뱃지 */
export function getMemberStatus(status) {
  if (!status) return { label: '독서 중', variant: 'gray' };
  if (status.isRead && status.isSent && status.isArrived) return { label: '완료', variant: 'green' };
  if (status.isRead && status.isSent) return { label: '발송 완료', variant: 'green' };
  if (status.isRead) return { label: '완독', variant: 'green' };
  return { label: '독서 중', variant: 'gray' };
}

/** D-day 계산 (문자열 반환) */
export function calcDday(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'D-day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

/** 가장 가까운 체크포인트 반환 */
export function getNextCheckpoint(checkpoints) {
  if (!checkpoints || checkpoints.length === 0) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = checkpoints
    .filter(cp => cp?.date && new Date(cp.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcoming[0] || checkpoints[checkpoints.length - 1];
}