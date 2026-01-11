function setReportStatus(message) {
  const el = document.getElementById('reportStatus');
  if (el) el.textContent = message;
}

function formatNumber(value) {
  return new Intl.NumberFormat('ar-EG').format(value);
}

function computeDateRange(data) {
  if (!data.length) return { start: null, end: null };
  const sorted = [...data].sort((a, b) => a.dateObj - b.dateObj);
  return { start: sorted[0].dateObj, end: sorted[sorted.length - 1].dateObj };
}

function buildKpis(data) {
  const totalSessions = data.length;
  const totalMinutes = data.reduce((sum, d) => sum + Number(d["مدة الحصة التدريبية بالدقيقة"] || 0), 0);
  const avgActivity = data.length
    ? data.reduce((sum, d) => sum + Number(d["تقييم نشاط واستجابة الخيل"] || 0), 0) / data.length
    : 0;
  const healthyCount = data.filter(d => (d["ملاحظات صحية"] || '').trim() === "الخيل سليم تماماً").length;
  const healthPercent = totalSessions ? Math.round((healthyCount / totalSessions) * 100) : 0;

  document.getElementById('kpiTotal').textContent = formatNumber(totalSessions);
  document.getElementById('kpiMinutes').textContent = formatNumber(totalMinutes);
  document.getElementById('kpiAvg').textContent = avgActivity.toFixed(2);
  document.getElementById('kpiHealth').textContent = `${healthPercent}%`;

  return { healthPercent };
}

function buildActivityChart(data) {
  const container = document.getElementById('activityChart');
  if (!container) return;

  const agg = {};
  data.forEach(d => {
    if (!d.isoDate) return;
    if (!agg[d.isoDate]) agg[d.isoDate] = { sum: 0, count: 0 };
    agg[d.isoDate].sum += Number(d["تقييم نشاط واستجابة الخيل"] || 0);
    agg[d.isoDate].count += 1;
  });

  const dates = Object.keys(agg).sort();
  const slice = dates.slice(-12);
  const values = slice.map(date => ({
    date,
    value: agg[date].count ? agg[date].sum / agg[date].count : 0
  }));

  const width = 520;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 50, left: 30 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  const maxVal = 5;
  const barWidth = chartWidth / Math.max(values.length, 1) - 8;

  const svgParts = [];
  svgParts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="white" />`);
  svgParts.push(`<line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#cbd5e1" />`);

  values.forEach((item, index) => {
    const barHeight = (item.value / maxVal) * chartHeight;
    const x = padding.left + index * (barWidth + 8);
    const y = padding.top + chartHeight - barHeight;
    const label = item.date.split('-').reverse().join('/');

    svgParts.push(`<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#00a8cc" />`);
    svgParts.push(`<text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" text-anchor="middle" fill="#0b2447">${item.value.toFixed(1)}</text>`);
    svgParts.push(`<text x="${x + barWidth / 2}" y="${padding.top + chartHeight + 18}" font-size="9" text-anchor="middle" fill="#64748b">${label}</text>`);
  });

  container.innerHTML = svgParts.join('');
}

function buildHealthGauge(percent) {
  const svg = document.getElementById('healthChart');
  if (!svg) return;

  const radius = 70;
  const centerX = 120;
  const centerY = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const color = percent > 80 ? '#10b981' : percent > 50 ? '#f59e0b' : '#ef4444';

  svg.innerHTML = `
    <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="14" />
    <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${color}" stroke-width="14" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 ${centerX} ${centerY})" />
    <text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" font-size="22" fill="#0b2447" font-weight="700">${percent}%</text>
    <text x="${centerX}" y="${centerY + 26}" text-anchor="middle" font-size="12" fill="#64748b">نسبة السلامة</text>
  `;
}

