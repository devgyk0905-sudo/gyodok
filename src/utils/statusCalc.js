// 라운드 완료 여부 판단
export function isRoundComplete(round, totalRounds, status) {
  if (!status) return false;
  const isFirst = round === 1;
  const isLast = round === totalRounds;
  if (isFirst) return !!(status.isRead && status.isSent);
  if (isLast) return !!(status.isArrived && status.isRead);
  return !!(status.isArrived && status.isRead && status.isSent);
}

// 개인별 현재 차수 계산
export function getPersonalCurrentRound(userId, books, allStatuses, totalRounds) {
  for (let round = 1; round <= totalRounds; round++) {
    const book = books.find(b => b.round === round && b.exchangeOrder?.includes(userId));
    if (!book) return round;
    const st = allStatuses?.[book.id]?.[userId];
    if (isRoundComplete(round, totalRounds, st)) continue;
    return round;
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

  const allDone = participants.every(p => {
    const lastBook = books.find(b => b.round === totalRounds && b.exchangeOrder?.includes(p.id));
    const st = lastBook ? allStatuses?.[lastBook.id]?.[p.id] : null;
    return isRoundComplete(totalRounds, totalRounds, st);
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

export function getMyStatusText(round, status, totalRounds) {
  const ordinals = ['', '1권째', '2권째', '3권째'];
  const ord = ordinals[round] || `${round}권째`;
  if (!status) return `${ord} 읽는 중`;
  if (status.isSent && round < totalRounds) return `${ord} 발송 완료`;
  if (status.isRead) return `${ord} 완독`;
  if (status.isArrived) return `${ord} 받음`;
  return `${ord} 읽는 중`;
}

export function getMemberStatus(status) {
  if (!status) return { label: '미시작', variant: 'gray' };
  if (status.isSent) return { label: '발송함', variant: 'green' };
  if (status.isRead) return { label: '완독', variant: 'green' };
  if (status.isArrived) return { label: '받음', variant: 'green' };
  return { label: '읽는 중', variant: 'gray' };
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