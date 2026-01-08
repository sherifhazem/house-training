/* Calendar rendering (Saturday week start) */
function renderCalendar(data, startISO, endISO) {
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  if (!data.length) {
    document.getElementById('calendarTitle').innerText = '—';
    return;
  }

  const trainingDays = new Set(data.map(d => d.isoDate).filter(Boolean));

  const parseISO = (iso) => {
    if (!iso) return null;
    const parts = String(iso).split('-').map(Number);
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const safeStart = parseISO(startISO);
  const safeEnd = parseISO(endISO);
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeDays = safeStart && safeEnd ? Math.floor((safeEnd - safeStart) / dayMs) + 1 : null;

  let windowStart;
  let windowEnd;

  if (safeStart && safeEnd && rangeDays && rangeDays <= 30) {
    windowStart = safeStart;
    windowEnd = safeEnd;
  } else {
    const latestISO = data[0]?.isoDate;
    windowEnd = parseISO(latestISO) || safeEnd || new Date();
    windowStart = new Date(windowEnd);
    windowStart.setDate(windowEnd.getDate() - 29);
  }

  document.getElementById('calendarTitle').innerText = `${formatDateDMY(windowStart)} إلى ${formatDateDMY(windowEnd)}`;

  const first = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate());
  const last = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), windowEnd.getDate());

  // Saturday index mapping:
  // JS getDay(): Sun=0..Sat=6
  // We want Sat=0, Sun=1, ... Fri=6
  const getSatIdx = (jsDay) => (jsDay + 1) % 7;
  const offset = getSatIdx(first.getDay());

  // Headers (Sat first)
  ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'].forEach(d => {
    grid.innerHTML += `<div class="calendar-header">${d}</div>`;
  });

  // Empty cells before start of month
  for (let i = 0; i < offset; i++) {
    grid.innerHTML += '<div></div>';
  }

  // Range days: only training/rest (no other states)
  for (let current = new Date(first); current <= last; current = new Date(current.getTime() + dayMs)) {
    const iso = toLocalISODateOnly(current);
    const isTraining = trainingDays.has(iso);

    const div = document.createElement('div');
    div.className = `calendar-day ${isTraining ? 'day-training' : 'day-rest'}`;
    div.title = isTraining ? 'يوم تدريب' : 'يوم راحة';
    div.textContent = current.getDate();
    grid.appendChild(div);
  }
}
