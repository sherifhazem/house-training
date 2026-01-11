/**
 * نظام إدارة مربط جادا - النسخة المصححة للتوافق الكامل
 */

const TRAINING_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSA8oCh4yfOK5khe_kd0O7gylN9RDKxtnJ7yxouZd7YobQwNisyy5X91oZvXpOnMrFde7Wss0Y4pDhk/pub?output=csv";
const RECORDS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSAeCLUYDXemRYF147vmNYIen6pUOfaP2NvfD7wQ1GwCDsi6mHr8MQeuODo3W3DB5jnEF6qUS15fwbD/pub?output=csv";

let masterTrainingData = [];
let horseGeneralRecords = [];
let activeCharts = {};

// دالة للحصول على التاريخ بصيغة YYYY-MM-DD حسب التوقيت المحلي
function getLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// دالة تنسيق التاريخ للعرض: يوم/شهر/سنة
function formatDateAR(date) {
    if (!date) return "--";
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

// جلب البيانات
async function loadAllData() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('hidden');
    
    // سحب بيانات التدريب
    Papa.parse(TRAINING_CSV, {
        download: true,
        header: true,
        complete: (results) => {
            masterTrainingData = results.data.map(row => {
                let clean = {};
                for (let k in row) clean[k.trim()] = row[k].trim();
                const d = new Date(clean["Timestamp"]);
                if (!isNaN(d)) {
                    clean.dateObj = d;
                    // استخدام التاريخ المحلي للمطابقة الدقيقة مع التقويم
                    clean.isoDate = getLocalDateString(d);
                }
                return clean;
            }).filter(r => r.isoDate);

            // سحب سجلات الخيل العامة
            Papa.parse(RECORDS_CSV, {
                download: true,
                header: true,
                complete: (res2) => {
                    horseGeneralRecords = res2.data.map(row => {
                        let clean = {};
                        for (let k in row) clean[k.trim()] = row[k].trim();
                        return clean;
                    }).filter(r => Object.values(r).some(v => v !== ""));
                    
                    if (loader) loader.classList.add('hidden');
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
    if (filter) {
        filter.innerHTML = '<option value="all">الكل</option>';
        horses.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.innerText = h;
            filter.appendChild(opt);
        });
    }

    applyFilters();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    
    const activeTab = document.getElementById(`tab-${tabId}`);
    const activeContent = document.getElementById(`content-${tabId}`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.remove('hidden');
    
    lucide.createIcons();
    // إعادة رسم المخططات لتناسب العرض الجديد
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

function applyFilters() {
    const horse = document.getElementById('horseFilter')?.value || 'all';
    const start = document.getElementById('startDate')?.value;
    const end = document.getElementById('endDate')?.value;

    let filtered = masterTrainingData.filter(d => {
        const mH = horse === 'all' || d["اسم الخيل"] === horse;
        const mS = !start || d.isoDate >= start;
        const mE = !end || d.isoDate <= end;
        return mH && mS && mE;
    });

    filtered.sort((a, b) => b.dateObj - a.dateObj);
    refreshDashboard(filtered);
}

function refreshDashboard(data) {
    // تحديث الأرقام (KPIs)
    const total = data.length;
    const avg = (data.reduce((s, d) => s + parseFloat(d["تقييم نشاط واستجابة الخيل"] || 0), 0) / (total || 1)).toFixed(1);
    const time = data.reduce((s, d) => s + parseInt(d["مدة الحصة التدريبية بالدقيقة"] || 0), 0);
    const healthyCount = data.filter(d => d["ملاحظات صحية"] === "الخيل سليم تماماً").length;
    const healthP = total > 0 ? ((healthyCount / total) * 100).toFixed(0) : 0;

    const elTotal = document.getElementById('statTotal');
    const elAvg = document.getElementById('statAvg');
    const elTime = document.getElementById('statTime');
    const elHealth = document.getElementById('statHealth');

    if (elTotal) elTotal.innerText = total;
    if (elAvg) elAvg.innerText = avg;
    if (elTime) elTime.innerText = time;
    if (elHealth) elHealth.innerText = healthP + "%";

    renderCharts(data, healthP);
    renderCalendar(data);
    renderTable(data);
}

function renderCharts(data, healthScore) {
    const font = 'IBM Plex Sans Arabic';
    
    // 1. تتبع منحنى الأداء (Line Chart)
    const lineContainer = document.querySelector("#performanceLineChart");
    if (lineContainer) {
        const chartSeries = data.slice().reverse().map(d => ({ x: d.isoDate, y: parseFloat(d["تقييم نشاط واستجابة الخيل"] || 0) }));
        if (activeCharts.line) activeCharts.line.destroy();
        activeCharts.line = new ApexCharts(lineContainer, {
            chart: { type: 'area', height: 300, toolbar: { show: false }, fontFamily: font },
            series: [{ name: 'مستوى النشاط', data: chartSeries }],
            colors: ['#00a8cc'],
            stroke: { curve: 'smooth', width: 3 },
            xaxis: { type: 'datetime', labels: { style: { fontSize: '10px' } } },
            yaxis: { max: 5, min: 0 }
        });
        activeCharts.line.render();
    }

    // 2. مؤشر كفاءة الصحة (Gauge Chart)
    const gaugeContainer = document.querySelector("#healthIndicatorChart");
    if (gaugeContainer) {
        const hVal = parseInt(healthScore);
        if (activeCharts.gauge) activeCharts.gauge.destroy();
        activeCharts.gauge = new ApexCharts(gaugeContainer, {
            chart: { type: 'radialBar', height: 320, fontFamily: font },
            series: [hVal],
            plotOptions: {
                radialBar: {
                    hollow: { size: '60%' },
                    dataLabels: {
                        name: { show: false },
                        value: { fontSize: '24px', fontWeight: '700', offsetY: 10, color: '#0b2447', formatter: v => v + "%" }
                    }
                }
            },
            fill: { colors: [hVal > 85 ? '#10b981' : hVal > 60 ? '#f59e0b' : '#ef4444'] }
        });
        activeCharts.gauge.render();
    }

    // 3. توزيع أنواع التدريب (Pie/Donut Chart)
    const pieContainer = document.querySelector("#trainingTypeChart");
    if (pieContainer) {
        const types = {};
        data.forEach(d => {
            const t = d["نوع التدريب اليومي"] || "غير محدد";
            types[t] = (types[t] || 0) + 1;
        });
        if (activeCharts.pie) activeCharts.pie.destroy();
        activeCharts.pie = new ApexCharts(pieContainer, {
            chart: { type: 'donut', height: 300, fontFamily: font },
            series: Object.values(types),
            labels: Object.keys(types),
            colors: ['#0b2447', '#00a8cc', '#10b981', '#f59e0b', '#ec4899'],
            legend: { position: 'bottom', fontSize: '10px' },
            dataLabels: { enabled: false }
        });
        activeCharts.pie.render();
    }
}

function renderCalendar(data) {
    const grid = document.getElementById('trainingCalendar');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (data.length === 0) {
        grid.innerHTML = '<div class="col-span-7 text-center py-4 text-slate-400 text-xs">لا توجد بيانات للعرض في التقويم</div>';
        return;
    }

    // استخراج كافة تواريخ النشاط المفلترة
    const trainedDates = new Set(data.map(d => d.isoDate));
    
    // تحديد الشهر والسنة بناءً على أحدث سجل
    const latestDate = data[0].dateObj;
    const y = latestDate.getFullYear();
    const m = latestDate.getMonth();
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    // إضافة ملاحظة نصية بالمدى الزمني المعروض
    const rangeNote = document.createElement('div');
    rangeNote.className = 'col-span-7 text-right mb-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100';
    rangeNote.innerText = `عرض سجل النشاط لشهر: ${monthNames[m]} ${y}`;
    grid.appendChild(rangeNote);

    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);

    // السبت = 0 في منطقنا لتناسب الثقافة العربية (السبت بداية الأسبوع)
    // getDay: الأحد=0، الاثنين=1... السبت=6
    // لجعل السبت=0: (getDay() + 1) % 7
    const startOffset = (firstDay.getDay() + 1) % 7;

    const headers = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
    headers.forEach(h => {
        const hDiv = document.createElement('div');
        hDiv.className = 'cal-header';
        hDiv.innerText = h;
        grid.appendChild(hDiv);
    });

    // إضافة فراغات ما قبل بداية الشهر
    for (let i = 0; i < startOffset; i++) {
        grid.appendChild(document.createElement('div'));
    }

    // رسم أيام الشهر ومطابقة تواريخ النشاط
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const curDate = new Date(y, m, d);
        const iso = getLocalDateString(curDate);
        const isTrained = trainedDates.has(iso);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = `cal-day ${isTrained ? 'day-active' : 'day-idle'}`;
        dayDiv.innerText = d;
        grid.appendChild(dayDiv);
    }
}

function renderTable(data) {
    const body = document.getElementById('tableBody');
    if (!body) return;
    body.innerHTML = '';
    
    if (data.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">لا توجد سجلات مطابقة للبحث</td></tr>';
        return;
    }

    data.forEach(d => {
        const isHealthy = d["ملاحظات صحية"] === "الخيل سليم تماماً";
        body.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-50 text-right">
                <td class="p-4 font-bold text-slate-700">
                    ${formatDateAR(d.dateObj)}
                    <span class="block text-[9px] text-slate-400 font-normal mt-1">${d.dateObj.getHours()}:${String(d.dateObj.getMinutes()).padStart(2, '0')}</span>
                </td>
                <td class="p-4 font-bold text-[#0b2447]">${d["اسم الخيل"]}</td>
                <td class="p-4"><span class="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">${d["نوع التدريب اليومي"]}</span></td>
                <td class="p-4 font-black text-cyan-600 text-xs">${d["مدة الحصة التدريبية بالدقيقة"]} د</td>
                <td class="p-4 text-center no-print">
                    <a href="${d["يمكنك رفع صور او فيدو للتوثيق"]}" target="_blank" class="text-cyan-500 hover:scale-110 transition inline-block">
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                    </a>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

function searchHorseData() {
    const q = document.getElementById('recordSearch')?.value.toLowerCase() || "";
    const cont = document.getElementById('recordsContainer');
    if (!cont) return;
    cont.innerHTML = '';
    
    if (!q) return;

    const res = horseGeneralRecords.filter(r => 
        Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );

    if (res.length === 0) {
        cont.innerHTML = '<div class="col-span-full text-center p-12 glass-card text-slate-400 font-bold">لم يتم العثور على نتائج للبحث</div>';
        return;
    }

    res.forEach(r => {
        let cardContent = "";
        for (let k in r) {
            if (k === "اسم الخيل") continue;
            const val = r[k];
            if (val && val.startsWith('http')) {
                cardContent += `
                    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg mb-2">
                        <span class="font-bold text-slate-500">${k}:</span>
                        <a href="${val}" target="_blank" class="text-blue-500 underline font-bold text-[10px]">فتح المرفق</a>
                    </div>`;
            } else if (val) {
                cardContent += `
                    <div class="flex justify-between border-b border-slate-50 pb-1 mb-1 text-right">
                        <span class="font-bold text-slate-500">${k}:</span>
                        <span class="text-slate-700">${val}</span>
                    </div>`;
            }
        }

        cont.innerHTML += `
            <div class="glass-card p-5 border-t-4 border-[#0b2447] text-right animate-in fade-in duration-300">
                <h3 class="text-lg font-black text-cyan-600 mb-4 pb-2 border-b border-slate-100">${r["اسم الخيل"] || "بيانات خيل"}</h3>
                <div class="space-y-1 text-xs">
                    ${cardContent}
                </div>
            </div>`;
    });
    lucide.createIcons();
}

function searchTable() {
    const v = document.getElementById('searchInput')?.value.toLowerCase() || "";
    document.querySelectorAll('#tableBody tr').forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(v) ? '' : 'none';
    });
}

async function exportToPDF() {
    const el = document.getElementById('app-wrapper');
    if (!el) return;

    document.body.classList.add('pdf-mode');
    const header = document.getElementById('pdf-report-header');
    const footer = document.getElementById('pdf-footer');
    const dateText = document.getElementById('pdf-date');

    if (header) header.classList.remove('hidden');
    if (footer) footer.classList.remove('hidden');
    if (dateText) dateText.innerText = formatDateAR(new Date());

    const opt = {
        margin: 10,
        filename: `مربط_جادا_تقرير_${formatDateAR(new Date()).replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(el).save();
    } catch (err) {
        console.error("PDF Export Error:", err);
    } finally {
        document.body.classList.remove('pdf-mode');
        if (header) header.classList.add('hidden');
        if (footer) footer.classList.add('hidden');
    }
}

// البدء عند التحميل
window.onload = loadAllData;
