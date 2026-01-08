/* Filters + stats + pretty date display */
function setFilterPrettyDates() {
  const startISO = document.getElementById('startDate').value;
  const endISO = document.getElementById('endDate').value;
  document.getElementById('startDatePretty').innerText = prettyFromISODate(startISO);
  document.getElementById('endDatePretty').innerText = prettyFromISODate(endISO);
}

function applyFilters() {
  const horse = document.getElementById('horseFilter').value;
  const start = document.getElementById('startDate').value; // YYYY-MM-DD
  const end = document.getElementById('endDate').value; // YYYY-MM-DD

  setFilterPrettyDates();

  let filtered = masterData.filter((d) => {
    const matchHorse = horse === 'all' || d["اسم الخيل"] === horse;
    const matchStart = !start || d.isoDate >= start;
    const matchEnd = !end || d.isoDate <= end;
    return matchHorse && matchStart && matchEnd;
  });

  // Sort newest first
  filtered.sort((a, b) => b.dateObj - a.dateObj);

  renderStats(filtered);
  renderCharts(filtered);
  renderCalendar(filtered, start, end);
  renderTable(filtered);

  // Report range text
  const rangeText = `${start ? prettyFromISODate(start) : '—'} إلى ${end ? prettyFromISODate(end) : '—'}`;
  document.getElementById('reportRange').innerText = rangeText;
}

// --- Stats ---
function renderStats(data) {
  const total = data.length;
  const avg = (
    data.reduce((s, d) => s + parseFloat(d["تقييم نشاط واستجابة الخيل"] || 0), 0) / (total || 1)
  ).toFixed(1);
  const time = data.reduce((s, d) => s + parseInt(d["مدة الحصة التدريبية بالدقيقة"] || 0), 0);
  const healthy = data.filter(d => (d["ملاحظات صحية"] || '').trim() === "الخيل سليم تماماً").length;
  const healthP = Math.round((healthy / (total || 1)) * 100);

  document.getElementById('statTotal').innerText = total;
  document.getElementById('statAvg').innerText = avg;
  document.getElementById('statTime').innerText = time;
  document.getElementById('statHealth').innerText = healthP;
}
