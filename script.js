/**
 * نظام إدارة وتحليل بيانات مربط جادا
 * مبرمج للربط المباشر مع Google Sheets
 */

// روابط ملفات البيانات بصيغة CSV
const TRAINING_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSA8oCh4yfOK5khe_kd0O7gylN9RDKxtnJ7yxouZd7YobQwNisyy5X91oZvXpOnMrFde7Wss0Y4pDhk/pub?output=csv";
const RECORDS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSAeCLUYDXemRYF147vmNYIen6pUOfaP2NvfD7wQ1GwCDsi6mHr8MQeuODo3W3DB5jnEF6qUS15fwbD/pub?output=csv";

let trainingData = [];
let horseRecordsData = [];
let activeCharts = {};

// دالة لتنسيق التاريخ ليظهر يوم/شهر/سنة
function formatDateDMY(date) {
    if (!date) return "--";
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

// جلب ومعالجة البيانات من المصادر
async function fetchData() {
    document.getElementById('loader').classList.remove('hidden');
    
    // جلب ملف التدريب الأول
    Papa.parse(TRAINING_CSV, {
        download: true,
        header: true,
        complete: (res) => {
            trainingData = res.data.map(d => {
                let obj = {};
                for (let key in d) obj[key.trim()] = d[key].trim();
                const dt = new Date(obj["Timestamp"]);
                if (!isNaN(dt)) {
                    obj.dateObj = dt;
                    obj.isoDate = dt.toISOString().split('T')[0];
                }
                return obj;
            }).filter(d => d.isoDate);
            
            // جلب ملف السجلات الثاني
            Papa.parse(RECORDS_CSV, {
                download: true,
                header: true,
                complete: (res2) => {
                    horseRecordsData = res2.data.map(d => {
                        let obj = {};
                        for (let key in d) obj[key.trim()] = d[key].trim();
                        return obj;
                    }).filter(d => Object.values(d).some(v => v !== ""));
                    
                    document.getElementById('loader').classList.add('hidden');
                    initDashboard();
                }
            });
        }
    });
}

// تهيئة النظام وعرض البيانات
function initDashboard() {
    lucide.createIcons();
    
    // تعبئة قائمة اختيار الخيول في الفلاتر
    const horses = [...new Set(trainingData.map(d => d["اسم الخيل"]))].filter(h => h);
    const select = document.getElementById('horseFilter');
    if(select) {
        select.innerHTML = '<option value="all">كل الخيول</option>';
        horses.sort().forEach(h => {
            const opt = document.createElement('option');
            opt.value = h; opt.innerText = h;
            select.appendChild(opt);
        });
    }
    
    renderRecordsTable();
    applyFilters();
}

// تبديل التبويبات (Tabs)
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`content-${tab}`).classList.remove('hidden');
    lucide.createIcons();
    // إعادة ضبط الرسوم البيانية لتناسب العرض الجديد
    window.dispatchEvent(new Event('resize'));
}

// تطبيق فلاتر البحث التاريخي
function applyFilters() {
    const horse = document.getElementById('horseFilter').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    let filtered = trainingData.filter(d => {
        const mH = horse === 'all' || d["اسم الخيل"] === horse;
        const mS = !start || d.isoDate >= start;
        const mE = !end || d.isoDate <= end;
        return mH && mS && mE;
    });

    // ترتيب من الأحدث للأقدم
    filtered.sort((a, b) => b.dateObj - a.dateObj);
    renderAnalysisContent(filtered);
}

// معالجة عرض تبويب التحليل
function renderAnalysisContent(data) {
    const total = data.length;
    const avg = (data.reduce((s, d) => s + parseFloat(d["تقييم نشاط واستجابة الخيل"] || 0), 0) / total || 0).toFixed(1);
    const time = data.reduce((s, d) => s + parseInt(d["مدة الحصة التدريبية بالدقيقة"] || 0), 0);
    const healthy = data.filter(d => d["ملاحظات صحية"] === "الخيل سليم تماماً").length;
    const healthP = ((healthy / total) * 100 || 0).toFixed(0);

    const stats = {
        'statTotal': total,
        'statAvg': avg,
        'statTime': time + " د",
        'statHealth': healthP
    };

    for(let id in stats) {
        const el = document.getElementById(id);
        if(el) el.innerText = stats[id];
    }

    renderCharts(data);
    renderCalendarGrid(data);
    renderDetailedTable(data);
}

