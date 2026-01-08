/* Calendar rendering (Saturday week start) */
function renderCalendar(data) {
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  if (!data.length) {
    document.getElementById('calendarTitle').innerText = '—';
    return;
  }

  const trainingDays = new Set(data.map(d => d.isoDate).filter(Boolean));

  // Show month of latest record within filtered data
  const latest = new Date(data[0].dateObj);
  const year = latest.getFullYear();
  const month = latest.getMonth();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  document.getElementById('calendarTitle').innerText = `${monthsAr[month]} ${year}`;

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

  // Month days: only training/rest (no other states)
  for (let day = 1; day <= last.getDate(); day++) {
    const current = new Date(year, month, day);
    const iso = toLocalISODateOnly(current);
    const isTraining = trainingDays.has(iso);

    const div = document.createElement('div');
    div.className = `calendar-day ${isTraining ? 'day-training' : 'day-rest'}`;
    div.title = isTraining ? 'يوم تدريب' : 'يوم راحة';
    div.textContent = day;
    grid.appendChild(div);
  }
}
