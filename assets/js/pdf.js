/* PDF report mode + html2pdf export */
async function exportPDF() {
  // Enter report mode
  document.body.classList.add('pdf-mode');

  // Wait for fonts to be ready (helps Arabic shaping)
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (_) {}
  }

  // Show report header/footer
  document.getElementById('report-meta').classList.remove('hidden');
  document.getElementById('pdf-footer').classList.remove('hidden');
  document.getElementById('printDate').innerText = formatDateDMY(new Date());

  const opt = {
    margin: [10, 10],
    filename: `تقرير_جادا_${formatDateDMY(new Date()).replace(/\//g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    await html2pdf().set(opt).from(document.getElementById('dashboard-container')).save();
  } finally {
    // Exit report mode
    document.body.classList.remove('pdf-mode');
    document.getElementById('report-meta').classList.add('hidden');
    document.getElementById('pdf-footer').classList.add('hidden');
  }
}
