/* Detailed table rendering + search */
function renderTable(data) {
  const body = document.getElementById('tableBody');
  body.innerHTML = '';

  data.forEach(d => {
    const isH = (d["ملاحظات صحية"] || '').trim() === "الخيل سليم تماماً";
    const attachment = (d["يمكنك رفع صور او فيدو للتوثيق"] || '').trim();
    const timeStr = d.dateObj
      ? `${String(d.dateObj.getHours()).padStart(2, '0')}:${String(d.dateObj.getMinutes()).padStart(2, '0')}`
      : '';

    body.innerHTML += `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-6 py-4 font-bold text-slate-700">
          ${formatDateDMY(d.dateObj)}
          <span class="text-[10px] text-slate-400 block">${timeStr}</span>
        </td>
        <td class="px-6 py-4 font-bold text-[#0b2447]">${d["اسم الخيل"] || ''}</td>
        <td class="px-6 py-4">
          <span class="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold">${d["نوع التدريب اليومي"] || ''}</span>
        </td>
        <td class="px-6 py-4 font-black text-cyan-600">${d["مدة الحصة التدريبية بالدقيقة"] || '0'} د</td>
        <td class="px-6 py-4">
          <span class="px-3 py-1 rounded-full text-[10px] font-bold ${isH ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
            ${d["ملاحظات صحية"] || ''}
          </span>
        </td>
        <td class="px-6 py-4 text-center no-print">
          ${attachment ? `
            <a href="${attachment}" target="_blank" class="text-cyan-500 hover:text-cyan-700 transition" aria-label="فتح المرفق">
              <i data-lucide="external-link" class="w-4 h-4 mx-auto"></i>
            </a>
          ` : '<span class="text-slate-300">—</span>'}
        </td>
      </tr>
    `;
  });

  lucide.createIcons();
}

function searchTable() {
  const val = document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('#tableBody tr').forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(val) ? '' : 'none';
  });
}