function buildCalendar(data) {
  const body = document.getElementById('calendarBody');
  if (!body) return;

  const { start, end } = computeDateRange(data);
  if (!start || !end) return;

  const trainingDates = new Set(data.map(d => d.isoDate));

  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const dayIndex = (startDate.getDay() + 1) % 7; // Saturday = 0
  const rows = [];
  let currentRow = [];

  for (let i = 0; i < dayIndex; i += 1) {
    currentRow.push('<td></td>');
  }

  for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
    const iso = toLocalISODateOnly(dt);
    const isTraining = trainingDates.has(iso);
    const cls = isTraining ? 'training' : 'rest';
    const label = formatDateDMY(dt);
    currentRow.push(`<td class="${cls}">${label}</td>`);

    if (currentRow.length === 7) {
      rows.push(`<tr>${currentRow.join('')}</tr>`);
      currentRow = [];
    }
  }

  if (currentRow.length) {
    while (currentRow.length < 7) {
      currentRow.push('<td></td>');
    }
    rows.push(`<tr>${currentRow.join('')}</tr>`);
  }

  body.innerHTML = rows.join('');
}

function buildDetailTable(data) {
  const body = document.getElementById('detailTableBody');
  if (!body) return;
  const rows = data.map(d => {
    const minutes = d["مدة الحصة التدريبية بالدقيقة"] || '0';
    return `
      <tr>
        <td>${formatDateDMY(d.dateObj)}</td>
        <td>${d["اسم الخيل"] || ''}</td>
        <td>${d["نوع التدريب اليومي"] || ''}</td>
        <td>${minutes} د</td>
        <td>${d["ملاحظات صحية"] || ''}</td>
        <td>${d["ملاحظات إضافية من المدرب"] || ''}</td>
      </tr>
    `;
  });
  body.innerHTML = rows.join('');
}

function getReportPayload() {
  const raw = localStorage.getItem('jadaReportPayload');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function hydrateReportData(payload) {
  if (!payload || !Array.isArray(payload.data)) return [];

  return payload.data.map((row) => {
    const obj = { ...row };
    const dateSeed = obj.isoDate || obj.dateObj || obj["التاريخ"] || obj["Timestamp"];
    const dt = parseISODateOnly(dateSeed) || parseSheetDateOnly(dateSeed);
    if (!dt) return null;

    obj.dateObj = dt;
    obj.isoDate = toLocalISODateOnly(dt);
    return obj;
  }).filter(Boolean);
}

function initReport() {
  if (!Array.isArray(masterData) || !masterData.length) {
    setReportStatus('لا توجد بيانات للعرض');
    return;
  }

  const { start, end } = computeDateRange(masterData);
  const issueDate = formatDateDMY(new Date());

  document.getElementById('reportRange').textContent = start && end
    ? `${formatDateDMY(start)} - ${formatDateDMY(end)}`
    : '--/--/----';
  document.getElementById('issueDate').textContent = issueDate;

  const { healthPercent } = buildKpis(masterData);
  buildActivityChart(masterData);
  buildHealthGauge(healthPercent);
  buildCalendar(masterData);
  buildDetailTable(masterData);

  setReportStatus('جاهز للتصدير');
}

async function exportReport() {
  setReportStatus('جارٍ تجهيز ملف PDF...');

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (_) {}
  }

  const opt = {
    margin: [0, 0, 0, 0],
    filename: `تقرير_جادا_${formatDateDMY(new Date()).replace(/\//g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  try {
    await html2pdf().set(opt).from(document.getElementById('report-container')).save();
    setReportStatus('تم التصدير بنجاح');
  } catch (error) {
    setReportStatus('تعذر إنشاء ملف PDF');
  }
}

window.onload = () => {
  const payload = getReportPayload();
  if (payload) {
    masterData = hydrateReportData(payload);
    const autoExport = localStorage.getItem('jadaReportAutoExport') === '1';
    localStorage.removeItem('jadaReportPayload');
    localStorage.removeItem('jadaReportAutoExport');
    initReport();
    if (autoExport) {
      exportReport();
    }
    return;
  }

  fetchData({
    onSuccess: initReport,
    onLoading: (isLoading) => {
      setReportStatus(isLoading ? 'جارٍ تحميل البيانات…' : '');
    }
  });
};
