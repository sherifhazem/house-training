/* ApexCharts rendering (line, pie, health gauge) */
let lineChart;
let healthGauge;
let trainingPie;

// --- Charts (DATE ONLY, no time) ---
function renderCharts(data) {
  const font = 'IBM Plex Sans Arabic';

  // 1) Aggregate by date (isoDate) so line chart uses date only and avoids time.
  const agg = {};
  for (const d of data) {
    const key = d.isoDate;
    if (!key) continue;
    if (!agg[key]) agg[key] = { sum: 0, n: 0 };
    agg[key].sum += parseFloat(d["تقييم نشاط واستجابة الخيل"] || 0);
    agg[key].n += 1;
  }

  const datesAsc = Object.keys(agg).sort();
  const seriesData = datesAsc.map(dateISO => {
    const avg = agg[dateISO].sum / Math.max(1, agg[dateISO].n);
    return { x: dateISO, y: Number(avg.toFixed(2)) };
  });

  const lineOptions = {
    chart: {
      type: 'area',
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false },
      selection: { enabled: false },
      animations: { enabled: false },
      fontFamily: font
    },
    series: [{ name: 'مستوى النشاط', data: seriesData }],
    colors: ['#00a8cc'],
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    states: {
      active: { filter: { type: 'none' } },
      hover: { filter: { type: 'none' } }
    },
    xaxis: {
      type: 'category',
      tickPlacement: 'on',
      labels: {
        formatter: (val) => {
          // val is ISO YYYY-MM-DD
          if (!val) return '';
          const parts = String(val).split('-');
          const y = parts[0];
          const m = parts[1];
          const d = parts[2];
          return `${d}/${m}/${y}`; // DD/MM/YYYY
        }
      }
    },
    tooltip: {
      x: {
        formatter: (val) => {
          if (!val) return '';
          const parts = String(val).split('-');
          const y = parts[0];
          const m = parts[1];
          const d = parts[2];
          return `${d}/${m}/${y}`;
        }
      }
    },
    yaxis: { max: 5, min: 0 },
    grid: { borderColor: '#eef2f7' },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 240 },
          xaxis: {
            tickAmount: Math.min(4, seriesData.length),
            labels: { rotate: -45, hideOverlappingLabels: true }
          }
        }
      }
    ]
  };

  if (lineChart) lineChart.destroy();
  lineChart = new ApexCharts(document.querySelector('#lineChart'), lineOptions);
  lineChart.render();

  // 2) Health Gauge
  const healthVal = parseInt(document.getElementById('statHealth').innerText || '0', 10) || 0;
  const gaugeOptions = {
    chart: { type: 'radialBar', height: 320, fontFamily: font },
    series: [healthVal],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '65%' },
        dataLabels: {
          name: { show: true, label: 'مؤشر السلامة', color: '#64748b', offsetY: 20 },
          value: {
            offsetY: -20,
            fontSize: '30px',
            fontWeight: 'bold',
            color: '#0b2447',
            formatter: (v) => `${v}%`
          }
        }
      }
    },
    fill: { colors: [healthVal > 80 ? '#10b981' : healthVal > 50 ? '#f59e0b' : '#ef4444'] },
    stroke: { lineCap: 'round' }
  };

  if (healthGauge) healthGauge.destroy();
  healthGauge = new ApexCharts(document.querySelector('#healthGauge'), gaugeOptions);
  healthGauge.render();

  // 3) Training Pie
  const types = {};
  data.forEach(d => {
    const t = (d["نوع التدريب اليومي"] || '').trim() || 'غير محدد';
    types[t] = (types[t] || 0) + 1;
  });

  const pieOptions = {
    chart: { type: 'donut', height: 300, fontFamily: font },
    series: Object.values(types),
    labels: Object.keys(types),
    colors: ['#0b2447', '#00a8cc', '#10b981', '#f59e0b', '#ec4899', '#6366f1'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: '60%' } } }
  };

  if (trainingPie) trainingPie.destroy();
  trainingPie = new ApexCharts(document.querySelector('#trainingPie'), pieOptions);
  trainingPie.render();
}
