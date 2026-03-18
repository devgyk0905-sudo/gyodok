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