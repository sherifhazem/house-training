/**
 * نظام إدارة مربط جادا - الإصدار المتوافق مع الجوال
 */

const TRAINING_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSA8oCh4yfOK5khe_kd0O7gylN9RDKxtnJ7yxouZd7YobQwNisyy5X91oZvXpOnMrFde7Wss0Y4pDhk/pub?output=csv";
const RECORDS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSAeCLUYDXemRYF147vmNYIen6pUOfaP2NvfD7wQ1GwCDsi6mHr8MQeuODo3W3DB5jnEF6qUS15fwbD/pub?output=csv";

let masterTrainingData = [];
let horseGeneralRecords = [];
let activeCharts = {};

// دالة تنسيق التاريخ: يوم/شهر/سنة
function formatDateAR(date) {
    if(!date) return "--";
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

// جلب البيانات
async function loadAllData() {
    document.getElementById('loader').classList.remove('hidden');
    
    // سحب بيانات التدريب
    Papa.parse(TRAINING_CSV, {
        download: true,
        header: true,
        complete: (results) => {
            masterTrainingData = results.data.map(row => {
                let clean = {};
                for(let k in row) clean[k.trim()] = row[k].trim();
                const d = new Date(clean["Timestamp"]);
                if(!isNaN(d)) { clean.dateObj = d; clean.isoDate = d.toISOString().split('T')[0]; }
                return clean;
            }).filter(r => r.isoDate);

            // سحب سجلات الخيل العامة
            Papa.parse(RECORDS_CSV, {
                download: true,
                header: true,
                complete: (res2) => {
                    horseGeneralRecords = res2.data.map(row => {
                        let clean = {};
                        for(let k in row) clean[k.trim()] = row[k].trim();
                        return clean;
                    }).filter(r => Object.values(r).some(v => v !== ""));
                    
                    document.getElementById('loader').classList.add('hidden');
                    initializeUI();
                }
            });
        }
    });
}

function initializeUI() {
    lucide.createIcons();
    
    // ملء الفلاتر
    const horses = [...new Set(masterTrainingData.map(r => r["اسم الخيل"]))].filter(h => h).sort();
    const filter = document.getElementById('horseFilter');
    horses.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h; opt.innerText = h; filter.appendChild(opt);
    });

    applyFilters();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`content-${tabId}`).classList.remove('hidden');
    lucide.createIcons();
    window.dispatchEvent(new Event('resize'));
}

function applyFilters() {
    const horse = document.getElementById('horseFilter').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    let filtered = masterTrainingData.filter(d => {
        const mH = horse === 'all' || d["اسم الخيل"] === horse;
        const mS = !start || d.isoDate >= start;
        const mE = !end || d.isoDate <= end;
        return mH && mS && mE;
    });

    filtered.sort((a,b) => b.dateObj - a.dateObj);
    refreshDashboard(filtered);
}

function refreshDashboard(data) {
    // تحديث الأرقام
    const total = data.length;
    const avg = (data.reduce((s, d) => s + parseFloat(d["تقييم نشاط واستجابة الخيل"] || 0), 0) / total || 0).toFixed(1);
    const time = data.reduce((s, d) => s + parseInt(d["مدة الحصة التدريبية بالدقيقة"] || 0), 0);
    const healthy = data.filter(d => d["ملاحظات صحية"] === "الخيل سليم تماماً").length;
    const healthP = ((healthy / total) * 100 || 0).toFixed(0);

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statAvg').innerText = avg;
    document.getElementById('statTime').innerText = time;
    document.getElementById('statHealth').innerText = healthP;

    renderCharts(data);
    renderCalendar(data);
    renderTable(data);
}

function renderCharts(data) {
    const font = 'IBM Plex Sans Arabic';
    const chartSeries = data.slice().reverse().map(d => ({ x: d.isoDate, y: parseFloat(d["تقييم نشاط واستجابة الخيل"] || 0) }));

    // 1. الخط الزمني (الأداء)
    if(activeCharts.line) activeCharts.line.destroy();
    activeCharts.line = new ApexCharts(document.querySelector("#performanceLineChart"), {
        chart: { type: 'area', height: 300, toolbar: {show:false}, fontFamily: font },
        series: [{ name: 'مستوى النشاط', data: chartSeries }],
        colors: ['#00a8cc'],
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { type: 'datetime', labels: {style:{fontSize:'10px'}} }
    });
    activeCharts.line.render();

    // 2. مؤشر الصحة (العداد)
    const hVal = parseInt(document.getElementById('statHealth').innerText);
    if(activeCharts.gauge) activeCharts.gauge.destroy();
    activeCharts.gauge = new ApexCharts(document.querySelector("#healthGauge"), {
        chart: { type: 'radialBar', height: 320, fontFamily: font },
        series: [hVal],
        plotOptions: {
            radialBar: { hollow:{size:'65%'}, dataLabels:{ value:{fontSize:'28px', fontWeight:'700', color: '#0b2447', formatter: v=>v+"%"} } }
        },
        fill: { colors: [hVal > 80 ? '#10b981' : hVal > 50 ? '#f59e0b' : '#ef4444'] }
    });
    // ملاحظة: تم تعديل المسمى ليتوافق مع HTML
    const gaugeContainer = document.querySelector("#healthIndicatorChart");
    if(gaugeContainer) {
        if(activeCharts.gauge) activeCharts.gauge.destroy();
        activeCharts.gauge = new ApexCharts(gaugeContainer, {
            chart: { type: 'radialBar', height: 320, fontFamily: font },
            series: [hVal],
            plotOptions: { radialBar: { hollow:{size:'60%'}, dataLabels:{ value:{fontSize:'24px', offsetY:-10, formatter: v=>v+"%"} } } },
            fill: { colors:[hVal > 85 ? '#10b981' : '#f59e0b'] }
        });
        activeCharts.gauge.render();
    }

    // 3. أنواع التدريب (دائري)
    const types = {};
    data.forEach(d => types[d["نوع التدريب اليومي"]] = (types[d["نوع التدريب اليومي"]] || 0) + 1);
    if(activeCharts.pie) activeCharts.pie.destroy();
    activeCharts.pie = new ApexCharts(document.querySelector("#trainingTypeChart"), {
        chart: { type: 'donut', height: 300, fontFamily: font },
        series: Object.values(types),
        labels: Object.keys(types),
        colors: ['#0b2447', '#00a8cc', '#10b981', '#f59e0b'],
        legend: { position: 'bottom', fontSize: '10px' }
    });
    activeCharts.pie.render();
}

