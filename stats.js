function updateTradeStats() {
  const summary = document.querySelector('.stats');
  const counts = { win: 0, loss: 0, unconfirmed: 0 };

  for (const trade of document.querySelectorAll('.trade')) {
    const outcome = trade.dataset.outcome;
    if (outcome === 'win' || outcome === 'loss') {
      counts[outcome] += 1;
    } else {
      counts.unconfirmed += 1;
    }
  }

  for (const count of summary.querySelectorAll('[data-count]')) {
    count.textContent = counts[count.dataset.count];
  }
  const decided = counts.win + counts.loss;
  summary.querySelector('[data-rate]').textContent = decided
    ? new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(counts.win / decided)
    : '—';
  summary.hidden = false;
}

updateTradeStats();
