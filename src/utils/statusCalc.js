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

export function getBookCardState(bookRound, currentRound) {
  if (bookRound < currentRound)  return 'done';
  if (bookRound === currentRound) return 'current';
  return 'pending';
}

export function getMyStatusText(round, status) {
  const ordinals = ['', '1권째', '2권째', '3권째'];
  const ord = ordinals[round] || `${round}권째`;
  if (!status) return `${ord} 읽는 중`;
  if (status.isArrived) return `${ord} 교환 완료`;
  if (status.isSent)    return `${ord} 발송 완료`;
  if (status.isRead)    return `${ord} 완독 완료`;
  return `${ord} 읽는 중`;
}

export function getMemberStatus(status) {
  if (!status) return { label: '미시작', variant: 'gray' };
  if (status.isArrived) return { label: '교환 완료', variant: 'green' };
  if (status.isSent)    return { label: '발송함',   variant: 'green' };
  if (status.isRead)    return { label: '완독',     variant: 'green' };
  return { label: '미시작', variant: 'gray' };
}

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

export function getNextCheckpoint(checkpoints) {
  if (!checkpoints || checkpoints.length === 0) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = checkpoints
    .filter(cp => cp.date && new Date(cp.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcoming[0] || checkpoints[checkpoints.length - 1];
}