// رسم المخططات البيانية التفاعلية
function renderCharts(data) {
    const font = 'IBM Plex Sans Arabic';
    const series = data.slice().reverse().map(d => ({ x: d.isoDate, y: parseFloat(d["تقييم نشاط واستجابة الخيل"] || 0) }));
    
    // 1. منحنى النشاط
    if(activeCharts.line) activeCharts.line.destroy();
    activeCharts.line = new ApexCharts(document.querySelector("#lineChart"), {
        chart: { type: 'area', height: 300, toolbar: {show:false}, fontFamily: font },
        series: [{ name: 'النشاط', data: series }],
        colors: ['#00a8cc'], stroke: {curve:'smooth', width:3},
        xaxis: {type:'datetime'}
    });
    activeCharts.line.render();

    // 2. مؤشر السلامة (Gauge)
    const hVal = parseInt(document.getElementById('statHealth').innerText);
    if(activeCharts.gauge) activeCharts.gauge.destroy();
    activeCharts.gauge = new ApexCharts(document.querySelector("#healthGauge"), {
        chart: { type: 'radialBar', height: 320, fontFamily: font },
        series: [hVal],
        plotOptions: { 
            radialBar: { hollow:{size:'65%'}, dataLabels:{ value:{fontSize:'30px', fontWeight:'700', color: '#0b2447', formatter: v=>v+"%"} } } 
        },
        fill: { colors:[hVal > 80 ? '#10b981' : hVal > 50 ? '#f59e0b' : '#ef4444'] }
    });
    activeCharts.gauge.render();

    // 3. توزيع أنواع التدريب (Pie)
    const types = {};
    data.forEach(d => types[d["نوع التدريب اليومي"]] = (types[d["نوع التدريب اليومي"]] || 0) + 1);
    if(activeCharts.pie) activeCharts.pie.destroy();
    activeCharts.pie = new ApexCharts(document.querySelector("#trainingPie"), {
        chart: { type: 'donut', height: 300, fontFamily: font },
        series: Object.values(types), labels: Object.keys(types),
        colors: ['#0b2447', '#00a8cc', '#10b981', '#f59e0b'],
        legend: {position:'bottom'}
    });
    activeCharts.pie.render();
}

// بناء التقويم (بداية الأسبوع السبت)
function renderCalendarGrid(data) {
    const grid = document.getElementById('calendarGrid');
    if(!grid) return;
    grid.innerHTML = '';
    if (!data.length) return;

    const tDays = new Set(data.map(d => d.isoDate));
    const latest = new Date(data[0].dateObj);
    const year = latest.getFullYear(), month = latest.getMonth();
    const first = new Date(year, month, 1), last = new Date(year, month + 1, 0);

    const getSatIdx = d => (d + 1) % 7;
    const offset = getSatIdx(first.getDay());

    ['سبت','أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة'].forEach(d => grid.innerHTML += `<div class="calendar-header">${d}</div>`);
    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= last.getDate(); d++) {
        const cur = new Date(year, month, d);
        const iso = cur.toISOString().split('T')[0];
        const isT = tDays.has(iso);
        grid.innerHTML += `<div class="calendar-day ${isT ? 'day-training' : 'day-rest'}" title="${isT?'تدريب':'راحة'}">${d}</div>`;
    }
}