function renderCalendar(data) {
    const grid = document.getElementById('trainingCalendar');
    grid.innerHTML = '';
    if(!data.length) return;

    const trainedDates = new Set(data.map(d => d.isoDate));
    const latest = new Date(data[0].dateObj);
    const y = latest.getFullYear(), m = latest.getMonth();
    const firstDay = new Date(y, m, 1), lastDay = new Date(y, m + 1, 0);

    // السبت = 0 في منطقنا
    const startOffset = (firstDay.getDay() + 1) % 7;

    ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].forEach(d => {
        grid.innerHTML += `<div class="cal-header">${d}</div>`;
    });

    for(let i=0; i<startOffset; i++) grid.innerHTML += `<div></div>`;

    for(let d=1; d<=lastDay.getDate(); d++) {
        const cur = new Date(y, m, d);
        const iso = cur.toISOString().split('T')[0];
        const isT = trainedDates.has(iso);
        grid.innerHTML += `<div class="cal-day ${isT ? 'day-active' : 'day-idle'}">${d}</div>`;
    }
}

function renderTable(data) {
    const body = document.getElementById('tableBody'); body.innerHTML = '';
    data.forEach(d => {
        body.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 font-bold text-slate-700">${formatDateAR(d.dateObj)}</td>
                <td class="p-4 font-bold text-[#0b2447]">${d["اسم الخيل"]}</td>
                <td class="p-4 text-slate-500 font-bold text-[10px]">${d["نوع التدريب اليومي"]}</td>
                <td class="p-4 font-black text-cyan-600">${d["مدة الحصة التدريبية بالدقيقة"]} د</td>
                <td class="p-4 text-center no-print">
                    <a href="${d["يمكنك رفع صور او فيدو للتوثيق"]}" target="_blank" class="text-cyan-500 hover:scale-110 transition inline-block"><i data-lucide="external-link" class="w-4 h-4"></i></a>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

function searchHorseData() {
    const q = document.getElementById('recordSearch').value.toLowerCase();
    const cont = document.getElementById('recordsContainer');
    cont.innerHTML = '';
    if(!q) return;

    const res = horseGeneralRecords.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));

    res.forEach(r => {
        let card = `<div class="glass-card p-5 border-t-4 border-[#0b2447] text-right">
            <h3 class="text-lg font-bold text-cyan-600 mb-3">${r["اسم الخيل"] || "بيانات خيل"}</h3>
            <div class="space-y-2 text-xs">`;
        for(let k in r) {
            if(k === "اسم الخيل") continue;
            const val = r[k];
            if(val && val.startsWith('http')) {
                card += `<p class="flex justify-between border-b pb-1"><strong>${k}:</strong> <a href="${val}" target="_blank" class="text-blue-500 underline font-bold">فتح الرابط</a></p>`;
            } else if(val) {
                card += `<p class="flex justify-between border-b pb-1"><strong>${k}:</strong> <span class="text-slate-600">${val}</span></p>`;
            }
        }
        card += `</div></div>`;
        cont.innerHTML += card;
    });
    lucide.createIcons();
}

function toggleRecordsTable() {
    document.getElementById('recordsTableWrapper').classList.toggle('hidden');
}

function searchTable() {
    const v = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('#tableBody tr').forEach(r => r.style.display = r.innerText.toLowerCase().includes(v) ? '' : 'none');
}

async function exportToPDF() {
    const el = document.getElementById('dashboard-container');
    document.body.classList.add('pdf-mode');
    document.getElementById('pdf-report-header').classList.remove('hidden');
    document.getElementById('pdf-footer').classList.remove('hidden');
    document.getElementById('pdf-date').innerText = formatDateAR(new Date());

    const opt = {
        margin: 10,
        filename: `مربط_جادا_تقرير_${formatDateAR(new Date()).replace(/\//g,'-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(el).save();

    document.body.classList.remove('pdf-mode');
    document.getElementById('pdf-report-header').classList.add('hidden');
    document.getElementById('pdf-footer').classList.add('hidden');
}

window.onload = loadAllData;
