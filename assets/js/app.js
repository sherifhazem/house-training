/* App initialization + orchestration */
function init() {
  lucide.createIcons();

  // Populate horses
  const horses = [...new Set(masterData.map(d => d["اسم الخيل"]))].filter(Boolean);
  const select = document.getElementById('horseFilter');
  select.innerHTML = '<option value="all">كل الخيول</option>';
  horses.forEach((h) => {
    const opt = document.createElement('option');
    opt.value = h;
    opt.innerText = h;
    select.appendChild(opt);
  });

  // Wire filter date display
  document.getElementById('startDate').addEventListener('change', () => {
    setFilterPrettyDates();
    applyFilters();
  });
  document.getElementById('endDate').addEventListener('change', () => {
    setFilterPrettyDates();
    applyFilters();
  });

  setFilterPrettyDates();
  applyFilters();
}

window.onload = fetchData;