// عرض الجدول التفصيلي للتدريب
function renderDetailedTable(data) {
    const body = document.getElementById('tableBody'); 
    if(!body) return;
    body.innerHTML = '';
    data.forEach(d => {
        const isH = d["ملاحظات صحية"] === "الخيل سليم تماماً";
        body.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b">
                <td class="px-6 py-4 font-bold text-slate-700 text-right">
                    ${formatDateDMY(d.dateObj)} 
                    <span class="text-[9px] text-slate-400 block">${d.dateObj.getHours()}:${String(d.dateObj.getMinutes()).padStart(2,'0')}</span>
                </td>
                <td class="px-6 py-4 font-bold text-[#0b2447] text-right">${d["اسم الخيل"]}</td>
                <td class="px-6 py-4 text-[10px] font-bold text-slate-600 text-right">${d["نوع التدريب اليومي"]}</td>
                <td class="px-6 py-4 font-bold text-cyan-600 text-right">${d["مدة الحصة التدريبية بالدقيقة"]} د</td>
                <td class="px-6 py-4 text-right"><span class="px-3 py-1 rounded-full text-[9px] font-bold ${isH ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">${d["ملاحظات صحية"]}</span></td>
                <td class="px-6 py-4 text-center no-print"><a href="${d["يمكنك رفع صور او فيدو للتوثيق"]}" target="_blank" class="text-cyan-500 hover:text-cyan-700 transition"><i data-lucide="external-link" class="w-5 h-5 mx-auto"></i></a></td>
            </tr>
        `;
    });
    lucide.createIcons();
}

// عرض جدول السجلات (الشيت الثاني)
function renderRecordsTable() {
    const head = document.getElementById('recordsHeader');
    const body = document.getElementById('recordsTableBody');
    if (!horseRecordsData.length || !head || !body) return;
    const keys = Object.keys(horseRecordsData[0]);
    head.innerHTML = keys.map(k => `<th class="px-6 py-4 text-right">${k}</th>`).join('');
    body.innerHTML = horseRecordsData.map(row => {
        return `<tr>${keys.map(k => {
            const val = row[k];
            if (val && (val.startsWith('http') || val.includes('drive.google'))) {
                return `<td class="px-6 py-4 text-right"><a href="${val}" target="_blank" class="text-cyan-600 font-bold underline">فتح المرفق</a></td>`;
            }
            return `<td class="px-6 py-4 font-semibold text-slate-700 text-right">${val || '--'}</td>`;
        }).join('')}</tr>`;
    }).join('');
}

// محرك بحث سجلات الخيل
function searchHorseRecords() {
    const query = document.getElementById('horseSearchInput').value.toLowerCase();
    const container = document.getElementById('recordsResultContainer');
    if(!container) return;
    container.innerHTML = '';
    if (!query) return;

    const results = horseRecordsData.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(query)));

    results.forEach(res => {
        const card = document.createElement('div');
        card.className = "glass-card p-6 border-t-4 border-[#0b2447] text-right";
        let content = `<h3 class="text-xl font-bold mb-4 text-[#00a8cc]">${res["اسم الخيل"] || "بيانات خيل"}</h3><div class="space-y-3 text-sm">`;
        for (let k in res) {
            if (k === "اسم الخيل") continue;
            const val = res[k];
            if (val && (val.startsWith('http') || val.includes('drive.google'))) {
                content += `<p class="flex justify-between items-center bg-slate-50 p-2 rounded-lg"><strong>${k}:</strong> <a href="${val}" target="_blank" class="text-blue-600 font-bold underline text-[10px]">عرض المرفق</a></p>`;
            } else if (val) {
                content += `<p class="flex justify-between border-b border-slate-50 pb-1"><strong>${k}:</strong> <span class="text-slate-600 font-semibold">${val}</span></p>`;
            }
        }
        content += `</div>`;
        card.innerHTML = content;
        container.appendChild(card);
    });
    lucide.createIcons();
}

function toggleRecordsTable() {
    const el = document.getElementById('recordsTableWrapper');
    if(el) el.classList.toggle('hidden');
}

function searchTable() {
    const val = document.getElementById("searchInput").value.toLowerCase();
    document.querySelectorAll("#tableBody tr").forEach(r => r.style.display = r.innerText.toLowerCase().includes(val) ? "" : "none");
}

// تصدير PDF احترافي (Report Mode)
async function exportPDF() {
    document.body.classList.add('pdf-mode');
    const header = document.getElementById('report-header');
    const footer = document.getElementById('pdf-footer');
    if(header) header.classList.remove('hidden');
    if(footer) footer.classList.remove('hidden');
    const dateText = document.getElementById('reportDateText');
    if(dateText) dateText.innerText = formatDateDMY(new Date());

    const opt = {
        margin: 10, 
        filename: `تقرير_جادا_${formatDateDMY(new Date()).replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const container = document.getElementById('dashboard-container');
    if(container) {
        await html2pdf().set(opt).from(container).save();
    }

    document.body.classList.remove('pdf-mode');
    if(header) header.classList.add('hidden');
    if(footer) footer.classList.add('hidden');
}

// بدء التشغيل فور تحميل الصفحة
window.onload = fetchData;