// 개인별 현재 차수 계산
// "도착했어요" 체크 = 해당 차수 완료 → 다음 차수 시작
export function getPersonalCurrentRound(userId, books, allStatuses, totalRounds) {
  for (let round = 1; round <= totalRounds; round++) {
    const book = books.find(b => b.round === round && b.exchangeOrder?.includes(userId));
    if (!book) return round; // 책 미등록 = 아직 이 차수
    const st = allStatuses?.[book.id]?.[userId];
    const isLastRound = round === totalRounds;
    if (isLastRound) {
      if (st?.isRead) continue; // 마지막 차수: 완독이면 완료
      return round;
    } else {
      if (st?.isArrived) continue; // 1차~중간: 도착했어요 = 완료
      return round;
    }
  }
  return totalRounds;
}

// 전체 교독 상태: 가장 빠른 참여자 기준
export function calcGyodokStatus(participants, books, allStatuses, totalRounds = 3) {
  if (!participants || participants.length === 0) {
    return { round: 1, label: `1/${totalRounds}`, statusText: '독서 중' };
  }
  if (!books || books.length === 0) {
    return { round: 1, label: `1/${totalRounds}`, statusText: '독서 중' };
  }

  const rounds = participants.map(p =>
    getPersonalCurrentRound(p.id, books, allStatuses, totalRounds)
  );
  const fastestRound = Math.max(...rounds);

  // 모두 마지막 차수 완료 여부
  const allDone = participants.every(p => {
    const lastBook = books.find(b => b.round === totalRounds && b.exchangeOrder?.includes(p.id));
    return lastBook && allStatuses?.[lastBook.id]?.[p.id]?.isRead;
  });
  if (allDone) {
    return { round: totalRounds, label: `${totalRounds}/${totalRounds}`, statusText: '교독 완료!' };
  }

  const currentRoundBooks = books.filter(b => b.round === fastestRound);
  const arrivedCount = participants.filter(p => {
    const book = currentRoundBooks.find(b => b.exchangeOrder?.includes(p.id));
    return book && allStatuses?.[book.id]?.[p.id]?.isArrived;
  }).length;
  const readCount = participants.filter(p => {
    const book = currentRoundBooks.find(b => b.exchangeOrder?.includes(p.id));
    return book && allStatuses?.[book.id]?.[p.id]?.isRead;
  }).length;

  let statusText = '독서 중';
  if (fastestRound > 1 && arrivedCount < participants.length) statusText = '교환 중';
  else if (readCount === participants.length) statusText = '교환 대기';

  return {
    round: fastestRound,
    label: `${fastestRound}/${totalRounds}`,
    statusText,
  };
}

export function getBookCardState(bookRound, currentRound) {
  if (bookRound < currentRound) return 'done';
  if (bookRound === currentRound) return 'current';
  return 'pending';
}

export function getMyStatusText(round, status) {
  const ordinals = ['', '1권째', '2권째', '3권째'];
  const ord = ordinals[round] || `${round}권째`;
  if (!status) return `${ord} 읽는 중`;
  if (status.isArrived) return `${ord} 교환 완료`;
  if (status.isSent) return `${ord} 발송 완료`;
  if (status.isRead) return `${ord} 완독 완료`;
  return `${ord} 읽는 중`;
}

export function getMemberStatus(status) {
  if (!status) return { label: '미시작', variant: 'gray' };
  if (status.isArrived) return { label: '교환 완료', variant: 'green' };
  if (status.isSent) return { label: '발송함', variant: 'green' };
  if (status.isRead) return { label: '완독', variant: 'green' };
  return { label: '미시작', variant: 'gray' };
}

export function calcDday(targetDate) {
  if (!targetDate) return null;
  try {
    const target = new Date(targetDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return 'D-Day';
    return `D+${Math.abs(diff)}`;
  } catch { return null; }
}

export function getNextCheckpoint(checkpoints) {
  if (!checkpoints || checkpoints.length === 0) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = checkpoints
    .filter(cp => cp.date && new Date(cp.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcoming[0] || checkpoints[checkpoints.length - 1];
}
